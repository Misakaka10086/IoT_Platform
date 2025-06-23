# WebHook 架构说明

本文档说明新的基于 EMQX WebHook 的设备状态管理架构，替代了原有的轮询方式。

## 架构概览

```
┌─────────────┐    WebHook     ┌─────────────┐    SSE     ┌─────────────┐
│    EMQX     │ ──────────────► │   Backend   │ ──────────► │   Frontend  │
│  Broker     │                 │   (Next.js) │             │   (React)   │
└─────────────┘                 └─────────────┘             └─────────────┘
       │                               │                           │
       │  Device Connection Events     │  Real-time Updates        │
       │  (client.connected/           │  (Server-Sent Events)     │
       │   client.disconnected)        │                           │
       │                               │                           │
       │                               │  Device Status Display    │
       │                               │  (Device Cards)           │
```

## 核心组件

### 1. EMQX WebHook 接收器
- **文件**: `app/api/emqx/webhook/route.ts`
- **功能**: 接收 EMQX 发送的设备连接/断开事件
- **处理**: 解析事件数据，转换为标准格式，更新设备状态

### 2. 设备状态事件服务
- **文件**: `app/services/deviceStatusEventService.ts`
- **功能**: 管理设备状态，广播更新到所有连接的 SSE 客户端
- **特性**: 支持多客户端连接，自动清理断开的客户端

### 3. SSE 流服务
- **文件**: `app/api/device-status-stream/route.ts`
- **功能**: 提供 Server-Sent Events 流，实时推送设备状态更新
- **特性**: 支持长连接，自动重连，错误处理

### 4. 客户端状态服务
- **文件**: `app/services/deviceStatusClientService.ts`
- **功能**: 前端 SSE 客户端，处理连接、重连、消息解析
- **特性**: 自动重连机制，指数退避，状态管理

### 5. 设备状态服务（重构）
- **文件**: `app/services/deviceStatusService.ts`
- **功能**: 统一的设备状态管理接口
- **变更**: 移除轮询逻辑，集成 WebHook 和 SSE 处理

## 数据流

### 1. 设备连接事件流
```
ESP32 Device ──► EMQX Broker ──► WebHook ──► Backend API ──► SSE Service ──► Frontend
```

1. ESP32 设备连接到 EMQX
2. EMQX 触发 `client.connected` 事件
3. EMQX 发送 WebHook 到后端
4. 后端解析事件，更新设备状态
5. 通过 SSE 推送到所有连接的客户端
6. 前端更新设备卡片显示

### 2. 设备断开事件流
```
ESP32 Device ──► EMQX Broker ──► WebHook ──► Backend API ──► SSE Service ──► Frontend
```

1. ESP32 设备断开连接
2. EMQX 触发 `client.disconnected` 事件
3. EMQX 发送 WebHook 到后端
4. 后端解析事件，更新设备状态
5. 通过 SSE 推送到所有连接的客户端
6. 前端更新设备卡片显示

## 事件格式

### WebHook 事件格式
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

### SSE 消息格式
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

## 优势

### 1. 实时性
- 设备状态变更立即推送到前端
- 无需轮询，减少延迟
- 支持多客户端同时接收更新

### 2. 效率
- 减少不必要的 API 调用
- 降低服务器负载
- 减少网络流量

### 3. 可靠性
- 自动重连机制
- 错误处理和恢复
- 连接状态监控

### 4. 扩展性
- 支持多客户端连接
- 易于添加新的设备类型
- 模块化设计

## 配置要求

### 1. EMQX 配置
- 启用 WebHook 功能
- 配置 WebHook URL 指向后端 API
- 选择 `client.connected` 和 `client.disconnected` 事件

### 2. 后端配置
- 确保 WebHook 端点可访问
- 配置 CORS 支持
- 设置适当的超时时间

### 3. 前端配置
- 配置 SSE 连接 URL
- 设置重连参数
- 处理连接状态显示

## 监控和调试

### 1. 日志监控
- WebHook 接收日志
- SSE 连接状态日志
- 设备状态变更日志

### 2. 状态检查
- SSE 连接状态
- 设备状态同步
- WebHook 接收状态

### 3. 测试工具
- WebHook 测试脚本
- SSE 连接测试
- 设备状态模拟

## 故障排除

### 1. WebHook 未接收
- 检查 EMQX 配置
- 验证网络连通性
- 检查后端服务状态

### 2. SSE 连接失败
- 检查前端连接配置
- 验证后端 SSE 服务
- 检查浏览器兼容性

### 3. 状态不同步
- 检查设备 ID 格式
- 验证事件解析逻辑
- 检查状态更新流程

## 迁移指南

### 从轮询方式迁移
1. 配置 EMQX WebHook
2. 部署新的后端代码
3. 更新前端代码
4. 测试功能
5. 移除轮询相关代码

### 兼容性
- 保持 MQTT 消息处理兼容性
- 支持混合模式（WebHook + MQTT）
- 渐进式迁移支持 