#include <ArduinoJson.h>
#include <MqttController.h>
#include <NeoPixelBus.h>
#include <OTA.h>

#define LED_PIN 8
#define LED_COUNT 1

NeoPixelBus<NeoGrbFeature, Neo800KbpsMethod> strip(LED_COUNT, LED_PIN);
MqttController mqttController;
OTA myOta;

JsonDocument device_info_JSON;

// Custom validation function - remains the same
bool customValidation() {
  Serial.println("[Validation] Starting custom validation...");
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Validation] Failed: WiFi not connected");
    return false;
  }
  // ... other checks
  Serial.println("[Validation] Custom validation passed");
  return true;
}

void onMqttConnect(bool sessionPresent) {
  device_info_JSON.clear();
  device_info_JSON["id"] = ESP.getEfuseMac();
  device_info_JSON["chip"] = ESP.getChipModel();
  device_info_JSON["git_version"] = FIRMWARE_VERSION;
  device_info_JSON["status"] = "Online";
  mqttController.sendMessage(MQTT_TOPIC_STATUS,
                             device_info_JSON.as<String>().c_str());
}

void onOtaProgress(unsigned int progress, unsigned int total) {
  // To avoid spamming serial, only print every 10%
  static int last_percent = -1;
  int percent = (progress * 100) / total;

  if (percent > last_percent) {
    Serial.printf("OTA Progress: %d%%\n", percent);
    device_info_JSON["status"] = "OTA Progress";
    device_info_JSON["progress"] = percent;
    mqttController.sendMessage(MQTT_TOPIC_STATUS,
                               device_info_JSON.as<String>().c_str());
    last_percent = percent;
    if (last_percent >= 100)
      last_percent = -1; // Reset for next time
  }
}

void onOtaError(int error, const char *errorString) {
  Serial.printf("OTA Final Error: %d, %s\n", error, errorString);
  device_info_JSON["status"] = "OTA Error";
  device_info_JSON["error"] = error;
  device_info_JSON["errorString"] = errorString;
  mqttController.sendMessage(MQTT_TOPIC_STATUS,
                             device_info_JSON.as<String>().c_str());
  // Maybe blink LED red rapidly to indicate permanent failure
}

void onOtaSuccess(const char *msg) {
  Serial.printf("OTA Success: %s\n", msg);
  device_info_JSON["status"] = "OTA Success";
  mqttController.sendMessage(MQTT_TOPIC_STATUS,
                             device_info_JSON.as<String>().c_str());
  // Maybe solid green LED before reboot
}

// NEW: Callback for retry attempts
void onOtaRetry(int attempt, int maxRetries, const char *errorString,
                unsigned long delay) {
  Serial.printf(
      "OTA Retry: Attempt %d of %d failed due to '%s'. Retrying in %lu ms.\n",
      attempt, maxRetries, errorString, delay);
  // You could implement a visual indicator, like a yellow blink
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  strip.Begin();
  strip.Show();

  mqttController.Begin();
  mqttController.setOnMqttConnect(onMqttConnect);
  mqttController.setOnMqttMessage(OTA::otaCommand);

  myOta.printFirmwareInfo();

  // Setup OTA with rollback protection AND NEW RETRY MECHANISM
  myOta.onProgress(onOtaProgress);
  myOta.onError(onOtaError);
  myOta.onSuccess(onOtaSuccess);
  myOta.onValidation(customValidation);
  myOta.onRetry(onOtaRetry); // Register the new retry callback

  // Configure the retry policy (e.g., 5 attempts, start with 5s delay)
  myOta.setRetryPolicy(5, 5000);

  myOta.enableRollbackProtection(true);
  myOta.checkAndValidateApp();

  Serial.println("Setup completed.");
}

void loop() {
  RgbColor color = RgbColor(0, 0, 20); // Blue heartbeat for normal operation
  strip.SetPixelColor(0, color);
  strip.Show();
  delay(500);
  strip.SetPixelColor(0, RgbColor(0, 0, 0));
  strip.Show();
  delay(1500);
}