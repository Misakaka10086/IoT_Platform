import { DeviceStatus } from '../../types/device';
import { DeviceConnectionEvent } from '../../types/emqx-webhook';

interface EventSourceClient {
    id: string;
    send: (data: string) => void;
    close: () => void;
}

class DeviceStatusEventService {
    private clients: Map<string, EventSourceClient> = new Map();
    private deviceStatuses: Map<string, DeviceStatus> = new Map();
    private clientCounter = 0;

    // Add a new SSE client
    addClient(): EventSourceClient {
        const clientId = `client_${++this.clientCounter}`;

        const client: EventSourceClient = {
            id: clientId,
            send: (data: string) => {
                // This will be implemented by the SSE handler
                console.log(`📡 Sending to client ${clientId}:`, data);
            },
            close: () => {
                this.removeClient(clientId);
            }
        };

        this.clients.set(clientId, client);
        console.log(`📡 New SSE client connected: ${clientId}, total clients: ${this.clients.size}`);

        // Send initial device statuses
        const initialData = Array.from(this.deviceStatuses.values());
        client.send(`data: ${JSON.stringify({ type: 'initial', devices: initialData })}\n\n`);

        return client;
    }

    // Remove a client
    removeClient(clientId: string): void {
        this.clients.delete(clientId);
        console.log(`📡 SSE client disconnected: ${clientId}, remaining clients: ${this.clients.size}`);
    }

    // Update device status from WebHook event
    updateDeviceStatusFromWebhook(event: DeviceConnectionEvent): void {
        const deviceStatus: DeviceStatus = {
            device_id: event.device_id,
            status: event.event === 'connected' ? 'online' : 'offline',
            last_seen: new Date(event.timestamp).toISOString(),
            data: {
                ...event.data,
                reason: event.reason,
                event_type: event.event,
                timestamp: event.timestamp
            }
        };

        console.log(`📱 Updating device status from WebHook:`, deviceStatus);

        // Update internal status
        this.deviceStatuses.set(event.device_id, deviceStatus);

        // Broadcast to all connected clients
        this.broadcastDeviceUpdate(deviceStatus);
    }

    // Update device status from MQTT message (for backward compatibility)
    updateDeviceStatusFromMqtt(deviceId: string, status: 'online' | 'offline', data?: Record<string, any>): void {
        const deviceStatus: DeviceStatus = {
            device_id: deviceId,
            status,
            last_seen: new Date().toISOString(),
            data
        };

        console.log(`📱 Updating device status from MQTT:`, deviceStatus);

        // Update internal status
        this.deviceStatuses.set(deviceId, deviceStatus);

        // Broadcast to all connected clients
        this.broadcastDeviceUpdate(deviceStatus);
    }

    // Broadcast device update to all connected clients
    private broadcastDeviceUpdate(deviceStatus: DeviceStatus): void {
        const message = `data: ${JSON.stringify({ type: 'device_update', device: deviceStatus })}\n\n`;

        this.clients.forEach((client, clientId) => {
            try {
                client.send(message);
            } catch (error) {
                console.error(`❌ Error sending to client ${clientId}:`, error);
                this.removeClient(clientId);
            }
        });
    }

    // Get current device statuses
    getAllDeviceStatuses(): DeviceStatus[] {
        return Array.from(this.deviceStatuses.values());
    }

    // Get specific device status
    getDeviceStatus(deviceId: string): DeviceStatus | undefined {
        return this.deviceStatuses.get(deviceId);
    }

    // Clear all device statuses
    clear(): void {
        this.deviceStatuses.clear();
        const message = `data: ${JSON.stringify({ type: 'clear' })}\n\n`;

        this.clients.forEach((client, clientId) => {
            try {
                client.send(message);
            } catch (error) {
                console.error(`❌ Error sending clear to client ${clientId}:`, error);
                this.removeClient(clientId);
            }
        });
    }

    // Get connected clients count
    getConnectedClientsCount(): number {
        return this.clients.size;
    }
}

export const deviceStatusEventService = new DeviceStatusEventService(); 