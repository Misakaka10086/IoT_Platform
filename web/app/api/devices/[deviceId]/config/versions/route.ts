import { NextRequest, NextResponse } from 'next/server';
import pool, { withRetry } from '../../../../../../lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    const { deviceId } = await params;

    console.log('📋 GET /api/devices/[deviceId]/config/versions called:', {
        deviceId,
        timestamp: new Date().toISOString(),
        method: 'GET'
    });

    try {
        const versions = await withRetry(async () => {
            const client = await pool.connect();
            try {
                const result = await client.query(`
                    SELECT cv.version, cv.config, cv.created_at,
                           CASE WHEN dc.version = cv.version THEN true ELSE false END as is_current
                    FROM config_version cv
                    LEFT JOIN device_configs dc ON cv.device_id = dc.device_id AND cv.version = dc.version
                    WHERE cv.device_id = $1
                    ORDER BY cv.created_at DESC
                `, [deviceId]);

                return result.rows.map(row => ({
                    version: row.version,
                    config: row.config,
                    created_at: row.created_at,
                    is_current: row.is_current
                }));
            } finally {
                client.release();
            }
        }, 3, `Get device config versions: ${deviceId}`);

        return NextResponse.json({
            success: true,
            versions,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error fetching device config versions:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: `/api/devices/${deviceId}/config/versions`
            },
            { status: 500 }
        );
    }
} 