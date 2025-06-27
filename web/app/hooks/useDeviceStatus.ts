'use client';

import { useState, useEffect, useCallback } from 'react';
import { DeviceStatus } from '../../types/device';
import {
    pusherClientService,
    DeviceStatusUpdate,
    DeviceConnectionEvent
} from '../services/pusherClientService';
import { usePusher } from '../context/PusherProvider';

interface UseDeviceStatusReturn {
    devices: DeviceStatus[];
    loading: boolean;
    error: string | null;
    pusherConnected: boolean;
    refreshDevices: () => Promise<void>;
    updateDeviceStatus: (deviceId: string, status: 'online' | 'offline') => Promise<void>;
}

export function useDeviceStatus(): UseDeviceStatusReturn {
    const { isPusherInitialized, isPusherConnected } = usePusher();
    const [devices, setDevices] = useState<DeviceStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize Pusher client
    useEffect(() => {
        if (isPusherInitialized) {
            console.log('Pusher is initialized, subscribing to device status channels...');
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

            return () => {
                console.log('🧹 Cleaning up device status subscriptions...');
                pusherClientService.unsubscribeFromDeviceStatus();
                pusherClientService.unsubscribeFromDeviceEvents();
            };
        }

    }, [isPusherInitialized]);

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
        if (isPusherInitialized) {
            fetchDevices();
        }
    }, [isPusherInitialized, fetchDevices]);

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
        pusherConnected: isPusherConnected,
        refreshDevices,
        updateDeviceStatus,
    };
} 