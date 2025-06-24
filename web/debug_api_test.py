#!/usr/bin/env python3
"""
调试API测试脚本
测试新添加的调试接口和增强的日志功能
"""

import requests
import json
from datetime import datetime

# 配置
BASE_URL = "https://io-t-platform-git-web-misakaka10086s-projects.vercel.app"
TIMEOUT = 15


def test_basic_endpoint():
    """测试基本测试端点"""
    print("🧪 测试基本端点...")

    try:
        response = requests.get(f"{BASE_URL}/api/test", timeout=TIMEOUT)
        print(f"   状态码: {response.status_code}")
        print(f"   响应: {response.text}")

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 成功! 消息: {data.get('message')}")
            return True
        else:
            print("   ❌ 失败!")
            return False

    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return False


def test_json_endpoint():
    """测试JSON测试端点"""
    print("\n🧪 测试JSON端点...")

    try:
        response = requests.get(f"{BASE_URL}/api/test?type=json", timeout=TIMEOUT)
        print(f"   状态码: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 成功! 消息: {data.get('message')}")
            print(f"   数据: {data.get('data')}")
            return True
        else:
            print(f"   ❌ 失败: {response.text}")
            return False

    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return False


def test_error_endpoint():
    """测试错误端点"""
    print("\n🧪 测试错误端点...")

    try:
        response = requests.get(f"{BASE_URL}/api/test?type=error", timeout=TIMEOUT)
        print(f"   状态码: {response.status_code}")
        print(f"   响应: {response.text}")

        if response.status_code == 400:
            print("   ✅ 成功! 按预期返回400错误")
            return True
        else:
            print("   ❌ 失败! 应该返回400错误")
            return False

    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return False


def test_post_endpoint():
    """测试POST端点"""
    print("\n🧪 测试POST端点...")

    data = {"test": "data", "number": 123, "timestamp": datetime.now().isoformat()}

    try:
        response = requests.post(
            f"{BASE_URL}/api/test",
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
        print(f"   状态码: {response.status_code}")
        print(f"   响应: {response.text}")

        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ 成功! 消息: {result.get('message')}")
            print(f"   接收到的数据: {result.get('receivedData')}")
            return True
        else:
            print("   ❌ 失败!")
            return False

    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return False


def test_devices_with_debug():
    """测试设备列表（带调试信息）"""
    print("\n📋 测试设备列表（带调试信息）...")

    try:
        response = requests.get(f"{BASE_URL}/api/devices", timeout=TIMEOUT)
        print(f"   状态码: {response.status_code}")

        if response.status_code == 200:
            devices = response.json()
            print(f"   ✅ 成功! 设备数量: {len(devices)}")
            if devices:
                print(f"   第一个设备: {devices[0]}")
            return True
        else:
            print(f"   ❌ 失败: {response.text}")
            return False

    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return False


def test_device_registration_with_debug():
    """测试设备注册（带调试信息）"""
    print("\n📝 测试设备注册（带调试信息）...")

    data = {
        "device_id": f"TEST_{datetime.now().strftime('%H%M%S')}",
        "chip": "ESP32-C3",
        "git_version": "fd5ee45",
        "timestamp": datetime.now().isoformat(),
    }

    try:
        response = requests.post(
            f"{BASE_URL}/api/devices/register",
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
        print(f"   状态码: {response.status_code}")
        print(f"   响应: {response.text}")

        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ 成功! 消息: {result.get('message', 'No message')}")
            return True
        else:
            print("   ❌ 失败!")
            return False

    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return False


def test_device_profiles_with_debug():
    """测试设备型号（带调试信息）"""
    print("\n🔧 测试设备型号（带调试信息）...")

    try:
        response = requests.get(f"{BASE_URL}/api/device-profiles", timeout=TIMEOUT)
        print(f"   状态码: {response.status_code}")

        if response.status_code == 200:
            profiles = response.json()
            print(f"   ✅ 成功! 型号数量: {len(profiles)}")
            if profiles:
                print(f"   第一个型号: {profiles[0]}")
            return True
        else:
            print(f"   ❌ 失败: {response.text}")
            return False

    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return False


if __name__ == "__main__":
    print("🚀 调试API测试开始...")
    print(f"   目标: {BASE_URL}")
    print("=" * 50)

    tests = [
        ("基本测试端点", test_basic_endpoint),
        ("JSON测试端点", test_json_endpoint),
        ("错误测试端点", test_error_endpoint),
        ("POST测试端点", test_post_endpoint),
        ("设备列表（调试）", test_devices_with_debug),
        ("设备注册（调试）", test_device_registration_with_debug),
        ("设备型号（调试）", test_device_profiles_with_debug),
    ]

    results = []
    for name, func in tests:
        print(f"\n{'='*20} {name} {'='*20}")
        success = func()
        results.append((name, success))

    print("\n" + "=" * 50)
    print("📊 调试测试结果:")
    passed = sum(1 for _, success in results if success)
    for name, success in results:
        status = "✅" if success else "❌"
        print(f"   {status} {name}")

    print(f"\n   通过: {passed}/{len(results)}")

    if passed == len(results):
        print("🎉 所有调试测试通过！")
    else:
        print("⚠️  部分测试失败，请检查Vercel日志")
