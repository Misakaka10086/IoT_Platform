#ifndef OTA_H
#define OTA_H

#include "../../../include/secrets.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <esp_ota_ops.h>
#include <functional>
#include <mbedtls/sha256.h>
// Callback function types
using OTAProgressCallback = std::function<void(unsigned int, unsigned int)>;
using OTAErrorCallback = std::function<void(int, const char *)>;
using OTASuccessCallback = std::function<void(const char *)>;
using OTAValidationCallback = std::function<bool()>;
// New callback for retry attempts
using OTARetryCallback =
    std::function<void(int, int, const char *, unsigned long)>;

class OTA;

// Structure for passing parameters to FreeRTOS task
struct OTATaskParams {
  OTA *instance;
  String url;
  String root_ca;
  String sha256;
};

class OTA {
public:
  // Internal error codes for better classification
  enum OTAErrorType {
    // --- Fatal Errors (Will not retry) ---
    OTA_FATAL_NO_SPACE = -101,
    OTA_FATAL_HTTP_4XX_ERROR = -102,
    OTA_FATAL_FLASH_WRITE_ERROR = -103,
    OTA_FATAL_SHA256_MISMATCH = -104,
    OTA_FATAL_UPDATE_END_FAILED = -105,

    // --- Transient Errors (Will be retried) ---
    OTA_TRANSIENT_WIFI_DISCONNECTED = -201,
    OTA_TRANSIENT_HTTP_GET_FAILED = -202,
    OTA_TRANSIENT_NO_CONTENT_LENGTH = -203,
    OTA_TRANSIENT_DOWNLOAD_INCOMPLETE = -204,
    OTA_TRANSIENT_DOWNLOAD_TIMEOUT = -205
  };

  OTA();
  void onProgress(OTAProgressCallback callback);
  void onError(OTAErrorCallback callback);
  void onSuccess(OTASuccessCallback callback);
  void onValidation(OTAValidationCallback callback);
  // New callback for retry notifications
  void onRetry(OTARetryCallback callback);

  // Configure the retry policy
  void setRetryPolicy(int maxRetries, int initialDelayMs);

  // Public function to start OTA update
  void updateFromURL(const String &url, const char *root_ca = nullptr,
                     const char *sha256 = nullptr);

  void printFirmwareInfo();

  // Rollback management functions
  void checkAndValidateApp();
  void markAppValid();
  void markAppInvalid();
  bool isFirstBootAfterUpdate();
  void enableRollbackProtection(bool enable = true);
  bool isRollbackProtectionEnabled() const { return _rollbackEnabled; }

  // Static MQTT command handler
  static void otaCommand(const char *topic, const char *payload);

private:
  void _updateTask(void *pvParameters);
  static void _updateTaskTrampoline(void *pvParameters);
  bool _performCustomValidation();
  void _parseOtaCommand(const char *payload);
  void _hexStringToBytes(const String &hexString, uint8_t *bytes,
                         size_t length);

  // Callbacks
  OTAProgressCallback _progressCallback;
  OTAErrorCallback _errorCallback;
  OTASuccessCallback _successCallback;
  OTAValidationCallback _validationCallback;
  OTARetryCallback _retryCallback;

  // Retry policy
  int _maxRetries;
  int _initialRetryDelayMs;

  // Rollback configuration
  bool _rollbackEnabled;
  bool _validationPerformed;

  static const unsigned long VALIDATION_TIMEOUT = 30000; // 30 seconds
  static OTA *_instance;
};

#endif // OTA_H