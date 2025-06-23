# IoT Device Management Platform

一个基于 Next.js 和 EMQX 的现代化 IoT 设备管理平台，支持实时设备状态监控、设备注册和配置管理。

## 特性

- **实时设备状态监控** - 基于 EMQX WebHook 和 Server-Sent Events 的实时状态更新
- **设备注册管理** - PostgreSQL 数据库支持设备注册和配置管理
- **现代化 UI** - 基于 Material-UI 的响应式设计，支持明暗主题切换
- **MQTT 集成** - 完整的 MQTT 连接管理，支持 WebSocket 传输
- **实时推送** - 无需轮询，设备状态变更立即推送到前端
- **自动重连** - SSE 连接自动重连机制，确保连接稳定性

## 架构概览

```mermaid
graph TB
    subgraph "IoT Devices"
        ESP32[ESP32 Device]
    end
    
    subgraph "EMQX Broker"
        EMQX[EMQX MQTT Broker]
        WebHookConfig[WebHook Configuration]
    end
    
    subgraph "Backend (Next.js)"
        WebHookAPI["/api/emqx/webhook"]
        EventService[Device Status Event Service]
        SSEAPI["/api/device-status-stream"]
        DB[(PostgreSQL Database)]
    end
    
    subgraph "Frontend (React)"
        ReactApp[React Application]
        DeviceCards[Device Cards]
        StatusDisplay[Status Display]
    end
    
    ESP32 -->|MQTT Connect/Disconnect| EMQX
    EMQX -->|WebHook Events| WebHookAPI
    WebHookAPI -->|Process Events| EventService
    EventService -->|Broadcast Updates| SSEAPI
    SSEAPI -->|SSE Stream| ReactApp
    ReactApp -->|Display| DeviceCards
    ReactApp -->|Show Status| StatusDisplay
    
    EventService -->|Store/Retrieve| DB
    
    style ESP32 fill:#e1f5fe
    style EMQX fill:#f3e5f5
    style WebHookAPI fill:#e8f5e8
    style EventService fill:#fff3e0
    style SSEAPI fill:#fce4ec
    style ReactApp fill:#f1f8e9
```

## 技术栈

### 前端
- **Next.js 15** - React 框架，使用 App Router
- **Material-UI (MUI)** - UI 组件库
- **TypeScript** - 类型安全
- **Server-Sent Events (SSE)** - 实时数据推送

### 后端
- **Next.js API Routes** - 后端 API
- **PostgreSQL** - 数据库
- **pg** - PostgreSQL 客户端
- **EMQX WebHook** - 设备事件接收

### 通信
- **MQTT** - 设备通信协议
- **WebSocket** - MQTT 传输层（浏览器端）
- **WebHook** - EMQX 事件推送

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 12+
- EMQX 5.0+

### 安装依赖

```bash
npm install
```

### 环境变量配置

创建 `.env.local` 文件：

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/iot_platform

# EMQX API Configuration (Optional)
EMQX_API_KEY=your_emqx_api_key
EMQX_SECRET_KEY=your_emqx_secret_key
```

### 数据库设置

1. 创建 PostgreSQL 数据库
2. 运行数据库迁移（参考 `DATABASE_SETUP.md`）

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 设备状态更新流程

### 设备连接流程

```mermaid
sequenceDiagram
    participant ESP32 as ESP32 Device
    participant EMQX as EMQX Broker
    participant WebHook as WebHook API
    participant EventService as Event Service
    participant SSE as SSE Stream
    participant Frontend as Frontend (React)

    ESP32->>EMQX: Connect (clientid: ESP32-1814AE9E9EF0)
    EMQX->>EMQX: client.connected event triggered
    EMQX->>WebHook: POST /api/emqx/webhook
    Note over WebHook: Event data: {event: "client.connected", clientid: "ESP32-1814AE9E9EF0", ...}
    
    WebHook->>EventService: updateDeviceStatusFromWebhook()
    EventService->>EventService: Extract device_id: "1814AE9E9EF0"
    EventService->>EventService: Create DeviceStatus: {device_id: "1814AE9E9EF0", status: "online", ...}
    EventService->>SSE: Broadcast to all connected clients
    
    loop For each connected SSE client
        SSE->>Frontend: data: {"type": "device_update", "device": {...}}
    end
    
    Frontend->>Frontend: Update device card status
    Frontend->>Frontend: Show device as "Online"
