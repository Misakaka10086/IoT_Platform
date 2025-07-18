import { NextRequest, NextResponse } from 'next/server';
import { EmqxMessagePublish, isMessagePublishEvent } from '../../../../../../types/emqx-webhook';
import { OTAPayloadBase, isValidOTAPayload, isValidOTAPayloadBase } from '../../../../../../types/ota-types';
import { pusherService } from '../../../../../services/pusherService';




async function processOtaUpdate(event: EmqxMessagePublish) {
    console.log(`处理设备 ${event.clientid} 在主题 ${event.topic} 上的OTA进度...`);

    // --- 👇 这里是核心的解析逻辑 ---
    try {
        // 1. 解析 payload 字符串
        const payloadObject: unknown = JSON.parse(event.payload);

        // 2. (推荐) 使用类型守卫验证解析出的对象结构
        if (isValidOTAPayloadBase(payloadObject)) {
            // 在这个块内，`payloadObject` 的类型被收窄为 `OtaProgressPayload`

            console.log('✅ OTA Payload 解析并验证成功!');
            console.log(`   - 设备ID (来自payload): ${payloadObject.id}`);
            console.log(`   - OTA 状态: ${payloadObject.status}`);
            console.log(`   - OTA 进度: ${payloadObject.progress}%`);

            // 3. 在这里执行你的业务逻辑
            // 例如：更新数据库中的OTA进度、通过Pusher将进度推送到前端等
            // await updateOtaProgressInDB(payloadObject.id, payloadObject.progress);
            // await pusherService.triggerOtaProgressUpdate(payloadObject);
            const deviceId = payloadObject.id;
            const otaStatus = payloadObject.status;
            const progress = payloadObject.progress.toString();
            try {

                switch (otaStatus) {
                    case "OTA Progress":
                        console.log(`✅: ${payloadObject.progress}%`);
                        await pusherService.triggerDeviceOTAProgressUpdate(deviceId, progress);
                        break;
                    case "OTA Success":
                        console.log(`✅: ${payloadObject.progress}%`);
                        await pusherService.triggerDeviceOTASuccess(deviceId);
                        break;
                    default:
                        console.log(`✅: ${payloadObject.progress}%`);
                        await pusherService.triggerDeviceOTAError(deviceId);
                }


            } catch (dbError) {
                console.error('❌ Database or Pusher error:', dbError);
                // Continue processing even if database/Pusher fails
            }

        } else {
            // 如果解析出的JSON对象结构不符合预期
            console.warn('⚠️ 解析出的Payload结构不符合OtaProgressPayload类型:', payloadObject);
        }

    } catch (e) {
        // JSON.parse will throw an exception if `event.payload` is not a valid JSON string
        console.error('❌ Failed to parse OTA payload, it might not be a valid JSON string.');
        // Print the original payload for debugging
        console.error('   - Original Payload:', event.payload);
        if (e instanceof Error) {
            console.error('   - Error message:', e.message);
        }
    }
}

export async function POST(request: NextRequest) {
    const body: unknown = await request.json();

    if (isMessagePublishEvent(body)) {
        await processOtaUpdate(body);
        return NextResponse.json({ success: true, message: 'OTA event received' });
    } else {
        return NextResponse.json(
            { error: 'Event is not a message.publish event or has invalid format' },
            { status: 400 }
        );
    }
}