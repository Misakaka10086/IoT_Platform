import { NextRequest, NextResponse } from 'next/server';
import { DeviceService } from '../../../../lib/deviceService';
import { DeviceRegistrationRequest } from '../../../../types/device';

export async function POST(request: NextRequest) {
    console.log('📝 POST /api/devices/register called:', {
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        contentType: request.headers.get('content-type'),
        method: 'POST'
    });

    try {
        console.log('🔍 Parsing request body...');
        const body: DeviceRegistrationRequest = await request.json();
        console.log('📦 Request body:', body);

        // Validate request body
        if (!body.device_id || !body.chip || !body.git_version) {
            console.log('❌ Validation failed: missing required fields');
            return NextResponse.json(
                {
                    error: 'Missing required fields: device_id, chip, and git_version',
                    receivedData: body,
                    timestamp: new Date().toISOString(),
                    endpoint: '/api/devices/register'
                },
                { status: 400 }
            );
        }

        console.log(`📱 Device registration request: ${body.device_id} (${body.chip}) - Git: ${body.git_version}`);

        // Handle device registration
        console.log('🔧 Processing device registration...');
        const response = await DeviceService.handleDeviceRegistration(body);

        console.log(`✅ Device registration successful: ${body.device_id}, version: ${response.version}`);

        return NextResponse.json({
            ...response,
            timestamp: new Date().toISOString(),
            endpoint: '/api/devices/register'
        });
    } catch (error) {
        console.error('❌ Device registration error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: '/api/devices/register'
            },
            { status: 500 }
        );
    }
} 