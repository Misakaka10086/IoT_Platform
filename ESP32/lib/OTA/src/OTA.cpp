// lib/OTA/src/OTA.cpp (Enhanced with Rollback Support)

#include "OTA.h"
#include "certificate.h"
#include <HTTPClient.h>
#include <Update.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_ota_ops.h>
#include <mbedtls/sha256.h>

extern "C" bool verifyRollbackLater() {
  // 返回 true，告诉 Arduino
  // Core："不要立即验证，我（用户代码）稍后会自己处理回滚逻辑。"
  return true;
}

// Static instance pointer for command handling
OTA *OTA::_instance = nullptr;

OTA::OTA() : _rollbackEnabled(true), _validationPerformed(false) {
  // Set the static instance pointer to this instance
  _instance = this;
}

void OTA::onProgress(OTAProgressCallback callback) {
  _progressCallback = callback;
}

void OTA::onError(OTAErrorCallback callback) { _errorCallback = callback; }

void OTA::onSuccess(OTASuccessCallback callback) {
  _successCallback = callback;
}

void OTA::onValidation(OTAValidationCallback callback) {
  _validationCallback = callback;
}

void OTA::enableRollbackProtection(bool enable) { _rollbackEnabled = enable; }

bool OTA::isFirstBootAfterUpdate() {
  const esp_partition_t *running = esp_ota_get_running_partition();
  if (!running) {
    Serial.println("[OTA] Failed to get running partition");
    return false;
  }

  esp_ota_img_states_t ota_state;
  if (esp_ota_get_state_partition(running, &ota_state) != ESP_OK) {
    Serial.println("[OTA] Failed to get OTA state");
    return false;
  }

  return (ota_state == ESP_OTA_IMG_PENDING_VERIFY);
}

void OTA::checkAndValidateApp() {
  if (!_rollbackEnabled) {
    Serial.println("[OTA] Rollback protection disabled, skipping validation");
    return;
  }

  if (!isFirstBootAfterUpdate()) {
    Serial.println("[OTA] Not first boot after update, skipping validation");
    return;
  }

  Serial.println("[OTA] First boot after OTA update, starting validation...");

  // Perform custom validation
  if (!_performCustomValidation()) {
    Serial.println("[OTA] Custom validation failed, marking app invalid");
    markAppInvalid();
    return;
  }

  // Validation passed
  Serial.println("[OTA] Custom validation passed, marking app valid");
  markAppValid();
}

void OTA::markAppValid() {
  if (esp_ota_mark_app_valid_cancel_rollback() == ESP_OK) {
    Serial.println("[OTA] App marked as valid, rollback cancelled");
    _validationPerformed = true;
  } else {
    Serial.println("[OTA] Failed to mark app as valid");
  }
}

void OTA::markAppInvalid() {
  if (esp_ota_mark_app_invalid_rollback_and_reboot() == ESP_OK) {
    Serial.println("[OTA] App marked as invalid, rollback initiated");
    // The device will reboot automatically
  } else {
    Serial.println("[OTA] Failed to mark app as invalid");
  }
}

bool OTA::_performCustomValidation() {
  if (!_validationCallback) {
    Serial.println("[OTA] No custom validation callback provided, skipping");
    return true; // No custom validation means pass
  }

  Serial.println("[OTA] Performing custom validation...");

  // Set a timeout for custom validation
  unsigned long startTime = millis();
  bool validationResult = false;

  // Try to perform validation with timeout
  while (millis() - startTime < VALIDATION_TIMEOUT) {
    validationResult = _validationCallback();
    if (validationResult) {
      Serial.println("[OTA] Custom validation passed");
      return true;
    }
    delay(100); // Small delay to prevent tight loop
  }

  Serial.println("[OTA] Custom validation failed or timed out");
  return false;
}

