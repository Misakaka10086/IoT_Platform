# MqttController

ESP32 MQTT控制器库，提供MQTT连接管理和消息处理功能。

## 功能特性

- 自动MQTT连接管理
- 支持动态配置更新
- 自定义客户端ID设置
- 自动重连机制
- 消息发布和订阅
- 完整的错误处理

## API接口

### 构造函数

```cpp
MqttController mqttController;
```

### 主要方法

```cpp
// 初始化MQTT控制器
void Begin();

// 更新MQTT配置
void updateConfig(const String &host, uint16_t port, const String &user = "", const String &password = "");

// 设置客户端ID
void setClientId(const String &clientId);

// 设置消息回调
void setOnMqttMessage(CommandCallback callback);

// 设置连接回调
void setOnMqttConnect(MqttConnectCallback callback);

// 发送消息
void sendMessage(const char *topic, const char *payload);
```

## 使用示例

### 基本使用

```cpp
#include <MqttController.h>

MqttController mqttController;

void setup() {
  // 设置MQTT配置
  mqttController.updateConfig("192.168.1.100", 1883, "user", "password");
  
  // 设置客户端ID
  mqttController.setClientId("ESP32_Device_001");
  
  // 初始化MQTT控制器
  mqttController.Begin();
}
```

### 与DeviceConfigManager集成

```cpp
#include <MqttController.h>
#include <DeviceConfigManager.h>

DeviceConfigManager configManager;
MqttController mqttController;

void setup() {
  // 加载设备配置
  if (configManager.loadDeviceConfig()) {
    // 更新MQTT配置
    mqttController.updateConfig(
      configManager.getMqttHost(),
      configManager.getMqttPort(),
      configManager.getMqttUser(),
      configManager.getMqttPassword()
    );
    
    // 设置基于设备ID的客户端ID
    String deviceId = configManager.getDeviceId();
    String clientId = "ESP32_" + deviceId.substring(0, 8);
    mqttController.setClientId(clientId);
  }
  
  // 初始化MQTT控制器
  mqttController.Begin();
}
```

### 消息处理

```cpp
void onMqttMessage(const char *payload) {
  Serial.printf("Received message: %s\n", payload);
  // 处理接收到的消息
}

void setup() {
  mqttController.setOnMqttMessage(onMqttMessage);
  mqttController.Begin();
}
```

### 连接状态处理

```cpp
void onMqttConnect(bool sessionPresent) {
  Serial.println("MQTT connected!");
  // 连接成功后的处理
}

void setup() {
  mqttController.setOnMqttConnect(onMqttConnect);
  mqttController.Begin();
}
```

## 客户端ID设置

### 为什么需要设置客户端ID？

1. **唯一标识**：每个MQTT客户端需要有唯一的标识符
2. **会话管理**：服务器可以根据客户端ID管理连接状态
3. **消息路由**：确保消息发送到正确的客户端
4. **调试便利**：便于在MQTT服务器日志中识别设备

### 客户端ID命名建议

```cpp
// 基于设备MAC地址
String deviceId = configManager.getDeviceId();
String clientId = "ESP32_" + deviceId.substring(0, 8);

// 基于芯片型号
String clientId = "ESP32_" + ESP.getChipModel() + "_" + String(ESP.getEfuseMac(), HEX);

// 基于位置或功能
String clientId = "LivingRoom_Light_ESP32";

// 基于时间戳
String clientId = "ESP32_" + String(millis(), HEX);
```

### 客户端ID规则

- 长度：1-23个字符
- 字符：只能包含字母、数字和下划线
- 唯一性：在同一MQTT服务器中必须唯一
- 持久性：建议使用设备唯一标识符

## 配置要求

在 `secrets.h` 文件中需要定义以下配置：

```cpp
// MQTT Topics
#define MQTT_TOPIC_COMMAND "iotplatform/esp32/command"
#define MQTT_TOPIC_STATUS "iotplatform/esp32/status"

// 可选：默认MQTT配置（如果使用动态配置则不需要）
#define MQTT_HOST "192.168.1.100"
#define MQTT_PORT 1883
#define MQTT_USER "user"
#define MQTT_PASSWORD "password"
```

## 错误处理

库包含完整的错误处理机制：

- 连接失败自动重试
- 网络断开自动重连
- 详细的调试信息输出
- 连接状态监控

## 依赖库

- AsyncMqttClient (0.9.0+)
- WiFi (ESP32内置)
- ArduinoJson (7.4.1+)

## 许可证

MIT License 