'use client';

import { useState, useEffect, useCallback } from 'react';
import { OTAStatus, OTAStateMap } from '../../types/ota-types';
import {
    pusherClientService,
    DeviceOTAStatusUpdate,
    DeviceOTAEvent
} from '../services/pusherClientService';
import { usePusher } from '../context/PusherProvider';

interface useDeviceOTAStatusReturn {
    otaStatuses: OTAStateMap;
    error: string | null;
}

export function useDeviceOTAStatus(): useDeviceOTAStatusReturn {
    const { isPusherInitialized, isPusherConnected } = usePusher();
    const [otaStatuses, setOtaStatuses] = useState<OTAStateMap>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isPusherInitialized) {
            console.log('Pusher is initialized, subscribing to device ota status channels...');

            // Subscribe to device ota status updates
            pusherClientService.subscribeToDeviceOTAStatus(
                (update: DeviceOTAStatusUpdate) => {
                    console.log('📡 Received ota progress update:', update);
                    // ✅ 实现状态更新逻辑
                    setOtaStatuses(prevMap => ({
                        ...prevMap,
                        [update.device_id]: {
                            ...prevMap[update.device_id],
                            progressStatus: update.status, // 假设 status 就是 "25%" 这样的字符串
                            result: undefined, // 收到新进度时，清除旧的结果
                        }
                    }));
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
                    // ✅ 实现状态更新逻辑
                    setOtaStatuses(prevMap => ({
                        ...prevMap,
                        [success.device_id]: {
                            ...prevMap[success.device_id],
                            progressStatus: 'Completed', // 可以给一个完成的提示
                            result: 'success',
                        }
                    }));
                },
                (failure: DeviceOTAEvent) => {
                    console.log('📡 Device OTA error:', failure);
                    // ✅ 实现状态更新逻辑
                    setOtaStatuses(prevMap => ({
                        ...prevMap,
                        [failure.device_id]: {
                            ...prevMap[failure.device_id],
                            progressStatus: 'Failed', // 可以给一个失败的提示
                            result: 'error',
                        }
                    }));
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

    }, [isPusherInitialized]);

    return {
        otaStatuses,
        error,
    };
}