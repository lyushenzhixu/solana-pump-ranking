# Google Analytics 配置指南

本项目集成了两部分 Google Analytics 能力：

1. **前端数据采集** — 在页面中注入 gtag.js，自动收集访问数据
2. **MCP 数据查询** — 在 Cursor 中通过自然语言查询 GA4 报告、实时数据等

---

## 一、前端数据采集（gtag.js）

### 前置条件

- 一个 [Google Analytics 4](https://analytics.google.com/) 媒体资源
- 获取 **衡量 ID**（Measurement ID），格式为 `G-XXXXXXXXXX`

### 配置步骤

1. 在 GA4 中创建 **Web 数据流**，获取 Measurement ID
2. 在 `.env` 中设置：

   ```
   GA_MEASUREMENT_ID=G-你的衡量ID
   ```

3. 重启服务，gtag.js 会自动注入到欢迎页（`/`）和榜单页（`/ranking`）

> 如果不设置 `GA_MEASUREMENT_ID`，不会注入任何追踪代码，不影响现有功能。

---

## 二、MCP 数据查询（在 Cursor 中查询 GA 数据）

### 前置条件

- Python 3.10+
- `google-analytics-mcp` 包（`pip install google-analytics-mcp`）
- Google Cloud 项目，启用 **Google Analytics Data API**
- Service Account 及 JSON 密钥文件

### 配置步骤

#### 1. 创建 Service Account

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择或创建项目
3. 进入 **APIs & Services → Library**，搜索并启用：
   - `Google Analytics Data API`
   - `Google Analytics Admin API`
4. 进入 **IAM & Admin → Service Accounts**
5. 点击 **Create Service Account**，填写名称（如 `ga-mcp-reader`）
6. 创建后，点击该 Service Account → **Keys → Add Key → Create new key → JSON**
7. 下载 JSON 密钥文件，保存到安全位置

#### 2. 授权 Service Account 访问 GA4

1. 打开 [Google Analytics](https://analytics.google.com/)
2. 进入目标媒体资源 → **管理 → 媒体资源访问管理**
3. 点击 **+** → 添加用户
4. 输入 Service Account 邮箱（JSON 文件中的 `client_email`）
5. 角色选择 **查看者（Viewer）**

#### 3. 获取 GA4 Property ID

1. 在 GA4 管理页面 → **媒体资源设置**
2. 复制 **媒体资源 ID**（纯数字，如 `123456789`）

#### 4. 配置环境变量

在 `.env` 中添加：

```
GA_SERVICE_ACCOUNT_KEY_PATH=/absolute/path/to/service-account-key.json
GA4_PROPERTY_ID=123456789
```

#### 5. 安装 MCP 依赖

```bash
pip install google-analytics-mcp
```

#### 6. MCP 配置

项目已在 `.cursor/mcp.json` 中配置好 MCP 服务器，Cursor 会自动识别。

配置路径：`.cursor/mcp.json`

```json
{
  "mcpServers": {
    "google-analytics": {
      "command": "python3",
      "args": ["-m", "ga4_mcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${GA_SERVICE_ACCOUNT_KEY_PATH}",
        "GA4_PROPERTY_ID": "${GA4_PROPERTY_ID}"
      }
    }
  }
}
```

### 在 Cursor 中使用

配置完成后，可以直接用自然语言查询 GA 数据，例如：

- "最近 7 天的访问量是多少？"
- "今天的实时用户数？"
- "过去 30 天流量最高的页面有哪些？"
- "用户主要来自哪些国家？"
- "这个月的跳出率是多少？"

### 可用工具

| 工具 | 功能 |
|------|------|
| `get_account_summaries` | 获取 GA 账号和媒体资源概览 |
| `run_report` | 运行 GA 报告（自定义维度和指标） |
| `run_realtime_report` | 查询实时分析数据 |
| `get_custom_dimensions_and_metrics` | 获取自定义维度和指标列表 |

---

## 故障排查

| 问题 | 解决 |
|------|------|
| 页面没有 GA 追踪代码 | 检查 `.env` 中 `GA_MEASUREMENT_ID` 是否设置并重启服务 |
| MCP 连接失败 | 确认 `pip install google-analytics-mcp` 已执行，Python 3.10+ |
| 权限错误 | 确认 Service Account 已添加到 GA4 媒体资源且角色为 Viewer |
| Property ID 错误 | 确认使用纯数字的媒体资源 ID，非衡量 ID（`G-` 开头的是衡量 ID） |
