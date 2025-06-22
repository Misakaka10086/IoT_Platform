import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/database';

export async function GET(request: NextRequest) {
    console.log('🔧 GET /api/device-profiles called:', {
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        method: 'GET'
    });

    try {
        const { searchParams } = new URL(request.url);
        const modelsOnly = searchParams.get('models_only') === 'true';
        console.log('📋 Query parameters:', { modelsOnly });

        if (modelsOnly) {
            // Return only model names for dropdown
            console.log('🔍 Fetching model names only...');
            const result = await pool.query('SELECT model FROM device_profiles ORDER BY model');
            const models = result.rows.map(row => row.model);
            console.log(`✅ Successfully fetched ${models.length} model names`);
            return NextResponse.json(models);
        } else {
            // Return full profile information
            console.log('🔍 Fetching full device profiles...');
            const result = await pool.query('SELECT * FROM device_profiles ORDER BY model');
            console.log(`✅ Successfully fetched ${result.rows.length} device profiles`);
            return NextResponse.json(result.rows);
        }
    } catch (error) {
        console.error('❌ Error fetching device profiles:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: '/api/device-profiles'
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    console.log('🔧 POST /api/device-profiles called:', {
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        contentType: request.headers.get('content-type'),
        method: 'POST'
    });

    try {
        console.log('🔍 Parsing request body...');
        const body = await request.json();
        console.log('📦 Request body:', body);

        const { model, default_config } = body;

        if (!model || !default_config) {
            console.log('❌ Validation failed: missing required fields');
            return NextResponse.json(
                {
                    error: 'Missing required fields: model and default_config',
                    receivedData: body,
                    timestamp: new Date().toISOString(),
                    endpoint: '/api/device-profiles'
                },
                { status: 400 }
            );
        }

        console.log(`🔧 Creating device profile for model: ${model}`);
        const result = await pool.query(
            'INSERT INTO device_profiles (model, default_config) VALUES ($1, $2) RETURNING *',
            [model, default_config]
        );

        console.log(`✅ Device profile created successfully: ${model}`);
        return NextResponse.json({
            ...result.rows[0],
            timestamp: new Date().toISOString(),
            endpoint: '/api/device-profiles'
        });
    } catch (error) {
        console.error('❌ Error creating device profile:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: '/api/device-profiles'
            },
            { status: 500 }
        );
    }
} 