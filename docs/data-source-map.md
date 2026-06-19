# zhizhilabs 数据源地图(锁定版)

> 2026-06-18 落地。目标:把每个板块功能所需的数据源**找全 + 确认可用**,作为后续建页的事实源。
> 原则:**优先免费、无 key、公开 API + Supabase**(站点 `.env` 只配了 `SUPABASE_*`,其余 live 板块全靠免费公开源)。
> 验证口径:本表 ✅ = 2026-06-18 用真实 `curl` 打到过有效 JSON;⚠️ = 文档说公开但本机被拦(需 prod host 复验);💲 = 需付费;📦 = 已在 KB(meme 仓)侧配置。

---

## 一览:7 个板块 × 数据源状态

| 组 | 板块 | 路由 | 状态 | 主数据源 | 缺口 |
|---|---|---|---|---|---|
| 总览 | 行情总览 | `/dashboard` | LIVE | coinpaprika + coingecko + alternative.me | — |
| 板块 | Meme·链上 | `/meme` | LIVE | DexScreener/GeckoTerminal/Jupiter/GoPlus/Binance-Web3/OKX → Supabase `/api/ranking` + `kb_signals` | — |
| 板块 | 永续合约 | `/perps` | 待建 | Hyperliquid + Binance Futures + Jupiter Perps | 链上 funding+OI(Drift 待复验)/ 跨所爆仓(Coinglass 💲) |
| 板块 | 预测市场 | `/prediction` | 待建 | Polymarket Gamma + CLOB | 分类税(借 Kalshi)|
| 跨板块 | 聪明钱追踪 | `/smart-money` | LIVE(浅) | Binance-Web3 signals/inflow + Helius 📦 | KB wallet INDEX 接入 |
| 跨板块 | 信号日志 | `/signals` | 待建 | Supabase `kb_signals` + verdicts(数据已在,缺渲染) | 无需新源 |
| 跨板块 | 模拟盘战绩 | `/paper` | LIVE | Supabase paper trades(KB quant 写入) | — |

**结论:真正缺数据源的只有 2 个新板块 —— 永续合约、预测市场。两者的免费主源已 live-verified 锁定。**

---

## 1. 行情总览 `/dashboard` — LIVE ✅

| 指标 | 源 | 端点 | auth |
|---|---|---|---|
| 总市值 + 24h | coinpaprika(主)| `GET api.coinpaprika.com/v1/global` | 免费无 key ✅ |
| 总市值兜底 | coingecko | `GET api.coingecko.com/api/v3/global`(免费档 429 频繁,故降级位)| 免费无 key |
| 恐贪指数 | alternative.me | `GET api.alternative.me/fng/?limit=1` | 免费无 key ✅ |

实现:`lib/fetchers/marketOverviewCore.ts`,`Promise.allSettled` 降级 + `unstable_cache` 300s。**无缺口。**

## 2. Meme · 链上 `/meme` — LIVE ✅

发现/榜单链路(KB meme 仓 cron 拉取 → 写 Supabase → 站点读):

| 用途 | 源 | auth |
|---|---|---|
| DEX 价/量/流动性 | DexScreener / GeckoTerminal | 免费无 key ✅ |
| 报价/路由 | Jupiter | 免费无 key ✅ |
| 安全审计(honeypot/rug)| GoPlus | 免费无 key ✅ |
| 交易所反补(trending/inflow)| Binance Web3 | 免费无 key ✅ |
| 持仓/搜索补充 | OKX OnchainOS | 需 key(可选,未配也能跑)📦 |
| 成品榜 | Supabase `/api/ranking` | service role |
| KB 信号标签 | Supabase `kb_signals`(KB 发布器 20min cron 写)| — |
| 代币详情/K线/叙事 | DexScreener + GeckoTerminal + GMGN 📦 + Helius 📦 | 站点侧免费;GMGN/Helius 在 KB 侧 |

客户端实现 `lib/sources/*.js`。**无缺口。**

## 3. 永续合约 `/perps` — 待建,源已锁定 ✅

需要展示:市场列表、资金费率(funding)、未平仓(OI)、多空比、爆仓、价格/杠杆。

| 源 | 覆盖 | auth | 免费 | 验证 | 定位 |
|---|---|---|---|---|---|
| **Hyperliquid** `api.hyperliquid.xyz/info`(POST)| markets/funding/OI/mark+oracle价/book/candles | 公开无 key | ✅ | ✅ | **主源**(最大链上永续,一个端点全有)|
| **Binance Futures** `fapi.binance.com` | funding/OI/**多空比**/klines | 公开无 key | ✅ | ✅ | **CEX 参照 + 唯一免费多空比**(⚠️ Railway IP 可能被 geo-block,需 prod 复验)|
| **Jupiter Perps** `perps-api.jup.ag/v1` | JLP/custody 利用率/借贷费率/top traders/持仓 | 公开无 key | ✅ | ✅ | **Solana 原生主源**(池模型,无 CEX 式 funding,展示借贷费率+利用率)|
| Bybit v5 `api.bybit.com` | funding/OI/价(单 call ticker)| 公开无 key | ✅ | ✅ | 补充(第二 CEX 对比)|
| CoinGecko `/derivatives` | 跨所 perps 列表/funding/OI/basis | demo 无 key | ✅ | ✅ | 补充(一把"全所 OI 概览")|
| Drift `data.api.drift.trade` | 真·链上 funding+OI/历史/OHLCV | 公开无 key(文档)| ✅ | ⚠️ 403 | 想要(本机数据中心 IP 被 CDN 拦,**需 prod host 复验**,否则退 Drift TS SDK 读链上)|
| Coinglass `open-api-v4.coinglass.com` | 跨所**爆仓**聚合(唯一覆盖)| 需 key | 💲 无免费档($29/mo 起)| — | 缺口,仅当爆仓 widget 必须时再买 |

