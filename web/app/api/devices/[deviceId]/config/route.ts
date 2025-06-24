import { NextRequest, NextResponse } from 'next/server';
import pool, { withRetry } from '../../../../../lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    const { deviceId } = await params;

    console.log('📋 GET /api/devices/[deviceId]/config called:', {
        deviceId,
        timestamp: new Date().toISOString(),
        method: 'GET'
    });

    try {
        const config = await withRetry(async () => {
            const client = await pool.connect();
            try {
                const result = await client.query(`
                    SELECT dc.version, cv.git_version, cv.config 
                    FROM device_configs dc 
                    JOIN config_version cv ON dc.device_id = cv.device_id AND dc.version = cv.version 
                    WHERE dc.device_id = $1
                `, [deviceId]);

                if (result.rows.length === 0) {
                    throw new Error('Device configuration not found');
                }

                return {
                    version: result.rows[0].version,
                    git_version: result.rows[0].git_version,
                    config: result.rows[0].config
                };
            } finally {
                client.release();
            }
        }, 3, `Get device config: ${deviceId}`);

        return NextResponse.json({
            success: true,
            config,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error fetching device config:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: `/api/devices/${deviceId}/config`
            },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    const { deviceId } = await params;

    console.log('📝 PUT /api/devices/[deviceId]/config called:', {
        deviceId,
        timestamp: new Date().toISOString(),
        method: 'PUT'
    });

    try {
        const body = await request.json();
        const { config: newConfig } = body;

        if (!newConfig) {
            return NextResponse.json(
                {
                    error: 'Configuration data is required',
                    timestamp: new Date().toISOString(),
                    endpoint: `/api/devices/${deviceId}/config`
                },
                { status: 400 }
            );
        }

        await withRetry(async () => {
            const client = await pool.connect();
            try {
                // Start transaction
                await client.query('BEGIN');

                // Generate new version timestamp
                const now = new Date();
                const version = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', 'T');

                // Get device's git_version
                const deviceResult = await client.query(
                    'SELECT git_version FROM devices WHERE device_id = $1',
                    [deviceId]
                );

                if (deviceResult.rows.length === 0) {
                    throw new Error('Device not found');
                }

                const gitVersion = deviceResult.rows[0].git_version;

                // Create new config version
                await client.query(
                    'INSERT INTO config_version (device_id, version, git_version, config) VALUES ($1, $2, $3, $4)',
                    [deviceId, version, gitVersion, newConfig]
                );

                // Update device config to use new version
                await client.query(
                    'UPDATE device_configs SET version = $1, updated_at = NOW() WHERE device_id = $2',
                    [version, deviceId]
                );

                // Commit transaction
                await client.query('COMMIT');

                console.log(`✅ Successfully updated device config: ${deviceId}, version: ${version}`);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }, 3, `Update device config: ${deviceId}`);

        return NextResponse.json({
            success: true,
            message: `Device configuration updated successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error updating device config:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: `/api/devices/${deviceId}/config`
            },
            { status: 500 }
        );
    }
} 