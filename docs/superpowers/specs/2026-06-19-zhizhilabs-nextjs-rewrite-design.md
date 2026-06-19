# zhizhilabs Next.js 忠实重写 · 设计 spec

> 状态:设计待 user review。2026-06-19 落。
> 配套上下文:KB memory `project_zhizhilabs_integration.md`(回滚记录 + archive 分支信息);前序设计 `docs/superpowers/specs/2026-06-13-zhizhilabs-glass-redesign-design.md`(玻璃态视觉)。

## 1. 目标(一句话)

把**当前线上的 Express 版 zhizhilabs**(zhizhilabs.com)用 Next.js **忠实重写**——保持老版那套**聚焦的页面结构与玻璃态视觉**,但跑在 Next.js 上消除「卡」(Express SSR 每次点击整页重载),做到 SPA 般顺滑。**不是**之前被否的「平台版」(营销落地页 + dashboard + perps/预测空板块 + 侧栏壳)。

## 2. 背景 & 动机

- 线上曾部署过一版 Next.js「平台版」,user 觉得**功能结构不如老版**(臃肿:营销 sprawl + 总览 dashboard + 空板块),已**回滚到 Express 老版**(生产分支 `feat/nextjs-frame` @ `3398109` = express-legacy)。
- user 要的是:**前端用 Next.js(不卡)+ 老版聚焦结构 + 保留已积累的代码**,在老版基础上单点慢慢加。
- 关键认知:那版「平台版」**已经是 Express 的完整 Next.js 移植**(组件、12 个 API route handler、`lib/sources/` data 层、scripts 全在),它被否的纯粹是**外层 IA 臃肿**。所以本次「重写」= **基于存档 reshape**(IA 收回老版聚焦结构 + 砍臃肿 + 补缺 + 修 bug + 视觉对齐),**不从零造轮子**。
- 存档源:`origin/archive/nextjs-frame-20260619`(= tag `nextjs-frame-backup-20260619`,commit `d89791f`)。本次工作分支 `feat/nextjs-rewrite` 已从该存档拉出。

## 3. 非目标(明确不做)

- ❌ 营销落地页 / 订阅定价页 / FAQ / 私域社区段(平台版的 marketing sprawl)
- ❌ 行情总览 dashboard、永续合约 perps、预测市场 prediction 板块(空壳 coming-soon)
- ❌ 平台式左侧栏壳(`components/shell/*` + `lib/nav.ts` 的板块/跨板块分组导航)
- ❌ 聪明钱单独成页(并回发现榜 tab)
- ❌ 独立 `/signals` 列表页 + `/signals/[ca]` 详情页(信号并进发现榜 KB信号 tab + 代币详情页)
- ❌ 新数据源 / 新表 / 支付 / 钱包签名 / 任何交易执行
- ❌ Supabase schema 变更(沿用现有表与 `kb_signals.narrative_twitter` 字段)

## 4. 架构

### 4.1 总体
- **单 Next.js 15 app(App Router)**,线上仍是**一个** Railway 服务(`next build` + `next start -p $PORT`)。
- **数据层原样复用**:`lib/sources/*`(dexscreener / geckoterminal / goplus / helius / jupiter / okx / sixfivefiveone / binance-smart-money + cache-manager + rate-limiter)+ `app/api/**/route.ts`(12 个)**不重写**。
- **渲染**:列表/榜单/详情外层用 **RSC(server component)**直接 `lib/queries` 读 Supabase(快、无客户端瀑布);代币详情的实时行情/K线/叙事/推文用**客户端 island** 调 `/api/token/*`(已有),但**新增 server 端预取**减少空窗(见 §7.3)。
- **真相源分工不变**:KB 是真相源,publisher 每 20min 写 `kb_signals`;站点只读 Supabase + 实时行情聚合,不反向写 KB。

