#include <ArduinoJson.h>
#include <MqttController.h>
#include <NeoPixelBus.h>
#include <OTA.h>

#define LED_PIN 8
#define LED_COUNT 1

NeoPixelBus<NeoGrbFeature, Neo800KbpsMethod> strip(LED_COUNT, LED_PIN);
MqttController mqttController;
OTA myOta;

// Custom validation function - you can modify this based on your needs
bool customValidation() {
  // Example validation logic - replace with your actual validation
  // This should check if your application is working correctly

  Serial.println("[Validation] Starting custom validation...");

  // 1. Check if WiFi is connected (essential for OTA)
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Validation] Failed: WiFi not connected");
    return false;
  }

  // 2. Check if OTA partitions are accessible
  const esp_partition_t *ota_partition =
      esp_ota_get_next_update_partition(NULL);
  if (!ota_partition) {
    Serial.println("[Validation] Failed: No OTA partition available");
    return false;
  }

  // 3. Check if we can access the current partition
  const esp_partition_t *running = esp_ota_get_running_partition();
  if (!running) {
    Serial.println("[Validation] Failed: Cannot access running partition");
    return false;
  }

  // 4. Check memory usage
  size_t freeHeap = esp_get_free_heap_size();
  if (freeHeap < 15000) { // Minimum 15KB free heap
    Serial.printf("[Validation] Failed: Low memory (%d bytes)\n", freeHeap);
    return false;
  }

  // 5. Check if basic hardware is working (optional)
  // if (!strip.IsDirty()) {
  //   // Test LED functionality
  //   strip.SetPixelColor(0, RgbColor(255, 0, 0)); // Red
  //   strip.Show();
  //   delay(100);
  //   strip.SetPixelColor(0, RgbColor(0, 0, 0)); // Off
  //   strip.Show();
  // }

  // 6. Add your custom validation logic here
  // For example:
  // - Check if sensors are responding
  // - Verify communication with external devices
  // - Test critical functions
  // - Check MQTT connection status if needed

  Serial.println("[Validation] Custom validation passed");
  return true;
}

void onOtaProgress(unsigned int progress, unsigned int total) {
  Serial.printf("OTA Progress: %u/%u\n", progress, total);
}

void onOtaError(int error, const char *errorString) {
  Serial.printf("OTA Error: %d, %s\n", error, errorString);
}

void onOtaSuccess(const char *msg) { Serial.println("OTA Success"); }

void setup() {
  Serial.begin(115200);
  delay(1000);
  // Initialize LED strip
  strip.Begin();
  strip.Show();

  // Initialize MQTT controller with OTA command handler
  mqttController.Begin(OTA::otaCommand);

  myOta.printFirmwareInfo();
  // Setup OTA with rollback protection
  myOta.onProgress(onOtaProgress);
  myOta.onError(onOtaError);
  myOta.onSuccess(onOtaSuccess);
  myOta.onValidation(customValidation);
  // Enable rollback protection (default is enabled)
  myOta.enableRollbackProtection(true);
  // Check if this is first boot after OTA update and validate
  myOta.checkAndValidateApp();

  Serial.println("Setup completed");
}

void loop() {
  // Simple heartbeat LED pattern
  RgbColor color = RgbColor(126, 126, 126);
  strip.SetPixelColor(0, color);
  strip.Show();
  delay(100);
  strip.SetPixelColor(0, RgbColor(0, 0, 0));
  strip.Show();
  delay(100);
}
