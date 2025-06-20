# OTA SHA256 校验功能指南

## 概述

OTA库现在支持SHA256校验功能，可以在下载固件后验证其完整性，确保固件没有被篡改或损坏。这是一个重要的安全特性，可以防止恶意固件攻击和传输错误。

## 功能特性

### 1. 实时SHA256计算
- 在下载固件的同时计算SHA256哈希值
- 使用mbedtls库进行高效的哈希计算
- 支持大文件的高效处理

### 2. 灵活的校验选项
- SHA256参数是可选的
- 如果提供SHA256，则进行校验
- 如果不提供SHA256，则跳过校验

### 3. 详细的错误报告
- 显示期望的SHA256哈希值
- 显示计算得到的SHA256哈希值
- 提供清晰的错误信息

### 4. 多种输入格式支持
- 支持带空格的十六进制字符串：`"a1 b2 c3 d4..."`
- 支持带冒号的十六进制字符串：`"a1:b2:c3:d4..."`
- 支持纯十六进制字符串：`"a1b2c3d4..."`
- 自动转换为小写并清理格式

## 使用方法

### 1. 基本OTA更新（无校验）

```cpp
// 直接调用
myOta.updateFromURL("http://example.com/firmware.bin");

// 通过MQTT命令
{
  "OTA": {
    "firmwareUrl": "http://example.com/firmware.bin"
  }
}
```

### 2. 带SHA256校验的OTA更新

```cpp
// 直接调用
myOta.updateFromURL("http://example.com/firmware.bin", nullptr, "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6");

// 通过MQTT命令
{
  "OTA": {
    "firmwareUrl": "http://example.com/firmware.bin",
    "SHA256": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
  }
}
```

### 3. 带SSL证书和SHA256校验的OTA更新

```cpp
// 直接调用
myOta.updateFromURL("https://example.com/firmware.bin", "-----BEGIN CERTIFICATE-----\n...", "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6");

// 通过MQTT命令（需要预先配置证书）
{
  "OTA": {
    "firmwareUrl": "https://example.com/firmware.bin",
    "SHA256": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
  }
}
```

## SHA256哈希值生成

### 1. 在Linux/macOS上生成SHA256

```bash
# 生成固件的SHA256哈希值
sha256sum firmware.bin

# 或者使用openssl
openssl dgst -sha256 firmware.bin
```

### 2. 在Windows上生成SHA256

```cmd
# 使用PowerShell
Get-FileHash firmware.bin -Algorithm SHA256

# 或者使用certutil
certutil -hashfile firmware.bin SHA256
```

### 3. 在线工具
- 可以使用在线SHA256计算器
- 上传固件文件获取哈希值

## 日志输出示例

### 成功的SHA256校验

```
[OTA] SHA256 verification enabled
[OTA] Verifying SHA256 hash...
[OTA] SHA256 verification passed
[OTA] Update successful! Rebooting...
```

### 失败的SHA256校验

```
[OTA] SHA256 verification enabled
[OTA] Verifying SHA256 hash...
[OTA] SHA256 verification failed!
[OTA] Expected: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
[OTA] Calculated: f1f2f3f4f5f6f7f8f9f0f1f2f3f4f5f6f7f8f9f0f1f2f3f4f5f6f7f8f9f0
OTA Error: -5, SHA256 verification failed
```

### 无SHA256校验的更新

```
[OTA] Received firmware URL: http://example.com/firmware.bin (no SHA256 provided)
[OTA] Starting OTA update...
[OTA] Update successful! Rebooting...
```

## 错误代码

| 错误代码 | 描述 |
|---------|------|
| -1 | Content-Length header invalid |
| -2 | Not enough space to begin OTA |
| -3 | Flash write error |
| -4 | Download incomplete |
| **-5** | **SHA256 verification failed** |
| HTTP错误码 | HTTP请求失败 |

## 安全建议

### 1. 始终使用SHA256校验
- 在生产环境中，建议始终提供SHA256哈希值
- 这可以防止中间人攻击和传输错误

### 2. 安全的哈希值传输
- 通过安全通道传输SHA256哈希值
- 考虑对哈希值进行数字签名

### 3. 固件来源验证
- 确保固件来自可信的来源
- 验证固件的数字签名（如果可用）

### 4. 网络安全
- 使用HTTPS下载固件
- 配置适当的SSL证书

## 性能考虑

### 1. 内存使用
- SHA256计算需要额外的内存
- 对于大文件，内存使用是可接受的

### 2. 处理时间
- SHA256计算会增加少量处理时间
- 对于大多数应用，这个开销是可以忽略的

### 3. 电池寿命
- 在电池供电的设备上，SHA256计算会消耗少量额外电量
- 安全性的提升通常值得这个开销

## 故障排除

### 1. SHA256校验失败

**可能原因：**
- 固件文件损坏
- 网络传输错误
- 哈希值计算错误
- 哈希值格式错误

**解决方法：**
- 重新生成固件的SHA256哈希值
- 检查网络连接
- 验证哈希值格式
- 重新下载固件

### 2. 哈希值格式错误

**支持的格式：**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
a1 b2 c3 d4 e5 f6 g7 h8 i9 j0 k1 l2 m3 n4 o5 p6 q7 r8 s9 t0 u1 v2 w3 x4 y5 z6
a1:b2:c3:d4:e5:f6:g7:h8:i9:j0:k1:l2:m3:n4:o5:p6:q7:r8:s9:t0:u1:v2:w3:x4:y5:z6
```

### 3. 内存不足

**解决方法：**
- 增加任务栈大小
- 优化固件大小
- 检查内存泄漏

## 示例代码

### 完整的OTA设置示例

```cpp
#include <MqttController.h>
#include <OTA.h>

MqttController mqttController;
OTA myOta;

void onOtaProgress(unsigned int progress, unsigned int total) {
  Serial.printf("OTA Progress: %u/%u\n", progress, total);
}

void onOtaError(int error, const char *errorString) {
  Serial.printf("OTA Error: %d, %s\n", error, errorString);
  
  // 处理SHA256校验失败
  if (error == -5) {
    Serial.println("SHA256 verification failed - firmware may be corrupted");
  }
}

void onOtaSuccess(const char *msg) {
  Serial.println("OTA Success");
}

void setup() {
  Serial.begin(115200);
  
  // 使用OTA内置命令接口（支持SHA256校验）
  mqttController.Begin(OTA::otaCommand);
  
  // 设置OTA回调
  myOta.onProgress(onOtaProgress);
  myOta.onError(onOtaError);
  myOta.onSuccess(onOtaSuccess);
  
  // 启用回滚保护
  myOta.enableRollbackProtection(true);
  myOta.checkAndValidateApp();
  
  Serial.println("OTA with SHA256 verification ready");
}

void loop() {
  // 主程序逻辑
}
```

## 总结

SHA256校验功能为OTA更新提供了重要的安全保障，确保下载的固件完整性和真实性。通过简单的API调用或MQTT命令，就可以启用这个功能，大大提高了系统的安全性。 