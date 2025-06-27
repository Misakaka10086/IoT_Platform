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

export interface EmqxMassagePublish extends EmqxWebhookBase {
    event: 'message.publish';
    clientid: string;
    username: string;
    topic: string;
    payload: string;
}

// 也可以放在 types/emqx-webhook.ts 文件中，方便复用

/**
 * 类型守卫函数，用于检查一个对象是否是合法的 EmqxMassagePublish 事件。
 * @param obj - 需要被检查的、任何类型的对象。
 * @returns 如果对象是 EmqxMassagePublish 类型，则返回 true，否则返回 false。
 */
export function isMessagePublishEvent(obj: any): obj is EmqxMassagePublish {
    // 1. 基础检查：确保 obj 是一个非 null 的对象。
    if (!obj || typeof obj !== 'object' || obj === null) {
        return false;
    }

    // 2. 检查可辨识的属性 'event'，这是最高效的区分方式。
    if (obj.event !== 'message.publish') {
        return false;
    }

    // 3. 逐一检查 EmqxMassagePublish 接口中定义的所有必需字段的类型。
    //    这样做可以防止请求体格式错误或不完整。
    const hasRequiredFields =
        typeof obj.clientid === 'string' &&
        typeof obj.username === 'string' &&
        typeof obj.topic === 'string' &&
        typeof obj.payload === 'string' &&
        typeof obj.timestamp === 'number' && // 从 EmqxWebhookBase 继承的字段
        typeof obj.node === 'string';      // 从 EmqxWebhookBase 继承的字段

    // 4. 只有所有检查都通过，才确认这是一个合法的事件对象。
    return hasRequiredFields;
}