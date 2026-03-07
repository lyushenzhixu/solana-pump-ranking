# Binance 系列 Skill 能力与 API 总结

本文档汇总 Binance 相关各 Skill 的能力说明及 API 文档要点，便于检索与对接。

---

## 1. 总览

| Skill | 用途概要 | 认证 |
|-------|----------|------|
| **binance-spot** | 现货行情、账户、下单、撤单等 | API Key + Secret（部分接口需签名） |
| **crypto-market-rank** | 榜单：社交热度、统一代币榜、聪明钱流入、Meme 榜、地址 PnL | 无（公开 API） |
| **meme-rush** | Meme 生命周期（新/即将迁移/已迁移）、话题 Rush | 无 |
| **query-address-info** | 钱包持币与仓位 | 无 |
| **query-token-audit** | 代币安全审计（蜜罐、税、恶意合约） | 无 |
| **query-token-info** | 代币搜索、元数据、实时行情、K 线 | 无 |
| **trading-signal** | 聪明钱买卖信号、触发价、当前价、最大收益、出场率 | 无 |

除 Spot 外，其余均为 Binance Web3 / 公开 BAPI，Base URL 多为 `https://web3.binance.com/bapi/...`。

---

## 2. Binance Spot Skill

### 2.1 能力与使用场景

- 现货行情：Ping、时间、交易对信息、深度、成交、K 线、24h 统计、最新价等
- 账户：资产、佣金、挂单、历史订单、成交记录等
- 交易：下单、撤单、改单、OCO/OPO/OTO 等组合单、SOR 下单

### 2.2 API 文档要点

- **Base URL**：主网 `https://api.binance.com`，测试网 `https://testnet.binance.vision`，Demo `https://demo-api.binance.com`
- **认证**：需 API Key + Secret；签名方式 HMAC SHA256（或 RSA/Ed25519 视配置）；Header `X-MBX-APIKEY`
- **User-Agent**：`binance-spot/1.0.1 (Skill)`
- **常用端点示例**：
  - `GET /api/v3/ping`、`/api/v3/time`、`/api/v3/exchangeInfo`
  - `GET /api/v3/depth`、`/api/v3/trades`、`/api/v3/klines`、`/api/v3/ticker/24hr`、`/api/v3/avgPrice`
  - `GET /api/v3/account`、`/api/v3/openOrders`、`/api/v3/myTrades`
  - `POST /api/v3/order`、`DELETE /api/v3/order`、`DELETE /api/v3/openOrders`
- **安全**：密钥仅展示部分字符；主网下单前需用户确认（如输入 CONFIRM）

---

## 3. Crypto Market Rank Skill

### 3.1 能力与使用场景

- 社交热度榜单：按链、情绪、时间范围查社交热度排行
- 统一代币榜：Trending(10)、Top Search(11)、Alpha(20)、Stock(40)，支持链/周期/排序/多维度筛选
- 聪明钱流入榜：按链、时间窗口查聪明钱净流入排名
- Meme 榜：Pulse 等 launchpad 的 Meme 代币排行（如 BSC chainId=56）
- 地址 PnL 榜：按链、周期、标签（如 KOL）查交易员盈亏排行

### 3.2 支持的链与 API 摘要

| 链 | chainId |
|----|---------|
| BSC | 56 |
| Base | 8453 |
| Solana | CT_501 |

| API | 方法 | URL 路径（base: web3.binance.com） |
|-----|------|-----------------------------------|
| Social Hype Leaderboard | GET | `/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/pulse/social/hype/rank/leaderboard` |
| Unified Token Rank | POST | `/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/pulse/unified/rank/list` |
| Smart Money Inflow Rank | POST | `/bapi/defi/v1/public/wallet-direct/tracker/wallet/token/inflow/rank/query` |
| Meme Rank | GET | `/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/pulse/exclusive/rank/list` |
| Address Pnl Rank | GET | `/bapi/defi/v1/public/wallet-direct/market/leaderboard/query` |

图标 URL 需加前缀：`https://bin.bnbstatic.com` + 返回的 path。

---

## 4. Meme Rush Skill

### 4.1 能力与使用场景

- **Meme Rush**：按 launchpad 生命周期阶段查 Meme 代币  
  - rankType 10：新上（bonding curve 上）  
  - 20：即将迁移  
  - 30：已迁移  
- **Topic Rush**：按话题热度查 AI 生成的热门话题及关联代币（Latest/Rising/Viral）
- 支持筛选：进度、持币分布、开发者行为、协议（Pump.fun、Four.meme 等）

### 4.2 支持的链与 API 摘要

| 链 | chainId |
|----|---------|
| BSC | 56 |
| Solana | CT_501 |

| API | 方法 | URL 路径 |
|-----|------|----------|
| Meme Rush Rank List | POST | `/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/pulse/rank/list` |
| Topic Rush Rank List | GET | `/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/social-rush/rank/list` |

协议码示例：Pump.fun 1001、Four.meme 2001、Moonit 1002、BONK 1008 等（见 Skill 内协议表）。

---

