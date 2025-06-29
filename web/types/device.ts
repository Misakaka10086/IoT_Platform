export interface Device {
    id: number;
    device_id: string;
    chip: string;
    git_version: string;
    registered_at: string;
    last_seen: string | null;
    description: string | null;
}

export interface DeviceInfo extends Device {
    online: boolean;
}
export interface GitVersion {
    id: number;
    device_id: string;
    version: string;
    created_at: string;
}
export interface DeviceProfile {
    id: number;
    model: string;
    default_config: Record<string, any>;
    created_at: string;
}

export interface ConfigVersion {
    id: number;
    device_id: string;
    version: string;
    git_version: string;
    config: Record<string, any>;
    created_at: string;
}

export interface DeviceConfig {
    id: number;
    device_id: string;
    version: string;
    git_version: string;
    updated_at: string;
}

export interface DeviceRegistrationRequest {
    device_id: string;
    chip: string;
    board: string;
    git_version: string;
}

export interface DeviceRegistrationResponse {
    version: string;
    config: Record<string, any>;
}

export interface DeviceStatus {
    device_id: string;
    status: 'online' | 'offline';
    last_seen: string;
    data?: Record<string, any>;
}

export interface SetVersionRequest {
    version: string;
}