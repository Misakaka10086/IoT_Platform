'use client';

import { useState, useEffect, useCallback } from 'react';
import { OTAStatus, OTAStateMap } from '../../types/ota-types';
import { pusherClientService } from '../services/pusherClientService';
import { DeviceOTAProgressUpdate, DeviceOTAEvent } from '../../types/pusher-types';
import { usePusher } from '../context/PusherProvider';
import { UseDeviceOTAStatusReturn } from '../../types/hooks'; // Corrected import

export function useDeviceOTAStatus(): UseDeviceOTAStatusReturn { // Corrected return type
    const { isPusherInitialized } = usePusher();
    const [otaStatuses, setOtaStatuses] = useState<OTAStateMap>({});
    const [error, setError] = useState<string | null>(null);

    const updateOtaStatusForDevice = useCallback((deviceId: string, newStatus: Partial<OTAStatus>) => {
        setOtaStatuses(prevMap => ({
            ...prevMap,
            [deviceId]: {
                ...(prevMap[deviceId] || {}),
                ...newStatus,
            },
        }));
    }, []);

    useEffect(() => {
        if (isPusherInitialized) {
            setError(null);
            console.log('📡 Pusher is initialized, subscribing to device OTA status channels...');

            // Subscribe to device ota status updates
            pusherClientService.subscribeToDeviceOTAStatus(
                (update: DeviceOTAProgressUpdate) => {
                    console.log('📡 Received ota progress update:', update);
                    updateOtaStatusForDevice(update.device_id, {
                        progressStatus: update.status,
                        result: undefined, // Clear previous result on new progress
                    });
                },
                (error) => {
                    console.error('❌ Pusher status subscription error:', error);
                    setError('Failed to subscribe to device ota status updates');
                }
            );

            // Subscribe to device ota event 
            pusherClientService.subscribeToDeviceOTAEvents(
                (success: DeviceOTAEvent) => {
                    console.log('📡 Device OTA success:', success);
                    updateOtaStatusForDevice(success.device_id, {
                        progressStatus: 'Completed',
                        result: 'success',
                    });
                },
                (failure: DeviceOTAEvent) => {
                    console.log('📡 Device OTA error:', failure);
                    updateOtaStatusForDevice(failure.device_id, {
                        progressStatus: 'Failed',
                        result: 'error',
                    });
                },
                (error) => {
                    console.error('❌ Pusher events subscription error:', error);
                    setError('Failed to subscribe to device ota events');
                }
            );

            return () => {
                console.log('🧹 Cleaning up device OTA status subscriptions...');
                pusherClientService.unsubscribeFromDeviceOTAStatus();
                pusherClientService.unsubscribeFromDeviceOTAEvents();
            };
        }
    }, [isPusherInitialized, updateOtaStatusForDevice]);

    return {
        otaStatuses,
        error,
    };
}
