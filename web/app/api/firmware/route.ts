import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { GroupedFirmware } from '../../../types/firmware'; // 我们将在下一步创建这个类型

// 检查环境变量
const { OSS_ACCESS_KEY_ID, OSS_SECRET_ACCESS_KEY, OSS_BUCKET_NAME, OSS_ENDPOINT_URL } = process.env;

if (!OSS_ACCESS_KEY_ID || !OSS_SECRET_ACCESS_KEY || !OSS_BUCKET_NAME || !OSS_ENDPOINT_URL) {
    console.error("❌ Missing S3 configuration in environment variables");
    // 不在此处抛出错误，而是在请求时返回错误，这样不会导致构建失败
}

// 初始化S3客户端
const s3Client = new S3Client({
    region: "auto",
    endpoint: OSS_ENDPOINT_URL,
    credentials: {
        accessKeyId: OSS_ACCESS_KEY_ID || '',
        secretAccessKey: OSS_SECRET_ACCESS_KEY || '',
    },
});

export async function GET(request: NextRequest) {
    if (!OSS_ACCESS_KEY_ID || !OSS_SECRET_ACCESS_KEY || !OSS_BUCKET_NAME || !OSS_ENDPOINT_URL) {
        return NextResponse.json({ error: "S3 service is not configured on the server." }, { status: 500 });
    }

    try {
        const command = new ListObjectsV2Command({
            Bucket: OSS_BUCKET_NAME,
            Prefix: "firmware/",
        });

        const { Contents } = await s3Client.send(command);

        if (!Contents) {
            return NextResponse.json({});
        }

        const groupedData: GroupedFirmware = {};
        const firmwareRegex = /^firmware\/([^/]+)\/([a-f0-9]{7,40})_([a-f0-9]{64})_firmware\.bin$/;

        for (const item of Contents) {
            if (item.Key) {
                const match = item.Key.match(firmwareRegex);
                if (match) {
                    const [, board, commitSha, firmwareSha256] = match;

                    if (!groupedData[commitSha]) {
                        groupedData[commitSha] = {
                            boards: new Set(), // 使用Set来自动处理重复的board
                            firmwareInfo: [],
                        };
                    }
                    // TO DO: 需要搞明白这里的Set<string>的含义
                    (groupedData[commitSha].boards as Set<string>).add(board);
                    groupedData[commitSha].firmwareInfo.push({
                        key: item.Key,
                        board,
                        commitSha,
                        firmwareSha256
                    });
                }
            }
        }

        // 将Set转换为数组以便JSON序列化
        const responseData = Object.entries(groupedData).reduce((acc, [commit, data]) => {
            acc[commit] = {
                ...data,
                boards: Array.from(data.boards)
            };
            return acc;
        }, {} as Record<string, any>);


        return NextResponse.json(responseData);

    } catch (error) {
        console.error("❌ Error fetching from S3:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json({ error: "Failed to fetch firmware list from S3.", details: errorMessage }, { status: 500 });
    }
}