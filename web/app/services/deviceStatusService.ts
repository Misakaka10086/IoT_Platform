import { DeviceStatus } from '../../types/device';
import { emqxApiService } from './emqxApiService';

export interface MqttDeviceData {
    device_id: string;
    chip: string;
    status: 'Online' | 'Offline';
    data?: Record<string, any>;
    timestamp?: string;
}

class DeviceStatusService {
    private devices: Map<string, DeviceStatus> = new Map();
    private listeners: Set<(devices: DeviceStatus[]) => void> = new Set();
    private emqxPollingInterval: NodeJS.Timeout | null = null;
    private isEmqxEnabled: boolean = false;

    // Initialize EMQX API service with MQTT host
    initEmqxApi(apiKey: string, secretKey: string, mqttHost: string) {
        if (apiKey && secretKey && mqttHost) {
            emqxApiService.init(apiKey, secretKey, mqttHost);
            this.isEmqxEnabled = true;
            this.startEmqxPolling();
        } else {
            this.isEmqxEnabled = false;
            this.stopEmqxPolling();
        }
    }

    // Start polling EMQX API for device statuses
    private startEmqxPolling() {
        if (this.emqxPollingInterval) {
            clearInterval(this.emqxPollingInterval);
        }

        // Poll every 10 seconds
        this.emqxPollingInterval = setInterval(async () => {
            if (this.isEmqxEnabled) {
                try {
                    const emqxStatuses = await emqxApiService.getDeviceStatuses();

                    // Clear existing statuses and update with EMQX data
                    // This ensures that devices that are no longer connected are removed
                    this.devices.clear();

                    // Update device statuses from EMQX
                    emqxStatuses.forEach(status => {
                        this.devices.set(status.device_id, status);
                    });

                    console.log(`🔄 EMQX polling: ${emqxStatuses.length} devices online`);
                    this.notifyListeners();
                } catch (error) {
                    console.error('Error polling EMQX API:', error);
                }
            }
        }, 10000);
    }

    // Stop EMQX polling
    private stopEmqxPolling() {
        if (this.emqxPollingInterval) {
            clearInterval(this.emqxPollingInterval);
            this.emqxPollingInterval = null;
        }
    }

    // Update device status from MQTT message
    updateDeviceStatus(mqttData: MqttDeviceData): void {
        const deviceStatus: DeviceStatus = {
            device_id: mqttData.device_id,
            status: mqttData.status === 'Online' ? 'online' : 'offline',
            last_seen: mqttData.timestamp || new Date().toISOString(),
            data: mqttData.data
        };

        console.log('🔄 Updating device status from MQTT:', deviceStatus);
        this.devices.set(mqttData.device_id, deviceStatus);
        this.notifyListeners();
    }

    // Update device status from EMQX API
    async updateDeviceStatusFromEmqx(deviceId: string): Promise<void> {
        if (!this.isEmqxEnabled) return;

        try {
            const status = await emqxApiService.getDeviceStatus(deviceId);
            if (status) {
                console.log('🔄 Updating device status from EMQX API:', status);
                this.devices.set(deviceId, status);
                this.notifyListeners();
            }
        } catch (error) {
            console.error('Error updating device status from EMQX:', error);
        }
    }

    // Get device status by ID
    getDeviceStatus(deviceId: string): DeviceStatus | undefined {
        return this.devices.get(deviceId);
    }

    // Get all device statuses
    getAllDeviceStatuses(): DeviceStatus[] {
        return Array.from(this.devices.values());
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

    private notifyListeners(): void {
        const devicesArray = Array.from(this.devices.values());
        console.log('📢 Notifying device status listeners with devices:', devicesArray.length);
        this.listeners.forEach(listener => listener(devicesArray));
    }

    // Clear all devices (useful for disconnection)
    clear(): void {
        this.devices.clear();
        this.notifyListeners();
    }

    // Test EMQX API connection
    async testEmqxConnection(): Promise<boolean> {
        if (!this.isEmqxEnabled) {
            return false;
        }
        return await emqxApiService.testConnection();
    }

    // Get EMQX configuration status
    isEmqxConfigured(): boolean {
        return this.isEmqxEnabled && emqxApiService.isConfigured();
    }

    // Manual refresh from EMQX API
    async refreshFromEmqx(): Promise<void> {
        if (!this.isEmqxEnabled) return;

        try {
            const emqxStatuses = await emqxApiService.getDeviceStatuses();

            // Clear existing statuses and update with EMQX data
            this.devices.clear();
            emqxStatuses.forEach(status => {
                this.devices.set(status.device_id, status);
            });

            console.log(`✅ Manual refresh: ${emqxStatuses.length} devices online`);
            this.notifyListeners();
        } catch (error) {
            console.error('Error refreshing from EMQX API:', error);
        }
    }
}

export const deviceStatusService = new DeviceStatusService(); 