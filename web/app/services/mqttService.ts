import mqtt, { MqttClient } from 'mqtt';
import { deviceStatusService, MqttDeviceData } from './deviceStatusService';

export interface MqttConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
    clientId: string;
    useWebSocket?: boolean;
    path?: string; // Add path for WebSocket
    subscriptionTopic?: string; // Add subscription topic
}

class MqttService {
    private client: MqttClient | null = null;
    private connectionTimeout: NodeJS.Timeout | null = null;

    connect(config: MqttConfig): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('Attempting to connect to MQTT broker...', config);

            // Determine the protocol and URL
            let protocol: 'ws' | 'wss' | 'mqtt' = 'mqtt';
            if (config.useWebSocket) {
                // If port is 443, always use wss. Otherwise, infer from page protocol.
                if (config.port === 443) {
                    protocol = 'wss';
                } else {
                    protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
                }
            }
            const url = `${protocol}://${config.host}:${config.port}${config.path || '/mqtt'}`;
            console.log('Connection URL:', url);

            const options = {
                clientId: config.clientId,
                username: config.username || undefined,
                password: config.password || undefined,
                clean: true,
                reconnectPeriod: 0, // Disable auto-reconnect for now
                connectTimeout: 20000, // Increase timeout to 20 seconds
                keepalive: 60,
                path: config.path || '/mqtt',
            };

            console.log('MQTT connection options:', options);

            try {
                this.client = mqtt.connect(url, options);
                console.log('MQTT client created');

                // Set up connection timeout
                this.connectionTimeout = setTimeout(() => {
                    console.error('MQTT connection timeout');
                    if (this.client) {
                        this.client.end();
                    }
                    reject(new Error('Connection timeout after 10 seconds'));
                }, 10000);

                this.client.on('connect', () => {
                    console.log('✅ Successfully connected to MQTT broker');
                    if (this.connectionTimeout) {
                        clearTimeout(this.connectionTimeout);
                        this.connectionTimeout = null;
                    }
                    const topic = config.subscriptionTopic || 'device/+/status';
                    this.client!.subscribe(topic, (err) => {
                        if (err) {
                            console.error(`Failed to subscribe to ${topic}:`, err);
                        } else {
                            console.log(`✅ Subscribed to ${topic}`);
                        }
                    });
                    resolve();
                });

                this.client.on('message', (topic, message) => {
                    console.log('📨 Received message on topic:', topic, 'Message:', message.toString());
                    try {
                        const deviceData: MqttDeviceData = JSON.parse(message.toString());
                        console.log('📱 Parsed device data:', deviceData);

                        // Update device status through the device status service
                        deviceStatusService.updateDeviceStatus(deviceData);
                    } catch (error) {
                        console.error('❌ Error parsing device message:', error);
                    }
                });

                this.client.on('error', (error) => {
                    console.error('❌ MQTT connection error:', error);
                    if (this.connectionTimeout) {
                        clearTimeout(this.connectionTimeout);
                        this.connectionTimeout = null;
                    }
                    reject(error);
                });

                this.client.on('close', () => {
                    console.log('🔌 MQTT connection closed');
                    if (this.connectionTimeout) {
                        clearTimeout(this.connectionTimeout);
                        this.connectionTimeout = null;
                    }
                });

                this.client.on('reconnect', () => {
                    console.log('🔄 MQTT attempting to reconnect...');
                });

                this.client.on('offline', () => {
                    console.log('📴 MQTT client went offline');
                });

            } catch (error) {
                console.error('❌ Failed to create MQTT client:', error);
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
                reject(error);
            }
        });
    }

    disconnect(): void {
        console.log('Disconnecting from MQTT broker...');
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        if (this.client) {
            this.client.end();
            this.client = null;
        }
        // Clear device statuses when disconnecting
        deviceStatusService.clear();
    }

    isConnected(): boolean {
        const connected = this.client?.connected || false;
        console.log('🔗 Connection status:', connected);
        return connected;
    }

    // Add method to test connection
    testConnection(config: MqttConfig): Promise<boolean> {
        return new Promise((resolve) => {
            console.log('🧪 Testing MQTT connection...');
            let protocol: 'ws' | 'wss' | 'mqtt' = 'mqtt';
            if (config.useWebSocket) {
                // If port is 443, always use wss. Otherwise, infer from page protocol.
                if (config.port === 443) {
                    protocol = 'wss';
                } else {
                    protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
                }
            }
            const testClient = mqtt.connect(`${protocol}://${config.host}:${config.port}${config.path || '/mqtt'}`, {
                clientId: `test_${Date.now()}`,
                username: config.username,
                password: config.password,
                connectTimeout: 20000, // Increase timeout to 20 seconds
                path: config.path || '/mqtt',
            });

            const timeout = setTimeout(() => {
                console.log('⏰ Test connection timeout');
                testClient.end();
                resolve(false);
            }, 5000);

            testClient.on('connect', () => {
                console.log('✅ Test connection successful');
                clearTimeout(timeout);
                testClient.end();
                resolve(true);
            });

            testClient.on('error', (error) => {
                console.log('❌ Test connection failed:', error.message);
                clearTimeout(timeout);
                testClient.end();
                resolve(false);
            });
        });
    }
}

export const mqttService = new MqttService(); 