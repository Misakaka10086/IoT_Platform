import { DeviceStatus } from '../../types/device';

export interface EmqxClient {
    clientid: string;
    username: string | null;
    connected: boolean;
    connected_at: string;
    created_at: string;
    ip_address: string;
    port: number;
    keepalive: number;
    proto_ver: number;
    proto_name: string;
    clean_start: boolean;
    expiry_interval: number;
    mountpoint: string;
    subscriptions_cnt: number;
    subscriptions_max: string;
    inflight_cnt: number;
    inflight_max: number;
    mqueue_len: number;
    mqueue_max: number;
    mqueue_dropped: number;
    await_rel_cnt: number;
    await_rel_max: number;
    send_msg: number;
    send_msg_qos0: number;
    send_msg_qos1: number;
    send_msg_qos2: number;
    send_msg_dropped: number;
    send_msg_dropped_expired: number;
    send_msg_dropped_queue_full: number;
    send_msg_dropped_too_large: number;
    recv_msg: number;
    recv_msg_qos0: number;
    recv_msg_qos1: number;
    recv_msg_qos2: number;
    recv_msg_dropped: number;
    recv_msg_dropped_await_pubrel_timeout: number;
    send_pkt: number;
    recv_pkt: number;
    send_oct: number;
    recv_oct: number;
    send_cnt: number;
    recv_cnt: number;
    heap_size: number;
    reductions: number;
    mailbox_len: number;
    listener: string;
    peerport: number;
    is_bridge: boolean;
    is_persistent: boolean;
    durable: boolean;
    enable_authn: boolean;
    node: string;
}

export interface EmqxApiResponse {
    data: EmqxClient[];
    meta: {
        count: number;
        hasnext: boolean;
        limit: number;
        page: number;
    };
}

class EmqxApiService {
    private apiKey: string = '';
    private secretKey: string = '';
    private mqttHost: string = '';

    // Initialize API configuration with MQTT host
    init(apiKey: string, secretKey: string, mqttHost: string) {
        this.apiKey = apiKey;
        this.secretKey = secretKey;
        this.mqttHost = mqttHost;

        console.log('🔗 EMQX API configured with MQTT host:', {
            mqttHost,
            apiKey: apiKey ? '***' : 'not set',
            secretKey: secretKey ? '***' : 'not set'
        });
    }

    // Get all connected clients via proxy
    async getClients(): Promise<EmqxClient[]> {
        try {
            // Use our backend proxy to avoid CORS issues
            const params = new URLSearchParams({
                path: 'clients',
                apiKey: this.apiKey,
                secretKey: this.secretKey,
                host: this.mqttHost
            });

            const url = `/api/emqx?${params.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`EMQX API error: ${response.status} ${response.statusText}`);
            }

            const data: EmqxApiResponse = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching EMQX clients:', error);
            throw error;
        }
    }

    // Get device status from EMQX clients
    async getDeviceStatuses(): Promise<DeviceStatus[]> {
        try {
            const clients = await this.getClients();
            console.log(`📡 EMQX API: Found ${clients.length} total clients`);

            const esp32Clients = clients.filter(client => client.clientid.startsWith('ESP32-'));
            console.log(`📡 EMQX API: Found ${esp32Clients.length} ESP32 devices`);

            return esp32Clients
                .map(client => {
                    // Extract device ID from client ID (remove 'ESP32-' prefix)
                    const deviceId = client.clientid.replace('ESP32-', '');

                    return {
                        device_id: deviceId,
                        status: client.connected ? 'online' : 'offline',
                        last_seen: client.connected_at || client.created_at,
                        data: {
                            ip_address: client.ip_address,
                            port: client.port,
                            keepalive: client.keepalive,
                            proto_ver: client.proto_ver,
                            subscriptions_count: client.subscriptions_cnt,
                            connected_at: client.connected_at,
                            created_at: client.created_at,
                        }
                    };
                });
        } catch (error) {
            console.error('Error getting device statuses from EMQX:', error);
            return [];
        }
    }

    // Get status for specific device
    async getDeviceStatus(deviceId: string): Promise<DeviceStatus | null> {
        try {
            const clients = await this.getClients();
            const clientId = `ESP32-${deviceId}`;
            const client = clients.find(c => c.clientid === clientId);

            if (!client) {
                return null;
            }

            return {
                device_id: deviceId,
                status: client.connected ? 'online' : 'offline',
                last_seen: client.connected_at || client.created_at,
                data: {
                    ip_address: client.ip_address,
                    port: client.port,
                    keepalive: client.keepalive,
                    proto_ver: client.proto_ver,
                    subscriptions_count: client.subscriptions_cnt,
                    connected_at: client.connected_at,
                    created_at: client.created_at,
                }
            };
        } catch (error) {
            console.error('Error getting device status from EMQX:', error);
            return null;
        }
    }

    // Test API connection
    async testConnection(): Promise<boolean> {
        try {
            await this.getClients();
            return true;
        } catch (error) {
            console.error('EMQX API connection test failed:', error);
            return false;
        }
    }

    // Get API configuration status
    isConfigured(): boolean {
        return !!(this.apiKey && this.secretKey);
    }
}

export const emqxApiService = new EmqxApiService(); 