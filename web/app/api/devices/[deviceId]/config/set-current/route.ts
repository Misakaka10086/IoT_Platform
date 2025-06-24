import { NextRequest, NextResponse } from 'next/server';
import pool, { withRetry } from '../../../../../../lib/database';

// 定义请求体的类型接口，确保类型安全
interface SetCurrentVersionRequestBody {
    version: string;
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    const { deviceId } = await params;

    console.log('🔄 PUT /api/devices/[deviceId]/config/set-current called:', {
        deviceId,
        timestamp: new Date().toISOString(),
        method: 'PUT'
    });

    try {
        // 1. 解析请求体
        const body: SetCurrentVersionRequestBody = await request.json();
        const { version } = body;

        // 2. 验证输入
        if (!version) {
            return NextResponse.json(
                { error: "Missing 'version' in request body" },
                { status: 400 }
            );
        }

        // 3. 使用数据库事务执行更新操作
        // 事务能保证所有操作要么全部成功，要么全部失败，确保数据一致性。
        await withRetry(async () => {
            const client = await pool.connect();
            try {
                // 开启事务
                await client.query('BEGIN');

                // 检查目标版本是否存在于 config_version 表中，确保我们不会指向一个不存在的版本
                const versionCheck = await client.query(
                    'SELECT 1 FROM config_version WHERE device_id = $1 AND version = $2',
                    [deviceId, version]
                );

                if (versionCheck.rowCount === 0) {
                    throw new Error(`Configuration version '${version}' does not exist for device '${deviceId}'.`);
                }

                // 更新 device_configs 表，将指定 device_id 的 version 设置为新的版本
                // ON CONFLICT 子句非常有用：
                // - 如果 device_id 已存在，它会执行 UPDATE。
                // - 如果 device_id 不存在（例如，设备是新的，还没有当前配置），它会执行 INSERT。
                // 这使得我们的 API 更具鲁棒性。
                const result = await client.query(`
                    INSERT INTO device_configs (device_id, version, updated_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (device_id) 
                    DO UPDATE SET 
                        version = EXCLUDED.version, 
                        updated_at = NOW();
                `, [deviceId, version]);

                // 检查是否有一行被影响，如果没有，说明设备ID可能不存在。
                if (result.rowCount === 0) {
                    throw new Error(`Device with ID '${deviceId}' not found or update failed.`);
                }

                // 提交事务
                await client.query('COMMIT');

                console.log(`✅ Successfully set current config version for device ${deviceId} to ${version}`);
            } catch (err) {
                // 如果发生任何错误，回滚事务
                await client.query('ROLLBACK');
                // 将错误向上抛出，以便被外层的 try/catch 捕获
                throw err;
            } finally {
                // 释放数据库连接
                client.release();
            }
        }, 3, `Set current config version for ${deviceId}`); // withRetry 配置

        // 4. 返回成功响应
        return NextResponse.json({
            success: true,
            message: `Successfully set current config for device ${deviceId} to version ${version}`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error setting current device config version:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // 根据错误类型返回不同的状态码
        const status = errorMessage.includes('not found') || errorMessage.includes('does not exist') ? 404 : 500;

        return NextResponse.json(
            {
                error: errorMessage,
                timestamp: new Date().toISOString(),
                endpoint: `/api/devices/${deviceId}/config/set-current`
            },
            { status }
        );
    }
}