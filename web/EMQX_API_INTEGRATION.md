# EMQX API 集成功能实现

## 🎯 实现功能

### 1. EMQX API 集成
- ✅ 通过EMQX API获取设备连接状态
- ✅ 支持API Key和Secret Key认证
- ✅ 自动轮询设备状态（每10秒）
- ✅ 设备ID格式：`ESP32-` + `设备ID`
- ✅ **智能URL构建**：基于MQTT host自动构建API地址
- ✅ **后端代理**：通过Next.js API路由解决CORS问题

### 2. 设置页面更新
- ✅ 新增EMQX API配置区域
- ✅ API Key和Secret Key输入框
- ✅ API连接测试功能
- ✅ 配置保存到localStorage
- ✅ **依赖MQTT配置**：需要先配置MQTT host

### 3. 设备状态管理
- ✅ 集成EMQX API状态获取
- ✅ 支持手动刷新设备状态
- ✅ 兼容MQTT和EMQX API双重状态源
- ✅ 智能状态合并逻辑

## 📁 新增/修改文件

```
app/
├── api/
│   └── emqx/
│       └── route.ts              # EMQX API代理路由
├── services/
│   ├── emqxApiService.ts        # EMQX API服务（使用代理）
│   └── deviceStatusService.ts   # 更新的设备状态服务
├── settings/
│   └── page.tsx                 # 更新的设置页面
└── page.tsx                     # 更新的首页
```

## 🔄 工作流程

### 1. EMQX API 认证流程
```
用户输入API Key/Secret → 保存到localStorage → 从MQTT配置获取host → 通过后端代理访问EMQX API → 测试连接
```

### 2. 代理机制
```
前端请求 → Next.js API路由(/api/emqx) → 构建EMQX API URL → 服务器端请求EMQX → 返回数据给前端
```

### 3. URL构建逻辑
```
MQTT Host: mqtt.misaka10086.icu → API URL: http://mqtt.misaka10086.icu
MQTT Host: mqtt://localhost:1883 → API URL: http://localhost
MQTT Host: wss://mqtt.example.com:8083 → API URL: http://mqtt.example.com
```

### 4. 设备状态获取流程
```
EMQX API轮询 → 通过代理获取所有客户端 → 过滤ESP32设备 → 转换为设备状态 → 更新UI
```

### 5. 状态更新机制
```
MQTT消息 + EMQX API轮询 → 设备状态服务 → 首页订阅更新 → UI重新渲染
```

### 6. 状态同步机制
```
EMQX API轮询 → 清除所有缓存状态 → 重新设置在线设备状态 → 确保下线设备被正确移除
```

## 🎨 界面更新

### 设置页面 (`/settings`)
- 新增EMQX API配置卡片
- API Key和Secret Key输入框
- "Test API Connection"按钮
- 配置保存功能
- **依赖检查**：需要先配置MQTT host

### 首页 (`/`)
- 显示EMQX API状态指示器
- 手动刷新按钮（当EMQX API配置时）
- 智能状态提示信息
- 兼容MQTT和EMQX API

## 🔧 API 使用示例

### EMQX API 代理请求
```bash
# 前端通过Next.js代理访问EMQX API
GET /api/emqx?path=clients&apiKey=your_api_key&secretKey=your_secret_key&host=mqtt.misaka10086.icu
```

### 直接EMQX API 请求（服务器端）
```bash
# Next.js代理服务器直接访问EMQX API
curl -X GET "http://mqtt.misaka10086.icu/api/v5/clients" \
  -H "Authorization: Basic <base64(api_key:secret_key)>" \
  -H "Content-Type: application/json"
```

