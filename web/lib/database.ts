import { Pool } from 'pg';

// 关键改动：根据环境决定 SSL 配置
const sslConfig = process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false } // 生产环境 (Vercel) 需要 SSL
    : false;                        // 开发环境 (本地 Docker) 不需要 SSL
// Database connection pool
const pool = new Pool({
    host: process.env.POSTGRES_HOST || process.env.PGHOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || process.env.PGPORT || '5432'),
    database: process.env.POSTGRES_DATABASE || process.env.PGDATABASE || 'neondb',
    user: process.env.POSTGRES_USER || process.env.PGUSER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || '',
    ssl: sslConfig, // <--- 应用条件化配置
    // Connection pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // 连接超时设置为10秒
    statement_timeout: 10000, // 查询超时设置为10秒
});

// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    // Don't exit the process, just log the error
});

// 重试工具函数
export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    operationName: string = 'Database operation'
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // 如果是最后一次尝试，直接抛出错误
            if (attempt === maxRetries) {
                console.error(`❌ ${operationName} failed after ${maxRetries} attempts:`, lastError);
                throw lastError;
            }

            // 计算延迟时间（指数退避）
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.warn(`⚠️ ${operationName} attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms:`, lastError.message);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

export default pool; 