### 4.2 榜单数据刷新(关键补缺)
- Express 老版用进程内 `src/scheduler.js` 每 N 分钟调 `updatePumpRanking()` / `updateZhilabsRanking()` 写 `solana_pump_ranking` / `zhilabs_ranking`。**存档 Next.js 版没有这个机制**——若不补,换到 Next.js 后榜单会冻住。
- **方案**:新增 `instrumentation.ts`,在 server 启动时 `register()` 起一个 `setInterval` 复刻 scheduler(调 `scripts/fetch-pump-ranking.js` 的 `updatePumpRanking()` / `fetch-zhilabs-ranking.js` 的 `updateZhilabsRanking()` 导出函数 —— critic 实测两者确为可导入函数,非纯 CLI)。Railway 跑的是常驻 `next start` 进程,`instrumentation.ts` 的 interval 能存活。
- ⚠️ **依赖冲突(critic 发现)**:`scripts/fetch-*.js` 当前 `import '../src/data-sources/index.js'`(§9 计划删的 legacy)。**删 `src/data-sources/` 前必须先把这两个 script 的 import 改指 `lib/sources/`**(两份代码相同),否则 scheduler 崩。顺序:repoint script → 验证榜单刷新 → 才删 `src/data-sources/`。
- `register()` 只在 server runtime 跑(`process.env.NEXT_RUNTIME === 'nodejs'` 守卫),避免 build / edge 误触发;单实例假设(Railway 单服务),多实例需改外部 cron。
- 间隔与开关沿用老版 env(`SCHEDULER_ENABLED` / interval);保留 `POST /api/update?type=pump|zhilabs` 手动触发(若 archive 未移植则补一个 route handler)。
- 幂等保护:`updateRunning` 标志防并发重入(对齐老版 `scheduler.js`)。

## 5. 信息架构 / 路由图(锁定)

| 路由 | 内容 | 来源 |
|---|---|---|
| `/` | 宇宙 hero 欢迎页 + 实时 Top-3 HUD | **新移植** Express `src/public/index.html` 进 Next.js |
| `/ranking` | 发现榜 4 tab:`pump` / `zhilabs` / `KB信号` / `聪明钱(binance)` | 复用 archive `app/(app)/meme/page.tsx`,改路由名 + 补 binance tab + 换 KB tab 内容 |
| `/token/[ca]` | 统一代币详情 = 信号详情:K线 + 行情/安全 + 叙事 + **推特时间线** + 热门推文 + KB卡 | archive `app/token/[address]/` + 修实时数据链 + 内嵌 `TweetTimelineCard` |
| `/paper` | 模拟盘战绩 | archive `app/(app)/paper/page.tsx` |

**统一性铁律(user 要求)**:
- **每个币的详情页都是同一个** `/token/[ca]` 模板,无论从哪个 tab 点进——同布局、同走 `/api/token/[ca]` 实时取数,**不做分源变体**。
- **发现榜行字段统一**:`pump / zhilabs / KB信号` 三 tab 共用**同一套表格行布局**(同一个 `RankingRow` 组件);tab 只换「哪批币 + 怎么排序」,不换行布局。`聪明钱(binance)` tab **独立**(金黄信号卡,跨链 inflow 信号,数据形状本就不同)。
- **KB信号 tab = 同一张统一表格,不是另一种卡片布局**(消除歧义):它就是发现榜表格筛出 `has_signal` 的币、按 `score` 排序、把信号徽章列(conviction / 聪明钱 / 复活)填上。推特叙事时间线**不在 tab 行里展开**,而是点进 `/token/[ca]` 详情页看(内嵌 `TweetTimelineCard`)。
- **字段可得性**:统一行布局里,某列若该数据源没有就显示「—」(列保留,值空)。具体:`kb_signals` **无 `holders` 字段**(`lib/columns.ts` 白名单实测无 holders)→ KB信号 tab 的持仓/Top10 列显示「—」;`solana_pump_ranking` / `zhilabs_ranking` 有 holders 正常显示。这样既满足「列统一」又不假造数据。