## 5. Query Address Info Skill

### 5.1 能力与使用场景

- 查询指定链上某钱包地址的**全部代币持仓**
- 返回代币名称、符号、价格、24h 涨跌、持仓数量等，用于资产/仓位展示

### 5.2 API 摘要

- **方法**：GET  
- **URL**：`https://web3.binance.com/bapi/defi/v3/public/wallet-direct/buw/wallet/address/pnl/active-position-list`  
- **参数**：`address`（必填）、`chainId`（必填）、`offset`（分页）  
- **Header**：`clienttype: web`，`clientversion: 1.2.0`，`Accept-Encoding: identity`  

支持链：BSC(56)、Base(8453)、Solana(CT_501)。图标需加 `https://bin.bnbstatic.com` 前缀。

---

## 6. Query Token Audit Skill

### 6.1 能力与使用场景

- 交易前**代币安全审计**：蜜罐、 Rug、骗局、恶意函数、买卖税等
- 用户问「这个币安全吗」「帮我审计一下」或在做 swap 前时使用

### 6.2 API 摘要

- **方法**：POST  
- **URL**：`https://web3.binance.com/bapi/defi/v1/public/wallet-direct/security/token/audit`  
- **Body**：`binanceChainId`、`contractAddress`、`requestId`（UUID v4）  
- **Header**：`Content-Type: application/json`，`Accept-Encoding: identity`  

**结果有效性**：仅当 `hasResult: true` 且 `isSupported: true` 时展示风险等级与检查项。  
**风险等级**：LOW(0–1)、MEDIUM(2–3)、HIGH(4–5)；5 建议阻止交易。  
使用后需附免责声明：审计结果仅供参考，不构成投资建议。

---

## 7. Query Token Info Skill

### 7.1 能力与使用场景

- **搜索**：按关键词（名称/符号/合约）查代币
- **元数据**：名称、符号、logo、社交链接、创建者等
- **动态数据**：实时价格、成交量、持币数、流动性、市值、多周期涨跌
- **K 线**：OHLCV 蜡烛图（另用 dquery.sintral.io 的 K 线接口）

### 7.2 API 摘要

| 能力 | 方法 | URL（或 base） |
|------|------|----------------|
| Token Search | GET | web3.binance.com `.../v5/.../token/search`，params: keyword, chainIds, orderBy |
| Token Metadata | GET | web3.binance.com `.../dex/market/token/meta/info`，params: chainId, contractAddress |
| Token Dynamic Data | GET | web3.binance.com `.../v4/.../token/dynamic/info`，params: chainId, contractAddress |
| Token K-Line | GET | `https://dquery.sintral.io/u-kline/v1/k-line/candles`，params: address, platform(eth/bsc/solana/base), interval, limit/from/to, pm(p/m) |

K 线 interval 含 1s、1min、5min、1h、1d、1w、1m 等；响应为二维数组 [open, high, low, close, volume, timestamp, count]。

支持链：BSC(56)、Base(8453)、Solana(CT_501)。

---

## 8. Trading Signal Skill

### 8.1 能力与使用场景

- 获取链上**聪明钱买卖信号**：触发价、当前价、最大收益、出场率等
- 用于发现机会、跟踪聪明钱行为、评估信号质量（exitRate、maxGain）

### 8.2 API 摘要

- **方法**：POST  
- **URL**：`https://web3.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/web/signal/smart-money`  
- **Body**：`chainId`（必填）、`page`、`pageSize`（最大 100）、`smartSignalType`（可选）  
- **Header**：`Content-Type: application/json`，`Accept-Encoding: identity`  

支持链：BSC(56)、Solana(CT_501)。信号状态：active、timeout、completed。图标 URL 需加 `https://bin.bnbstatic.com` 前缀。

---

## 9. 通用说明

- **链 ID**：BSC=56，Base=8453，Solana=CT_501，Ethereum=1；各 Skill 的请求参数中可能使用 `chainId` 或 `binanceChainId`。
- **图标**：多数接口返回的 icon 为路径，需拼接 `https://bin.bnbstatic.com`。
- **数值**：价格、数量、百分比等多为字符串，使用时需按需转换。
- **安全**：Spot 涉及资金操作，主网需用户确认；Token Audit 仅作参考，不构成投资建议。

---

## 10. 参考文件

各 Skill 的完整参数、枚举与示例见对应 SKILL.md：

- `C:\Users\USER\.cursor\skills\binance-spot\SKILL.md`
- `C:\Users\USER\.cursor\skills\binance-web3-crypto-market-rank\SKILL.md`
- `C:\Users\USER\.cursor\skills\binance-web3-meme-rush\SKILL.md`
- `C:\Users\USER\.cursor\skills\binance-web3-query-address-info\SKILL.md`
- `C:\Users\USER\.cursor\skills\binance-web3-query-token-audit\SKILL.md`
- `C:\Users\USER\.cursor\skills\binance-web3-query-token-info\SKILL.md`
- `C:\Users\USER\.cursor\skills\binance-web3-trading-signal\SKILL.md`
