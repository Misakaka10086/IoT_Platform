// lib/OTA/src/OTA.h (Enhanced with Rollback Support)
#ifndef OTA_H
#define OTA_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <esp_ota_ops.h>
#include <functional>
#include <mbedtls/sha256.h>

using OTAProgressCallback = std::function<void(unsigned int, unsigned int)>;
using OTAErrorCallback = std::function<void(int, const char *)>;
using OTASuccessCallback = std::function<void(const char *)>;
// Custom validation callback
using OTAValidationCallback = std::function<bool()>;

class OTA;

// Structure for passing parameters to FreeRTOS task
struct OTATaskParams {
  OTA *instance;
  String url;
  String root_ca;
  String sha256; // SHA256 hash for verification
};

class OTA {
public:
  OTA();
  void onProgress(OTAProgressCallback callback);
  void onError(OTAErrorCallback callback);
  void onSuccess(OTASuccessCallback callback);

  // Custom validation callback
  void onValidation(OTAValidationCallback callback);

  // Public function to start OTA update in background task
  // sha256 parameter is optional - if provided, will verify the downloaded
  // firmware
  void updateFromURL(const String &url, const char *root_ca = nullptr,
                     const char *sha256 = nullptr);

  void printFirmwareInfo();

  // Rollback management functions
  void checkAndValidateApp();
  void markAppValid();
  void markAppInvalid();
  bool isFirstBootAfterUpdate();

  // Rollback state management
  void enableRollbackProtection(bool enable = true);
  bool isRollbackProtectionEnabled() const { return _rollbackEnabled; }

  // Static MQTT command handler - can be passed directly to
  // MqttController.Begin()
  static void otaCommand(const char *payload);

private:
  // Actual update function running in separate task
  void _updateTask(void *pvParameters);

  // Trampoline function for FreeRTOS C-style API
  static void _updateTaskTrampoline(void *pvParameters);

  // Custom validation function
  bool _performCustomValidation();

  // MQTT command parsing function
  void _parseOtaCommand(const char *payload);

  // SHA256 verification function
  bool _verifySHA256(const uint8_t *data, size_t length,
                     const String &expectedHash);

  // Convert hex string to bytes
  void _hexStringToBytes(const String &hexString, uint8_t *bytes,
                         size_t length);

  // Callback functions
  OTAProgressCallback _progressCallback;
  OTAErrorCallback _errorCallback;
  OTASuccessCallback _successCallback;
  OTAValidationCallback _validationCallback;

  // Rollback configuration
  bool _rollbackEnabled;
  bool _validationPerformed;

  // Custom validation timeout (ms)
  static const unsigned long VALIDATION_TIMEOUT = 30000; // 30 seconds

  // Static instance pointer for command handling
  static OTA *_instance;
};

#endif // OTA_H