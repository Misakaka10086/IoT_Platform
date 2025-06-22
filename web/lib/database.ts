import { Pool } from 'pg';

// Database connection pool
const pool = new Pool({
    host: process.env.POSTGRES_HOST || process.env.PGHOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || process.env.PGPORT || '5432'),
    database: process.env.POSTGRES_DATABASE || process.env.PGDATABASE || 'neondb',
    user: process.env.POSTGRES_USER || process.env.PGUSER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || '',
    ssl: {
        rejectUnauthorized: false
    },
    // Connection pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    // Don't exit the process, just log the error
});

export default pool; 