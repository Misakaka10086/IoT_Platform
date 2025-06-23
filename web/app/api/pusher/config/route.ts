import { NextRequest, NextResponse } from 'next/server';
import { pusherService } from '../../../services/pusherService';

export async function GET(request: NextRequest) {
    try {
        // Return Pusher configuration for client-side initialization
        const config = pusherService.getConfig();

        return NextResponse.json({
            success: true,
            config: {
                key: config.key,
                cluster: config.cluster,
                forceTLS: true
            }
        });
    } catch (error) {
        console.error('❌ Error getting Pusher config:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Test Pusher connection
        const isConnected = await pusherService.testConnection();

        return NextResponse.json({
            success: true,
            connected: isConnected,
            message: isConnected ? 'Pusher connection successful' : 'Pusher connection failed'
        });
    } catch (error) {
        console.error('❌ Error testing Pusher connection:', error);
        return NextResponse.json(
            {
                success: false,
                connected: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 