**顶部导航**(替换平台侧栏):老版那条简单 nav —— `Zhizhi Labs` brand · 发现榜 · KB信号(锚到 `/ranking#kb` 或 tab)· 模拟盘。无侧栏、无板块分组。

## 6. 页面 spec

### 6.1 `/` 宇宙 hero(新移植)
- 忠实移植 Express `src/public/index.html`:cosmic 背景层(stars / nebula / warp-grid / 漂浮 Solana·Polymarket·Binance 品牌 logo / 光束 / vignette / scanline / noise)+ 中心标题(`Zhizhi Labs` / `BEYOND THE VISIBLE SPECTRUM` / value-prop)+ `查看实时榜单` CTA(→ `/ranking`)+ **实时 Top-3 HUD**(`Promise.allSettled` 拉 `/api/ranking` 必需 + `/api/kb-signals` 可选 join 徽章,降级 fallback)。
- 落地为 Next.js route(`app/page.tsx` 或独立 segment),CSS/动画 verbatim 搬运;HUD 脚本改成 client component(`useEffect` fetch)。
- **字体**:hero 保留 **Orbitron**(其签名视觉)+ JetBrains Mono(数字)。
- `prefers-reduced-motion` 降级保留。

### 6.2 `/ranking` 发现榜
- **4 个 tab**:
  1. **pump**(成交量榜 24h)— RSC `getPumpRanking(20)` 读 `solana_pump_ranking`。
  2. **zhilabs** — RSC `getZhilabsRanking()` 读 `zhilabs_ranking`。
  3. **KB信号**(替换原 archive 的精选/存活表)— RSC `getKbSignals()` 读 `kb_signals`(含 `narrative_twitter`)→ 用**同一个 `RankingRow` 统一表格**渲染(非卡片列表),筛 `has_signal` 子集、按 `score` 降序,信号徽章列(conviction / 聪明钱 / 复活 / cluster)填满,持仓列「—」(§5)。每行 → `/token/[ca]`。主推 KOL / 叙事摘要可作为该行的「信号」列附注(可选),但不改变行布局。
  4. **聪明钱(binance)**(独立)— 客户端调 `/api/smart-money-signals` + `/api/smart-money-inflow`(sol+bsc),渲染**金黄信号卡网格**(从 Express `ranking-page.js` 的 `.signal-card` 样式移植)。
- **统一表格行字段**(tab 1/2/3 共用):排名 # · 名称+symbol · 市值(market_cap)· 24h 成交量 · 24h 涨跌 % · 持仓数/Top10%(无 holders 数据源显示「—」,见 §5)· **信号徽章**(把 `kb_signals` 的 conviction/聪明钱/复活 join 到行上,无信号则空)。可排序表头沿用老版。
- KB信号 tab 顶部保留**风险免责**(非投资建议)。
- 路由命名:把 archive 的 `/meme` 重命名为 `/ranking`;反转 `next.config.mjs` 现有 `/ranking → /meme` 重定向(改为真实 `/ranking`,可加 `/meme → /ranking` 兼容旧链接)。

### 6.3 `/token/[ca]` 统一代币详情(= 信号详情)
- **分区**(单一模板,所有币一致):
  1. **K线图**:修复后用 `DexChart`(DexScreener iframe,需 `main_pair`)或 `KlineChart`(`/api/kline/[pairAddress]` + lightweight-charts)。择一,默认先修 DexChart。
  2. **行情·安全卡**:price / market_cap / vol_24h / holders / Top10% / honeypot / mintable / 风险等级 —— 走 `/api/token/[ca]`(实时 `getTokenDetail` + `getTokenSecurityDetail`)。
  3. **叙事分析卡**:`/api/token/[ca]/narrative`(sixfivefiveone + Supabase 缓存)。
  4. **推特时间线卡(新增内嵌)**:若该 CA 的 `kb_signals.narrative_twitter.status === 'generated'`,渲染 `TweetTimelineCard`(主推 KOL + call 时间线 + 可点 X 链接)。
  5. **热门推文卡**:`/api/token/[ca]/tweets`。
  6. **KB 信号卡**:`getKbSignalByCa(ca)`(conviction / 聪明钱 / cluster / 复活)。
