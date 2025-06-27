import Pusher from 'pusher';

export interface PusherEventData {
    device_id: string;
    timestamp: string;
    data?: Record<string, any>;
}

export interface DeviceStatusEventData extends PusherEventData {
    status: 'online' | 'offline';
}

export interface DeviceConnectionEventData extends PusherEventData {
    event_type: 'connected' | 'disconnected';
    reason?: string;
}

export interface DeviceOTAProgressUpdateData {
    device_id: string;
    status: string;
}

export interface DeviceOTAResultData {
    device_id: string;
    status: 'success' | 'error';

}


class PusherService {
    private pusher: Pusher;

    constructor() {
        this.pusher = new Pusher({
            appId: process.env.PUSHER_APP_ID!,
            key: process.env.PUSHER_KEY!,
            secret: process.env.PUSHER_SECRET!,
            cluster: process.env.PUSHER_CLUSTER!,
            useTLS: true
        });

        console.log('📡 Pusher service initialized');
    }

    // 触发设备状态更新事件
    async triggerDeviceStatusUpdate(deviceId: string, status: 'online' | 'offline', data?: Record<string, any>): Promise<void> {
        try {
            const eventData: DeviceStatusEventData = {
                device_id: deviceId,
                status,
                timestamp: new Date().toISOString(),
                data
            };

            await this.pusher.trigger('device-status', 'status-update', eventData);

            console.log(`📡 Pusher: Device ${deviceId} status updated to ${status}`);
        } catch (error) {
            console.error('❌ Pusher trigger error:', error);
            throw error;
        }
    }

    // 触发设备连接事件
    async triggerDeviceConnected(deviceId: string, data: Record<string, any>): Promise<void> {
        try {
            const eventData: DeviceConnectionEventData = {
                device_id: deviceId,
                event_type: 'connected',
                timestamp: new Date().toISOString(),
                data
            };

            await this.pusher.trigger('device-events', 'device-connected', eventData);

            console.log(`📡 Pusher: Device ${deviceId} connected event triggered`);
        } catch (error) {
            console.error('❌ Pusher trigger error:', error);
            throw error;
        }
    }

    // 触发设备断开事件
    async triggerDeviceDisconnected(deviceId: string, reason: string, data: Record<string, any>): Promise<void> {
        try {
            const eventData: DeviceConnectionEventData = {
                device_id: deviceId,
                event_type: 'disconnected',
                reason,
                timestamp: new Date().toISOString(),
                data
            };

            await this.pusher.trigger('device-events', 'device-disconnected', eventData);

            console.log(`📡 Pusher: Device ${deviceId} disconnected event triggered (reason: ${reason})`);
        } catch (error) {
            console.error('❌ Pusher trigger error:', error);
            throw error;
        }
    }

    // 批量触发设备状态更新
    async batchTriggerDeviceStatusUpdates(updates: Array<{ deviceId: string, status: 'online' | 'offline', data?: Record<string, any> }>): Promise<void> {
        try {
            const promises = updates.map(update =>
                this.triggerDeviceStatusUpdate(update.deviceId, update.status, update.data)
            );

            await Promise.all(promises);

            console.log(`📡 Pusher: Batch triggered ${updates.length} device status updates`);
        } catch (error) {
            console.error('❌ Pusher batch trigger error:', error);
            throw error;
        }
    }
    // 触发OTA进度更新
    async triggerDeviceOTAProgressUpdate(deviceId: string, status: string): Promise<void> {
        try {
            const eventData: DeviceOTAProgressUpdateData = {
                device_id: deviceId,
                status
            };

            await this.pusher.trigger('device-ota-status', 'progress-update', eventData);

            console.log(`📡 Pusher: Device ${deviceId} ota progress update to ${status}`);
        } catch (error) {
            console.error('❌ Pusher trigger error:', error);
            throw error;
        }
    }
    // 触发OTA结果更新成功
    async triggerDeviceOTASuccess(deviceId: string): Promise<void> {
        try {
            const eventData: DeviceOTAResultData = {
                device_id: deviceId,
                status: "success"
            };

            await this.pusher.trigger('device-ota-events', 'ota-success', eventData);

            console.log(`📡 Pusher: Device ${deviceId} ota result update to success`);
        } catch (error) {
            console.error('❌ Pusher trigger error:', error);
            throw error;
        }
    }
    // 触发OTA结果更新失败
    async triggerDeviceOTAError(deviceId: string): Promise<void> {
        try {
            const eventData: DeviceOTAResultData = {
                device_id: deviceId,
                status: "error"
            };

            await this.pusher.trigger('device-ota-events', 'ota-error', eventData);

            console.log(`📡 Pusher: Device ${deviceId} ota result update to error`);
        } catch (error) {
            console.error('❌ Pusher trigger error:', error);
            throw error;
        }
    }
    // 获取应用信息
    async getAppInfo(): Promise<any> {
        try {
            return await this.pusher.get({ path: '/apps' });
        } catch (error) {
            console.error('❌ Pusher get app info error:', error);
            throw error;
        }
    }

    // 测试连接
    async testConnection(): Promise<boolean> {
        try {
            await this.getAppInfo();
            console.log('✅ Pusher connection test successful');
            return true;
        } catch (error) {
            console.error('❌ Pusher connection test failed:', error);
            return false;
        }
    }

    // 获取配置信息（不包含敏感信息）
    getConfig(): { key: string; cluster: string } {
        return {
            key: process.env.PUSHER_KEY!,
            cluster: process.env.PUSHER_CLUSTER!
        };
    }
}

export const pusherService = new PusherService(); 