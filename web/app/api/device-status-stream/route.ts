import { NextRequest } from 'next/server';
import { deviceStatusEventService } from '../../services/deviceStatusEventService';

export async function GET(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // Set up SSE headers
            controller.enqueue(encoder.encode('HTTP/1.1 200 OK\r\n'));
            controller.enqueue(encoder.encode('Content-Type: text/event-stream\r\n'));
            controller.enqueue(encoder.encode('Cache-Control: no-cache\r\n'));
            controller.enqueue(encoder.encode('Connection: keep-alive\r\n'));
            controller.enqueue(encoder.encode('Access-Control-Allow-Origin: *\r\n'));
            controller.enqueue(encoder.encode('Access-Control-Allow-Headers: Cache-Control\r\n'));
            controller.enqueue(encoder.encode('\r\n'));

            // Send initial connection message
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`));

            // Create SSE client
            const client = deviceStatusEventService.addClient();

            // Override the send method to actually send data through the stream
            const originalSend = client.send;
            client.send = (data: string) => {
                try {
                    controller.enqueue(encoder.encode(data));
                } catch (error) {
                    console.error('❌ Error sending SSE data:', error);
                    client.close();
                }
            };

            // Override the close method to clean up the stream
            const originalClose = client.close;
            client.close = () => {
                try {
                    controller.close();
                } catch (error) {
                    console.error('❌ Error closing SSE stream:', error);
                }
                originalClose();
            };

            // Handle client disconnect
            request.signal.addEventListener('abort', () => {
                console.log('📡 Client disconnected, cleaning up SSE connection');
                client.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
        },
    });
} 