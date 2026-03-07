# 代币审计记录

本目录存放通过 AVE Cloud、Binance 等接口获取的代币合约审计结果，仅作留档与对比，不构成投资建议。

## 命名规则

- **AVE**：`AVE-<合约地址>-<日期>.json`
- **Binance**：`BINANCE-<合约地址>-<日期>.json`

## 已保存记录

| 日期       | 来源   | 合约 (缩写) | 代币  | 风险分 | 文件 |
|------------|--------|-------------|-------|--------|------|
| 2025-03-07 | AVE    | ATFtq...qjW | BILl  | 55     | AVE-ATFtqCyeCAps8dbA6eegfojkDmxmq7ofDh93vkcpuqjW-2025-03-07.json |

## 复跑审计

```bash
# AVE
node scripts/ave-token-audit.js <合约地址> [链]

# Binance（需网络可访问 web3.binance.com）
node scripts/binance-token-audit.js <合约地址>
```
