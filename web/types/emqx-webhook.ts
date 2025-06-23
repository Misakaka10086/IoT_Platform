export interface EmqxWebhookBase {
    event: string;
    timestamp: number;
    node: string;
    metadata?: {
        rule_id: string;
    };
}

export interface EmqxClientConnected extends EmqxWebhookBase {
    event: 'client.connected';
    clientid: string;
    username: string;
    connected_at: number;
    sockname: string;
    peername: string;
    proto_name: string;
    proto_ver: number;
    keepalive: number;
    clean_start: boolean;
    expiry_interval: number;
    mountpoint: string;
    is_bridge: boolean;
    receive_maximum: number;
    conn_props: {
        'User-Property': Record<string, any>;
    };
    client_attrs: Record<string, any>;
}

export interface EmqxClientDisconnected extends EmqxWebhookBase {
    event: 'client.disconnected';
    clientid: string;
    username: string;
    disconnected_at: number;
    sockname: string;
    peername: string;
    proto_name: string;
    proto_ver: number;
    reason: string;
    disconn_props: {
        'User-Property': Record<string, any>;
    };
    client_attrs: Record<string, any>;
}

export type EmqxWebhookEvent = EmqxClientConnected | EmqxClientDisconnected;

export interface DeviceConnectionEvent {
    device_id: string;
    event: 'connected' | 'disconnected';
    timestamp: number;
    reason?: string;
    data?: Record<string, any>;
} 