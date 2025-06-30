#include "OTA.h"
#include "certificate.h"
#include <HTTPClient.h>
#include <StreamString.h>
#include <Update.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_ota_ops.h>
#include <mbedtls/sha256.h>

extern "C" bool verifyRollbackLater() { return true; }

OTA *OTA::_instance = nullptr;

static const uint32_t DOWNLOAD_TIMEOUT_MS = 15000; // 15秒内无数据则超时

OTA::OTA()
    : _rollbackEnabled(true), _validationPerformed(false), _maxRetries(5),
      _initialRetryDelayMs(5000), _progressCallback(nullptr),
      _errorCallback(nullptr), _successCallback(nullptr),
      _validationCallback(nullptr), _retryCallback(nullptr) {
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
void OTA::onRetry(OTARetryCallback callback) { _retryCallback = callback; }

void OTA::setRetryPolicy(int maxRetries, int initialDelayMs) {
  _maxRetries = maxRetries > 0 ? maxRetries : 1;
  _initialRetryDelayMs = initialDelayMs;
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
  if (!_performCustomValidation()) {
    Serial.println("[OTA] Custom validation failed, marking app invalid");
    markAppInvalid();
    return;
  }
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
  } else {
    Serial.println("[OTA] Failed to mark app as invalid");
  }
}

bool OTA::_performCustomValidation() {
  if (!_validationCallback) {
    Serial.println("[OTA] No custom validation callback provided, skipping");
    return true;
  }
  Serial.println("[OTA] Performing custom validation...");
  unsigned long startTime = millis();
  while (millis() - startTime < VALIDATION_TIMEOUT) {
    if (_validationCallback()) {
      Serial.println("[OTA] Custom validation passed");
      return true;
    }
    delay(100);
  }
  Serial.println("[OTA] Custom validation failed or timed out");
  return false;
}

void OTA::_updateTask(void *pvParameters) {
  OTATaskParams *params = (OTATaskParams *)pvParameters;
  String url = params->url;
  String root_ca_str = params->root_ca;
  String sha256_hash_str = params->sha256;
  delete params;

  bool overall_success = false;

  for (int attempt = 1; attempt <= _maxRetries; ++attempt) {
    bool attempt_succeeded = false;
    bool is_fatal_error = false;
    int error_code = 0;
    String error_message = "";

    Serial.printf("[OTA] Starting update attempt %d/%d from %s\n", attempt,
                  _maxRetries, url.c_str());

    do {
      if (WiFi.status() != WL_CONNECTED) {
        error_code = OTA_TRANSIENT_WIFI_DISCONNECTED;
        error_message = "WiFi not connected";
        break;
      }

      HTTPClient http;
      WiFiClient *client = nullptr;

      if (url.startsWith("https://")) {
        WiFiClientSecure *secure_client = new WiFiClientSecure;
        if (!root_ca_str.isEmpty()) {
          secure_client->setCACert(root_ca_str.c_str());
        } else {
          secure_client->setInsecure();
          Serial.println("[OTA] WARNING: Certificate validation is DISABLED! "
                         "This is insecure!");
        }
        client = secure_client;
      } else {
        client = new WiFiClient;
      }

      http.begin(*client, url);

      int httpCode = http.GET();
      if (httpCode != HTTP_CODE_OK) {
        if (httpCode >= 400 && httpCode < 500) {
          is_fatal_error = true;
          error_code = OTA_FATAL_HTTP_4XX_ERROR;
        } else {
          error_code = OTA_TRANSIENT_HTTP_GET_FAILED;
        }
        error_message = "HTTP GET failed: " + http.errorToString(httpCode);
        http.end();
        delete client;
        break;
      }

      int contentLength = http.getSize();
      if (contentLength <= 0) {
        error_code = OTA_TRANSIENT_NO_CONTENT_LENGTH;
        error_message = "Content-Length header invalid or missing";
        http.end();
        delete client;
        break;
      }
      Serial.printf("[OTA] Firmware size: %d bytes\n", contentLength);

      if (!Update.begin(contentLength)) {
        is_fatal_error = true;
        error_code = OTA_FATAL_NO_SPACE;
        StreamString updateErrorStream;
        Update.printError(updateErrorStream);
        error_message = "Not enough space to begin OTA: " + updateErrorStream;
        http.end();
        delete client;
        break;
      }

      size_t written = 0;
      uint8_t buff[4096] = {0};
      Stream &stream = http.getStream();
      bool sha256_verification_enabled = !sha256_hash_str.isEmpty();
      mbedtls_sha256_context sha256_ctx;

      if (sha256_verification_enabled) {
        mbedtls_sha256_init(&sha256_ctx);
        mbedtls_sha256_starts(&sha256_ctx, 0);
      }

      unsigned long lastDataTime = millis();
      while (http.connected() && (written < contentLength)) {
        if (millis() - lastDataTime > DOWNLOAD_TIMEOUT_MS) {
          error_code = OTA_TRANSIENT_DOWNLOAD_TIMEOUT;
          error_message = "Download timed out (no data received)";
          break;
        }

        size_t len = stream.readBytes(buff, sizeof(buff));
        if (len > 0) {
          lastDataTime = millis();
          if (Update.write(buff, len) != len) {
            is_fatal_error = true;
            error_code = OTA_FATAL_FLASH_WRITE_ERROR;
            error_message = "Flash write error";
            break;
          }
          if (sha256_verification_enabled) {
            mbedtls_sha256_update(&sha256_ctx, buff, len);
          }
          written += len;
          if (_progressCallback) {
            _progressCallback(written, contentLength);
          }
        }
        vTaskDelay(1);
      }

      if (error_code != 0 || is_fatal_error) {
        http.end();
        delete client;
        break;
      }

      if (written != contentLength) {
        error_code = OTA_TRANSIENT_DOWNLOAD_INCOMPLETE;
        error_message = "Download incomplete";
        http.end();
        delete client;
        break;
      }

      if (sha256_verification_enabled) {
        uint8_t calculated_hash[32];
        uint8_t expected_hash[32];
        mbedtls_sha256_finish(&sha256_ctx, calculated_hash);
        mbedtls_sha256_free(&sha256_ctx);
        _hexStringToBytes(sha256_hash_str, expected_hash, 32);

        if (memcmp(calculated_hash, expected_hash, 32) != 0) {
          is_fatal_error = true;
          error_code = OTA_FATAL_SHA256_MISMATCH;
          error_message = "SHA256 verification failed";
          http.end();
          delete client;
          break;
        }
        Serial.println("[OTA] SHA256 verification passed.");
      }

      attempt_succeeded = true;
      http.end();
      delete client;

    } while (false);

    if (attempt_succeeded) {
      overall_success = true;
      break;
    }

    Update.abort();

    if (is_fatal_error || attempt == _maxRetries) {
      Serial.printf("[OTA] Final error after %d attempts: %s (Code: %d)\n",
                    attempt, error_message.c_str(), error_code);
      if (_errorCallback) {
        _errorCallback(error_code, error_message.c_str());
      }
      vTaskDelete(NULL);
      return;
    }

    unsigned long delay_ms = _initialRetryDelayMs * (1 << (attempt - 1));
    Serial.printf("[OTA] Attempt %d failed: %s. Retrying in %lu ms...\n",
                  attempt, error_message.c_str(), delay_ms);

    if (_retryCallback) {
      _retryCallback(attempt, _maxRetries, error_message.c_str(), delay_ms);
    }
    vTaskDelay(pdMS_TO_TICKS(delay_ms));
  }

  if (overall_success) {
    if (!Update.end(true)) {
      int final_error_code = OTA_FATAL_UPDATE_END_FAILED;
      StreamString updateErrorStream;
      Update.printError(updateErrorStream);
      String final_error_msg =
          "Update.end() failed. Error: " + updateErrorStream;
      Serial.printf("[OTA] FATAL ERROR: %s\n", final_error_msg.c_str());
      if (_errorCallback) {
        _errorCallback(final_error_code, final_error_msg.c_str());
      }
    } else {
      const char *success_msg = "Update successful! Rebooting...";
      Serial.printf("[OTA] %s\n", success_msg);
      if (_successCallback) {
        _successCallback(success_msg);
      }
      delay(1000);
      ESP.restart();
    }
  }

  vTaskDelete(NULL);
}