- **修「—」根因**(report 诊断):`/api/token/[address]` 响应**缺 `main_pair`** → DexChart 显示「暂无图表」;若行情源稀疏 → 行情卡塌成「—」。修法:
  1. critic 实测:`getTokenDetail` 确实已 merge `main_pair`(dexscreener `normalizePair` 设 `main_pair: pair.pairAddress || null`,index.js 用 GeckoTerminal 兜底)。所以**逻辑在**,真问题是 ① 两源都拿不到 pair 时 `main_pair` 为 null,DexChart 直接「暂无图表」;② 全客户端瀑布导致首屏空窗看起来像「—」。
  2. 行情字段(price/mc/vol)缺失时确认 DexScreener → GeckoTerminal → OKX 兜底链 merge 没漏字段;route handler 返回前确保 `main_pair` 真的进了序列化 JSON(若 null 显式标记)。
  3. **server 端预取**:在 RSC 内 `await getTokenDetail` 把首屏行情/`main_pair` 作为 props 传给 client island,消除「全客户端瀑布 → 首屏全是 —」的空窗;client 再后台 revalidate。
  4. **K线兜底**:`main_pair` 为 null(确无可用池)时,详情页优雅显示「该代币暂无可用图表」而非卡 loading;有 pair 必须渲染。可选:DexChart(iframe)失败时切 `KlineChart`(`/api/kline` + lightweight-charts)。
- 验收:`/token/<任一活跃CA>` 首屏 1.5s 内出现 price/MC/vol 真实值(不是「—」)+ 有 pair 的币 K线必须渲染;仅当确无可用池时允许「暂无图表」(不允许卡 loading)。

### 6.4 `/paper` 模拟盘
- 直接复用 archive `app/(app)/paper/page.tsx`:免责 banner + summary(总收益% / 权益 / 胜率 / 活仓·已平 / 数据新鲜度)+ 成交记录表。RSC 读 `getPaperSummary()` + `getPaperTrades()`(`PAPER_TRADE_PUBLIC_COLUMNS` 脱敏白名单)。仅做视觉/壳对齐。

## 7. 组件复用图(来自 archive)

| 复用 | 文件 | 用途 |
|---|---|---|
| 🔧 改造/可选 | `components/signals/SignalListItem.tsx` | KB tab 改用 `RankingRow`(§6.2),此组件降为可选的「信号」列附注;**内部硬编码 `href=/signals/${ca}` 必须改指 `/token/${ca}`**(critic 发现,否则点进 404),或加 `linkTo` prop |
| 🔧 改造 | `components/signals/TweetTimelineCard.tsx` | 代币详情「推特时间线」卡;**若内部有 `/signals/[ca]` 链接同样改指 `/token/[ca]`** |
| ✅ 直接用 | `components/token/{TokenSections,DexChart,KlineChart}.tsx` | 详情页 K线 + 行情/叙事/推文卡 |
| ✅ 直接用 | `components/ui/*`(Badge/EmptyState/MetricCard/DataFreshness/ClickableRow/Reveal/CountUp/ComingSoon/PreviewCard) | 通用 UI |
| ✅ 直接用 | `lib/queries.ts`(6 fn)/ `lib/columns.ts`(脱敏白名单)/ `lib/supabase.ts` | 数据读取层 |
| ✅ 直接用 | `app/api/**/route.ts`(12)/ `lib/sources/*` | API + 数据源 |
| 🔧 改造 | `app/(app)/meme/page.tsx` → `/ranking` | 改路由 + 补 binance tab + KB tab 换信号卡 |
| 🔧 改造 | `app/token/[address]/` | 修 `main_pair` + server 预取 + 内嵌时间线卡 |
| 🆕 新建 | `app/page.tsx`(hero)+ `instrumentation.ts`(scheduler) | hero 移植 + 榜单刷新 |
| ❌ 删除 | `app/(marketing)/`、`app/(app)/{dashboard,perps,prediction,smart-money}/`、`components/shell/{AppShell,Sidebar}.tsx`、`lib/nav.ts`、`test/nav.test.ts`、`app/(app)/signals/`(独立信号页) | 砍臃肿 IA |
| 🔧 改造/简化 | `components/shell/Topbar.tsx`、`app/(app)/layout.tsx`、`app/globals.css` 的 `.app-shell/.app-sidebar/.mobile-bar` 规则 | 去侧栏壳,改简单顶部 nav + 居中容器 |
| 🧹 清理 | `src/data-sources/`(被 `lib/sources/` 取代的 legacy 镜像) | 死代码,移除 |

