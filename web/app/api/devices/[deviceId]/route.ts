import { NextRequest, NextResponse } from 'next/server';
import pool, { withRetry } from '../../../../lib/database';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    const { deviceId } = await params;

    console.log('🗑️ DELETE /api/devices/[deviceId] called:', {
        deviceId,
        timestamp: new Date().toISOString(),
        method: 'DELETE'
    });

    try {
        await withRetry(async () => {
            const client = await pool.connect();
            try {
                // Start transaction
                await client.query('BEGIN');

                // Delete device configs first (due to foreign key constraint)
                await client.query(
                    'DELETE FROM device_configs WHERE device_id = $1',
                    [deviceId]
                );

                // Delete config versions
                await client.query(
                    'DELETE FROM config_version WHERE device_id = $1',
                    [deviceId]
                );

                // Delete the device
                const result = await client.query(
                    'DELETE FROM devices WHERE device_id = $1',
                    [deviceId]
                );

                if (result.rowCount === 0) {
                    throw new Error('Device not found');
                }

                // Commit transaction
                await client.query('COMMIT');

                console.log(`✅ Successfully deleted device: ${deviceId}`);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }, 3, `Delete device: ${deviceId}`);

        return NextResponse.json({
            success: true,
            message: `Device ${deviceId} deleted successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error deleting device:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: `/api/devices/${deviceId}`
            },
            { status: 500 }
        );
    }
} 