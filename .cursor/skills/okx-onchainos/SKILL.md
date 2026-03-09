---
name: okx-onchainos
version: 1.0.0
description: |
  Query on-chain crypto data via OKX OnChainOS API (https://web3.okx.com/zh-hans/onchainos/dev-docs/).
  Use this skill when the user wants to:
  - Get token holder distribution (Top 20 holders, Top10 percentage)
  - Supplement token data where AVE/Binance/GoPlus have gaps
  - Access OKX market data across 130+ blockchains
  Trigger on /okx or any query involving OKX on-chain data
metadata:
  openclaw:
    primaryEnv: OKX_API_KEY
    requires:
      env:
        - OKX_API_KEY
        - OKX_SECRET_KEY
        - OKX_PASSPHRASE
---

# OKX OnChainOS Skill

OKX OnChainOS 提供多链市场数据、代币持有人、K线等接口，用于补充项目中的代币数据。

## 配置

```bash
export OKX_API_KEY="your_api_key"
export OKX_SECRET_KEY="your_secret_key"
export OKX_PASSPHRASE="your_passphrase"
```

获取密钥：https://web3.okx.com/zh-hans/onchainos/dev-docs/home/api-access-and-usage

## 项目内使用

数据源模块：`src/data-sources/okx-onchainos.js`

- `getTokenHolders(address, chain)` — 获取代币 Top 持有人及 Top10 占比
- `getTokenDynamicInfo(address, chain)` — 获取代币动态信息
- `isOKXConfigured()` — 检查 API 是否已配置

在 `getTokenSecurityDetail` 中，当 Binance 无数据时会尝试 OKX 补充 Top10 占比。

## 与榜单的数据流

1. Pump 榜单：Top10 来自 Binance Web3 token dynamic，存于 `solana_pump_ranking.holders_top10_percent`
2. 代币详情页：优先使用榜单表内值，其次 Binance，再次 OKX，最后 GoPlus
