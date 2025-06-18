#include <ArduinoJson.h>
#include <MqttController.h>
#include <NeoPixelBus.h>
#include <OTA.h>

#define LED_PIN 8
#define LED_COUNT 1

NeoPixelBus<NeoGrbFeature, Neo800KbpsMethod> strip(LED_COUNT, LED_PIN);
MqttController mqttController;
OTA myOta;

void onMqttMessage(const char *payload) {
  JsonDocument doc;
  deserializeJson(doc, payload);
  const char *firmwareUrl = doc["firmwareUrl"];
  DEBUG_PRINTF(firmwareUrl);

  myOta.updateFromURL(firmwareUrl);
}

void onOtaProgress(unsigned int progress, unsigned int total) {
  DEBUG_PRINTF("OTA Progress: %u/%u\n", progress, total);
}
void onOtaError(int error, const char *errorString) {
  DEBUG_PRINTF("OTA Error: %d, %s\n", error, errorString);
}
void onOtaSuccess(const char *msg) { DEBUG_PRINTLN("OTA Success"); }

void setup() {
  Serial.begin(115200);
  strip.Begin();
  strip.Show();
  mqttController.Begin(onMqttMessage);
  myOta.onProgress(onOtaProgress);
  myOta.onError(onOtaError);
  myOta.onSuccess(onOtaSuccess);
}

void loop() {

  RgbColor color = RgbColor(126, 126, 126);
  strip.SetPixelColor(0, color);
  strip.Show();
  delay(100);
  strip.SetPixelColor(0, RgbColor(0, 0, 0));
  strip.Show();
  delay(100);
}