// This is the C++ member function that cannot be called directly by xTaskCreate
void OTA::_updateTask(void *pvParameters) {
  OTATaskParams *params = (OTATaskParams *)pvParameters;
  String url = params->url;
  String root_ca_str = params->root_ca;
  String sha256_hash = params->sha256; // Extract SHA256 hash

  // Clean up the passed parameter structure to prevent memory leaks
  delete params;

  // --- All the previous updateFromURL logic ---
  if (WiFi.status() != WL_CONNECTED) {
    if (_errorCallback)
      _errorCallback(0, "WiFi not connected");
    vTaskDelete(NULL); // Task must delete itself before ending
    return;
  }

  HTTPClient http;
  WiFiClient *client = nullptr;
  if (url.startsWith("https://")) {
    WiFiClientSecure *secure_client = new WiFiClientSecure;
    if (!root_ca_str.isEmpty()) {
      secure_client->setCACert(root_ca_str.c_str());
      Serial.println("INFO: Certificate validation is ENABLED.");
    } else {
      secure_client->setInsecure();
      Serial.println(
          "WARNING: Certificate validation is DISABLED! This is insecure!");
    }
    client = secure_client;
  } else {
    client = new WiFiClient;
  }

  http.begin(*client, url);
  int httpCode = http.GET();
  if (httpCode != HTTP_CODE_OK) {
    if (_errorCallback)
      _errorCallback(httpCode, http.errorToString(httpCode).c_str());
    http.end();
    delete client;
    vTaskDelete(NULL);
    return;
  }

  int contentLength = http.getSize();
  if (contentLength <= 0) {
    if (_errorCallback)
      _errorCallback(-1, "Content-Length header invalid");
    http.end();
    delete client;
    vTaskDelete(NULL);
    return;
  }

  if (!Update.begin(contentLength)) {
    if (_errorCallback)
      _errorCallback(-2, "Not enough space to begin OTA");
    Update.printError(Serial);
    http.end();
    delete client;
    vTaskDelete(NULL);
    return;
  }

  // Initialize SHA256 context for verification
  mbedtls_sha256_context sha256_ctx;
  uint8_t calculated_hash[32];
  bool sha256_verification_enabled = !sha256_hash.isEmpty();

  if (sha256_verification_enabled) {
    Serial.println("[OTA] SHA256 verification enabled");
    mbedtls_sha256_init(&sha256_ctx);
    mbedtls_sha256_starts(&sha256_ctx, 0); // 0 = SHA256, 1 = SHA224
  }

  size_t written = 0;
  static uint8_t buff[4096] = {0};
  Stream &stream = http.getStream();
  while (http.connected() && (written < contentLength)) {
    size_t len = stream.readBytes(buff, sizeof(buff));
    if (len > 0) {
      if (Update.write(buff, len) != len) {
        if (_errorCallback)
          _errorCallback(-3, "Flash write error");
        Update.abort();
        break;
      }

      // Update SHA256 hash if verification is enabled
      if (sha256_verification_enabled) {
        mbedtls_sha256_update(&sha256_ctx, buff, len);
      }

      written += len;
      if (_progressCallback && (written % 1024 == 0)) // 每100KB报告一次
        _progressCallback(written, contentLength);
      // Simple delay is sufficient for scheduler in independent task
      vTaskDelay(1);
    }
  }

  http.end();
  delete client;
  if (written != contentLength) {
    if (_errorCallback)
      _errorCallback(-4, "Download incomplete");
    Update.abort();
    vTaskDelete(NULL);
    return;
  }

  // Complete SHA256 calculation if verification is enabled
  if (sha256_verification_enabled) {
    mbedtls_sha256_finish(&sha256_ctx, calculated_hash);
    mbedtls_sha256_free(&sha256_ctx);

    Serial.println("[OTA] Verifying SHA256 hash...");

    // Convert expected hash string to bytes
    uint8_t expected_hash[32];
    _hexStringToBytes(sha256_hash, expected_hash, 32);

    // Compare hashes
    if (memcmp(calculated_hash, expected_hash, 32) != 0) {
      Serial.println("[OTA] SHA256 verification failed!");
      Serial.print("[OTA] Expected: ");
      for (int i = 0; i < 32; i++) {
        Serial.printf("%02x", expected_hash[i]);
      }
      Serial.println();
      Serial.print("[OTA] Calculated: ");
      for (int i = 0; i < 32; i++) {
        Serial.printf("%02x", calculated_hash[i]);
      }
      Serial.println();

      if (_errorCallback)
        _errorCallback(-5, "SHA256 verification failed");
      Update.abort();
      vTaskDelete(NULL);
      return;
    }

    Serial.println("[OTA] SHA256 verification passed");
  }

  if (!Update.end(true)) {
    if (_errorCallback)
      _errorCallback(Update.getError(), "Update.end() failed");
    vTaskDelete(NULL);
    return;
  }

  if (_successCallback)
    _successCallback("Update successful! Rebooting...");

  delay(1000);
  ESP.restart();
  // Code after ESP.restart() won't execute, but kept for completeness
  vTaskDelete(NULL);
}

