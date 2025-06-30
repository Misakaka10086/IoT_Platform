export interface FirmwareInfo {
    key: string;
    board: string;
    commitSha: string;
    firmwareSha256: string;
}

export interface GroupedFirmware {
    [commitSha: string]: {
        boards: Set<string> | string[]; // 在处理时是Set，发送给前端时是string[]
        firmwareInfo: FirmwareInfo[];
    };
}

export type FirmwareApiResponse = Record<string, {
    boards: string[];
    firmwareInfo: FirmwareInfo[];
}>;