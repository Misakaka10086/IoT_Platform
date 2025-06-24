import pool, { withRetry } from './database';
import {
    Device,
    DeviceProfile,
    ConfigVersion,
    DeviceConfig,
    DeviceRegistrationRequest,
    DeviceRegistrationResponse
} from '../types/device';

export class DeviceService {
    // Check if device exists
    static async deviceExists(deviceId: string): Promise<boolean> {
        return withRetry(async () => {
            const result = await pool.query(
                'SELECT 1 FROM devices WHERE device_id = $1',
                [deviceId]
            );
            return result.rows.length > 0;
        }, 3, `Check device exists: ${deviceId}`);
    }

    // Get device by ID
    static async getDevice(deviceId: string): Promise<Device | null> {
        return withRetry(async () => {
            const result = await pool.query(
                'SELECT * FROM devices WHERE device_id = $1',
                [deviceId]
            );
            return result.rows[0] || null;
        }, 3, `Get device: ${deviceId}`);
    }

    // Register new device
    static async registerDevice(deviceId: string, chip: string): Promise<Device> {
        return withRetry(async () => {
            const result = await pool.query(
                'INSERT INTO devices (device_id, chip) VALUES ($1, $2) RETURNING *',
                [deviceId, chip]
            );
            return result.rows[0];
        }, 3, `Register device: ${deviceId}`);
    }

    // Get device profile by model
    static async getDeviceProfile(model: string): Promise<DeviceProfile | null> {
        return withRetry(async () => {
            const result = await pool.query(
                'SELECT * FROM device_profiles WHERE model = $1',
                [model]
            );
            return result.rows[0] || null;
        }, 3, `Get device profile: ${model}`);
    }

    // Create config version
    static async createConfigVersion(
        deviceId: string,
        version: string,
        config: Record<string, any>
    ): Promise<ConfigVersion> {
        return withRetry(async () => {
            const result = await pool.query(
                'INSERT INTO config_version (device_id, version, config) VALUES ($1, $2, $3) RETURNING *',
                [deviceId, version, config]
            );
            return result.rows[0];
        }, 3, `Create config version for ${deviceId}`);
    }

    // Create device config
    static async createDeviceConfig(deviceId: string, version: string): Promise<DeviceConfig> {
        return withRetry(async () => {
            const result = await pool.query(
                'INSERT INTO device_configs (device_id, version) VALUES ($1, $2) RETURNING *',
                [deviceId, version]
            );
            return result.rows[0];
        }, 3, `Create device config for ${deviceId}`);
    }

    // Get current device config
    static async getCurrentDeviceConfig(deviceId: string): Promise<{ version: string; config: Record<string, any> } | null> {
        return withRetry(async () => {
            const result = await pool.query(`
          SELECT dc.version, cv.config 
          FROM device_configs dc 
          JOIN config_version cv ON dc.device_id = cv.device_id AND dc.version = cv.version 
          WHERE dc.device_id = $1
        `, [deviceId]);

            if (result.rows.length === 0) return null;

            return {
                version: result.rows[0].version,
                config: result.rows[0].config
            };
        }, 3, `Get current device config for ${deviceId}`);
    }

    // Update device last seen
    static async updateDeviceLastSeen(deviceId: string): Promise<void> {
        return withRetry(async () => {
            await pool.query(
                'UPDATE devices SET last_seen = NOW() WHERE device_id = $1',
                [deviceId]
            );
        }, 3, `Update device last seen: ${deviceId}`);
    }

    // Get all devices
    static async getAllDevices(): Promise<Device[]> {
        return withRetry(async () => {
            const result = await pool.query('SELECT * FROM devices ORDER BY last_seen DESC NULLS LAST');
            return result.rows;
        }, 3, 'Get all devices');
    }

    // Generate version timestamp
    static generateVersion(): string {
        const now = new Date();
        return now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', 'T');
    }

    // Handle device registration (new or existing)
    static async handleDeviceRegistration(request: DeviceRegistrationRequest): Promise<DeviceRegistrationResponse> {
        return withRetry(async () => {
            const { device_id, chip } = request;

            // Update last seen for all devices
            await this.updateDeviceLastSeen(device_id);

            // Check if device exists
            const deviceExists = await this.deviceExists(device_id);

            if (!deviceExists) {
                // New device registration
                await this.registerDevice(device_id, chip);

                // 尝试获取设备 profile
                let profile = await this.getDeviceProfile(chip);

                // ⬇️ 如果找不到该 chip 的配置，则使用 "default"
                if (!profile) {
                    profile = await this.getDeviceProfile("default");
                    console.log(`No default configuration found for chip: ${chip}, using "default" profile`);
                }

                if (!profile) {
                    throw new Error(`No default configuration found for chip: ${chip} or fallback "default"`);
                }

                // Generate version and create config
                const version = this.generateVersion();
                await this.createConfigVersion(device_id, version, profile.default_config);
                await this.createDeviceConfig(device_id, version);

                return {
                    version,
                    config: profile.default_config
                };
            } else {
                // Existing device - get current config
                const currentConfig = await this.getCurrentDeviceConfig(device_id);
                if (!currentConfig) {
                    throw new Error(`No configuration found for device: ${device_id}`);
                }

                return {
                    version: currentConfig.version,
                    config: currentConfig.config
                };
            }
        }, 3, `Handle device registration: ${request.device_id}`);
    }
} 