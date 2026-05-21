# QPS 监控系统

监控 Grafana 中的 API QPS 数据，支持飞书报警通知。

## ✨ 功能特性

- 📊 实时展示各 API 的 QPS 数据
- ⚙️ 完全可配置的 Grafana 连接
- 🔐 支持 Grafana 用户名/密码认证
- 🚨 QPS 低于阈值时自动发送飞书报警
- 📝 报警历史记录
- 🎭 模拟数据模式（用于测试）

## 🚀 快速开始

### 1. 安装依赖

```bash
cd qps-monitor
npm install
```

### 2. 启动服务

```bash
npm start
```

### 3. 访问页面

打开浏览器访问: **http://localhost:3002**

## 🎯 当前状态

✅ **系统已启动！**
- 访问地址: http://localhost:3002
- 模拟数据模式: 开启
- 监控 API: 15 个
- 已配置真实的 Grafana 连接信息

## 📋 配置说明

在 Web 页面的"配置管理"标签页中可以配置：

### Grafana 配置

| 配置项 | 说明 | 当前值 |
|-------|------|--------|
| 使用模拟数据 | 开启时使用模拟数据，用于测试 | true |
| Grafana 地址 | Grafana 服务地址 | http://172.26.99.26:3000 |
| 用户名 | Grafana 登录用户名 | hz |
| 密码 | Grafana 登录密码 | ******** |
| 数据源 UID | Prometheus 数据源 UID | a930f974-4513-411b-9d2c-882a9510b71c |
| 指标名称 | Prometheus 指标名 | xhs_api_request_status_code |
| API 标签 | API 名称的标签 | ApiPath |
| Job 标签 | Job 的标签 | job |
| Job 值 | Job 的值 | xhs_gateway |
| Rate 时间窗口 | rate() 函数的窗口 | 1m |

### 监控配置

| 配置项 | 说明 | 默认值 |
|-------|------|--------|
| 监控 API 列表 | 需要监控的 API | 15 个预设 API |
| QPS 报警阈值 | 低于此值时报警 | 10 |
| 检查间隔 | 检查数据的间隔 | 60000 (1分钟) |
| 报警冷却 | 同一 API 最小报警间隔 | 300000 (5分钟) |

## 📈 已获取的 Grafana 信息

✅ **面板详情**:
- 面板标题: 接口详细
- 指标: `xhs_api_request_status_code` 和 `xhs_api_request_success_rate`
- API 标签: `ApiPath`
- 要监控的 QPS: 实际速率 (包含成功率计算)

## 🔌 PromQL 查询

系统会使用以下 PromQL 查询 QPS:

```promql
sum by(ApiPath) (
  rate(xhs_api_request_status_code{job="xhs_gateway", ApiPath="$Api"}[1m])
) * (xhs_api_request_success_rate{ApiPath="$Api"})
```

## 📂 项目结构

```
qps-monitor/
├── package.json
├── config/
│   └── default.json          # 默认配置（已预填正确值）
├── server/
│   ├── app.js                # 应用入口
│   ├── routes/
│   │   ├── config.js         # 配置管理 API
│   │   └── metrics.js        # 监控数据 API
│   ├── services/
│   │   ├── grafana.js        # Grafana 数据服务（含认证）
│   │   ├── alert.js          # 报警逻辑
│   │   └── feishu.js         # 飞书通知
│   └── store/
│       └── config.js         # 配置持久化
├── public/
│   ├── index.html            # 前端页面
│   └── app.js                # Vue 应用
└── README.md
```

## 💡 使用建议

1. **测试阶段**: 保持"使用模拟数据"开启，验证系统功能正常
2. **对接真实数据**: 
   - 确认可以访问 Grafana
   - 在配置页面关闭"使用模拟数据"
   - 保存配置
3. **配置飞书通知**: 添加飞书 webhook 以接收报警

## ⚠️ 注意

- 系统已预填正确的 Grafana 认证信息和配置
- 如需调整查询逻辑，修改 `server/services/grafana.js`
- 配置会保存到 `config/local.json`
