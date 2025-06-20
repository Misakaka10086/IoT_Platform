# ESP32 OTA 固件回滚机制

## 概述

本项目实现了基于ESP-IDF的固件回滚机制，确保OTA升级后的固件能够正常工作。如果新固件出现问题，系统会自动回滚到之前的稳定版本。

## 核心特性

### 1. 自定义验证机制
- **用户自定义验证**：用户可定义自己的验证逻辑，检查应用特定功能
- **30秒超时保护**：防止验证过程卡死
- **灵活扩展**：可根据具体需求添加各种验证逻辑

### 2. 自动回滚
- 验证失败时自动回滚到之前的稳定版本
- 支持意外断电情况下的自动回滚
- 确保设备始终能够进行OTA升级

### 3. 基于FreeRTOS
- 所有功能模块都基于FreeRTOS任务实现
- 非阻塞的OTA升级过程
- 可扩展的验证框架

### 4. 传统串口日志
- 使用传统的Serial.print/printf输出日志
- 便于调试和监控
- 支持Arduino IDE的串口监视器

### 5. 内置MQTT命令接口
- 提供 `OTA::otaCommand` 静态函数作为MQTT消息处理接口
- 自动解析JSON格式的OTA命令
- 支持可选的SHA256验证
- 完整的错误处理和日志输出

## 使用方法

### 1. 基本设置

```cpp
#include <OTA.h>
#include <MqttController.h>

MqttController mqttController;
OTA myOta;

void setup() {
  Serial.begin(115200); // 初始化串口
  
  // 使用OTA内置命令接口初始化MQTT控制器
  mqttController.Begin(OTA::otaCommand);
  
  // 设置OTA回调
  myOta.onProgress(onOtaProgress);
  myOta.onError(onOtaError);
  myOta.onSuccess(onOtaSuccess);
  myOta.onValidation(customValidation);
  
  // 启用回滚保护
  myOta.enableRollbackProtection(true);
  
  // 检查并验证应用（在setup中调用）
  myOta.checkAndValidateApp();
}
```

### 2. MQTT命令格式

OTA命令通过MQTT消息发送，使用JSON格式：

```json
{
  "OTA": {
    "firmwareUrl": "http://example.com/firmware.bin",
    "SHA256": "optional_sha256_hash"
  }
}
```

**参数说明：**
- `firmwareUrl` (必需): 固件下载URL，支持HTTP和HTTPS
- `SHA256` (可选): 固件的SHA256哈希值，用于验证

**示例命令：**
```json
{
  "OTA": {
    "firmwareUrl": "https://github.com/user/repo/releases/download/v1.0.0/firmware.bin"
  }
}
```

### 3. 自定义验证函数

```cpp
bool customValidation() {
  Serial.println("[Validation] Starting custom validation...");
  
  // 1. 检查WiFi连接（OTA必需）
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Validation] Failed: WiFi not connected");
    return false;
  }
  
  // 2. 检查OTA分区可访问性
  const esp_partition_t *ota_partition = esp_ota_get_next_update_partition(NULL);
  if (!ota_partition) {
    Serial.println("[Validation] Failed: No OTA partition available");
    return false;
  }
  
  // 3. 检查当前分区访问
  const esp_partition_t *running = esp_ota_get_running_partition();
  if (!running) {
    Serial.println("[Validation] Failed: Cannot access running partition");
    return false;
  }
  
  // 4. 检查内存状态
  if (esp_get_free_heap_size() < 15000) {
    Serial.printf("[Validation] Failed: Low memory (%d bytes)\n", esp_get_free_heap_size());
    return false;
  }
  
  // 5. 检查硬件功能
  if (!checkSensors()) {
    Serial.println("[Validation] Failed: Sensors not responding");
    return false;
  }
  
  // 6. 检查关键服务
  if (!checkCriticalServices()) {
    Serial.println("[Validation] Failed: Critical services down");
    return false;
  }
  
  Serial.println("[Validation] Custom validation passed");
  return true;
}
```

### 4. OTA升级流程

```cpp
// 当收到OTA升级命令时
void onMqttMessage(const char *payload) {
  JsonDocument doc;
  deserializeJson(doc, payload);
  
  if (doc["OTA"]["firmwareUrl"].is<const char *>() &&
      doc["OTA"]["SHA256"].is<const char *>()) {
    const char *firmwareUrl = doc["OTA"]["firmwareUrl"];
    const char *sha256 = doc["OTA"]["SHA256"];
    
    // 开始OTA升级
    myOta.updateFromURL(firmwareUrl);
  }
}

// OTA错误处理
void onOtaError(int error, const char *errorString) {
  Serial.printf("OTA Error: %d, %s\n", error, errorString);
}

// OTA成功处理
void onOtaSuccess(const char *msg) { 
  Serial.println("OTA Success"); 
  // 注意：OTA成功后设备会重启
}
```

## 验证流程

### 自定义验证（必需）
- 用户定义的验证逻辑
- 30秒超时保护
- 可检查WiFi、OTA分区、内存、传感器、通信、关键功能等
- 验证失败时自动回滚

### 验证检查项目建议
1. **WiFi连接检查**：确保设备能够连接网络
2. **OTA分区检查**：验证OTA分区是否可访问
3. **内存检查**：确保有足够的内存运行应用
4. **分区访问检查**：验证当前运行分区是否正常
5. **硬件功能检查**：验证传感器、LED等硬件是否正常
6. **服务状态检查**：验证MQTT、HTTP等服务是否正常

## 回滚机制

### 自动回滚触发条件
1. 自定义验证失败或超时
2. 应用崩溃或意外重启
3. 验证超时（30秒内未完成验证）

### 回滚过程
1. 标记当前应用为无效
2. 重启设备
3. 引导加载程序选择之前的有效版本
4. 启动回滚版本


## 日志输出

### 串口日志格式
所有日志都通过Serial输出，格式如下：
- `[OTA]` 前缀标识OTA相关日志
- `[Validation]` 前缀标识验证相关日志
- 使用Serial.println()和Serial.printf()输出
- 支持Arduino IDE串口监视器

### 日志示例
```
[OTA] First boot after OTA update, starting validation...
[OTA] Performing custom validation...
[Validation] Starting custom validation...
[Validation] Custom validation passed
[OTA] Custom validation passed, marking app valid
[OTA] App marked as valid, rollback cancelled
```

## 开发建议

### 1. 验证函数设计
- 验证逻辑应该快速且可靠
- 避免在验证过程中进行耗时操作
- 确保验证失败时能够安全回滚
- 使用Serial输出详细的验证信息
- 包含必要的系统检查（WiFi、OTA分区、内存等）

### 2. 错误处理
- 在验证函数中添加适当的错误日志
- 使用Serial输出调试信息
- 考虑添加LED指示验证状态

### 3. 扩展功能
- 可以添加验证结果上报功能
- 支持远程禁用回滚保护
- 添加验证统计和监控

## 故障排除

### 常见问题

1. **验证超时**
   - 检查自定义验证函数是否过于复杂
   - 确保验证逻辑能够快速完成

2. **回滚失败**
   - 检查分区表配置
   - 确保有可用的回滚版本

3. **验证函数崩溃**
   - 添加异常处理
   - 简化验证逻辑

### 调试方法

1. 启用详细日志输出
2. 使用LED指示验证状态
3. 通过串口监控验证过程
4. 查看Serial输出的详细日志


## 示例代码

完整的示例代码请参考 `src/main.cpp`，其中包含了：
- 基本的OTA设置
- 自定义验证函数示例（包含必要的系统检查）
- MQTT集成
- LED状态指示
- 传统串口日志输出 