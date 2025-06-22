#!/usr/bin/env python3
"""
Test script for device configuration API
"""

import requests
import json
import sys


def test_device_config_api():
    """Test the device configuration API endpoint"""

    # API endpoint
    base_url = "http://io-t-platform-git-web-misakaka10086s-projects.vercel.app"
    endpoint = "/api/devices/register"
    url = base_url + endpoint

    # Test data
    test_device_id = "TEST1234561"
    test_chip = "ESP32-C3"

    payload = {"device_id": test_device_id, "chip": test_chip}

    headers = {"Content-Type": "application/json"}

    print(f"Testing device configuration API...")
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("-" * 50)

    try:
        # Send POST request
        response = requests.post(url, json=payload, headers=headers, timeout=10)

        print(f"Response Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            try:
                response_data = response.json()
                print(f"Response Body: {json.dumps(response_data, indent=2)}")

                # Validate response structure
                if "version" in response_data and "config" in response_data:
                    config = response_data["config"]
                    required_fields = ["MQTT_HOST", "MQTT_PORT"]

                    missing_fields = [
                        field for field in required_fields if field not in config
                    ]

                    if missing_fields:
                        print(f"ERROR: Missing required fields: {missing_fields}")
                        return False
                    else:
                        print("SUCCESS: API response is valid!")
                        return True
                else:
                    print("ERROR: Response missing 'version' or 'config' fields")
                    return False

            except json.JSONDecodeError as e:
                print(f"ERROR: Invalid JSON response: {e}")
                print(f"Raw response: {response.text}")
                return False
        else:
            print(f"ERROR: HTTP request failed with status code {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"ERROR: Request failed: {e}")
        return False


def test_multiple_devices():
    """Test with multiple device IDs"""

    base_url = "http://io-t-platform-git-web-misakaka10086s-projects.vercel.app"
    endpoint = "/api/devices/register"
    url = base_url + endpoint

    test_cases = [
        {"device_id": "ESP32_001", "chip": "ESP32"},
        {"device_id": "ESP32_002", "chip": "ESP32-C3"},
        {"device_id": "ESP32_003", "chip": "ESP32-S3"},
    ]

    headers = {"Content-Type": "application/json"}

    print("Testing multiple devices...")
    print("=" * 50)

    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}: {test_case['device_id']} ({test_case['chip']})")
        print("-" * 30)

        try:
            response = requests.post(url, json=test_case, headers=headers, timeout=10)

            if response.status_code == 200:
                response_data = response.json()
                print(f"SUCCESS: {test_case['device_id']}")
                print(f"Config Version: {response_data.get('version', 'N/A')}")
                print(
                    f"MQTT Host: {response_data.get('config', {}).get('MQTT_HOST', 'N/A')}"
                )
            else:
                print(
                    f"FAILED: {test_case['device_id']} - Status: {response.status_code}"
                )

        except Exception as e:
            print(f"ERROR: {test_case['device_id']} - {e}")


if __name__ == "__main__":
    print("Device Configuration API Test")
    print("=" * 40)

    # Test basic API functionality
    success = test_device_config_api()

    if success:
        print("\n" + "=" * 40)
        # Test multiple devices
        test_multiple_devices()
    else:
        print("\nBasic API test failed, skipping multiple device test")
        sys.exit(1)

    print("\nTest completed!")
