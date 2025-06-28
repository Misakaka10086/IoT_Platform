import Pusher, { Channel } from 'pusher-js';
import {
    PusherClientConfig,
    DeviceStatusUpdate,
    DeviceConnectionEvent,
    DeviceOTAProgressUpdate,
    DeviceOTAEvent,
    PusherChannelStatus,
    DeviceStatusUpdateHandler,
    DeviceConnectionEventHandler,
    DeviceOTAProgressUpdateHandler,
    DeviceOTAEventHandler,
    PusherErrorHandler
} from '../../types/pusher-types';

class PusherClientService {
    private pusher: Pusher | null = null;
    private deviceStatusChannel: Channel | null = null;
    private deviceEventsChannel: Channel | null = null;

    private deviceOTAProcessChannel: Channel | null = null;
    private deviceOTAResultChannel: Channel | null = null;

    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;

    public getPusherInstance(): Pusher | null {
        return this.pusher;
    }

    // 初始化 Pusher 客户端
    initialize(config: PusherClientConfig): void {
        if (this.pusher) {
            console.log('📡 Pusher client already initialized');
            return;
        }

        this.pusher = new Pusher(config.key, {
            cluster: config.cluster,
            forceTLS: config.forceTLS ?? true,
            enabledTransports: ['ws', 'wss'],
            disabledTransports: ['xhr_streaming', 'xhr_polling']
        });

        this.setupEventHandlers();
        console.log('📡 Pusher client initialized');
    }

