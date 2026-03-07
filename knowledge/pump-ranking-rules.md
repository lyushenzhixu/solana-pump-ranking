# Pump 榜单入榜规则与实现说明

本文档记录 Solana Pump 榜单的筛选规则、数据来源与运维注意点，便于后续维护与 AI 检索。

## 数据流概览

1. **候选来源**：AVE API  
   - `pump_in_new`、`pump_in_hot`（platform）、`solana`（ranks），去重后得到原始候选。
2. **筛选与排序**：链 + 市值 + 上线时间 → LP 校验 → Top10 占比 → 按 24h 交易量排序取前 20。
3. **落库**：写入 Supabase `solana_pump_ranking`，前端从该表读并展示。

## 入榜条件（与 `scripts/fetch-pump-ranking.js` 一致）

| 规则 | 条件 | 说明 |
|------|------|------|
| 链 | `chain === 'solana'` | 仅 Solana。 |
| 市值 | `market_cap >= 100_000`（MIN_MARKET_CAP） | 单位 USD。 |
| 上线时间 | `launch_at` 在近 10 天内 | 超过 10 天剔除。 |
| 有图片 | `logo_url` 非空 | 无图片代币通常为低质量或疑似操控。 |
| LP 状态 | 非「明确未锁定」 | 见下节。 |
| Insider 指数 | `insider_wallet_rate ≤ 0.5`（MAX_INSIDER_RATE） | AVE token 详情返回；操控代币通常 >80（即 8000%+），阈值 0.5 即 50%。 |
| Top10 占比 | ≤ 30%（MAX_TOP10_HOLDERS_PERCENT） | 来自 Binance Web3 token dynamic；未取到则不因该条排除。 |

最终按 `tx_volume_u_24h` 降序取前 20 条写入。

## Insider 过滤规则（重要）

- **数据来源**：AVE **token 详情** `GET /v2/tokens/{address}-solana` 中 `data.token.insider_wallet_rate` 字段。
- **阈值**：`MAX_INSIDER_RATE = 0.50`（原始值，0.5 = 50%）。正常代币通常 0～0.2，被操控代币通常 >80。
- **未返回时**：若 AVE 未返回该字段或接口失败，`insiderRate` 为 null，不因该条排除，避免误杀。
- **背景**：Solana ranks 榜单中存在一类无图片、名称含 `_COIN`/`_NTWK` 等拼凑关键词的代币（如 `BILLIONS_NTWK_COIN`、`YELLOW_COIN`），insider_wallet_rate 极高（>8000%），属人为操控。

## LP 规则（重要）

- **数据来源**：对每个候选调用 AVE **token 详情** `GET /v2/tokens/{address}-solana`，不信任 platform 列表中的 `is_lp_not_locked`。
- **当前策略**（常量 `EXCLUDE_LP_NOT_LOCKED_ONLY = true`）：
  - **排除**：仅当 AVE token 详情**明确**返回 `is_lp_not_locked === true`（LP 未锁定）。
  - **允许**：返回 `false`（已 burn/锁定）或 **未返回/未知/null**（含接口失败）。
- **原因**：AVE 对多数 Solana pump 代币不返回该字段，若「未知一律排除」会导致整表 0 条；故改为「只排除明确未锁定」，未知允许入榜，LP 列展示为「—」。
- **前端**：LP 列展示「已burn/锁」或「—」或「否」，对应 `lp_burned` 与 `is_lp_not_locked` 的解析结果。

## 数据库字段（solana_pump_ranking）

- 基础：token, chain, name, symbol, market_cap, tx_volume_u_24h, current_price_usd, price_change_24h, holders, main_pair, logo_url, launch_at, created_at, updated_at。
- 扩展：`holders_top10_percent`（numeric）、`lp_burned`（boolean）。  
- 迁移见：`config/sql/solana-pump-ranking-add-holders-top10.sql`、`solana-pump-ranking-add-lp-burned.sql`。

## 运维与排错

- **更新后 0 条**：先确认运行的是最新脚本（日志应为「仅排除明确未锁定」「排除 LP 明确未锁定 后候选」）。若为「未知/未锁定/失败 均排除」「仅保留 LP 已 burn/锁定」则为旧逻辑，需**重启本地服务**（Ctrl+C 后 `npm start`）或重新部署线上。
- **单代币是否入榜**：可运行 `node scripts/check-token-eligibility.js <token_address>` 做一次规则校验（依赖 AVE/Binance 可用）。
- **0 条时表会清空**：脚本在「无符合条件数据」时也会先执行清空表再 return，避免前端仍展示旧数据。

## 相关文件

- 拉取与筛选逻辑：`scripts/fetch-pump-ranking.js`
- 表结构：`config/sql/solana-pump-ranking.sql`
- 前端展示与描述：`src/server.js`（榜单页 HTML + /api/ranking）
