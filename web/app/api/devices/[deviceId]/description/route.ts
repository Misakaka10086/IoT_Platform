import { NextRequest, NextResponse } from 'next/server';
import pool, { withRetry } from '../../../../../lib/database';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    const { deviceId } = await params;

    console.log('📝 PUT /api/devices/[deviceId]/description called:', {
        deviceId,
        timestamp: new Date().toISOString(),
        method: 'PUT'
    });

    try {
        const body = await request.json();
        const { description } = body;

        if (description === undefined) {
            return NextResponse.json(
                {
                    error: 'Description field is required',
                    timestamp: new Date().toISOString(),
                    endpoint: `/api/devices/${deviceId}/description`
                },
                { status: 400 }
            );
        }

        await withRetry(async () => {
            const client = await pool.connect();
            try {
                // Update device description
                const result = await client.query(
                    'UPDATE devices SET description = $1 WHERE device_id = $2',
                    [description, deviceId]
                );

                if (result.rowCount === 0) {
                    throw new Error('Device not found');
                }

                console.log(`✅ Successfully updated device description: ${deviceId}`);
            } finally {
                client.release();
            }
        }, 3, `Update device description: ${deviceId}`);

        return NextResponse.json({
            success: true,
            message: `Device description updated successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error updating device description:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: `/api/devices/${deviceId}/description`
            },
            { status: 500 }
        );
    }
} 