// This is a static "trampoline" function that FreeRTOS uses to call our C++
// member function
void OTA::_updateTaskTrampoline(void *pvParameters) {
  OTATaskParams *params = (OTATaskParams *)pvParameters;
  // Get the this pointer from parameters, then call the actual member
  // function
  params->instance->_updateTask(pvParameters);
}

// This is the new public function that only starts the task
void OTA::updateFromURL(const String &url, const char *root_ca,
                        const char *sha256) {
  // Dynamically allocate parameter structure to pass to new task
  OTATaskParams *params = new OTATaskParams();
  params->instance = this;
  params->url = url;
  if (root_ca) {
    params->root_ca = root_ca;
  }
  if (sha256) {
    params->sha256 = sha256;
  }

  // Create task
  // xTaskCreate(function, name, stack_size, parameters, priority,
  // task_handle)
  xTaskCreate(_updateTaskTrampoline, "OTA_Update_Task",
              12288,  // OTA + HTTPS needs larger stack space
              params, // Pass parameters
              10,     // Task priority
              NULL    // Task handle, we don't need it
  );
}

void OTA::printFirmwareInfo() {
  const esp_app_desc_t *app_desc = esp_ota_get_app_description();
  if (app_desc != nullptr) {
    Serial.println("=== Current Firmware Information ===");
    Serial.printf("Project Name: %s\n", app_desc->project_name);
    Serial.printf("Version: %s\n", app_desc->version);
    Serial.printf("Compile Date: %s\n", app_desc->date);
    Serial.printf("Compile Time: %s\n", app_desc->time);
    Serial.printf("IDF Version: %s\n", app_desc->idf_ver);
    Serial.printf("Secure Version: %u\n", app_desc->secure_version);

    // Print SHA256 hash of the ELF file
    Serial.print("ELF SHA256: ");
    for (int i = 0; i < 32; i++) {
      Serial.printf("%02x", app_desc->app_elf_sha256[i]);
    }
    Serial.println();

    // Get current running partition info
    const esp_partition_t *running_partition = esp_ota_get_running_partition();
    if (running_partition != nullptr) {
      Serial.printf("Running Partition: %s (type: %d, subtype: %d)\n",
                    running_partition->label, running_partition->type,
                    running_partition->subtype);
      Serial.printf("Partition Address: 0x%08x\n", running_partition->address);
      Serial.printf("Partition Size: %u bytes\n", running_partition->size);
    }

    // Print partition states for all OTA partitions
    Serial.println("\n--- Partition States ---");
    uint8_t partition_count = esp_ota_get_app_partition_count();
    Serial.printf("Total OTA Partitions: %u\n", partition_count);

    for (uint8_t i = 0; i < partition_count; i++) {
      const esp_partition_t *partition = esp_partition_find_first(
          ESP_PARTITION_TYPE_APP,
          (esp_partition_subtype_t)(ESP_PARTITION_SUBTYPE_APP_OTA_0 + i), NULL);
      if (partition != nullptr) {
        esp_ota_img_states_t ota_state;
        esp_err_t err = esp_ota_get_state_partition(partition, &ota_state);

        Serial.printf("Partition %d (%s): ", i, partition->label);

        if (err == ESP_OK) {
          switch (ota_state) {
          case ESP_OTA_IMG_NEW:
            Serial.println("NEW");
            break;
          case ESP_OTA_IMG_PENDING_VERIFY:
            Serial.println("PENDING_VERIFY");
            break;
          case ESP_OTA_IMG_VALID:
            Serial.println("VALID");
            break;
          case ESP_OTA_IMG_INVALID:
            Serial.println("INVALID");
            break;
          case ESP_OTA_IMG_ABORTED:
            Serial.println("ABORTED");
            break;
          case ESP_OTA_IMG_UNDEFINED:
            Serial.println("UNDEFINED");
            break;
          default:
            Serial.printf("UNKNOWN (%u)\n", ota_state);
            break;
          }
        } else {
          Serial.printf("ERROR getting state (err: %d)\n", err);
        }
      }
    }

    // Check if rollback is possible
    bool rollback_possible = esp_ota_check_rollback_is_possible();
    Serial.printf("Rollback Possible: %s\n", rollback_possible ? "YES" : "NO");

    Serial.println("=====================================");
  } else {
    Serial.println("ERROR: Failed to get firmware information");
  }
}

