# AVE Cloud Skill 能力与 API 总结

本文档汇总 AVE Cloud Skill 的能力说明及官方 API 文档要点，便于检索与对接。

---

## 1. Skill 概述

| 项目 | 说明 |
|------|------|
| **名称** | ave-cloud |
| **版本** | 1.1.2 |
| **官方 API** | https://cloud.ave.ai/ |
| **API 文档** | https://ave-cloud.gitbook.io/data-api |
| **环境变量** | `AVE_API_KEY`（必填）、`API_PLAN`（free / normal / pro） |

AVE Cloud API 覆盖 **130+ 区块链** 与 **300+ DEX**，提供链上代币搜索、行情、K 线、持币分布、交易记录、榜单、合约风险检测及 WebSocket 实时流等能力。

---

## 2. 能力清单（何时使用本 Skill）

在用户需要以下任一能力时，应使用 AVE Cloud Skill：

- 按名称、符号或合约地址**搜索代币**
- 获取代币**价格、市值、TVL、成交量、涨跌幅**
- 查看代币或交易对的 **K 线/蜡烛图（OHLCV）**
- 查看代币 **Top 100 持币地址及分布**
- 查看交易对**近期成交/swap 记录**
- 按链或主题查看**热门/榜单代币**（hot、meme、gainer、loser、AI、DePIN 等）
- 对合约做**安全/风险检测**（蜜罐、税、所有权等）
- 查询**支持的链**或某链的**主币信息**
- **Pro 计划**：交易对实时 swap/流动性事件流、K 线实时推送、多代币价格订阅、WebSocket REPL 交互

触发方式：用户输入 `/ave-cloud` 或任何涉及链上代币数据、DEX 分析的查询。

---

## 3. REST API 要点（来自 API 文档）

### 3.1 认证与限流

- **Header**：`X-API-KEY: <your_api_key>`
- **限流**：free 1 RPS，normal 5 RPS，pro 20 RPS；错误码 401/403/400/404

### 3.2 Base URL

- REST：`https://data.ave-api.xyz/v2`
- WebSocket：`wss://wss.ave-api.xyz`

### 3.3 主要端点摘要

| 能力 | 方法 | 路径/说明 |
|------|------|-----------|
| 搜索代币 | GET | `/v2/tokens?keyword={keyword}`，可选 chain、limit、orderby |
| 平台/标签代币 | GET | `/v2/tokens/platform?tag={tag}&limit&orderby`，约 90 种 tag |
| 批量价格 | POST | `/v2/tokens/price`，Body: `token_ids` 等，最多 200 个 |
| 榜单主题列表 | GET | `/v2/ranks/topics` |
| 某主题榜单 | GET | `/v2/ranks?topic={topic}` |
| 代币详情 | GET | `/v2/tokens/{token_address}-{chain}` |
| K 线（交易对） | GET | `/v2/klines/pair/{pair_address}-{chain}?interval&size` |
| K 线（代币） | GET | `/v2/klines/token/{token_address}-{chain}?interval&size` |
| Top 100 持币 | GET | `/v2/tokens/top100/{token_address}-{chain}` |
| Swap 成交 | GET | `/v2/txs/{pair_address}-{chain}` |
| 支持链列表 | GET | `/v2/supported_chains` |
| 链主币 | GET | `/v2/tokens/main?chain={chain_name}` |
| 链热门列表 | GET | `/v2/tokens/trending?chain&current_page&page_size` |
| 合约风险检测 | GET | `/v2/contracts/{token_address}-{chain}` |

常用链 ID：`eth`、`bsc`、`solana`、`base`、`arbitrum`、`optimism`、`avax`、`polygon`、`ton` 等。完整列表可通过本 Skill 的 `chains` 命令获取。

---

## 4. 本项目中使用的脚本与命令

脚本路径：`scripts/ave_data_rest.py`（相对于 skill 根目录）。所有命令输出 JSON 到 stdout，错误输出到 stderr。

| 能力 | 命令示例 |
|------|----------|
| 搜索代币 | `search --keyword <keyword> [--chain <chain>] [--limit 20]` |
| 平台代币 | `platform-tokens --platform <platform>` |
| 代币详情 | `token --address <contract> --chain <chain>` |
| 批量价格 | `price --tokens <addr>-<chain> ...` |
| K 线（代币） | `kline-token --address <token> --chain <chain> [--interval] [--size]` |
| K 线（交易对） | `kline-pair --address <pair> --chain <chain> [--interval] [--size]` |
| Top 100 持币 | `holders --address <token> --chain <chain>` |
| 成交记录 | `txs --address <pair> --chain <chain>` |
| 热门列表 | `trending --chain <chain> [--page] [--page-size]` |
| 榜单主题列表 | `rank-topics` |
| 某主题榜单 | `ranks --topic <topic>` |
| 合约风险 | `risk --address <token> --chain <chain>` |
| 支持链 | `chains` |
| 链主币 | `main-tokens --chain <chain>` |

K 线间隔（分钟）：1, 5, 15, 30, 60, 120, 240, 1440, 4320, 10080。默认 interval=60，size=24。

---

## 5. WebSocket（Pro 计划）

- 需 `API_PLAN=pro`，连接 `wss://wss.ave-api.xyz`，认证同 REST。
- 使用 JSON-RPC 2.0 格式；支持订阅：
  - **price**：多代币实时价格
  - **tx / multi_tx / liq**：交易对 swap 或流动性事件
  - **kline**：交易对 K 线推送
- 本 Skill 提供 `wss-repl` 交互式会话：可输入 `subscribe price/tx/kline`、`unsubscribe`、`quit` 等。

---

## 6. 响应与展示建议（来自 Skill 说明）

- **代币详情**：价格、24h 涨跌、市值、成交量、TVL、主要 DEX 对、风险等级
- **K 线**：趋势摘要、近期蜡烛可做 ASCII 表
- **持币**：Top 5–10 及占比，若 Top 10 >50% 标注集中度风险
- **成交**：最近约 10 条，时间、买卖、金额、钱包
- **榜单/热门**：表格形式，价格、24h 涨跌、成交量
- **风险报告**：先给出风险等级（LOW/MEDIUM/HIGH/CRITICAL），再列蜜罐、税率、所有权等
- **搜索**：表格展示 symbol、name、chain、合约、价格、24h 涨跌

---

## 7. 参考文件

- Skill 定义与操作说明：`.cursor/skills/ave-cloud/SKILL.md`
- API 端点与参数详情：`.cursor/skills/ave-cloud/references/api-endpoints.md`
