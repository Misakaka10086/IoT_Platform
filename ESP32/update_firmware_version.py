Import("env")
import subprocess

def get_firmware_version():
    try:
        version = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD']).decode('ascii').strip()
        return version
    except:
        return "unknown"

firmware_version = get_firmware_version()
print(f"Setting FIRMWARE_VERSION to: {firmware_version}")

# 将 FIRMWARE_VERSION 添加到构建环境中
env.Append(CPPDEFINES=[
    ("FIRMWARE_VERSION", f'\\"{firmware_version}\\"')
])