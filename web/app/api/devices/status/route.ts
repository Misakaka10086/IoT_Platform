import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '../../../services/databaseService';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const deviceId = searchParams.get('device_id');

        if (deviceId) {
            // Get specific device status
            const deviceStatus = await databaseService.getDeviceStatus(deviceId);

            if (!deviceStatus) {
                return NextResponse.json(
                    { error: 'Device not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                device: deviceStatus
            });
        } else {
            // Get all device statuses
            const deviceStatuses = await databaseService.getAllDeviceStatuses();
            const onlineCount = await databaseService.getOnlineDeviceCount();
            const offlineCount = await databaseService.getOfflineDeviceCount();

            return NextResponse.json({
                success: true,
                devices: deviceStatuses,
                summary: {
                    total: deviceStatuses.length,
                    online: onlineCount,
                    offline: offlineCount
                }
            });
        }
    } catch (error) {
        console.error('❌ Error fetching device statuses:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { device_id, status, data } = body;

        if (!device_id || !status) {
            return NextResponse.json(
                { error: 'Missing required fields: device_id, status' },
                { status: 400 }
            );
        }

        if (!['online', 'offline'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be "online" or "offline"' },
                { status: 400 }
            );
        }

        const statusUpdate = {
            device_id,
            status: status as 'online' | 'offline',
            last_seen: new Date(),
            data
        };

        await databaseService.updateDeviceStatus(statusUpdate);

        return NextResponse.json({
            success: true,
            message: `Device ${device_id} status updated to ${status}`,
            device: statusUpdate
        });
    } catch (error) {
        console.error('❌ Error updating device status:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 