import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const testType = searchParams.get('type') || 'basic';

        console.log('🧪 Test API called:', {
            method: 'GET',
            testType,
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent'),
            origin: request.headers.get('origin'),
            referer: request.headers.get('referer')
        });

        switch (testType) {
            case 'basic':
                return NextResponse.json({
                    status: 'ok',
                    message: 'Basic test endpoint working',
                    timestamp: new Date().toISOString(),
                    testType: 'basic',
                    headers: {
                        userAgent: request.headers.get('user-agent'),
                        origin: request.headers.get('origin'),
                        contentType: request.headers.get('content-type')
                    }
                });

            case 'json':
                return NextResponse.json({
                    status: 'ok',
                    message: 'JSON test endpoint working',
                    data: {
                        string: 'test string',
                        number: 123,
                        boolean: true,
                        array: [1, 2, 3],
                        object: { key: 'value' }
                    },
                    timestamp: new Date().toISOString()
                });

            case 'error':
                return NextResponse.json(
                    {
                        status: 'error',
                        message: 'This is a test error response',
                        timestamp: new Date().toISOString()
                    },
                    { status: 400 }
                );

            default:
                return NextResponse.json({
                    status: 'ok',
                    message: 'Unknown test type, returning basic response',
                    testType,
                    timestamp: new Date().toISOString()
                });
        }
    } catch (error) {
        console.error('Test API error:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const testType = searchParams.get('type') || 'basic';

        let body = null;
        try {
            body = await request.json();
        } catch (e) {
            body = 'Could not parse JSON body';
        }

        console.log('🧪 Test API POST called:', {
            method: 'POST',
            testType,
            body,
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent'),
            contentType: request.headers.get('content-type')
        });

        return NextResponse.json({
            status: 'ok',
            message: 'POST test endpoint working',
            receivedData: body,
            testType,
            timestamp: new Date().toISOString(),
            headers: {
                userAgent: request.headers.get('user-agent'),
                contentType: request.headers.get('content-type')
            }
        });
    } catch (error) {
        console.error('Test API POST error:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
} 