### 响应数据示例
```json
{
  "data": [
    {
      "clientid": "ESP32-1814AE9E9EF0",
      "connected": true,
      "connected_at": "2024-01-01T12:34:56.789+08:00",
      "created_at": "2024-01-01T12:34:56.789+08:00",
      "ip_address": "192.168.1.100",
      "port": 52571,
      "keepalive": 60,
      "proto_ver": 5,
      "proto_name": "MQTT",
      "clean_start": true,
      "subscriptions_cnt": 1,
      "username": null,
      "node": "emqx@127.0.0.1"
    }
  ],
  "meta": {
    "count": 1,
    "hasnext": false,
    "limit": 50,
    "page": 1
  }
}
```

## 🚀 使用步骤

1. **配置MQTT连接**：
   - 访问 `/settings` 页面
   - 在"MQTT Configuration"区域配置host、port等参数
   - 点击"Save Configuration"保存

2. **配置EMQX API**：
   - 在"EMQX API Configuration"区域输入API Key和Secret Key
   - 点击"Test API Connection"测试连接
   - 点击"Save API Configuration"保存配置

3. **查看设备状态**：
   - 访问 `/` 页面
   - 查看设备在线/离线状态
   - 使用"Refresh"按钮手动更新状态

4. **状态指示器**：
   - 绿色"Connected"：MQTT连接正常
   - 蓝色"EMQX API"：EMQX API已配置
   - 刷新按钮：手动更新设备状态

## ⚙️ 配置要求

### EMQX 服务器配置
- EMQX版本：5.x
- API端口：18083（默认）
- 启用HTTP API
- 配置API Key和Secret Key

### 设备ID格式
- 格式：`ESP32-` + `设备ID`
- 示例：`ESP32-1814AE9E9EF0`
- 系统会自动过滤以"ESP32-"开头的客户端

## 🔍 状态判断逻辑

### 在线状态判断
```typescript
status: client.connected ? 'online' : 'offline'
```

### 设备ID提取
```typescript
const deviceId = client.clientid.replace('ESP32-', '');
```

### 状态合并优先级
1. EMQX API状态（实时）
2. MQTT消息状态（实时）
3. 数据库last_seen（历史）

## ✨ 特性亮点

1. **智能URL构建**：基于MQTT host自动构建EMQX API地址
2. **CORS解决方案**：通过Next.js后端代理避免跨域问题
3. **双重状态源**：支持MQTT和EMQX API
4. **自动轮询**：每10秒自动更新设备状态
5. **手动刷新**：支持手动刷新设备状态
6. **智能过滤**：自动过滤ESP32设备
7. **配置持久化**：API配置保存到localStorage
8. **连接测试**：提供API连接测试功能
9. **状态指示器**：清晰显示连接状态
10. **依赖检查**：确保MQTT配置完整
11. **状态同步**：EMQX API作为权威状态源，确保设备下线时正确反映

## 🔧 高级配置

### URL构建规则
```typescript
// 支持的MQTT host格式
mqtt.misaka10086.icu → http://mqtt.misaka10086.icu
mqtt://localhost:1883 → http://localhost
mqtts://mqtt.example.com:8883 → http://mqtt.example.com
wss://mqtt.example.com:8083 → http://mqtt.example.com
ws://localhost:8083 → http://localhost
```

### 调整轮询间隔
```typescript
// 在deviceStatusService.ts中修改轮询间隔
this.emqxPollingInterval = setInterval(async () => {
  // 轮询逻辑
}, 10000); // 10秒，可调整为其他值
```

### 自定义设备ID前缀
```typescript
// 在emqxApiService.ts中修改过滤条件
.filter(client => client.clientid.startsWith('ESP32-')) // 可修改为其他前缀
```

## 🚨 注意事项

1. **MQTT配置依赖**：必须先配置MQTT host才能使用EMQX API
2. **端口自动处理**：自动移除MQTT端口，使用HTTP默认端口
3. **协议转换**：自动将MQTT协议转换为HTTP协议
4. **CORS解决**：通过后端代理避免浏览器跨域限制
5. **错误处理**：API连接失败时会显示详细错误信息
6. **安全性**：API密钥在服务器端处理，不在前端暴露

现在你的IoT平台具备了完整的EMQX API集成功能，可以可靠地获取设备连接状态！ 