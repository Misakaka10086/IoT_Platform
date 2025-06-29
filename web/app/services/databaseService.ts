import pool from '../../lib/database';
import { DeviceStatus } from '../../types/device';
import { DatabaseDeviceStatusUpdate } from '../../types/pusher-types';

class DatabaseService {
    // 更新设备状态
    async updateDeviceStatus(update: DatabaseDeviceStatusUpdate): Promise<void> {
        const client = await pool.connect();

        try {
            await client.query(
                `UPDATE devices 
                 SET online = $1, last_seen = $2 
                 WHERE device_id = $3`,
                [update.status === 'online', update.last_seen, update.device_id]
            );

            console.log(`📊 Database: Updated device ${update.device_id} status to ${update.status}`);
        } catch (error) {
            console.error('❌ Database update error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // 批量更新设备状态
    async batchUpdateDeviceStatus(updates: DatabaseDeviceStatusUpdate[]): Promise<void> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            for (const update of updates) {
                await client.query(
                    `UPDATE devices 
                     SET online = $1, last_seen = $2 
                     WHERE device_id = $3`,
                    [update.status === 'online', update.last_seen, update.device_id]
                );
            }

            await client.query('COMMIT');
            console.log(`📊 Database: Batch updated ${updates.length} device statuses`);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Database batch update error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // 获取所有设备状态
    async getAllDeviceStatuses(): Promise<DeviceStatus[]> {
        const client = await pool.connect();

        try {
            const result = await client.query(
                `SELECT device_id, chip,board, git_version, online, last_seen, description 
                 FROM devices 
                 ORDER BY last_seen DESC NULLS LAST`
            );

            return result.rows.map((row: any) => ({
                device_id: row.device_id,
                status: row.online ? 'online' : 'offline',
                last_seen: row.last_seen ? row.last_seen.toISOString() : null,
                data: {
                    chip: row.chip,
                    board: row.board,
                    git_version: row.git_version,
                    description: row.description
                }
            }));
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // 获取单个设备状态
    async getDeviceStatus(deviceId: string): Promise<DeviceStatus | null> {
        const client = await pool.connect();

        try {
            const result = await client.query(
                `SELECT device_id, chip, board, git_version, online, last_seen, description 
                 FROM devices 
                 WHERE device_id = $1`,
                [deviceId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const row: any = result.rows[0];
            return {
                device_id: row.device_id,
                status: row.online ? 'online' : 'offline',
                last_seen: row.last_seen ? row.last_seen.toISOString() : null,
                data: {
                    chip: row.chip,
                    board: row.board,
                    git_version: row.git_version,
                    description: row.description
                }
            };
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // 获取在线设备数量
    async getOnlineDeviceCount(): Promise<number> {
        const client = await pool.connect();

        try {
            const result = await client.query(
                'SELECT COUNT(*) as count FROM devices WHERE online = true'
            );

            return parseInt(result.rows[0].count) || 0;
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // 获取离线设备数量
    async getOfflineDeviceCount(): Promise<number> {
        const client = await pool.connect();

        try {
            const result = await client.query(
                'SELECT COUNT(*) as count FROM devices WHERE online = false OR online IS NULL'
            );

            return parseInt(result.rows[0].count) || 0;
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // 清理长时间离线的设备状态（可选）
    async cleanupOldOfflineDevices(daysThreshold: number = 30): Promise<number> {
        const client = await pool.connect();

        try {
            const result = await client.query(
                `UPDATE devices 
                 SET online = false 
                 WHERE online = true 
                 AND last_seen < NOW() - INTERVAL '${daysThreshold} days'`
            );

            const rowCount = result.rowCount || 0;
            console.log(`📊 Database: Cleaned up ${rowCount} old offline devices`);
            return rowCount;
        } catch (error) {
            console.error('❌ Database cleanup error:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

export const databaseService = new DatabaseService(); 