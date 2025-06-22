#include "MqttController.h"

MqttController::MqttController() { _commandCallback = nullptr; }

void MqttController::updateConfig(const String &host, uint16_t port,
                                  const String &user, const String &password) {

  _host = host;
  _port = port;
  _user = user;
  _password = password;

  // Disconnect if currently connected
  if (_mqttClient.connected()) {
    _mqttClient.disconnect();
  }

  // Update server configuration
  DEBUG_PRINTF("[MqttController] Updating server config - Host: %s, Port: %d\n",
               _host.c_str(), _port);
  _mqttClient.setServer(_host.c_str(), _port);

  // Update credentials if provided
  if (_user.length() > 0) {
    DEBUG_PRINTF(
        "[MqttController] Updating credentials - User: %s, Password: %s\n",
        _user.c_str(), _password.c_str());
    _mqttClient.setCredentials(_user.c_str(), _password.c_str());
  } else {
    DEBUG_PRINTLN("[MqttController] Clearing credentials");
    _mqttClient.setCredentials("", "");
  }

  // Connect to MQTT if WiFi is connected
  if (WiFi.status() == WL_CONNECTED) {
    connectToMqtt();
  }
}

void MqttController::setClientId(const String &clientId) {
  _clientId = clientId;
  DEBUG_PRINTF("[MqttController] Client ID set to: %s\n", _clientId.c_str());

  // If currently connected, disconnect and reconnect to apply new client ID
  if (_mqttClient.connected()) {
    DEBUG_PRINTLN("[MqttController] Disconnecting to apply new client ID");
    _mqttClient.disconnect();
  }
}

void MqttController::connectToMqtt() {
  DEBUG_PRINTLN("Connecting to MQTT...");

  // Set client ID if provided
  if (_clientId.length() > 0) {
    DEBUG_PRINTF("[MqttController] Connecting with client ID: %s\n",
                 _clientId.c_str());
    _mqttClient.setClientId(_clientId.c_str());
  } else {
    DEBUG_PRINTLN("[MqttController] Connecting with auto-generated client ID");
  }

  _mqttClient.connect();
}

void MqttController::onMqttConnect(bool sessionPresent) {
  DEBUG_PRINTLN("Connected to MQTT.");
  uint16_t packetIdSub = _mqttClient.subscribe(MQTT_TOPIC_COMMAND, 2);
  DEBUG_PRINTF("Subscribing to %s...\n", MQTT_TOPIC_COMMAND);

  // Call user-provided custom callback if it exists
  if (_connectCallback != nullptr) {
    _connectCallback(sessionPresent);
  }
}

void MqttController::onMqttDisconnect(AsyncMqttClientDisconnectReason reason) {
  DEBUG_PRINT("Disconnected from MQTT. Reason: ");
  switch (reason) {
  case AsyncMqttClientDisconnectReason::TCP_DISCONNECTED:
    DEBUG_PRINTLN("TCP Disconnected");
    break;
  case AsyncMqttClientDisconnectReason::MQTT_UNACCEPTABLE_PROTOCOL_VERSION:
    DEBUG_PRINTLN("Unacceptable Protocol Version");
    break;
  case AsyncMqttClientDisconnectReason::MQTT_IDENTIFIER_REJECTED:
    DEBUG_PRINTLN("Identifier Rejected");
    break;
  case AsyncMqttClientDisconnectReason::MQTT_SERVER_UNAVAILABLE:
    DEBUG_PRINTLN("Server Unavailable");
    break;
  case AsyncMqttClientDisconnectReason::MQTT_MALFORMED_CREDENTIALS:
    DEBUG_PRINTLN("Malformed Credentials");
    break;
  case AsyncMqttClientDisconnectReason::MQTT_NOT_AUTHORIZED:
    DEBUG_PRINTLN("Not Authorized");
    break;
  case AsyncMqttClientDisconnectReason::ESP8266_NOT_ENOUGH_SPACE:
    DEBUG_PRINTLN("Not Enough Space");
    break;
  case AsyncMqttClientDisconnectReason::TLS_BAD_FINGERPRINT:
    DEBUG_PRINTLN("TLS Bad Fingerprint");
    break;
  default:
    DEBUG_PRINTLN("Unknown");
    break;
  }

  if (WiFi.isConnected()) {
    xTimerStart(_mqttReconnectTimer, 0);
  }
}

void MqttController::onMqttSubscribe(uint16_t packetId, uint8_t qos) {
  DEBUG_PRINTLN("Subscribe acknowledged.");
}

void MqttController::onMqttMessage(char *topic, char *payload,
                                   AsyncMqttClientMessageProperties properties,
                                   size_t len, size_t index, size_t total) {
  char message[len + 1];
  memcpy(message, payload, len);
  message[len] = '\0';
  DEBUG_PRINTF("Message received on topic %s: %s\n", topic, message);

  if (_commandCallback != nullptr) {
    _commandCallback(message); // 直接传递整个 payload
  }
}

void MqttController::sendMessage(const char *topic, const char *payload) {
  _mqttClient.publish(topic, 0, true, payload);
}