# Phase 0 庄家检测逻辑文档

> 最后更新: 2026-03-24
> 脚本: `scripts/phase0-validate.js`
> 运行: `HTTP_PROXY=http://127.0.0.1:7897 npm run phase0-validate -- --tokens 10`

## 总览

Phase 0 庄家猎手验证脚本通过 5 个步骤，从链上数据中自动识别 Solana Meme 代币的协同操盘钱包组（"庄家"）。

```
┌────────────────────────────────────────────────────────────────┐
│  Step 1: 筛选大涨代币                                          │
│  GeckoTerminal trending → 24h>50% 预筛 → OHLCV 7d涨幅>500%   │
│  → GoPlus 蜜罐/CRITICAL排除 → Binance Top10 <30% 排除         │
│  数据源: GeckoTerminal + GoPlus + Binance Web3 (全部免费)       │
└──────────────┬─────────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────────┐
│  Step 2: 获取 Top 交易者                                       │
│  Helius Enhanced API → 获取代币的 SWAP 交易记录                 │
│  OKX getTokenHolders → 补充持有者数据                           │
│  去重、排除 CEX 钱包，按买入金额排序取 Top 20                    │
└──────────────┬─────────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────────┐
│  Step 3: 追溯资金来源 (1 hop back)                              │
│  Helius Enhanced API → 每个交易者的 SOL TRANSFER 入账记录       │
│  过滤 >0.01 SOL 的转入，保留最大 3 笔资金来源                   │
│  并行批次 = 5 个钱包/批                                         │
└──────────────┬─────────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────────┐
│  Step 4: 钱包聚类 (纯计算，无 API 调用)                         │
│  构建 funder → wallets 映射                                    │
│  聚类条件:                                                      │
│    ① 同一 funder 资助 ≥3 个不同钱包                             │
│    ② 所有资金转入在 24 小时窗口内                               │
│    ③ 所有钱包首次买入在 1 小时窗口内                            │
│  CEX 过滤 + 置信度评分                                         │
└──────────────┬─────────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────────┐
│  Step 5: 输出结果                                              │
│  控制台表格 (中文标签 + Solscan 链接)                           │
│  JSON → scripts/output/phase0-{timestamp}.json                 │
└────────────────────────────────────────────────────────────────┘
```

## 核心概念

### 什么是"庄家"
一组协同操作的钱包，由同一实体控制，在代币大涨前集中买入。特征：
- 从同一个资金源获得 SOL
- 在相近的时间窗口内对同一代币进行买入
- 分散在多个钱包中以避免被单一地址识别

### 聚类判定逻辑

```
IF   funder_A 向 wallet_1, wallet_2, wallet_3 转了 SOL
AND  这些转账发生在 24 小时内
AND  wallet_1, wallet_2, wallet_3 都在 1 小时内买入了同一个代币
THEN 这 3 个钱包被聚类为一个"庄家钱包组"
```

**最小聚类规模:** 3 个不同钱包（防止偶然巧合）

### 置信度评分

| 置信度 | 条件 |
|--------|------|
| **高** | 非 CEX funder，资金窗口 <12h，交易窗口 <30min，≥4 个钱包 |
| **中** | 非 CEX funder，资金窗口 12-24h 或交易窗口 30-60min，或刚好 3 个钱包 |
| **低** | funder 是已知 CEX 地址，或 funder 资助了 >20 个钱包（可能是 CEX 提币） |

### CEX 排除机制

1. **静态列表:** 已知 CEX 热钱包地址（Binance, OKX, Bybit, Coinbase, Kraken, Gate.io, KuCoin）
2. **动态启发式:** 如果某 funder 资助了 >100 个不同钱包，大概率是 CEX 提币地址而非庄家
3. **Raydium/Jupiter 排除:** 已知 DEX 路由地址也在排除列表中

## 代币质量筛选标准

Phase 0 脚本复用了榜单页（`fetch-pump-ranking.js`）的筛选标准，确保分析的代币质量：

| 筛选项 | 条件 | 数据源 |
|--------|------|--------|
| 7 日涨幅 | ≥500% | GeckoTerminal OHLCV |
| 市值 | ≥$100,000 | GeckoTerminal |
| 蜜罐检测 | 非蜜罐 | GoPlus Security API |
| 风险等级 | 非 CRITICAL | GoPlus Security API |
| Top10 持有者占比 | ≤30% | Binance Web3 API |

## API 消耗

| API | 每次运行(10代币) | 费用 | 备注 |
|-----|-----------------|------|------|
| GeckoTerminal | ~25-45 calls | 免费 | 15 req/min 限制 |
| GoPlus | 1 batch call | 免费 | 30 req/min |
| Binance Web3 | ~10-20 calls | 免费 | 220ms 间隔 |
| Helius | ~200-450 credits | $49/月 2M credits | 10 req/sec |
| OKX | ~10 calls | 免费 | 补充数据 |

**月度预算 (1次/天):** ~960 Helius credits/月 = 0.05% 月配额

## CLI 参数

```bash
node scripts/phase0-validate.js [--tokens 10] [--days 7] [--min-gain 500]
```

| 参数 | 默认 | 说明 |
|------|------|------|
| `--tokens` | 10 | 分析的代币数量上限 |
| `--days` | 7 | 计算涨幅的天数窗口 |
| `--min-gain` | 500 | 最低涨幅百分比门槛 |

## 输出格式

### JSON 输出 (`scripts/output/phase0-{timestamp}.json`)

```json
{
  "timestamp": "2026-03-24T12:25:52.868Z",
  "config": { ... },
  "tokensAnalyzed": [
    {
      "address": "代币合约地址",
      "symbol": "符号",
      "priceChange7d": 5359,
      "clustersFound": 4
    }
  ],
  "clusters": [
    {
      "id": "CLU-001",
      "tokenSymbol": "大胖",
      "wallets": [
        { "address": "钱包地址", "buyAmountUsd": 995, "txCount": 1 }
      ],
      "commonFunder": "资金源地址",
      "fundingWindow": { "durationHours": 12.6 },
      "tradingWindow": { "durationMinutes": 0 },
      "confidence": "medium",
      "flags": []
    }
  ],
  "rpcStats": { "heliusCreditsUsed": 32 }
}
```

## 已知局限性

1. **CEX 提币盲区:** 庄家通过 CEX 提币到全新钱包时，链上无直接资金关联
2. **交易者数量依赖:** 低交易量代币可能只有 3-4 个交易者，难以形成有意义的聚类
3. **Helius 404 错误:** 部分钱包的历史交易查询超出搜索窗口，会触发 404 重试
4. **时间窗口固定:** 当前 24h/1h 窗口是硬编码的，不同庄家的操作节奏可能不同
5. **单跳追溯:** 只追溯 1 层资金来源，多层中转可能绕过检测

## 相关文件

| 文件 | 作用 |
|------|------|
| `scripts/phase0-validate.js` | 主脚本 |
| `src/data-sources/helius.js` | Helius API 客户端 |
| `src/data-sources/cex-wallets.js` | CEX 热钱包排除列表 |
| `src/data-sources/geckoterminal.js` | GeckoTerminal 数据源 |
| `src/data-sources/goplus.js` | GoPlus 安全检测 |
| `src/data-sources/index.js` | 数据源聚合层 |
| `scripts/fetch-pump-ranking.js` | 榜单筛选逻辑（质量标准来源） |
