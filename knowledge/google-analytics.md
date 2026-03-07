# Google Analytics 集成

## 概述

项目集成了 Google Analytics 4（GA4）两部分能力：

1. **前端数据采集** — 在页面中动态注入 gtag.js，收集用户访问数据
2. **MCP 数据查询** — 通过 Cursor 的 MCP 协议，用自然语言查询 GA4 报告

## 关键信息

| 项目 | 值 |
|------|-----|
| GA4 衡量 ID | `G-K2PCHH0FV6` |
| GA4 数据流名称 | zhizhilabs |
| 数据流网址 | `https://zhizhilabs.com/` |
| 数据流 ID | `13842564632` |
| MCP 包 | `google-analytics-mcp` (PyPI, v2.0.0) |
| MCP 模块 | `ga4_mcp` |

## 实现方式

### 前端追踪（gtag.js）

- 环境变量 `GA_MEASUREMENT_ID` 控制是否注入追踪代码
- 不设置时，页面完全不包含 GA 相关代码，零侵入
- 注入位置：`</head>` 标签之前
- 覆盖页面：欢迎页 (`/`) 和榜单页 (`/ranking`)

代码位置：`src/server.js` 中的 `gaSnippet()` 函数

```
欢迎页（/）     → fs.readFileSync + string replace 注入
榜单页（/ranking）→ buildRankingPage() 模板函数内直接插入
```

### MCP 查询

- 配置文件：`.cursor/mcp.json`
- 运行方式：`python3 -m ga4_mcp`
- 需要 Service Account JSON 密钥 + GA4 Property ID
- 可用工具：`get_account_summaries`、`run_report`、`run_realtime_report`、`get_custom_dimensions_and_metrics`

## 环境变量

| 变量 | 用途 | 必需 |
|------|------|------|
| `GA_MEASUREMENT_ID` | 前端 gtag.js 衡量 ID（`G-` 开头） | 前端追踪需要 |
| `GA_SERVICE_ACCOUNT_KEY_PATH` | Service Account JSON 密钥路径 | MCP 查询需要 |
| `GA4_PROPERTY_ID` | GA4 媒体资源 ID（纯数字） | MCP 查询需要 |

## 部署注意

- Railway 或其他部署平台需添加 `GA_MEASUREMENT_ID=G-K2PCHH0FV6` 环境变量
- 部署后 GA 控制台可能需要最多 48 小时确认数据收集已启用
- 详细配置步骤见 `docs/GOOGLE-ANALYTICS.md`

## 相关文件

- `src/server.js` — gaSnippet() 函数、HTML 注入逻辑
- `.cursor/mcp.json` — MCP 服务器配置
- `.env.example` — 环境变量模板
- `docs/GOOGLE-ANALYTICS.md` — 完整配置指南
