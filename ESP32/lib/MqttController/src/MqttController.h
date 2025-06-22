#ifndef MQTT_CONTROLLER_H
#define MQTT_CONTROLLER_H

#include "../../../include/DebugUtils.h"
#include "../../../include/secrets.h" // 在头文件中包含，因为实现也在这里
#include <ArduinoJson.h>
#include <AsyncMqttClient.h>
#include <WiFi.h>

typedef void (*CommandCallback)(const char *commandPayload);
typedef void (*MqttConnectCallback)(bool sessionPresent);

class MqttController {
public:
  MqttController();

  // ***** Begin 的实现现在直接放在头文件中 *****
  void Begin() {
    _mqttReconnectTimer =
        xTimerCreate("mqttTimer", pdMS_TO_TICKS(2000), pdFALSE, (void *)this,
                     [](TimerHandle_t xTimer) {
                       static_cast<MqttController *>(pvTimerGetTimerID(xTimer))
                           ->connectToMqtt();
                     });

    _mqttClient.onConnect(
        [this](bool sessionPresent) { this->onMqttConnect(sessionPresent); });
    _mqttClient.onDisconnect([this](AsyncMqttClientDisconnectReason reason) {
      this->onMqttDisconnect(reason);
    });
    _mqttClient.onSubscribe([this](uint16_t packetId, uint8_t qos) {
      this->onMqttSubscribe(packetId, qos);
    });
    _mqttClient.onMessage([this](char *topic, char *payload,
                                 AsyncMqttClientMessageProperties properties,
                                 size_t len, size_t index, size_t total) {
      this->onMqttMessage(topic, payload, properties, len, index, total);
    });

// Use default configuration from secrets.h if available
#ifdef MQTT_HOST
    _mqttClient.setServer(MQTT_HOST, MQTT_PORT);
    if (strlen(MQTT_USER) > 0) {
      _mqttClient.setCredentials(MQTT_USER, MQTT_PASSWORD);
    }
#endif

    // Connect to MQTT if WiFi is already connected
    if (WiFi.status() == WL_CONNECTED) {
      connectToMqtt();
    }
  }

  // Dynamic configuration method
  void updateConfig(const String &host, uint16_t port, const String &user = "",
                    const String &password = "");

  // Set client ID method
  void setClientId(const String &clientId);

  // Setter methods for callbacks
  void setOnMqttMessage(CommandCallback callback) {
    _commandCallback = callback;
  }

  void setOnMqttConnect(MqttConnectCallback callback) {
    _connectCallback = callback;
  }

  void sendMessage(const char *topic, const char *payload);

private:
  AsyncMqttClient _mqttClient;

  String _host;
  uint16_t _port;
  String _user;
  String _password;
  String _clientId;

  TimerHandle_t _mqttReconnectTimer;

  CommandCallback _commandCallback;
  MqttConnectCallback _connectCallback;

  // MQTT事件处理函数
  void onMqttConnect(bool sessionPresent);
  void onMqttDisconnect(AsyncMqttClientDisconnectReason reason);
  void onMqttSubscribe(uint16_t packetId, uint8_t qos);
  void onMqttMessage(char *topic, char *payload,
                     AsyncMqttClientMessageProperties properties, size_t len,
                     size_t index, size_t total);

  // MQTT连接函数
  void connectToMqtt();
};

#endif