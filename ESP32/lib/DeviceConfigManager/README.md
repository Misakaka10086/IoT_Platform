# DeviceConfigManager

ESP32设备配置管理库，用于从远程服务器动态获取设备配置。

## 功能特性

- 自动WiFi连接和配置获取
- 支持MQTT配置的动态更新
- 使用ESP32唯一MAC地址作为设备ID
- 自动重试机制
- 完整的错误处理和日志记录

## API接口

### 构造函数

```cpp
// 使用默认服务器和WiFi配置（从secrets.h读取）
DeviceConfigManager configManager;

// 使用自定义服务器配置，WiFi配置从secrets.h读取
DeviceConfigManager configManager("192.168.1.100", 3001);

// 使用自定义服务器和WiFi配置
DeviceConfigManager configManager("192.168.1.100", 3001, "MyWiFi", "password123");
```

### 主要方法

```cpp
// 加载设备配置（包括WiFi连接）
bool loadDeviceConfig();

// 检查配置是否已加载
bool isConfigLoaded() const;

// 检查WiFi是否已连接
bool isWiFiConnected() const;

// 获取MQTT配置
String getMqttHost() const;
int getMqttPort() const;
String getMqttUser() const;
String getMqttPassword() const;
String getConfigVersion() const;

// 打印配置信息（调试用）
void printConfig() const;
```

## 使用示例

### 基本使用

```cpp
#include <DeviceConfigManager.h>

DeviceConfigManager configManager;

void setup() {
  Serial.begin(115200);
  
  // 加载设备配置（自动处理WiFi连接）
  if (configManager.loadDeviceConfig()) {
    Serial.println("Configuration loaded successfully");
    configManager.printConfig();
  } else {
    Serial.println("Failed to load configuration");
  }
}
```

### 与MQTT控制器集成

```cpp
#include <DeviceConfigManager.h>
#include <MqttController.h>

DeviceConfigManager configManager;
MqttController mqttController;

void setup() {
  // 加载配置（包括WiFi连接）
  if (configManager.loadDeviceConfig()) {
    // 更新MQTT控制器配置
    mqttController.updateConfig(
      configManager.getMqttHost(),
      configManager.getMqttPort(),
      configManager.getMqttUser(),
      configManager.getMqttPassword()
    );
  }
  
  // 初始化MQTT控制器
  mqttController.Begin();
}
```

### 自定义WiFi配置

```cpp
#include <DeviceConfigManager.h>

// 使用自定义WiFi配置
DeviceConfigManager configManager("192.168.1.100", 3001, "MyCustomWiFi", "MyPassword");

void setup() {
  if (configManager.loadDeviceConfig()) {
    Serial.println("Configuration loaded with custom WiFi");
  }
}
```

## 服务器API

设备配置管理器期望服务器提供以下API接口：

### 设备注册接口

**URL:** `POST /api/devices/register`

**请求体:**
```json
{
  "device_id": "ABC123456",
  "chip": "ESP32"
}
```

**响应:**
```json
{
  "version": "20250622T043111",
  "config": {
    "MQTT_HOST": "192.168.31.83",
    "MQTT_PORT": 1883,
    "MQTT_USER": "misaka",
    "MQTT_PASSWORD": "misaka"
  }
}
```

## 配置要求

在 `secrets.h` 文件中需要定义以下配置：

```cpp
// 服务器配置
#define SERVER_HOST "192.168.31.83"
#define SERVER_PORT 3001

// WiFi配置（可选，如果使用自定义构造函数）
#define WIFI_SSID "your_wifi_ssid"
#define WIFI_PASSWORD "your_wifi_password"
```

## 工作流程

1. **实例化**: 创建 `DeviceConfigManager` 实例
2. **WiFi连接**: 调用 `loadDeviceConfig()` 时自动连接WiFi
3. **配置获取**: 向服务器发送设备注册请求
4. **配置解析**: 解析服务器返回的JSON配置
5. **配置应用**: 将配置应用到MQTT控制器等组件

## 错误处理

库包含完整的错误处理机制：

- WiFi连接超时处理（默认10秒）
- HTTP请求错误处理
- JSON解析错误处理
- 配置验证
- 自动重试机制

所有错误都会通过Serial输出详细的调试信息。

## 依赖库

- ArduinoJson (7.4.1+)
- WiFi (ESP32内置)
- HTTPClient (ESP32内置)

## 许可证

MIT License 