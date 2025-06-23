import { DeviceStatus } from '../../types/device';
import { DeviceConnectionEvent } from '../../types/emqx-webhook';
import { deviceStatusEventService } from './deviceStatusEventService';

export interface MqttDeviceData {
    device_id: string;
    chip: string;
    status: 'Online' | 'Offline';
    data?: Record<string, any>;
    timestamp?: string;
}

class DeviceStatusService {
    private listeners: Set<(devices: DeviceStatus[]) => void> = new Set();

    // Update device status from WebHook event
    updateDeviceStatusFromWebhook(event: DeviceConnectionEvent): void {
        console.log('🔄 Processing WebHook event:', event);
        deviceStatusEventService.updateDeviceStatusFromWebhook(event);
        this.notifyListeners();
    }

    // Update device status from MQTT message (for backward compatibility)
    updateDeviceStatus(mqttData: MqttDeviceData): void {
        console.log('🔄 Processing MQTT device data:', mqttData);
        deviceStatusEventService.updateDeviceStatusFromMqtt(
            mqttData.device_id,
            mqttData.status === 'Online' ? 'online' : 'offline',
            mqttData.data
        );
        this.notifyListeners();
    }

    // Get device status by ID
    getDeviceStatus(deviceId: string): DeviceStatus | undefined {
        return deviceStatusEventService.getDeviceStatus(deviceId);
    }

    // Get all device statuses
    getAllDeviceStatuses(): DeviceStatus[] {
        return deviceStatusEventService.getAllDeviceStatuses();
    }

    // Subscribe to device status changes
    subscribe(callback: (devices: DeviceStatus[]) => void): () => void {
        this.listeners.add(callback);
        // Immediately call with current devices
        callback(deviceStatusEventService.getAllDeviceStatuses());

        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);
        };
    }

    private notifyListeners(): void {
        const devicesArray = deviceStatusEventService.getAllDeviceStatuses();
        console.log('📢 Notifying device status listeners with devices:', devicesArray.length);
        this.listeners.forEach(listener => listener(devicesArray));
    }

    // Clear all devices (useful for disconnection)
    clear(): void {
        deviceStatusEventService.clear();
        this.notifyListeners();
    }

    // Get connected SSE clients count
    getConnectedClientsCount(): number {
        return deviceStatusEventService.getConnectedClientsCount();
    }
}

export const deviceStatusService = new DeviceStatusService(); 