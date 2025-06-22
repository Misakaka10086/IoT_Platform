import pool from './database';
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
        const result = await pool.query(
            'SELECT 1 FROM devices WHERE device_id = $1',
            [deviceId]
        );
        return result.rows.length > 0;
    }

    // Get device by ID
    static async getDevice(deviceId: string): Promise<Device | null> {
        const result = await pool.query(
            'SELECT * FROM devices WHERE device_id = $1',
            [deviceId]
        );
        return result.rows[0] || null;
    }

    // Register new device
    static async registerDevice(deviceId: string, chip: string): Promise<Device> {
        const result = await pool.query(
            'INSERT INTO devices (device_id, chip) VALUES ($1, $2) RETURNING *',
            [deviceId, chip]
        );
        return result.rows[0];
    }

    // Get device profile by model
    static async getDeviceProfile(model: string): Promise<DeviceProfile | null> {
        const result = await pool.query(
            'SELECT * FROM device_profiles WHERE model = $1',
            [model]
        );
        return result.rows[0] || null;
    }

    // Create config version
    static async createConfigVersion(
        deviceId: string,
        version: string,
        config: Record<string, any>
    ): Promise<ConfigVersion> {
        const result = await pool.query(
            'INSERT INTO config_version (device_id, version, config) VALUES ($1, $2, $3) RETURNING *',
            [deviceId, version, config]
        );
        return result.rows[0];
    }

    // Create device config
    static async createDeviceConfig(deviceId: string, version: string): Promise<DeviceConfig> {
        const result = await pool.query(
            'INSERT INTO device_configs (device_id, version) VALUES ($1, $2) RETURNING *',
            [deviceId, version]
        );
        return result.rows[0];
    }

    // Get current device config
    static async getCurrentDeviceConfig(deviceId: string): Promise<{ version: string; config: Record<string, any> } | null> {
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
    }

    // Update device last seen
    static async updateDeviceLastSeen(deviceId: string): Promise<void> {
        await pool.query(
            'UPDATE devices SET last_seen = NOW() WHERE device_id = $1',
            [deviceId]
        );
    }

    // Get all devices
    static async getAllDevices(): Promise<Device[]> {
        const result = await pool.query('SELECT * FROM devices ORDER BY last_seen DESC NULLS LAST');
        return result.rows;
    }

    // Generate version timestamp
    static generateVersion(): string {
        const now = new Date();
        return now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', 'T');
    }

    // Handle device registration (new or existing)
    static async handleDeviceRegistration(request: DeviceRegistrationRequest): Promise<DeviceRegistrationResponse> {
        const { device_id, chip } = request;

        // Update last seen for all devices
        await this.updateDeviceLastSeen(device_id);

        // Check if device exists
        const deviceExists = await this.deviceExists(device_id);

        if (!deviceExists) {
            // New device registration
            await this.registerDevice(device_id, chip);

            // Get default config for this chip
            const profile = await this.getDeviceProfile(chip);
            if (!profile) {
                throw new Error(`No default configuration found for chip: ${chip}`);
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
    }
} 