## 8. 视觉 & 壳

- **设计 tokens 沿用 archive `globals.css`**(report 实测与玻璃态愿景 95%+ 对齐):OKLCH near-black 紫调底 + 单一电紫 accent + 语义涨跌色(`--up/--down/--warn`)+ 发丝边框 `--line/--line-soft` + radius/spacing scale。**无需大改**,只在预览时微调 hue 对齐老版。
- **字体**:hero = Orbitron(签名);app 页(发现榜/详情/模拟盘)= archive 现有 **Noto Sans SC + JetBrains Mono**(CJK 可读性更好;此点列为 §11 待确认,默认保持 archive)。
- **壳**:删平台侧栏,换成老版顶部 nav 条(brand + 4 链接 + backdrop blur)。app 页布局从 `.app-shell` grid 改为 `max-width + margin:auto` 居中容器。
- **图标**:沿用 Tabler Icons(archive 已加载)。

## 9. 删除清单(明确)

页面:`app/(marketing)/page.tsx`、`app/(app)/dashboard/`、`app/(app)/perps/`、`app/(app)/prediction/`、`app/(app)/smart-money/`、`app/(app)/signals/`(含 `[ca]`)。
组件/配置:`components/shell/AppShell.tsx`、`components/shell/Sidebar.tsx`、`lib/nav.ts`、`test/nav.test.ts`。
**`app/(app)/layout.tsx` 的处置(critic 要求明确)**:它现在 import `AppShell`,删壳后会断。处理 = **改写成极简布局**(顶部 nav 条 + `max-width` 居中容器,包住 `/ranking`·`/token`·`/paper`),而非整删——保留一个共享 layout 挂顶部 nav。若 `(app)` 路由组无意义可平掉,但要保证剩余页仍有共享顶部 nav。
死代码:`src/data-sources/`(**先确认 `scripts/fetch-*.js` 已 repoint 到 `lib/sources/` 且榜单刷新验证通过,见 §4.2**,再移除;及 `src/` 下其他 Express-only legacy 确认无引用后移除)。
删除顺序(critic 修正):先 repoint scheduler scripts → 验证刷新 →(`lib/nav.ts` → `Sidebar` → `AppShell` → 改写 `app/(app)/layout.tsx` 为极简 → 清 `globals.css` 壳规则 → 删页面)→ 最后删 `src/data-sources/`。

## 10. 路由/配置变更