```

### 设备断开流程

```mermaid
sequenceDiagram
    participant ESP32 as ESP32 Device
    participant EMQX as EMQX Broker
    participant WebHook as WebHook API
    participant EventService as Event Service
    participant SSE as SSE Stream
    participant Frontend as Frontend (React)

    ESP32->>EMQX: Disconnect (keepalive timeout)
    EMQX->>EMQX: client.disconnected event triggered
    EMQX->>WebHook: POST /api/emqx/webhook
    Note over WebHook: Event data: {event: "client.disconnected", clientid: "ESP32-1814AE9E9EF0", reason: "keepalive_timeout", ...}
    
    WebHook->>EventService: updateDeviceStatusFromWebhook()
    EventService->>EventService: Extract device_id: "1814AE9E9EF0"
    EventService->>EventService: Create DeviceStatus: {device_id: "1814AE9E9EF0", status: "offline", reason: "keepalive_timeout", ...}
    EventService->>SSE: Broadcast to all connected clients
    
    loop For each connected SSE client
        SSE->>Frontend: data: {"type": "device_update", "device": {...}}
    end
    
    Frontend->>Frontend: Update device card status
    Frontend->>Frontend: Show device as "Offline"
```
### 前端 SSE 连接流程
```mermaid
sequenceDiagram
    participant Frontend as Frontend (React)
    participant SSE as SSE Stream API
    participant EventService as Event Service

    Frontend->>SSE: GET /api/device-status-stream
    SSE->>EventService: addClient()
    EventService->>EventService: Create new SSE client
    EventService->>SSE: Send initial device statuses
    
    SSE->>Frontend: data: {"type": "initial", "devices": [...]}
    Frontend->>Frontend: Display current device statuses
    
    loop Real-time updates
        EventService->>SSE: Broadcast device update
        SSE->>Frontend: data: {"type": "device_update", "device": {...}}
        Frontend->>Frontend: Update UI in real-time
    end
    
    Note over Frontend,SSE: Connection maintained with auto-reconnect
```

## EMQX 配置

### WebHook 配置

1. 登录 EMQX Dashboard (`http://your-emqx-host:18083`)
2. 进入 **Data Integration** → **Webhook**
3. 创建新的 WebHook：
   - **Name**: `device_status_webhook`
   - **URL**: `https://your-domain.vercel.app/api/emqx/webhook`
   - **Method**: `POST`
   - **Headers**: `Content-Type: application/json`
   - **Events**: `client.connected`, `client.disconnected`

### CLI 配置

```bash
# 创建 WebHook
emqx_ctl webhook create device_status_webhook \
  --url "https://your-domain.vercel.app/api/emqx/webhook" \
  --method "POST" \
  --headers '{"Content-Type": "application/json"}' \
  --events "client.connected,client.disconnected"

# 启用 WebHook
emqx_ctl webhook enable device_status_webhook
```

## 部署

### Vercel 部署

1. 推送代码到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

### 环境变量配置

在 Vercel 中设置以下环境变量：

```env
DATABASE_URL=postgresql://username:password@host:5432/database
EMQX_API_KEY=your_emqx_api_key
EMQX_SECRET_KEY=your_emqx_secret_key
```

### 数据库部署

推荐使用 Vercel Postgres 或其他云数据库服务。

