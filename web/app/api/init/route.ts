import { NextResponse } from 'next/server';
import pool from '../../../lib/database';

export async function POST() {
    try {
        // Insert default device profiles
        await pool.query(`
      INSERT INTO device_profiles (model, default_config) 
      VALUES 
        ('ESP32', '{"led_color": "#00ff00", "interval": 60, "wifi_ssid": "", "wifi_password": ""}'),
        ('ESP8266', '{"led_color": "#ffaa00", "interval": 30, "wifi_ssid": "", "wifi_password": ""}'),
        ('Arduino', '{"led_color": "#ff0000", "interval": 120, "wifi_ssid": "", "wifi_password": ""}')
      ON CONFLICT (model) DO NOTHING
    `);

        console.log('✅ Database initialized with default device profiles');

        return NextResponse.json({
            success: true,
            message: 'Database initialized successfully'
        });
    } catch (error) {
        console.error('Error initializing database:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
} 