- `next.config.mjs`:现有 `/ranking → /meme`(permanent)**方向反了**(critic 确认)。改为 `{ source: '/meme', destination: '/ranking', permanent: true }`,`/ranking` 成为真实路由。同时全仓 grep `'/meme'` 与 `href="/meme"`,把内部 `<Link>` 引用改成 `/ranking`。
- **SEO**:archive 已有 `app/robots.ts` + `app/sitemap.ts`(保留);hero 移植时带上 `ld+json` 结构化数据(老版 index.html 有);`generateMetadata` 沿用 archive。`sitemap.ts` 若列 `/meme` 改 `/ranking`。
- `package.json`:`start` 保持 `next start -p ${PORT:-3000}`;`legacy:start`(Express)可保留或移除。
- `instrumentation.ts`:`export const register()` 起 scheduler interval(§4.2)。
- env(Railway):`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`(⚠️ 见 §11 轮换提醒)+ `SITE_URL` + 可选 `GA_MEASUREMENT_ID` + scheduler 开关/间隔。

## 11. 风险 & 待确认

1. **字体**:hero 用 Orbitron 已定;app 页是否也回 Orbitron(忠实老版)还是保持 archive 的 Noto Sans SC(更易读)?**默认 Noto Sans SC,预览时由 user 拍板。**
2. **scheduler**:用 `instrumentation.ts` 进程内 interval(faithful)vs 外部 Railway cron 命中 `POST /api/update`。**默认 instrumentation.ts**(最贴近老版行为,单服务)。
3. **service_role key**:历史上曾硬编码在源码/本地 git history(站点 repo 有 GitHub remote)。**user 需在 Supabase 控制台轮换** service_role key,并确认 Railway env 用新 key。本次重写代码全部从 env 读,不硬编码。
4. **K线组件**:DexChart(iframe,省事)vs KlineChart(自渲染,可控)。默认先修 DexChart;若 iframe 体验差再切 KlineChart。
5. **binance tab 数据**:`/api/smart-money-*` 依赖 OKX/6551,需确认线上 key 配置仍有效(见 KB memory `data_sources_status`)。

## 12. 测试 & 验收

- **单测**:`vitest`(`lib/columns` 脱敏白名单、`lib/queries`、信号/时间线纯逻辑组件)。删 `test/nav.test.ts`。
- **本地预览(强制)**:每个增量 `npm run dev`,用 preview 工具截图 + console/network 检查,**user 视觉确认 + style-match 后**才进下一步。遵守 KB feedback「local preview before push」铁律。
- **关键验收点**:
  - `/` hero 动画顺滑 + Top-3 HUD 出真实数据。
  - `/ranking` 4 tab 切换**无整页重载**(SPA),三表行字段一致,binance 金黄卡独立。
  - `/token/[ca]` 首屏出真实 price/MC/vol + K线渲染(**不再「—」**)+ 推特时间线卡。
  - `/paper` 数据正常 + 脱敏。
  - 榜单数据随 scheduler 刷新(不冻)。
- **不卡验收**:页间导航走 client router,无 Express 那种整页白屏重载。

## 13. 增量交付顺序

1. **壳 + hero + 发现榜**:删平台壳 → 顶部 nav → 移植 hero(`/`)→ `/ranking` 4 tab(含 binance 补回 + KB tab 换信号卡)+ 统一行字段。
2. **代币详情**:修 `main_pair` + server 预取(灭「—」)→ 内嵌 `TweetTimelineCard` → K线渲染。
3. **模拟盘**:`/paper` 视觉/壳对齐。
4. **scheduler + 收尾**:`instrumentation.ts` 榜单刷新 → 清死代码 → 路由重定向 → 全站联调。
每步本地预览给 user 看。

## 14. 分支 & 部署策略

- 工作分支 `feat/nextjs-rewrite`(已从 `origin/archive/nextjs-frame-20260619` 拉出)。
- **Express 生产不动**:线上仍是 `feat/nextjs-frame` @ express-legacy,直到 user 本地确认全部增量 + 明确批准部署。
- 部署:user 批准后,把 `feat/nextjs-rewrite` 合/force-push 到 Railway 跟踪的生产分支。**绝不自动 push user 生产 repo**(KB feedback 铁律)。
- 回滚锚点:express-legacy（当前生产）+ `nextjs-frame-backup-20260619`（平台版存档）均保留。
