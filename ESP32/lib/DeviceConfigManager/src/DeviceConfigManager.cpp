#include "DeviceConfigManager.h"
#include "../../../include/secrets.h"

DeviceConfigManager::DeviceConfigManager()
    : serverHost(SERVER_HOST), serverPort(80), useCustomPort(false),
      configLoaded(false), wifiConnected(false) {
  deviceId = getDeviceId();
  chipType = getChipType();
  wifiSsid = WIFI_SSID;
  wifiPassword = WIFI_PASSWORD;
}

DeviceConfigManager::DeviceConfigManager(const String &host)
    : serverHost(host), serverPort(80), useCustomPort(false),
      configLoaded(false), wifiConnected(false) {
  deviceId = getDeviceId();
  chipType = getChipType();
  wifiSsid = WIFI_SSID;
  wifiPassword = WIFI_PASSWORD;
}

DeviceConfigManager::DeviceConfigManager(const String &host, int port)
    : serverHost(host), serverPort(port), useCustomPort(true),
      configLoaded(false), wifiConnected(false) {
  deviceId = getDeviceId();
  chipType = getChipType();
  wifiSsid = WIFI_SSID;
  wifiPassword = WIFI_PASSWORD;
}

DeviceConfigManager::DeviceConfigManager(const String &host, int port,
                                         const String &ssid,
                                         const String &password)
    : serverHost(host), serverPort(port), useCustomPort(true), wifiSsid(ssid),
      wifiPassword(password), configLoaded(false), wifiConnected(false) {
  deviceId = getDeviceId();
  chipType = getChipType();
}

String DeviceConfigManager::getDeviceId() {
  // Use ESP32's unique MAC address as device ID
  uint64_t mac = ESP.getEfuseMac();
  char deviceIdStr[18];
  snprintf(deviceIdStr, sizeof(deviceIdStr), "%04X%08X", (uint16_t)(mac >> 32),
           (uint32_t)mac);
  return String(deviceIdStr);
}

String DeviceConfigManager::getChipType() { return ESP.getChipModel(); }

String DeviceConfigManager::buildServerUrl() {
  if (useCustomPort) {
    return "https://" + serverHost + ":" + String(serverPort) +
           "/api/devices/register";
  } else {
    return "https://" + serverHost + "/api/devices/register";
  }
}

bool DeviceConfigManager::connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[ConfigManager] WiFi already connected");
    wifiConnected = true;
    return true;
  }

  Serial.printf("[ConfigManager] Connecting to WiFi: %s\n", wifiSsid.c_str());
  WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());

  return waitForWiFiConnection();
}

bool DeviceConfigManager::waitForWiFiConnection(int timeoutMs) {
  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED && (millis() - startTime) < timeoutMs) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[ConfigManager] WiFi connected successfully");
    Serial.printf("[ConfigManager] IP address: %s\n",
                  WiFi.localIP().toString().c_str());
    wifiConnected = true;
    return true;
  } else {
    Serial.println("\n[ConfigManager] WiFi connection failed");
    wifiConnected = false;
    return false;
  }
}

bool DeviceConfigManager::loadDeviceConfig() {
  // First, ensure WiFi is connected
  if (!connectToWiFi()) {
    Serial.println("[ConfigManager] Cannot load config: WiFi not connected");
    return false;
  }

  HTTPClient http;
  String url = buildServerUrl();

  Serial.printf("[ConfigManager] Requesting config from: %s\n", url.c_str());

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // Prepare request body
  JsonDocument requestDoc;
  requestDoc["device_id"] = deviceId;
  requestDoc["chip"] = chipType;

  String requestBody = requestDoc.as<String>();
  Serial.printf("[ConfigManager] Request body: %s\n", requestBody.c_str());

  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("[ConfigManager] HTTP Response code: %d\n", httpResponseCode);
    Serial.printf("[ConfigManager] Response: %s\n", response.c_str());

    if (httpResponseCode == 200) {
      bool success = parseConfigResponse(response);
      if (success) {
        Serial.println("[ConfigManager] Configuration loaded successfully");
        configLoaded = true;
        printConfig();
      } else {
        Serial.println(
            "[ConfigManager] Failed to parse configuration response");
      }
      http.end();
      return success;
    } else {
      Serial.printf("[ConfigManager] HTTP request failed with code: %d\n",
                    httpResponseCode);
    }
  } else {
    Serial.printf("[ConfigManager] HTTP request failed: %s\n",
                  http.errorToString(httpResponseCode).c_str());
  }

  http.end();
  return false;
}

bool DeviceConfigManager::parseConfigResponse(const String &response) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, response);

  if (error) {
    Serial.printf("[ConfigManager] JSON parsing failed: %s\n", error.c_str());
    return false;
  }

  // Check if version exists
  if (!doc["version"].is<String>()) {
    Serial.println("[ConfigManager] Missing version in response");
    return false;
  }

  // Check if config object exists
  if (!doc["config"].is<JsonObject>()) {
    Serial.println("[ConfigManager] Missing config object in response");
    return false;
  }

  JsonObject config = doc["config"];

  // Parse MQTT configuration
  if (config["MQTT_HOST"].is<String>()) {
    mqttHost = config["MQTT_HOST"].as<String>();
  } else {
    Serial.println("[ConfigManager] Missing MQTT_HOST in config");
    return false;
  }

  if (config["MQTT_PORT"].is<int>()) {
    mqttPort = config["MQTT_PORT"].as<int>();
  } else {
    Serial.println("[ConfigManager] Missing MQTT_PORT in config");
    return false;
  }

  if (config["MQTT_USER"].is<String>()) {
    mqttUser = config["MQTT_USER"].as<String>();
  } else {
    mqttUser = ""; // Optional field
  }

  if (config["MQTT_PASSWORD"].is<String>()) {
    mqttPassword = config["MQTT_PASSWORD"].as<String>();
  } else {
    mqttPassword = ""; // Optional field
  }

  configVersion = doc["version"].as<String>();

  return true;
}

bool DeviceConfigManager::isConfigLoaded() const { return configLoaded; }

bool DeviceConfigManager::isWiFiConnected() const { return wifiConnected; }

String DeviceConfigManager::getMqttHost() const { return mqttHost; }

int DeviceConfigManager::getMqttPort() const { return mqttPort; }

String DeviceConfigManager::getMqttUser() const { return mqttUser; }

String DeviceConfigManager::getMqttPassword() const { return mqttPassword; }

String DeviceConfigManager::getConfigVersion() const { return configVersion; }

void DeviceConfigManager::printConfig() const {
  Serial.println("=== Device Configuration ===");
  Serial.printf("Device ID: %s\n", deviceId.c_str());
  Serial.printf("Chip Type: %s\n", chipType.c_str());
  Serial.printf("WiFi Connected: %s\n", wifiConnected ? "Yes" : "No");
  if (wifiConnected) {
    Serial.printf("WiFi IP: %s\n", WiFi.localIP().toString().c_str());
  }
  // Serial.printf("Server URL: %s\n", buildServerUrl().c_str());
  Serial.printf("Config Version: %s\n", configVersion.c_str());
  Serial.printf("MQTT Host: %s\n", mqttHost.c_str());
  Serial.printf("MQTT Port: %d\n", mqttPort);
  Serial.printf("MQTT User: %s\n", mqttUser.c_str());
  Serial.printf("MQTT Password: %s\n", mqttPassword.c_str());
  Serial.println("============================");
}