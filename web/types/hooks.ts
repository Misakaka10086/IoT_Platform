import { DeviceStatus } from "./device";
import { OTAStateMap } from "./ota-types";

export interface UseDeviceOTAStatusReturn {
    otaStatuses: OTAStateMap;
    error: string | null;
}

export interface UseDeviceStatusReturn {
    devices: DeviceStatus[];
    loading: boolean;
    error: string | null;
    pusherConnected: boolean;
    refreshDevices: () => Promise<void>;
    updateDeviceStatus: (deviceId: string, status: 'online' | 'offline') => Promise<void>;
}