**建站推荐:Hyperliquid(主)+ Binance Futures(CEX/多空比)+ Jupiter Perps(Solana 原生);Bybit/CoinGecko 选配。**
**待办:① 从 Railway prod 复验 Binance/Bybit/Drift 是否被 geo-block;② 跨所爆仓是付费缺口,默认不做。**

## 4. 预测市场 `/prediction` — 待建,源已锁定 ✅

需要展示:热门/活跃市场、问题、yes/no 赔率、成交量、流动性、结算日、分类、价格历史。

| 源 | 覆盖 | auth | 免费 | 验证 | 定位 |
|---|---|---|---|---|---|
| **Polymarket Gamma** `gamma-api.polymarket.com` | markets/question/赔率/vol/24h/流动性/endDate(`order=volume24hr` 取热门)| 公开无 key,CORS 开 | ✅ | ✅ | **主源**(最大预测市场,一个 call 全有)|
| **Polymarket CLOB** `clob.polymarket.com/prices-history` | 价格历史(喂 Gamma 的 `clobTokenIds`)| 公开读 | ✅ | ✅ | **配套**(补 Gamma 唯一缺口:K线)|
| Kalshi v2 `api.elections.kalshi.com/trade-api/v2` | markets/bid-ask/vol/OI/**干净分类**(Crypto/Politics)| 公开读(交易才需签名)| ✅ | ✅ | 次主源(监管美盘 + 分类税)|
| Limitless `api.limitless.exchange/markets/active` | Base 链上加密原生短周期市场 | 公开 | ✅ | ✅ | 补充(噪音多,选配)|
| Manifold `api.manifold.markets/v0` | 问题/概率/池 | 公开读 | ✅ | ✅ | **仅开发期沙盒**(play-money,不上生产)|
| Adjacent News `v2.api.adj.news` | 跨平台聚合 | 公开读 | 有免费档 | ❌ 526 | 跳过(当前 SSL 526 不通,日后复验)|
| Myriad | — | — | — | ❌ | 跳过(无公开 API)|

**建站推荐:Polymarket Gamma(主)+ CLOB(价格历史);Kalshi 做次主源补分类。**
**待办:Polymarket 市场对象 `category` 常为 null,分类从 `/events` 分组或借 Kalshi 的 category 字段推导。**

## 5. 聪明钱追踪 `/smart-money` — LIVE(浅)

| 用途 | 源 | 状态 |
|---|---|---|
| Binance 聪明钱 signals/inflow | Binance Web3 `lib/sources/binance-smart-money.js` | 免费无 key ✅,已接 `/api/smart-money-signals` `/api/smart-money-inflow` |
| 钱包持仓/盈亏/资金链 forensic | Helius(2026-06-17 已升级,forensic 端点解锁)📦 | KB 侧;站点尚未接 |
| KB 高盈利/疑似庄家钱包 | KB `wiki/entities/wallets/INDEX.md` | 未接入站点 |

**当前页只包了 `SmartMoneyPanels`(Binance 信号)。深化方向:接 KB wallet INDEX + Helius 真实持仓/盈亏(需把 KB 侧数据经 Supabase 或 API 暴露给站点)。无需新外部源。**

## 6. 信号日志 `/signals` — 待建,无需新源 ✅

数据全在:Supabase `kb_signals` 表 + KB `output/verdicts/*`。当前是 ComingSoon 占位,只缺渲染层(复用 `/api/kb-signals`)。**零新数据源。**

## 7. 模拟盘战绩 `/paper` — LIVE ✅

Supabase paper trades 表(KB quant paper-trade daemon 写入)→ `/api/paper`。**无缺口。**

---

## 跨板块要点 / 待办

1. **geo-block 复验(P0)**:Binance Futures / Bybit / Drift 文档公开,但本机数据中心 IP 被拦(Binance 历史上会 block 部分服务器 IP,Drift `/contracts` 本机 403)。**上 perps 前先从 Railway prod host curl 一次**确认可达;不可达则:Binance→改用 Bybit/Hyperliquid 顶上,Drift→退 TS SDK 读链上或加代理。
2. **付费缺口只有一个**:跨所爆仓聚合 = Coinglass($29/mo,无免费档)。默认不做,除非爆仓 widget 列为必须。
3. **新板块沿用老原则**:perps/prediction 全部主源都是免费无 key 公开 API,站点 `.env` 不需新增密钥,与现有 live 板块一致。
4. **KB 侧专属源**(GMGN prod / Helius 升级版 / Xpoz / OKX)留在 meme 仓,经 Supabase 落地给站点消费,不在站点直连。
