# OKX OnChainOS Skill 接入说明

## 概述

OKX OnChainOS 提供多链市场数据接口，用于补充项目中的代币数据（如 Top 持有人占比）。

文档：https://web3.okx.com/zh-hans/onchainos/dev-docs/home/what-is-onchainos

## 配置

在 `.env` 中配置：

```
OKX_API_KEY=你的API_KEY
OKX_SECRET_KEY=你的SECRET_KEY
OKX_PASSPHRASE=你的PASSPHRASE
```

获取密钥：https://web3.okx.com/zh-hans/onchainos/dev-docs/home/api-access-and-usage

## 项目内使用

- **模块**：`src/data-sources/okx-onchainos.js`
- **用途**：在 `getTokenSecurityDetail` 中，当 Binance 无 Top10 数据时，尝试用 OKX 补充
- **数据流**：榜单 Top10 优先来自 Binance（与 Pump 表一致）→ 其次 OKX → 最后 GoPlus

## 榜单 OKX Skill Tab

榜单页新增「OKX Skill」一级 Tab，二级为：
- 聪明钱信号
- 聪明钱流入
- KOL 追踪

卡片风格：OKX 黑色主色（#050505 背景 + 灰白强调），与 Binance 金黄风格区分。