    // 设置事件处理器
    private setupEventHandlers(): void {
        if (!this.pusher) return;

        this.pusher.connection.bind('connected', () => {
            console.log('✅ Pusher client connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
        });

        this.pusher.connection.bind('disconnected', () => {
            console.log('❌ Pusher client disconnected');
            this.isConnected = false;
        });

        this.pusher.connection.bind('error', (error: any) => {
            console.error('❌ Pusher connection error:', error);
            this.handleReconnection();
        });

        this.pusher.connection.bind('reconnecting', () => {
            console.log('🔄 Pusher client reconnecting...');
        });
    }

    // 处理重连
    private handleReconnection(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            if (this.pusher) {
                this.pusher.connect();
            }
        }, delay);
    }

    // 订阅设备状态频道
    subscribeToDeviceStatus(
        onStatusUpdate: DeviceStatusUpdateHandler,
        onError?: PusherErrorHandler
    ): void {
        if (!this.pusher) {
            console.error('❌ Pusher client not initialized');
            return;
        }

        this.deviceStatusChannel = this.pusher.subscribe('device-status');

        this.deviceStatusChannel.bind('status-update', (data: DeviceStatusUpdate) => {
            console.log('📡 Received device status update:', data);
            onStatusUpdate(data);
        });

        this.deviceStatusChannel.bind('pusher:subscription_error', (error: any) => {
            console.error('❌ Device status subscription error:', error);
            onError?.(error);
        });

        console.log('📡 Subscribed to device-status channel');
    }

    // 订阅设备事件频道
    subscribeToDeviceEvents(
        onDeviceConnected: DeviceConnectionEventHandler,
        onDeviceDisconnected: DeviceConnectionEventHandler,
        onError?: PusherErrorHandler
    ): void {
        if (!this.pusher) {
            console.error('❌ Pusher client not initialized');
            return;
        }

        this.deviceEventsChannel = this.pusher.subscribe('device-events');

        this.deviceEventsChannel.bind('device-connected', (data: DeviceConnectionEvent) => {
            console.log('📡 Received device connected event:', data);
            onDeviceConnected(data);
        });

        this.deviceEventsChannel.bind('device-disconnected', (data: DeviceConnectionEvent) => {
            console.log('📡 Received device disconnected event:', data);
            onDeviceDisconnected(data);
        });

        this.deviceEventsChannel.bind('pusher:subscription_error', (error: any) => {
            console.error('❌ Device events subscription error:', error);
            onError?.(error);
        });

        console.log('📡 Subscribed to device-events channel');
    }

    // 订阅设备OTA状态频道
    subscribeToDeviceOTAStatus(
        onStatusUpdate: DeviceOTAProgressUpdateHandler,
        onError?: PusherErrorHandler
    ): void {
        if (!this.pusher) {
            console.error('❌ Pusher client not initialized');
            return;
        }

        this.deviceOTAProcessChannel = this.pusher.subscribe('device-ota-status');

        this.deviceOTAProcessChannel.bind('progress-update', (data: DeviceOTAProgressUpdate) => {
            console.log('📡 Received device OTA status update:', data);
            onStatusUpdate(data);
        });

        this.deviceOTAProcessChannel.bind('pusher:subscription_error', (error: any) => {
            console.error('❌ Device OTA status subscription error:', error);
            onError?.(error);
        });

        console.log('📡 Subscribed to device-ota-status channel');
    }

    // 订阅设备OTA事件频道
    subscribeToDeviceOTAEvents(
        onDeviceOTASuccess: DeviceOTAEventHandler,
        onDeviceOTAError: DeviceOTAEventHandler,
        onError?: PusherErrorHandler
    ): void {
        if (!this.pusher) {
            console.error('❌ Pusher client not initialized');
            return;
        }

        this.deviceOTAResultChannel = this.pusher.subscribe('device-ota-events');

        this.deviceOTAResultChannel.bind('ota-success', (data: DeviceOTAEvent) => {
            console.log('📡 Received device OTA success event:', data);
            onDeviceOTASuccess(data);
        });

        this.deviceOTAResultChannel.bind('ota-error', (data: DeviceOTAEvent) => {
            console.log('📡 Received device OTA error event:', data);
            onDeviceOTAError(data);
        });

        this.deviceOTAResultChannel.bind('pusher:subscription_error', (error: any) => {
            console.error('❌ Device OTA events subscription error:', error);
            onError?.(error);
        });

        console.log('📡 Subscribed to device-ota-events channel');
    }

    // 取消订阅设备状态频道
    unsubscribeFromDeviceStatus(): void {
        if (this.deviceStatusChannel) {
            this.pusher?.unsubscribe('device-status');
            this.deviceStatusChannel = null;
            console.log('📡 Unsubscribed from device-status channel');
        }
    }

    // 取消订阅设备事件频道
    unsubscribeFromDeviceEvents(): void {
        if (this.deviceEventsChannel) {
            this.pusher?.unsubscribe('device-events');
            this.deviceEventsChannel = null;
            console.log('📡 Unsubscribed from device-events channel');
        }
    }

    // 取消订阅设备OTA状态频道
    unsubscribeFromDeviceOTAStatus(): void {
        if (this.deviceOTAProcessChannel) {
            this.pusher?.unsubscribe('device-ota-status');
            this.deviceOTAProcessChannel = null;
            console.log('📡 Unsubscribed from device-ota-status channel');
        }
    }

    // 取消订阅设备OTA事件频道
    unsubscribeFromDeviceOTAEvents(): void {
        if (this.deviceOTAResultChannel) {
            this.pusher?.unsubscribe('device-ota-events');
            this.deviceOTAResultChannel = null;
            console.log('📡 Unsubscribed from device-ota-events channel');
        }
    }

    // 获取连接状态
    getConnectionState(): string {
        return this.pusher?.connection.state || 'disconnected';
    }

    // 检查客户端是否已连接
    isClientConnected(): boolean {
        return this.isConnected;
    }

    // 断开连接
    disconnect(): void {
        if (this.pusher) {
            this.pusher.disconnect();
            this.pusher = null;
            this.isConnected = false;
            console.log('📡 Pusher client disconnected');
        }
    }

    // 重新连接
    reconnect(): void {
        if (this.pusher) {
            this.pusher.connect();
            console.log('📡 Pusher client reconnecting...');
        }
    }

    // 获取频道信息
    getChannelInfo(): PusherChannelStatus {
        return {
            deviceStatus: !!this.deviceStatusChannel,
            deviceEvents: !!this.deviceEventsChannel,
            deviceOTAStatus: !!this.deviceOTAProcessChannel,
            deviceOTAEvents: !!this.deviceOTAResultChannel,
        };
    }
}

// 创建单例实例
export const pusherClientService = new PusherClientService(); 