void OTA::_updateTaskTrampoline(void *pvParameters) {
  OTATaskParams *params = (OTATaskParams *)pvParameters;
  params->instance->_updateTask(pvParameters);
}

void OTA::updateFromURL(const String &url, const char *root_ca,
                        const char *sha256) {
  OTATaskParams *params = new OTATaskParams();
  params->instance = this;
  params->url = url;
  if (root_ca) {
    params->root_ca = root_ca;
  }
  if (sha256) {
    params->sha256 = sha256;
  }
  xTaskCreate(_updateTaskTrampoline, "OTA_Update_Task", 12288, params, 10,
              NULL);
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

void OTA::_hexStringToBytes(const String &hexString, uint8_t *bytes,
                            size_t length) {
  String cleanHex = hexString;
  cleanHex.replace(" ", "");
  cleanHex.replace(":", "");
  cleanHex.toLowerCase();
  if (cleanHex.length() != length * 2) {
    memset(bytes, 0, length);
    return;
  }
  for (size_t i = 0; i < length; i++) {
    String byteString = cleanHex.substring(i * 2, i * 2 + 2);
    bytes[i] = (uint8_t)strtol(byteString.c_str(), NULL, 16);
  }
}

void OTA::otaCommand(const char *topic, const char *payload) {
  if (_instance == nullptr) {
    Serial.println(
        "[OTA] Error: No OTA instance available for command handling");
    return;
  }
  // Check if the topic matches the expected command topic
  String expectedTopic = String(MQTT_TOPIC_COMMAND "/" PLATFORMIO_BOARD_NAME);
  if (strcmp(topic, expectedTopic.c_str()) != 0) {
    Serial.println("[OTA] Ignoring command - topic does not match");
    return;
  }
  Serial.printf("[OTA] Received MQTT command: %s\n", payload);
  _instance->_parseOtaCommand(payload);
}

void OTA::_parseOtaCommand(const char *payload) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.printf("[OTA] JSON parsing failed: %s\n", error.c_str());
    return;
  }

  if (doc["OTA"]["firmwareUrl"].is<const char *>()) {
    const char *firmwareUrl = doc["OTA"]["firmwareUrl"];
    const char *sha256 = doc["OTA"]["SHA256"]; // Can be null
    Serial.printf("[OTA] Received firmware URL: %s\n", firmwareUrl);
    if (sha256) {
      Serial.printf("[OTA] Received SHA256: %s\n", sha256);
    }
    updateFromURL(firmwareUrl, root_ca, sha256);
  } else {
    Serial.println("[OTA] Invalid or missing OTA parameters in MQTT message");
  }
}