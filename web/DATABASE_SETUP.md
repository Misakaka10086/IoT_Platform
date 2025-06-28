# Database Setup Guide

## 数据库配置

### 1. 环境变量配置

在项目根目录创建 `.env` 文件，包含以下配置：

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iot_platform
DB_USER=postgres
DB_PASSWORD=your_password_here

# Next.js Configuration
NODE_ENV=development
```

### 2. 数据库表结构

确保PostgreSQL数据库中已创建以下表：

```sql
-- 设备表
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,           -- 设备唯一标识（如MAC或SN）
  chip TEXT NOT NULL,                       -- 设备型号
  git_version VARCHAR(20) NOT NULL,         -- git版本号
  registered_at TIMESTAMPTZ DEFAULT now(),  -- 注册时间
  last_seen TIMESTAMPTZ,                    -- 最近上线时间
  online BOOLEAN DEFAULT FALSE,             -- 在线状态
  description TEXT                          -- 可选备注
);


-- 设备配置表
CREATE TABLE device_configs (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE REFERENCES devices(device_id) ON DELETE CASCADE,
  version TEXT NOT NULL,                         -- 当前激活版本号
  updated_at TIMESTAMPTZ DEFAULT now(),

  FOREIGN KEY (device_id, version) REFERENCES config_version(device_id, version)
);

-- 设备配置文件表
CREATE TABLE device_profiles (
  id SERIAL PRIMARY KEY,
  model TEXT UNIQUE NOT NULL,               -- 设备型号
  default_config JSONB NOT NULL,            -- 默认配置
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 配置版本表
CREATE TABLE config_version (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  version TEXT NOT NULL,                         -- 使用时间戳格式版本号
  git_version VARCHAR(20) NOT NULL, 
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (device_id, version)
);
-- 固件版本表
CREATE TABLE git_version (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL, 
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. 初始化数据库

1. 启动应用后，访问 `/test` 页面
2. 点击 "Initialize Database" 按钮
3. 这将插入默认的设备配置文件（ESP32、ESP8266、Arduino）

### 4. 测试设备注册

在 `/test` 页面可以测试设备注册功能：

1. 输入设备ID和芯片类型
2. 点击 "Test Registration" 按钮
3. 查看返回的配置信息

### 5. API 端点

- `POST /api/devices/register` - 设备注册
- `GET /api/devices` - 获取所有设备
- `POST /api/init` - 初始化数据库

### 6. 设备注册流程

#### 新设备上线：
1. 设备发送POST请求到 `/api/devices/register`
2. 平台检查设备是否存在
3. 如果不存在，创建新设备记录
4. 获取对应芯片的默认配置
5. 生成配置版本号
6. 返回配置给设备

#### 老设备上线：
1. 设备发送POST请求到 `/api/devices/register`
2. 平台检查设备是否存在
3. 如果存在，获取当前激活配置
4. 返回配置给设备

### 7. MQTT 集成

设备通过MQTT发送状态信息，格式：

```json
{
  "device_id": "ABC123456",
  "chip": "ESP32",
  "status": "Online",
  "data": {
    "temperature": 25.5,
    "humidity": 60.2
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

平台会实时更新设备状态并在Home页面显示。 