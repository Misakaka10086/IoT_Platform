import { NextRequest, NextResponse } from 'next/server';
import { EmqxWebhookEvent, DeviceConnectionEvent } from '../../../../types/emqx-webhook';
import { databaseService, DeviceStatusUpdate } from '../../../services/databaseService';
import { pusherService } from '../../../services/pusherService';

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
        // filter out non-IoT device
        if (!webhookEvent.clientid.startsWith('ESP32-')) {
            console.log(`📝 Ignoring non-IoT device: ${webhookEvent.clientid}`);
            return NextResponse.json({
                success: true,
                message: 'Non-IoT device ignored',
                device_id: webhookEvent.clientid
            });
        }
        //filter out events where the reason is 'discarded'
        if ((webhookEvent as any).reason === 'discarded') {
            console.log(`🗑️ Ignoring discarded event: ${webhookEvent.clientid}`);
            return NextResponse.json({
                success: true,
                message: 'Discarded event ignored',
                device_id: webhookEvent.clientid
            });
        }

        // Extract device ID from client ID (remove 'ESP32-' prefix)
        const deviceId = webhookEvent.clientid.replace('ESP32-', '');
        const isConnected = webhookEvent.event === 'client.connected';
        const status: 'online' | 'offline' = isConnected ? 'online' : 'offline';

        // Create device connection event
        const deviceEvent: DeviceConnectionEvent = {
            device_id: deviceId,
            event: isConnected ? 'connected' : 'disconnected',
            timestamp: webhookEvent.timestamp,
            reason: !isConnected ? (webhookEvent as any).reason : undefined,
            data: {
                username: webhookEvent.username,
                sockname: webhookEvent.sockname,
                peername: webhookEvent.peername,
                proto_name: webhookEvent.proto_name,
                proto_ver: webhookEvent.proto_ver,
                node: webhookEvent.node,
                ...(isConnected && {
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

        // Update database
        const statusUpdate: DeviceStatusUpdate = {
            device_id: deviceId,
            status,
            last_seen: new Date(),
            data: deviceEvent.data
        };

        try {
            // Update database first
            await databaseService.updateDeviceStatus(statusUpdate);
            console.log(`📊 Database updated for device ${deviceId}`);

            // Then trigger Pusher event
            if (isConnected) {
                await pusherService.triggerDeviceConnected(deviceId, deviceEvent.data || {});
            } else {
                await pusherService.triggerDeviceDisconnected(
                    deviceId,
                    deviceEvent.reason || 'Unknown reason',
                    deviceEvent.data || {}
                );
            }

            // Also trigger status update event
            await pusherService.triggerDeviceStatusUpdate(deviceId, status, deviceEvent.data);

            console.log(`📡 Pusher events triggered for device ${deviceId}`);
        } catch (dbError) {
            console.error('❌ Database or Pusher error:', dbError);
            // Continue processing even if database/Pusher fails
        }

        return NextResponse.json({
            success: true,
            device_id: deviceId,
            status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error processing WebHook:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 