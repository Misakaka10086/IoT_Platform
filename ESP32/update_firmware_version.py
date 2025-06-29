Import("env")
import subprocess


def get_git_version():
    try:
        version = (
            subprocess.check_output(["git", "rev-parse", "HEAD"])
            .decode("ascii")
            .strip()
        )
        return version
    except:
        return "unknown"


git_version = get_git_version()
print(f"Setting GIT_VERSION to: {git_version}")

# 将 FIRMWARE_VERSION 添加到构建环境中
env.Append(CPPDEFINES=[("GIT_VERSION", f'\\"{git_version}\\"')])
