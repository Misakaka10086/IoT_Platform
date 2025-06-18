// lib/OTA/src/OTA.cpp (FreeRTOS Task Version)

#include "OTA.h"
#include <HTTPClient.h>
#include <Update.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

OTA::OTA() {}

void OTA::onProgress(OTAProgressCallback callback) {
  _progressCallback = callback;
}

void OTA::onError(OTAErrorCallback callback) { _errorCallback = callback; }

void OTA::onSuccess(OTASuccessCallback callback) {
  _successCallback = callback;
}

// 这是 C++ 成员函数，不能直接被 xTaskCreate 调用
void OTA::_updateTask(void *pvParameters) {
  OTATaskParams *params = (OTATaskParams *)pvParameters;
  String url = params->url;
  String root_ca_str = params->root_ca;

  // 清理传入的参数结构体，防止内存泄漏
  delete params;

  // --- 这里是之前 updateFromURL 的所有逻辑 ---
  if (WiFi.status() != WL_CONNECTED) {
    if (_errorCallback)
      _errorCallback(0, "WiFi not connected");
    vTaskDelete(NULL); // 任务结束前必须自我删除
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

  size_t written = 0;
  uint8_t buff[4096] = {0};
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
      written += len;
      if (_progressCallback)
        _progressCallback(written, contentLength);
    }
    // 在独立任务中，简单的 delay 已经足够让调度器工作
    delay(1);
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
  // ESP.restart() 之后，下面的代码不会执行，但为了完整性保留
  vTaskDelete(NULL);
}

// 这是一个静态的“跳板”函数，FreeRTOS 通过它来调用我们的 C++ 成员函数
void OTA::_updateTaskTrampoline(void *pvParameters) {
  OTATaskParams *params = (OTATaskParams *)pvParameters;
  // 从参数中拿到 this 指针，然后调用真正的成员函数
  params->instance->_updateTask(pvParameters);
}

// 这是新的公共函数，它只负责启动任务
void OTA::updateFromURL(const String &url, const char *root_ca) {
  // 动态分配参数结构体，传递给新任务
  OTATaskParams *params = new OTATaskParams();
  params->instance = this;
  params->url = url;
  if (root_ca) {
    params->root_ca = root_ca;
  }

  // 创建任务
  // xTaskCreate(function, name, stack_size, parameters, priority, task_handle)
  xTaskCreate(_updateTaskTrampoline, "OTA_Update_Task",
              12288,   // OTA + HTTPS 需要较大的栈空间
              params, // 传递参数
              5,      // 任务优先级
              NULL    // 任务句柄，我们不需要
  );
}