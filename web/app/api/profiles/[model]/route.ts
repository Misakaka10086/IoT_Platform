import { NextRequest, NextResponse } from 'next/server';
import pool, { withRetry } from '../../../../lib/database';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ model: string }> }
) {
    const { model } = await params;

    console.log('📝 PUT /api/profiles/[model] called:', {
        model,
        timestamp: new Date().toISOString(),
        method: 'PUT'
    });

    try {
        const body = await request.json();
        const { model: newModel, default_config } = body;

        if (!newModel || !default_config) {
            return NextResponse.json(
                {
                    error: 'Model and default_config are required',
                    timestamp: new Date().toISOString(),
                    endpoint: `/api/profiles/${model}`
                },
                { status: 400 }
            );
        }

        const profile = await withRetry(async () => {
            const client = await pool.connect();
            try {
                const result = await client.query(
                    'UPDATE device_profiles SET model = $1, default_config = $2 WHERE model = $3 RETURNING *',
                    [newModel, default_config, model]
                );

                if (result.rowCount === 0) {
                    throw new Error('Profile not found');
                }

                return result.rows[0];
            } finally {
                client.release();
            }
        }, 3, `Update profile: ${model}`);

        console.log(`✅ Successfully updated profile: ${model} -> ${newModel}`);

        return NextResponse.json({
            success: true,
            profile: profile,
            message: `Profile updated successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error updating profile:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: `/api/profiles/${model}`
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ model: string }> }
) {
    const { model } = await params;

    console.log('🗑️ DELETE /api/profiles/[model] called:', {
        model,
        timestamp: new Date().toISOString(),
        method: 'DELETE'
    });

    try {
        await withRetry(async () => {
            const client = await pool.connect();
            try {
                const result = await client.query(
                    'DELETE FROM device_profiles WHERE model = $1',
                    [model]
                );

                if (result.rowCount === 0) {
                    throw new Error('Profile not found');
                }

                console.log(`✅ Successfully deleted profile: ${model}`);
            } finally {
                client.release();
            }
        }, 3, `Delete profile: ${model}`);

        return NextResponse.json({
            success: true,
            message: `Profile ${model} deleted successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error deleting profile:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: `/api/profiles/${model}`
            },
            { status: 500 }
        );
    }
} 