const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

// 关键改动：根据环境决定 SSL 配置
const sslConfig = process.env.APP_ENV === 'production' 
  ? { rejectUnauthorized: false } // 生产环境 (Vercel) 需要 SSL
  : false;                        // 开发环境 (本地 Docker) 不需要 SSL

async function testConnection() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || process.env.PGHOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || process.env.PGPORT || '5432'),
    database: process.env.POSTGRES_DATABASE || process.env.PGDATABASE || 'neondb',
    user: process.env.POSTGRES_USER || process.env.PGUSER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || '',
    ssl: sslConfig, // <--- 应用条件化配置
  });

  try {
    console.log('🔍 Testing database connection...');
    console.log('Host:', process.env.POSTGRES_HOST);
    console.log('Database:', process.env.POSTGRES_DATABASE);
    console.log('User:', process.env.POSTGRES_USER);
    
    const client = await pool.connect();
    console.log('✅ Successfully connected to database!');
    
    const result = await client.query('SELECT NOW()');
    console.log('Current time from database:', result.rows[0].now);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    await pool.end();
  }
}

testConnection(); 