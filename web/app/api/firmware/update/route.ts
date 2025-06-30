import { NextRequest, NextResponse } from 'next/server';
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { FirmwareUpdateRequest, FirmwareApiResponse } from '../../../../types/firmware';

// --- 配置检查 ---
const {
    OSS_ACCESS_KEY_ID, OSS_SECRET_ACCESS_KEY, OSS_BUCKET_NAME, OSS_ENDPOINT_URL,
    EMQX_API_KEY, EMQX_SECRET_KEY, EMQX_ENDPOINT_URL, EMQX_OTA_TOPIC
} = process.env;

const isS3Configured = OSS_ACCESS_KEY_ID && OSS_SECRET_ACCESS_KEY && OSS_BUCKET_NAME && OSS_ENDPOINT_URL;
const isEmqxConfigured = EMQX_API_KEY && EMQX_SECRET_KEY && EMQX_ENDPOINT_URL && EMQX_OTA_TOPIC;

// S3 客户端
const s3Client = isS3Configured ? new S3Client({
    region: "auto",
    endpoint: OSS_ENDPOINT_URL,
    credentials: {
        accessKeyId: OSS_ACCESS_KEY_ID,
        secretAccessKey: OSS_SECRET_ACCESS_KEY,
    },
}) : null;

// --- 主处理函数 ---
export async function POST(request: NextRequest) {
    if (!isS3Configured || !isEmqxConfigured) {
        return NextResponse.json({ error: "Server is not fully configured for OTA updates. (Missing S3 or EMQX settings)" }, { status: 503 });
    }

    try {
        const body: FirmwareUpdateRequest = await request.json();
        const { commitSha, boards } = body;

        if (!commitSha || !boards || boards.length === 0) {
            return NextResponse.json({ error: "commitSha and at least one board are required." }, { status: 400 });
        }

        // 1. 从 /api/firmware 获取固件信息，以找到 Key 和 SHA256
        // 注意：这里我们直接调用内部逻辑，而不是通过HTTP fetch，效率更高。
        // 但为了解耦和简单，我们先用 fetch 模拟。在生产环境中可以重构成一个共享服务。
        const firmwareListResponse = await fetch(`${new URL(request.url).origin}/api/firmware`);
        if (!firmwareListResponse.ok) throw new Error("Failed to retrieve internal firmware list.");
        const firmwareData: FirmwareApiResponse = await firmwareListResponse.json();

        const commitDetails = firmwareData[commitSha];
        if (!commitDetails) {
            return NextResponse.json({ error: `Firmware for commit ${commitSha} not found.` }, { status: 404 });
        }

        const results = [];

        // 2. 遍历选中的每个 board
        for (const board of boards) {
            const firmwareInfo = commitDetails.firmwareInfo.find(fw => fw.board === board);
            if (!firmwareInfo) {
                results.push({ board, success: false, error: "Firmware file info not found for this board." });
                continue;
            }

            try {
                // 3. 为固件文件生成预签名URL
                const command = new GetObjectCommand({
                    Bucket: OSS_BUCKET_NAME,
                    Key: firmwareInfo.key,
                });
                const firmwareUrl = await getSignedUrl(s3Client!, command, { expiresIn: 3600 }); // URL 1小时有效

                // 4. 构建EMQX Payload
                const payload = {
                    OTA: {
                        firmwareUrl: firmwareUrl,
                        SHA256: firmwareInfo.firmwareSha256,
                    },
                };

                // 5. 构建EMQX请求
                const topic = `${EMQX_OTA_TOPIC}/${board}`;
                const emqxApiUrl = `${EMQX_ENDPOINT_URL}/api/v5/publish`;
                const credentials = Buffer.from(`${EMQX_API_KEY}:${EMQX_SECRET_KEY}`).toString('base64');

                // 6. 发送指令到EMQX
                const emqxResponse = await fetch(emqxApiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        topic: topic,
                        payload: JSON.stringify(payload),
                        qos: 1, // Quality of Service: at least once
                        retain: false,
                    }),
                });

                if (!emqxResponse.ok) {
                    const errorBody = await emqxResponse.text();
                    throw new Error(`EMQX API Error (${emqxResponse.status}): ${errorBody}`);
                }

                results.push({ board, success: true, topic });

            } catch (e: any) {
                results.push({ board, success: false, error: e.message });
            }
        }

        return NextResponse.json({ message: "OTA command dispatch process completed.", results });

    } catch (error) {
        console.error("❌ Error processing OTA update request:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred";
        return NextResponse.json({ error: "Failed to process OTA update request.", details: errorMessage }, { status: 500 });
    }
}