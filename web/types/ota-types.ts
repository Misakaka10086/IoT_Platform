// 定义一个包含所有合法OTA状态的联合类型
export type OTAStatusValue = "OTA Progress" | "OTA Success" | "OTA Error";
// 定义一个包含所有合法状态值的常量数组，便于在运行时检查
const VALID_OTA_STATUSES: OTAStatusValue[] = ["OTA Progress", "OTA Success", "OTA Error"];
// 定义设备发送的OTA payload 基础的结构
export interface OTAPayloadBase {
    id: string;
    status: OTAStatusValue; // ⬅️ 使用我们定义的联合类型
    progress: number;
}
// 定义设备发送的OTA payload的结构
export interface OTAPayload extends OTAPayloadBase {
    chip: string;
    git_version: string;
    config_version: string;
    error_reason?: string;
}



/**
 * 类型守卫函数，用于检查一个未知对象是否是合法的OtaPayload。
 * @param obj - 待检查的任意对象。
 * @returns 如果对象是OtaPayload类型，则返回true，否则返回false。
 */
export function isValidOTAPayload(obj: any): obj is OTAPayload {
    // 1. 检查obj是否存在且是一个对象
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    // 2. 检查所有必需的字段是否存在及其基本类型
    const hasRequiredFields =
        typeof obj.id === 'string' &&
        typeof obj.chip === 'string' &&
        typeof obj.git_version === 'string' &&
        typeof obj.status === 'string' &&
        typeof obj.config_version === 'string' &&
        typeof obj.progress === 'number';

    if (!hasRequiredFields) {
        return false;
    }

    // 3. 严格检查 status 字段的值是否在我们的合法列表中
    //    这里用 .includes() 方法，比 startsWith("OTA") 更精确
    if (!VALID_OTA_STATUSES.includes(obj.status)) {
        return false;
    }

    // 4. (可选但推荐) 增加与状态相关的逻辑校验
    //    - 如果是进度更新，进度值应该在 0-100 之间
    //    - 如果是成功或失败，进度值应该是 100
    if (obj.status === "OTA Progress" && (obj.progress < 0 || obj.progress > 100)) {
        return false;
    }
    if ((obj.status === "OTA Success" || obj.status === "OTA Error") && obj.progress !== 100) {
        // 对于最终结果，我们通常期望进度是100%
        // 如果您的业务逻辑允许其他值，可以调整或移除此检查
        return false;
    }

    // 所有检查都通过了！
    return true;
}

export function isValidOTAPayloadBase(obj: any): obj is OTAPayloadBase {
    // 1. 确保 obj 是一个非null的对象
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    // 2. 检查必需的字段是否存在及其类型是否正确
    const hasCorrectTypes =
        typeof obj.id === 'string' &&
        typeof obj.status === 'string' &&
        typeof obj.progress === 'number';

    if (!hasCorrectTypes) {
        return false;
    }

    // 3. 严格检查 status 字段的值是否为预定义的三种之一
    if (!VALID_OTA_STATUSES.includes(obj.status)) {
        return false;
    }

    // 初始版本，暂时不加额外的逻辑校验。
    // 所有基本检查都通过了！
    return true;
}

export interface DeviceOTAStatus {
    device_id: string;
    status: "OTA Progress" | "OTA Success" | "OTA Error";
    process: string;

}


export interface OTAStatus {
    progressStatus?: string; // e.g., "Downloading... 25%"
    result?: 'success' | 'error';
    // 还可以加入更多信息
    // message?: string;
    // outcome_at?: string;
}

// 用一个字典来存储所有设备的OTA状态
// key 是 device_id, value 是该设备的OTA状态
export type OTAStateMap = Record<string, OTAStatus | undefined>;

// ============================================================================
// Git Commit Information Types
// ============================================================================

/** Represents a single commit's information, typically stored in the git_info table. */
export interface GitCommitInfo {
    version: string;     // The 40-character commit SHA
    message: string;
    authored_at: string; // ISO 8601 date string
}