import { NextRequest, NextResponse } from 'next/server';
import { EmqxWebhookEvent, DeviceConnectionEvent } from '../../../../types/emqx-webhook';
import { deviceStatusService } from '../../../services/deviceStatusService';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('📨 Received EMQX WebHook:', JSON.stringify(body, null, 2));

        // Validate the webhook event
        const webhookEvent = body as EmqxWebhookEvent;

        if (!webhookEvent.event || !webhookEvent.clientid) {
            console.error('❌ Invalid WebHook event format:', body);
            return NextResponse.json(
                { error: 'Invalid WebHook event format' },
                { status: 400 }
            );
        }

        // Extract device ID from client ID (remove 'ESP32-' prefix)
        const deviceId = webhookEvent.clientid.replace('ESP32-', '');

        // Create device connection event
        const deviceEvent: DeviceConnectionEvent = {
            device_id: deviceId,
            event: webhookEvent.event === 'client.connected' ? 'connected' : 'disconnected',
            timestamp: webhookEvent.timestamp,
            reason: webhookEvent.event === 'client.disconnected' ? (webhookEvent as any).reason : undefined,
            data: {
                username: webhookEvent.username,
                sockname: webhookEvent.sockname,
                peername: webhookEvent.peername,
                proto_name: webhookEvent.proto_name,
                proto_ver: webhookEvent.proto_ver,
                node: webhookEvent.node,
                ...(webhookEvent.event === 'client.connected' && {
                    keepalive: (webhookEvent as any).keepalive,
                    clean_start: (webhookEvent as any).clean_start,
                    expiry_interval: (webhookEvent as any).expiry_interval,
                    mountpoint: (webhookEvent as any).mountpoint,
                    is_bridge: (webhookEvent as any).is_bridge,
                    receive_maximum: (webhookEvent as any).receive_maximum,
                })
            }
        };

        console.log('📱 Processing device event:', deviceEvent);

        // Update device status through the service
        deviceStatusService.updateDeviceStatusFromWebhook(deviceEvent);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('❌ Error processing WebHook:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 