## 项目结构
```
├── app/
│ ├── api/
│ │ ├── emqx/
│ │ │ └── webhook/ # EMQX WebHook 接收
│ │ ├── device-status-stream/ # SSE 流服务
│ │ ├── devices/ # 设备管理 API
│ │ └── device-profiles/ # 设备配置 API
│ ├── components/
│ │ ├── DeviceCard.tsx # 设备卡片组件
│ │ ├── Header.tsx # 页面头部
│ │ └── Footer.tsx # 页面底部
│ ├── services/
│ │ ├── deviceStatusService.ts # 设备状态服务
│ │ ├── deviceStatusEventService.ts # 事件服务
│ │ ├── deviceStatusClientService.ts # 客户端服务
│ │ └── mqttService.ts # MQTT 服务
│ ├── settings/ # 设置页面
│ └── page.tsx # 主页面
├── types/
│ ├── device.ts # 设备类型定义
│ └── emqx-webhook.ts # WebHook 类型定义
├── lib/
│ └── db.ts # 数据库连接
└── docs/ # 文档
```


## 🔍 API 文档

### WebHook 事件格式

#### 设备连接事件
```json
{
  "event": "client.connected",
  "clientid": "ESP32-1814AE9E9EF0",
  "username": "misaka",
  "connected_at": 1750606466703,
  "timestamp": 1750606466703,
  "node": "emqx@127.0.0.1",
  "sockname": "192.168.31.83:1883",
  "peername": "192.168.31.237:52134",
  "proto_name": "MQTT",
  "proto_ver": 4,
  "keepalive": 15,
  "clean_start": true,
  "expiry_interval": 0,
  "mountpoint": "undefined",
  "is_bridge": false,
  "receive_maximum": 32,
  "conn_props": {
    "User-Property": {}
  },
  "client_attrs": {},
  "metadata": {
    "rule_id": "test_WH_D"
  }
}
```

#### 设备断开事件
```json
{
  "event": "client.disconnected",
  "clientid": "ESP32-1814AE9E9EF0",
  "username": "misaka",
  "disconnected_at": 1750605768206,
  "timestamp": 1750605768207,
  "reason": "keepalive_timeout",
  "node": "emqx@127.0.0.1",
  "sockname": "192.168.31.83:1883",
  "peername": "192.168.31.237:58458",
  "proto_name": "MQTT",
  "proto_ver": 4,
  "disconn_props": {
    "User-Property": {}
  },
  "client_attrs": {},
  "metadata": {
    "rule_id": "test_WH_D"
  }
}
```

### SSE 消息格式

#### 设备状态更新
```json
{
  "type": "device_update",
  "device": {
    "device_id": "1814AE9E9EF0",
    "status": "online",
    "last_seen": "2024-01-01T12:00:00.000Z",
    "data": {
      "username": "misaka",
      "sockname": "192.168.31.83:1883",
      "peername": "192.168.31.237:52134",
      "proto_name": "MQTT",
      "proto_ver": 4,
      "keepalive": 15,
      "clean_start": true,
      "expiry_interval": 0,
      "mountpoint": "undefined",
      "is_bridge": false,
      "receive_maximum": 32,
      "node": "emqx@127.0.0.1",
      "event_type": "connected",
      "timestamp": 1750606466703
    }
  }
}
```

## ��️ 开发

### 添加新功能

1. 在 `types/` 目录下定义类型
2. 在 `app/services/` 目录下实现业务逻辑
3. 在 `app/api/` 目录下创建 API 路由
4. 在 `app/components/` 目录下创建 UI 组件

### 测试

```bash
# 运行测试
npm test

# 运行 WebHook 测试
python3 test_webhook.py
```

## 📚 相关文档

- [EMQX WebHook 配置指南](EMQX_WEBHOOK_SETUP.md)
- [WebHook 架构说明](WEBHOOK_ARCHITECTURE.md)
- [数据库设置指南](DATABASE_SETUP.md)
- [EMQX API 集成](EMQX_API_INTEGRATION.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## �� 许可证

MIT License

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Material-UI 文档](https://mui.com/)
- [EMQX 文档](https://docs.emqx.com/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)