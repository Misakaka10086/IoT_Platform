# EMQX WebHook 配置指南

本文档说明如何在 EMQX 中配置 WebHook，以便在设备连接和断开时实时通知后端服务。

## 1. EMQX WebHook 配置

### 1.1 通过 EMQX Dashboard 配置

1. 登录 EMQX Dashboard (通常是 `http://your-emqx-host:18083`)
2. 进入 **Data Integration** → **Webhook**
3. 点击 **Create** 创建新的 WebHook

### 1.2 WebHook 配置参数

- **Name**: `device_status_webhook`
- **URL**: `http://your-backend-domain/api/emqx/webhook`
- **Method**: `POST`
- **Headers**: 
  ```
  Content-Type: application/json
  ```
- **Body**: 保持默认（EMQX 会自动发送事件数据）

### 1.3 事件类型配置

在 WebHook 配置中，选择以下事件类型：

- ✅ `client.connected` - 客户端连接事件
- ✅ `client.disconnected` - 客户端断开事件

### 1.4 通过 EMQX CLI 配置

如果无法访问 Dashboard，可以通过 CLI 配置：

```bash
# 创建 WebHook
emqx_ctl webhook create device_status_webhook \
  --url "http://your-backend-domain/api/emqx/webhook" \
  --method "POST" \
  --headers '{"Content-Type": "application/json"}' \
  --events "client.connected,client.disconnected"

# 启用 WebHook
emqx_ctl webhook enable device_status_webhook

# 查看 WebHook 状态
emqx_ctl webhook list
```

## 2. 后端服务配置

### 2.1 环境变量

确保后端服务可以接收来自 EMQX 的 WebHook 请求：

```bash
# 如果需要认证，可以设置 WebHook 密钥
EMQX_WEBHOOK_SECRET=your_webhook_secret
```

### 2.2 网络配置

确保 EMQX 服务器可以访问你的后端服务：

- 如果使用内网，确保网络连通性
- 如果使用公网，确保防火墙允许相应端口
- 如果使用反向代理，确保正确转发请求

## 3. 测试 WebHook

### 3.1 测试连接事件

1. 让一个 ESP32 设备连接到 EMQX
2. 检查后端日志，应该看到类似以下日志：
   ```
   📨 Received EMQX WebHook: {
     "event": "client.connected",
     "clientid": "ESP32-1814AE9E9EF0",
     "username": "misaka",
     "connected_at": 1750606466703,
     ...
   }
   ```

### 3.2 测试断开事件

1. 断开 ESP32 设备或等待 keepalive 超时
2. 检查后端日志，应该看到类似以下日志：
   ```
   📨 Received EMQX WebHook: {
     "event": "client.disconnected",
     "clientid": "ESP32-1814AE9E9EF0",
     "username": "misaka",
     "disconnected_at": 1750605768206,
     "reason": "keepalive_timeout",
     ...
   }
   ```

## 4. 故障排除

### 4.1 WebHook 未触发

1. 检查 EMQX Dashboard 中的 WebHook 状态
2. 检查网络连通性
3. 检查后端服务是否正常运行
4. 查看 EMQX 日志：`emqx_ctl logs`

### 4.2 后端接收不到请求

1. 检查 WebHook URL 是否正确
2. 检查防火墙设置
3. 检查后端服务日志
4. 使用 `curl` 测试端点：
   ```bash
   curl -X POST http://your-backend-domain/api/emqx/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

### 4.3 前端状态不更新

1. 检查 SSE 连接状态
2. 检查浏览器控制台是否有错误
3. 检查后端 SSE 服务是否正常运行
4. 检查设备 ID 格式是否正确（应该移除 "ESP32-" 前缀）

## 5. 性能优化

### 5.1 WebHook 批量处理

对于高并发场景，可以考虑：

1. 在 EMQX 中配置批量发送
2. 在后端实现批量处理逻辑
3. 使用消息队列缓冲事件

### 5.2 连接池优化

1. 配置合适的数据库连接池大小
2. 优化 WebHook 处理逻辑
3. 监控系统资源使用情况

## 6. 安全考虑

### 6.1 WebHook 认证

可以添加 WebHook 认证机制：

1. 在 EMQX 中配置认证头
2. 在后端验证认证信息
3. 使用 HTTPS 传输

### 6.2 数据验证

1. 验证 WebHook 数据格式
2. 限制请求频率
3. 记录异常请求

## 7. 监控和日志

### 7.1 监控指标

- WebHook 发送成功率
- 后端处理延迟
- 设备状态更新频率
- SSE 连接数

### 7.2 日志记录

- WebHook 接收日志
- 设备状态变更日志
- 错误和异常日志
- 性能指标日志 