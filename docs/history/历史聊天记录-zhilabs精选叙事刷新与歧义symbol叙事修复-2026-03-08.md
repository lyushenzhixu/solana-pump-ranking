# 历史聊天记录：zhilabs 精选叙事刷新与歧义 symbol 叙事修复（2026-03-08）

本记录保存「zhilabs 精选榜单 meme 叙事更新」「刷新叙事 0 条修复」以及「歧义 symbol（如 SOL）叙事错位修复」的需求与实现。

---

## 1. zhilabs 精选榜单叙事强制刷新

### 1.1 需求

用户需要能够**更新 zhilabs 精选榜单里 meme 的叙事**，即对榜单内代币的叙事缓存做强制刷新（忽略现有缓存，重新拉取并写入）。

### 1.2 实现

| 项 | 说明 |
|----|------|
| **脚本** | `scripts/refresh-zhilabs-narratives.js`：从 `zhilabs_ranking` 读取代币列表，逐个调用 `getTokenNarrative` 并写入 `token_narratives`，并发 2、批次延迟 3s |
| **API** | `POST /api/ranking/zhilabs/refresh-narratives`：调用同一刷新逻辑，返回 `{ ok, updated, errors, tokens, at }` |
| **前端** | 榜单页在「zhilabs 精选」Tab 下增加「刷新叙事」按钮，仅在该 Tab 显示，点击后请求上述 API 并展示结果 |
| **npm** | `npm run zhilabs-refresh-narratives`：独立运行脚本，不启动 Web 服务即可刷新叙事 |

服务端通过 `import { refreshZhilabsNarratives } from '../scripts/refresh-zhilabs-narratives.js'` 复用脚本内逻辑。

---

## 2. 刷新叙事「成功 0 条」修复

### 2.1 现象

执行 `npm run zhilabs-refresh-narratives` 输出：成功 0 条，失败 0 条（共 10 个代币）。

### 2.2 原因

- **未配置 OPENNEWS_TOKEN 时**：`getTokenNarrative` 直接返回带 `error` 的对象，未尝试拉取链上叙事。
- **脚本保存条件**：仅当 `!narrative.error` 才写入，导致即使有链上降级数据也不保存。

### 2.3 修改

| 文件 | 变更 |
|------|------|
| `src/data-sources/sixfivefiveone.js` | 无 newsToken 时若传入 `contractAddress`，仍调用 `getOnChainNarrative(contractAddress, 'solana')`，将结果放入 `twitterNarrative` 并返回（保留 `error` 提示「仅返回链上叙事」） |
| `scripts/refresh-zhilabs-narratives.js` | 保存条件改为「有 `summary` 或 `twitterNarrative` 即写入」；成功计数条件同步改为「有 `summary` 或 `twitterNarrative`」即计为 updated |

修复后，无 6551 Token 时也能刷新并持久化链上叙事。

---

## 3. 歧义 symbol 叙事错位修复（如「Sol The Trophy Tomato」）

### 3.1 现象

代币「Sol The Trophy Tomato」符号为 **SOL**，与 Solana 链同名。叙事区域出现的是 Solana 生态新闻（ETF、Aerodrome、跨链桥、地缘政治等），与当前 Meme 代币无关，用户反馈「叙事明显不对」。

### 3.2 原因

- 新闻搜索使用 `coins: [symbol]`（如 `coins: ['SOL']`），OpenNews 返回的是与「SOL」相关的大量链/生态内容，而非该合约对应的 Meme 代币。
- 摘要与新闻列表均来自上述结果，导致整段叙事与代币脱节。

### 3.3 实现

**文件**：`src/data-sources/sixfivefiveone.js`

1. **歧义 symbol 名单**  
   新增 `AMBIGUOUS_SYMBOLS`（如 SOL、PEPE、DOGE、SHIB、BTC、ETH、USDC 等与公链/主流币同名的 symbol）。当 `symbol` 在该集合内时，**不再执行** `coins: [symbol]` 的新闻搜索，避免混入链/生态新闻。

2. **歧义时的叙事内容**  
   当判定为歧义 symbol 且存在链上或推特合并结果 `mergedNarrative` 时：
   - **主摘要**：不再使用新闻拼接，改为由 `buildNarrativeSummaryFromGrade(mergedNarrative)` 根据叙事评级、建议及 dimensions（市场/社区/安全）生成一段「本代币叙事评级：xxx。xxx。市场：… 持币人… 安全：…（数据来自链上分析）」式摘要。
   - **新闻列表**：置空（`articles` 不展示），避免展示与当前代币无关的新闻。

3. **辅助函数**  
   `buildNarrativeSummaryFromGrade(tn)`：根据 `narrativeGrade`、`recommendation`、`dimensions.market/community/security` 及 `source` 生成简短中文摘要。

效果：symbol 为 SOL、PEPE、DOGE 等歧义时，页面展示的是**针对该合约的链上/推特叙事摘要**，不再展示 Solana/生态类无关新闻。

### 3.4 使用说明

若该代币此前已写入旧叙事缓存，需重新拉取才能看到新逻辑：

- 在榜单页切到「zhilabs 精选」后点击「刷新叙事」，或  
- 等待叙事缓存过期后再次打开该代币详情页。

---

## 4. 涉及文件一览

| 文件 | 变更摘要 |
|------|----------|
| `scripts/refresh-zhilabs-narratives.js` | 新增：zhilabs 叙事强制刷新脚本，导出 `refreshZhilabsNarratives` |
| `src/server.js` | 引入 `refreshZhilabsNarratives`；新增 `POST /api/ranking/zhilabs/refresh-narratives`；榜单页「刷新叙事」按钮与展示逻辑；按钮样式 |
| `src/data-sources/sixfivefiveone.js` | 无 newsToken 时仍可返回链上叙事；`AMBIGUOUS_SYMBOLS` 与歧义时跳过 coins 搜索；`buildNarrativeSummaryFromGrade`；歧义时用链上/推特摘要替代新闻摘要并清空 articles |
| `package.json` | 新增脚本 `zhilabs-refresh-narratives` |

---

## 5. 相关文档

- 叙事双引擎与缓存：`docs/history/历史聊天记录-代币叙事分析增强-推特与链上双引擎-2026-03-08.md`
- 叙事策略与配置：`knowledge/meme-narrative-strategy.md`
