// ============================================================================
// Pusher Event Types - Centralized Type Definitions
// ============================================================================

// Base event data interface
export interface PusherEventData {
    device_id: string;
    timestamp: string;
    data?: Record<string, any>;
}

// ============================================================================
// Device Status Events
// ============================================================================

export interface DeviceStatusUpdate extends PusherEventData {
    status: 'online' | 'offline';
}

// Database-specific device status update interface
export interface DatabaseDeviceStatusUpdate {
    device_id: string;
    status: 'online' | 'offline';
    last_seen: Date;
    data?: Record<string, any>;
}

export interface DeviceConnectionEvent extends PusherEventData {
    event_type: 'connected' | 'disconnected';
    reason?: string;
}

// ============================================================================
// Device OTA Events
// ============================================================================

export interface DeviceOTAProgressUpdate extends PusherEventData {
    status: string; // Progress percentage or status message
}

export interface DeviceOTAEvent extends PusherEventData {
    status: 'success' | 'error';
    message?: string;
}

// ============================================================================
// Pusher Client Configuration
// ============================================================================

export interface PusherClientConfig {
    key: string;
    cluster: string;
    forceTLS?: boolean;
}

// ============================================================================
// Channel Subscription Status
// ============================================================================

export interface PusherChannelStatus {
    deviceStatus: boolean;
    deviceEvents: boolean;
    deviceOTAStatus: boolean;
    deviceOTAEvents: boolean;
}

// ============================================================================
// Event Handler Types
// ============================================================================

export type DeviceStatusUpdateHandler = (data: DeviceStatusUpdate) => void;
export type DeviceConnectionEventHandler = (data: DeviceConnectionEvent) => void;
export type DeviceOTAProgressUpdateHandler = (data: DeviceOTAProgressUpdate) => void;
export type DeviceOTAEventHandler = (data: DeviceOTAEvent) => void;
export type PusherErrorHandler = (error: any) => void;

// ============================================================================
// Service Response Types
// ============================================================================

export interface PusherServiceResponse {
    success: boolean;
    message?: string;
    error?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isDeviceStatusUpdate(obj: any): obj is DeviceStatusUpdate {
    return obj &&
        typeof obj.device_id === 'string' &&
        typeof obj.status === 'string' &&
        (obj.status === 'online' || obj.status === 'offline') &&
        typeof obj.timestamp === 'string';
}

export function isDeviceConnectionEvent(obj: any): obj is DeviceConnectionEvent {
    return obj &&
        typeof obj.device_id === 'string' &&
        typeof obj.event_type === 'string' &&
        (obj.event_type === 'connected' || obj.event_type === 'disconnected') &&
        typeof obj.timestamp === 'string';
}

export function isDeviceOTAProgressUpdate(obj: any): obj is DeviceOTAProgressUpdate {
    return obj &&
        typeof obj.device_id === 'string' &&
        typeof obj.status === 'string' &&
        typeof obj.timestamp === 'string';
}

export function isDeviceOTAEvent(obj: any): obj is DeviceOTAEvent {
    return obj &&
        typeof obj.device_id === 'string' &&
        typeof obj.status === 'string' &&
        (obj.status === 'success' || obj.status === 'error') &&
        typeof obj.timestamp === 'string';
} 