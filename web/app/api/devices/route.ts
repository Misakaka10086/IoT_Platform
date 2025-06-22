import { NextRequest, NextResponse } from 'next/server';
import { DeviceService } from '../../../lib/deviceService';

export async function GET(request: NextRequest) {
    console.log('📋 GET /api/devices called:', {
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        method: 'GET'
    });

    try {
        console.log('🔍 Fetching devices from database...');
        const devices = await DeviceService.getAllDevices();
        console.log(`✅ Successfully fetched ${devices.length} devices`);

        return NextResponse.json(devices);
    } catch (error) {
        console.error('❌ Error fetching devices:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: '/api/devices'
            },
            { status: 500 }
        );
    }
} 