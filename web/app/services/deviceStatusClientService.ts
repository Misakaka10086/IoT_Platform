import { DeviceStatus } from '../../types/device';

interface SSEEvent {
    type: string;
    devices?: DeviceStatus[];
    device?: DeviceStatus;
    message?: string;
}

class DeviceStatusClientService {
    private eventSource: EventSource | null = null;
    private listeners: Set<(devices: DeviceStatus[]) => void> = new Set();
    private devices: Map<string, DeviceStatus> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // Start with 1 second

    // Connect to SSE stream
    connect(): void {
        if (this.eventSource) {
            this.disconnect();
        }

        console.log('📡 Connecting to device status SSE stream...');

        try {
            this.eventSource = new EventSource('/api/device-status-stream');

            this.eventSource.onopen = () => {
                console.log('✅ SSE connection established');
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data: SSEEvent = JSON.parse(event.data);
                    this.handleSSEMessage(data);
                } catch (error) {
                    console.error('❌ Error parsing SSE message:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('❌ SSE connection error:', error);
                this.handleConnectionError();
            };

        } catch (error) {
            console.error('❌ Failed to create SSE connection:', error);
        }
    }

    // Handle SSE messages
    private handleSSEMessage(data: SSEEvent): void {
        switch (data.type) {
            case 'connected':
                console.log('📡 SSE connected:', data.message);
                break;

            case 'initial':
                if (data.devices) {
                    console.log('📡 Received initial devices:', data.devices.length);
                    this.devices.clear();
                    data.devices.forEach(device => {
                        this.devices.set(device.device_id, device);
                    });
                    this.notifyListeners();
                }
                break;

            case 'device_update':
                if (data.device) {
                    console.log('📡 Device status update:', data.device);
                    this.devices.set(data.device.device_id, data.device);
                    this.notifyListeners();
                }
                break;

            case 'clear':
                console.log('📡 Clearing all device statuses');
                this.devices.clear();
                this.notifyListeners();
                break;

            default:
                console.log('📡 Unknown SSE message type:', data.type);
        }
    }

    // Handle connection errors and implement reconnection
    private handleConnectionError(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 SSE reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

            setTimeout(() => {
                this.connect();
                this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Exponential backoff, max 30s
            }, this.reconnectDelay);
        } else {
            console.error('❌ Max SSE reconnection attempts reached');
        }
    }

    // Disconnect from SSE stream
    disconnect(): void {
        if (this.eventSource) {
            console.log('📡 Disconnecting from SSE stream');
            this.eventSource.close();
            this.eventSource = null;
        }
        this.devices.clear();
        this.notifyListeners();
    }

    // Subscribe to device status changes
    subscribe(callback: (devices: DeviceStatus[]) => void): () => void {
        this.listeners.add(callback);
        // Immediately call with current devices
        callback(Array.from(this.devices.values()));

        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);
        };
    }

    // Get all device statuses
    getAllDeviceStatuses(): DeviceStatus[] {
        return Array.from(this.devices.values());
    }

    // Get specific device status
    getDeviceStatus(deviceId: string): DeviceStatus | undefined {
        return this.devices.get(deviceId);
    }

    // Check if connected
    isConnected(): boolean {
        return this.eventSource?.readyState === EventSource.OPEN;
    }

    private notifyListeners(): void {
        const devicesArray = Array.from(this.devices.values());
        console.log('📢 Notifying client listeners with devices:', devicesArray.length);
        this.listeners.forEach(listener => listener(devicesArray));
    }
}

export const deviceStatusClientService = new DeviceStatusClientService(); 