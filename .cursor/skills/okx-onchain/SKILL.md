---
name: okx-onchain
version: 1.0.0
description: |
  OKX OnchainOS Market API 数据源 — 代币搜索、持仓分布、价格/交易信息。
  用于补充现有数据源（DexScreener / GeckoTerminal / GoPlus）不足之处。
  Use this skill whenever the user wants to:
  - 使用 OKX 数据查询代币持有者分布 (Top20 Holders)
  - 获取代币价格和交易信息
  - 搜索代币（按名称、符号或合约地址）
  - 补充代币的 Top10 持仓比例数据
metadata:
  requires:
    env:
      - OKX_API_KEY
      - OKX_SECRET_KEY
      - OKX_PASSPHRASE
---

# OKX OnchainOS Skill

OKX OnchainOS Market API 提供多链代币数据查询能力，作为项目数据源的补充。

## 环境变量

```bash
export OKX_API_KEY="your_api_key"
export OKX_SECRET_KEY="your_secret_key"
export OKX_PASSPHRASE="your_passphrase"
```

在 [OKX 开发者后台](https://web3.okx.com/build) 创建项目并生成 API 凭证。

## 代码位置

- 数据源模块: `src/data-sources/okx-onchain.js`
- 通过 `src/data-sources/index.js` 统一导出

## 可用接口

### 1. 代币 Top20 持有者

```javascript
import { okxOnchain } from './src/data-sources/index.js';
const holders = await okxOnchain.getTokenHolders(address, 'solana');
// [{ holdAmount: "570747950.108575", holderWalletAddress: "9Wz..." }, ...]
```

### 2. 计算 Top10 持仓比例

```javascript
const pct = await okxOnchain.getTop10HolderPercent(address, 'solana');
// 15.6 (百分比)
```

### 3. 代币搜索

```javascript
const tokens = await okxOnchain.searchTokens('SOL');
```

### 4. 代币价格/交易信息

```javascript
const detail = await okxOnchain.getTokenDetail(address, 'solana');
```

## 认证

所有请求自动签名，使用 HMAC-SHA256。请求头包含：
- `OK-ACCESS-KEY`
- `OK-ACCESS-SIGN`
- `OK-ACCESS-PASSPHRASE`
- `OK-ACCESS-TIMESTAMP`

## 支持的链

| 链 | chainIndex |
|----|-----------|
| Solana | 501 |
| Ethereum | 1 |
| BSC | 56 |
| Base | 8453 |
| Arbitrum | 42161 |

## 在项目中的应用

1. **代币详情页**: 当数据库和 GoPlus 都没有 Top10 持仓数据时，使用 OKX 持有者数据计算
2. **榜单页**: 作为 OKX Skill Tab 数据来源的基础
3. **数据补充**: 补充现有数据源中缺失的代币信息