// Convert hex string to bytes
void OTA::_hexStringToBytes(const String &hexString, uint8_t *bytes,
                            size_t length) {
  // Remove any spaces or colons from the hex string
  String cleanHex = hexString;
  cleanHex.replace(" ", "");
  cleanHex.replace(":", "");
  cleanHex.toLowerCase();

  // Ensure the hex string is the correct length (2 characters per byte)
  if (cleanHex.length() != length * 2) {
    Serial.printf("[OTA] Invalid hex string length: %d (expected %d)\n",
                  cleanHex.length(), length * 2);
    // Fill with zeros if invalid
    memset(bytes, 0, length);
    return;
  }

  // Convert hex string to bytes
  for (size_t i = 0; i < length; i++) {
    String byteString = cleanHex.substring(i * 2, i * 2 + 2);
    bytes[i] = (uint8_t)strtol(byteString.c_str(), NULL, 16);
  }
}

// Static MQTT command handler - can be passed directly to
// MqttController.Begin()
void OTA::otaCommand(const char *payload) {
  if (_instance == nullptr) {
    Serial.println(
        "[OTA] Error: No OTA instance available for command handling");
    return;
  }

  Serial.printf("[OTA] Received MQTT command: %s\n", payload);
  _instance->_parseOtaCommand(payload);
}

// MQTT command parsing function
void OTA::_parseOtaCommand(const char *payload) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.printf("[OTA] JSON parsing failed: %s\n", error.c_str());
    return;
  }

  // Check if OTA parameters exist
  if (doc["OTA"]["firmwareUrl"].is<const char *>()) {
    const char *firmwareUrl = doc["OTA"]["firmwareUrl"];
    const char *sha256 = nullptr;

    // SHA256 is optional
    if (doc["OTA"]["SHA256"].is<const char *>()) {
      sha256 = doc["OTA"]["SHA256"];
      Serial.printf("[OTA] Received firmware URL: %s\n", firmwareUrl);
      Serial.printf("[OTA] Received SHA256: %s\n", sha256);
    } else {
      Serial.printf("[OTA] Received firmware URL: %s (no SHA256 provided)\n",
                    firmwareUrl);
    }

    // Start OTA update with SHA256 verification if provided
    Serial.println("[OTA] Starting OTA update...");
    updateFromURL(firmwareUrl, root_ca, sha256);
  } else {
    Serial.println("[OTA] Invalid or missing OTA parameters in MQTT message");
    Serial.println("[OTA] Expected format: {\"OTA\": {\"firmwareUrl\": "
                   "\"http://...\", \"SHA256\": \"...\"}}");
  }
}