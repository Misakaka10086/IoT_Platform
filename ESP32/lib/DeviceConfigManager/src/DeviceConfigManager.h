#ifndef DEVICE_CONFIG_MANAGER_H
#define DEVICE_CONFIG_MANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

class DeviceConfigManager {
private:
  String serverHost;
  int serverPort;
  bool useCustomPort;
  String deviceId;
  String chipType;
  String boardType;
  String gitVersion;
  String wifiSsid;
  String wifiPassword;

  // Configuration storage
  String mqttHost;
  int mqttPort;
  String mqttUser;
  String mqttPassword;
  String configVersion;

  bool configLoaded;
  bool wifiConnected;

  // Helper methods

  bool parseConfigResponse(const String &response);
  bool connectToWiFi();
  bool waitForWiFiConnection(int timeoutMs = 10000);
  String buildServerUrl();

public:
  DeviceConfigManager();
  // DeviceConfigManager(const String &host);
  // DeviceConfigManager(const String &host, int port);
  // DeviceConfigManager(const String &host, int port, const String &ssid,
  //                     const String &password);

  // Configuration methods
  bool loadDeviceConfig();
  bool isConfigLoaded() const;
  bool isWiFiConnected() const;

  // Getter methods for configuration
  String getMqttHost() const;
  int getMqttPort() const;
  String getMqttUser() const;
  String getMqttPassword() const;

  String getConfigVersion() const;
  String getDeviceId();
  String getChipType();
  String getBoardType();
  String getGitVersion();
  // Debug methods
  void printConfig() const;
};

#endif // DEVICE_CONFIG_MANAGER_H