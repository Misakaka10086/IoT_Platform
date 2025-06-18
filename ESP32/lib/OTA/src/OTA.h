// lib/OTA/src/OTA.h (FreeRTOS Task Version)
#ifndef OTA_H
#define OTA_H

#include <Arduino.h>
#include <functional>

using OTAProgressCallback = std::function<void(unsigned int, unsigned int)>;
using OTAErrorCallback = std::function<void(int, const char *)>;
using OTASuccessCallback = std::function<void(const char *)>;

class OTA;

// 结构体，用于向新创建的 FreeRTOS 任务传递参数
struct OTATaskParams {
  OTA *instance;
  String url;
  String root_ca;
};

class OTA {
public:
  OTA();
  void onProgress(OTAProgressCallback callback);
  void onError(OTAErrorCallback callback);
  void onSuccess(OTASuccessCallback callback);

  // 这个公共函数现在只负责创建后台任务，然后立即返回（非阻塞）
  void updateFromURL(const String &url, const char *root_ca = nullptr);

private:
  // 实际执行更新的函数，它将在一个独立的任务中运行
  void _updateTask(void *pvParameters);

  // 让 C++ 成员函数可以被 FreeRTOS 的 C 风格 API 调用
  static void _updateTaskTrampoline(void *pvParameters);

  OTAProgressCallback _progressCallback;
  OTAErrorCallback _errorCallback;
  OTASuccessCallback _successCallback;
};

#endif // OTA_H