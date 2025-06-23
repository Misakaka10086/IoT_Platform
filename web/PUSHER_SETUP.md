# Pusher 设置指南

## 环境变量配置

在项目根目录创建 `.env.local` 文件，添加以下配置：

```bash
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=neondb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Pusher Configuration
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster

# EMQX Configuration (for WebHook)
EMQX_WEBHOOK_SECRET=your_webhook_secret

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

## Pusher 账户设置

### 1. 注册 Pusher 账户
1. 访问 [Pusher 官网](https://pusher.com/)
2. 注册免费账户
3. 创建新应用

### 2. 获取配置信息
在 Pusher 控制台中：
1. 选择你的应用
2. 进入 "App Keys" 页面
3. 复制以下信息：
   - App ID
   - Key
   - Secret
   - Cluster

### 3. 配置应用
1. 在 "App Settings" 中启用客户端事件
2. 设置允许的主机（开发环境：`localhost:3000`）
3. 配置安全选项

## 频道配置

### 设备状态频道
- 频道名：`device-status`
- 事件：`status-update`

### 设备事件频道
- 频道名：`device-events`
- 事件：`device-connected`, `device-disconnected`

## 测试连接

### 1. 后端测试
```bash
curl -X POST http://localhost:3000/api/pusher/config
```

### 2. 前端测试
访问应用首页，检查 Pusher 连接状态指示器。

## 故障排除

### 常见问题

1. **连接失败**
   - 检查环境变量是否正确设置
   - 确认 Pusher 应用配置
   - 检查网络连接

2. **事件未触发**
   - 确认 WebHook URL 配置正确
   - 检查 EMQX WebHook 设置
   - 查看服务器日志

3. **前端未接收事件**
   - 检查 Pusher 客户端初始化
   - 确认频道订阅状态
   - 查看浏览器控制台错误

### 调试工具

1. **Pusher 调试器**
   - 在 Pusher 控制台启用调试模式
   - 查看实时事件日志

2. **浏览器开发者工具**
   - 检查网络请求
   - 查看 WebSocket 连接状态
   - 监控控制台错误

## 生产环境部署

### Vercel 部署
1. 在 Vercel 项目设置中添加环境变量
2. 更新 Pusher 应用设置中的允许主机
3. 配置生产环境的 WebHook URL

### 安全考虑
1. 使用环境变量存储敏感信息
2. 配置 Pusher 应用的安全选项
3. 限制允许的主机和事件类型
4. 监控 API 使用量和费用 