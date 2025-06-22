import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Get query parameters
        const { searchParams } = new URL(request.url);
        const path = searchParams.get('path') || 'clients';
        const apiKey = searchParams.get('apiKey');
        const secretKey = searchParams.get('secretKey');
        const host = searchParams.get('host');

        if (!apiKey || !secretKey || !host) {
            return NextResponse.json(
                { error: 'Missing required parameters: apiKey, secretKey, host' },
                { status: 400 }
            );
        }

        // Build EMQX API URL
        let apiHost = host;

        // Remove protocol prefixes
        if (apiHost.startsWith('mqtt://')) {
            apiHost = apiHost.replace('mqtt://', '');
        } else if (apiHost.startsWith('mqtts://')) {
            apiHost = apiHost.replace('mqtts://', '');
        } else if (apiHost.startsWith('wss://')) {
            apiHost = apiHost.replace('wss://', '');
        } else if (apiHost.startsWith('ws://')) {
            apiHost = apiHost.replace('ws://', '');
        }

        // Remove port
        apiHost = apiHost.replace(/:\d+$/, '');

        const apiUrl = `http://${apiHost}/api/v5/${path}`;

        // Create Basic Auth header
        const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

        // Make request to EMQX API
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`EMQX API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('EMQX API proxy error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 