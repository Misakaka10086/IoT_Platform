import { NextRequest, NextResponse } from 'next/server';
import pool, { withRetry } from '../../../lib/database';

export async function GET(request: NextRequest) {
    console.log('📋 GET /api/profiles called:', {
        timestamp: new Date().toISOString(),
        method: 'GET'
    });

    try {
        const profiles = await withRetry(async () => {
            const client = await pool.connect();
            try {
                const result = await client.query(`
                    SELECT id, model, default_config, created_at 
                    FROM device_profiles 
                    ORDER BY created_at DESC
                `);
                return result.rows;
            } finally {
                client.release();
            }
        }, 3, 'Get all profiles');

        return NextResponse.json({
            success: true,
            profiles: profiles,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error fetching profiles:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: '/api/profiles'
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    console.log('📝 POST /api/profiles called:', {
        timestamp: new Date().toISOString(),
        method: 'POST'
    });

    try {
        const body = await request.json();
        const { model, default_config } = body;

        if (!model || !default_config) {
            return NextResponse.json(
                {
                    error: 'Model and default_config are required',
                    timestamp: new Date().toISOString(),
                    endpoint: '/api/profiles'
                },
                { status: 400 }
            );
        }

        const profile = await withRetry(async () => {
            const client = await pool.connect();
            try {
                const result = await client.query(
                    'INSERT INTO device_profiles (model, default_config) VALUES ($1, $2) RETURNING *',
                    [model, default_config]
                );
                return result.rows[0];
            } finally {
                client.release();
            }
        }, 3, `Create profile: ${model}`);

        console.log(`✅ Successfully created profile: ${model}`);

        return NextResponse.json({
            success: true,
            profile: profile,
            message: `Profile ${model} created successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error creating profile:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: '/api/profiles'
            },
            { status: 500 }
        );
    }
} 