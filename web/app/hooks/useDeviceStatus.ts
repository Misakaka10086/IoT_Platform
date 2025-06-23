'use client';

import { useState, useEffect, useCallback } from 'react';
import { DeviceStatus } from '../../types/device';
import { pusherClientService, DeviceStatusUpdate, DeviceConnectionEvent } from '../services/pusherClientService';

interface UseDeviceStatusReturn {
    devices: DeviceStatus[];
    loading: boolean;
    error: string | null;
    pusherConnected: boolean;
    refreshDevices: () => Promise<void>;
    updateDeviceStatus: (deviceId: string, status: 'online' | 'offline') => Promise<void>;
}

export function useDeviceStatus(): UseDeviceStatusReturn {
    const [devices, setDevices] = useState<DeviceStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pusherConnected, setPusherConnected] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize Pusher client
    useEffect(() => {
        const initializePusher = async () => {
            try {
                // Get Pusher config from API
                const response = await fetch('/api/pusher/config');
                const data = await response.json();

                if (data.success) {
                    pusherClientService.initialize(data.config);

                    // Set up connection status monitoring
                    const checkConnectionStatus = () => {
                        const connected = pusherClientService.isClientConnected();
                        setPusherConnected(connected);
                    };

                    // Initial check
                    checkConnectionStatus();

                    // Set up interval to monitor connection status
                    const interval = setInterval(checkConnectionStatus, 1000);

                    // Subscribe to device status updates
                    pusherClientService.subscribeToDeviceStatus(
                        (statusUpdate: DeviceStatusUpdate) => {
                            console.log('📡 Received status update:', statusUpdate);
                            setDevices(prevDevices => {
                                const updatedDevices = prevDevices.map(device =>
                                    device.device_id === statusUpdate.device_id
                                        ? {
                                            ...device,
                                            status: statusUpdate.status,
                                            last_seen: statusUpdate.timestamp,
                                            data: { ...device.data, ...statusUpdate.data }
                                        }
                                        : device
                                );

                                // If device doesn't exist, add it
                                if (!updatedDevices.find(d => d.device_id === statusUpdate.device_id)) {
                                    updatedDevices.push({
                                        device_id: statusUpdate.device_id,
                                        status: statusUpdate.status,
                                        last_seen: statusUpdate.timestamp,
                                        data: statusUpdate.data || {}
                                    });
                                }

                                return updatedDevices;
                            });
                        },
                        (error) => {
                            console.error('❌ Pusher status subscription error:', error);
                            setError('Failed to subscribe to device status updates');
                        }
                    );

                    // Subscribe to device connection events
                    pusherClientService.subscribeToDeviceEvents(
                        (connectedEvent: DeviceConnectionEvent) => {
                            console.log('📡 Device connected:', connectedEvent);
                            // Status update will be handled by status subscription
                        },
                        (disconnectedEvent: DeviceConnectionEvent) => {
                            console.log('📡 Device disconnected:', disconnectedEvent);
                            // Status update will be handled by status subscription
                        },
                        (error) => {
                            console.error('❌ Pusher events subscription error:', error);
                            setError('Failed to subscribe to device events');
                        }
                    );

                    setIsInitialized(true);

                    // Return cleanup function
                    return () => clearInterval(interval);
                } else {
                    console.error('❌ Failed to get Pusher config:', data.error);
                    setError('Failed to initialize real-time connection');
                    setIsInitialized(true);
                }
            } catch (err) {
                console.error('❌ Error initializing Pusher:', err);
                setError('Failed to initialize real-time connection');
                setIsInitialized(true);
            }
        };

        const cleanup = initializePusher();

        // Cleanup on unmount
        return () => {
            cleanup?.then(clearInterval => clearInterval?.());
            // 不要在这里调用 disconnect，让连接保持活跃
        };
    }, []);

    // Fetch devices from API
    const fetchDevices = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/devices/status');
            const data = await response.json();

            if (data.success) {
                setDevices(data.devices);
            } else {
                setError(data.error || 'Failed to fetch devices');
            }
        } catch (err) {
            console.error('❌ Error fetching devices:', err);
            setError('Failed to fetch devices');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch - 等待 Pusher 初始化完成后再获取数据
    useEffect(() => {
        if (isInitialized) {
            fetchDevices();
        }
    }, [isInitialized, fetchDevices]);

    // Update device status
    const updateDeviceStatus = useCallback(async (deviceId: string, status: 'online' | 'offline') => {
        try {
            const response = await fetch('/api/devices/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    device_id: deviceId,
                    status,
                    data: { manual_update: true }
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Update local state
                setDevices(prevDevices =>
                    prevDevices.map(device =>
                        device.device_id === deviceId
                            ? { ...device, status, last_seen: new Date().toISOString() }
                            : device
                    )
                );
            } else {
                setError(data.error || 'Failed to update device status');
            }
        } catch (err) {
            console.error('❌ Error updating device status:', err);
            setError('Failed to update device status');
        }
    }, []);

    // Refresh devices
    const refreshDevices = useCallback(async () => {
        await fetchDevices();
    }, [fetchDevices]);

    return {
        devices,
        loading,
        error,
        pusherConnected,
        refreshDevices,
        updateDeviceStatus,
    };
} 