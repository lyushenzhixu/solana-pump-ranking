# 自研数据源（Self-Hosted Data Source）

替代 AVE Cloud API 的自研链上数据聚合模块，无需 API Key，无请求限制/收费。

## 数据来源

| API | 能力 | 速率 |
|-----|------|------|
| DexScreener | 代币搜索、交易对、boost/profiles | 300 req/min |
| GeckoTerminal | 趋势池、新池、OHLCV、交易记录 | ~20 req/min |
| GoPlus Security | 合约安全（蜜罐、增发、冻结、LP 锁定） | 30 req/min |
| Binance Web3 | Top10 持有人、holders、insider 占比 | 宽松 |
| Jupiter | Solana 价格（v2 需认证，可选） | — |

## 模块结构

```
src/data-sources/
├── index.js             # 统一聚合层
├── dexscreener.js       # DexScreener 客户端
├── geckoterminal.js     # GeckoTerminal 客户端
├── goplus.js            # GoPlus 客户端（Solana + EVM）
├── jupiter.js           # Jupiter 价格
├── rate-limiter.js      # 限流器
└── chain-map.js         # 链 ID 映射
```

## 主要接口

```javascript
import * as dataSource from './src/data-sources/index.js';

// 搜索代币
await dataSource.searchTokens('BONK', 'solana', 10);

// 代币详情
await dataSource.getTokenDetail(address, 'solana');

// 平台代币（hot / new）
await dataSource.getPlatformTokens('pump_in_hot', 200);

// 排行榜
await dataSource.getRanks('solana');

// 安全检测
await dataSource.getTokenSecurityDetail(address, 'solana');
await dataSource.batchGetTokenSecurity('solana', [addr1, addr2]);

// 合约风险报告
await dataSource.getContractRisk(address, 'solana');

// K 线
await dataSource.getKline(pairAddress, 'solana', 60, 24);

// 交易记录
await dataSource.getSwapTxs(pairAddress, 'solana');

// 批量价格
await dataSource.getTokenPrices([{ address, chain: 'solana' }]);

// 支持的链
await dataSource.getSupportedChains();
```

## 支持的链

`solana` / `eth` / `bsc` / `base` / `arbitrum` / `polygon` / `avalanche` / `optimism` / `ton`

## 测试

```bash
node scripts/test-data-source.js
```

## 相关文档

- 完整实现记录：[历史聊天记录-自研数据源替代AVE-2026-03-07.md](../history/历史聊天记录-自研数据源替代AVE-2026-03-07.md)
- AVE Cloud Skill（保留）：[AVE-CLOUD-SKILL.md](./AVE-CLOUD-SKILL.md)
