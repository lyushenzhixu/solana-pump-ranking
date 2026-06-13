# zhizhilabs 玻璃拟态整站 UI 重设计 · 设计文档

> 日期:2026-06-13 · 仓库:`solana-pump-ranking`(独立 repo,部署 Railway → zhizhilabs.com)
> 状态:设计已与用户 + Codex 评审对齐,待落地为实施计划
> 关联:KB 是真相源(见 meme repo `CLAUDE.md` § 0 三板块),本仓库只消费 KB 输出做展示;改 UI 不动数据契约。

## 1. 背景与问题

zhizhilabs.com 有 4 个页面,目前是 4 套割裂的视觉语言:

| 页面 | 文件 | 现状 | 问题 |
|---|---|---|---|
| 落地页 `/` | `src/public/index.html` | 电影感太空 splash,Orbitron,"BEYOND THE VISIBLE SPECTRUM" | **不传达产品做什么**;`overflow:hidden` 把首页钉死成一屏 |
| 榜单页 `/ranking` | `src/views/ranking-page.js` | 暗色玻璃数据表,4 tab,自动刷新 | 已是正确玻璃容器模式(参考样板)|
| 详情页 `/token/:ca` | `src/views/token-detail-page.js` | 最精致:玻璃渐变头部 + AI 叙事卡 + stat grid + K 线 | **全站最强页,是设计系统的来源,不是再改造的对象** |
| 模拟盘 `/paper` | `src/views/paper-page.js` | 裸表格,GitHub-dark 自有调色板(`#0d1117`/`#79c0ff`)| 完全脱离系统,最弱、最不一致 |

`ranking-page.js` 与 `token-detail-page.js` 已共享一套近乎一致的 `:root` OKLCH token(`--bg-card: oklch(16% 0.02 270 / 0.85)`、`--border-subtle`、`--border-glow`、Solana 紫/绿/蓝、`--positive/--negative`),且都用 `backdrop-filter: blur()`。**设计系统其实已存在于这两页,只是没抽出来共享,paper 与落地页没消费它。**

## 2. 目标与非目标

**目标**
- 整站统一到一套**玻璃拟态(glassmorphism)**视觉语言:半透明磨砂面板 + 固定深空辉光背景。
- 兼顾「对外展示惊艳」与「数据实用可读」(用户定调:两者兼顾)。
- 落地页一眼讲清产品价值,并展示实时数据。
- 把最弱的 paper 页拉齐到系统;把已有玻璃模式抽成可复用、带命名空间的共享 CSS。

**非目标(YAGNI)**
- 不引入任何前端框架(React/Vue/构建链)。保持 Express 渲染 HTML 模板字符串。
- 不重做数据层 / API / Supabase schema / KB 信号契约。
- **不激进重写 token-detail 页**——它是样板,只做与新系统对齐的轻量收口,避免把最强页改弱。
- 不改 SEO meta / sitemap / robots 逻辑(仅复用现有 `pages.js` 注入点)。

## 3. 已锁定的设计决策

1. **美学方向**:全站玻璃拟态 + 固定辉光背景(用户选「最炫向」)。
2. **玻璃 = 容器语言,不是逐格特效**(Codex 核心修正):`backdrop-filter` 只施加在**大容器**(页面壳、卡片、表格 wrapper、导航、弹层),**绝不**加在每一行 `tr`/`td`/badge/sticky 表头/实时刷新行上。
3. **字体三件套精简**:
   - 展示标题 / logo:`Orbitron`(保留品牌 DNA,仅用于稀疏大标题)
   - 正文 / UI / 中文:`system-ui, 'PingFang SC', sans-serif`(零加载、中文友好)→ **退役 `Exo 2`**
   - 数字 / 地址 / MC / 百分比:`'JetBrains Mono', monospace` → **退役 `Fira Code`**
4. **落地页 live HUD 本轮一起做**:首屏加价值主张 + 实时 top-3 玻璃 HUD(拉 `/api/ranking`),含**数据拉取失败兜底**。
5. **命名空间 CSS**(Codex 修正):共享类一律 `.zl-*` 前缀(`.zl-glass-panel`、`.zl-data-table`、`.zl-stat-card`、`.zl-page-bg`…),避免与仓库已有的泛化类名(`.card`、`.banner`、`.label`)冲突。
6. **本地预览 + 用户视觉确认后才 push 生产**(用户铁律,见记忆 `feedback_local_preview_before_push`)。

## 4. 设计系统:`glass-system.css`

新建 `src/public/styles/glass-system.css`,内容 = 把 ranking/token-detail 现有 `:root` token + 玻璃类抽出、命名空间化、补齐缺口。

### 4.1 Token(沿用现有 OKLCH,补充语义)
```
--surface-0..3        深空底面(沿用 index.html / ranking 现值)
--zl-glass-fill       rgba/oklch,文字承载面板填充,opacity 0.72–0.9(数据面板取高位)
--zl-glass-border     --border-subtle / --border-glow
--accent / --positive / --negative / --sol-purple|green|blue   沿用现值
--zl-blur-strong: 16px   仅大 hero/卡片
--zl-blur-soft: 10–12px  数据容器
--ease-out            沿用
```

### 4.2 玻璃面板规则
- `.zl-glass-panel`:`background: var(--zl-glass-fill)` + `backdrop-filter: blur(var(--zl-blur-*))` + `-webkit-backdrop-filter` + 1px `--zl-glass-border` + 轻内发光。
- **数据容器**(`.zl-data-table` 的 wrapper)用**高不透明度填充**(≥0.85)+ soft blur,保证读数。
- **表头近乎不透明**:sticky 表头浮在动背景上极易糊,表头底色取实色 / ≥0.92。

### 4.3 排版 / 颜色 / 对比预算
- 三件套见 § 3.3。
- **对比预算(Codex 补)**:为每类承载面定义最低文字对比(正文 ≥ 4.5:1,大标题 ≥ 3:1);styling 前先定面板填充不透明度满足该预算,再叠玻璃。
- 涨绿跌红沿用 `--positive/--negative`;强调色 Solana 紫/绿/青。

### 4.4 动效
- 辉光缓慢呼吸**只用于背景层 + HUD 强调**,不铺满全站。
- 实时刷新:**只闪变化的数字单元格**(短暂高亮),不再整行换底色动画。
- `@media (prefers-reduced-motion: reduce)`:关闭辉光呼吸、扫描线(scanlines)、hover transform、数字闪动。

### 4.5 降级与守护
- `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`:玻璃面板回退为实色深面(`--surface-1/2`),不靠模糊也可读。
- **性能守护**:每个 section 最多「一层固定背景 + 一层玻璃」。禁止大量移动子元素各自 blur。
- 浏览器矩阵:Chrome / Safari / 移动端都验证(Safari 的 `backdrop-filter` + sticky 表头 + 横向滚动是易翻车点)。

## 5. 架构(无框架)

- `src/public/styles/glass-system.css` — 共享 token + 组件类(单一来源,但**不是杂物抽屉**:只放跨页复用的东西)。
- 每页保留**小块**页面专属样式:`landing.css` / `ranking.css` / `token-detail.css` / `paper.css`(或内联,按体量)。
- 新增**无框架 JS 渲染助手**(纯函数,返回字符串),消除现有 4 个 view 重复的 head/背景/壳代码:
  - `renderGlassHead({ title, meta, extraCss })` — `<head>` + 字体 link + glass-system.css 引用 + GA 注入点兼容
  - `renderGlassBackground()` — 固定深空辉光背景层 DOM
  - `renderPageShell({ nav, content })` — 统一导航 + 内容容器
  放在 `src/views/_shared/` 或 `src/views/glass-shell.js`。
- 4 个 view 改为 import 这些助手 + 引共享 CSS;HTML 仍是模板字符串,改造可控。

## 6. 分页面规格

### 6.1 落地页 `/`(`src/public/index.html`)
- **保留** Orbitron `Zhizhi Labs` 作为 H1 + 电影感首屏氛围(辉光 / 星点)。
- **新增中文价值主张**(H1 下一行),示意:`实时发现 Solana meme 新币 —— 按交易量、持仓、聪明钱与 AI 叙事信号交叉排序。`
- **新增实时 top-3 玻璃 HUD**:首屏内嵌一块 `.zl-glass-panel`,客户端取前 3,显示 名称 / 24h 量 / 涨跌 / **信号标签**。
  - **信号数据来源(Codex 核实)**:`/api/ranking` **不返回 KB 信号标签**(只有量/MC/涨跌/持有/logo/CA/`updated_at` 等,见 `src/routes/api.js` `select('*')` ordered by `tx_volume_u_24h` limit 20)。信号是榜单页另拉 `/api/kb-signals` 按 CA 客户端 join 得到的。HUD 要么**同样发第二个 fetch 到 `/api/kb-signals` 按 CA 合并**,要么新增聚合端点 `/api/landing-hud`(推荐第二 fetch,零新端点)。
  - **转义**:HUD 用 `/api/ranking` 数据拼 `innerHTML` 必须走 `esc()`(对齐 ranking/paper 现有写法),禁止裸注入 name/symbol/logo。
  - **失败兜底**:fetch 失败 / 空数据 → 显示静态占位文案(如"榜单加载中 / 稍后重试")+ 重试,**绝不**留空玻璃框。
- CTA 文案 `discovery` → **`查看实时榜单`**,跳 `/ranking`。
- **`/` 是静态文件不是 JS view**(`pages.js` 直接读 `index.html` + 字符串注入 GA)。决策:**落地页保持静态 `index.html`**(避免改 GA 注入逻辑的风险),通过 `<link>` 引同一份 `glass-system.css`,导航/背景 markup 内联(仅此一页,漂移可控);`renderGlassHead/Background/Shell` 助手服务另外 3 个 JS view。
- **`overflow:hidden` 不是一行能改**:现 `body{overflow:hidden;height:100%}` + `.universe` 固定满屏 + mousemove 视差多动画层。加 HUD = 重做 hero/背景/内容定位 → 明确**保留**固定辉光背景层,**删除**多余视差/扫描线动画层(只留一层辉光),让首页可纵向滚动,避免 HUD 移动端被裁。

### 6.2 榜单页 `/ranking`
- 已是正确玻璃容器样板:**保留** `.table-card` 单层 blur 模式,改造为消费共享 `.zl-*`。
- 行底用足够实的底色;表头近不透明;单元格闪动 + FLIP 重排(见 §7.2)。
- **渲染重构(B 方案前提)**:现榜单刷新是 `root.innerHTML = table` 全量替换(`ranking-page.js`),FLIP 需改成 **keyed-row 调和**(按 CA 复用/移动行,而非整表重建),并兼容 tab 切换 / 排序 / 搜索三种重排路径。这是 B 方案最大工量项。
- 保留 4 tab、自动刷新条、涨跌色、移动端 `min-width` + 横向滚动。

### 6.3 详情页 `/token/:ca`
- **样板页,轻触**:仅把硬编码 token 收敛到共享 `glass-system.css`、字体换三件套、与新背景/壳对齐。
- 不重排布局、不动 K 线集成、不削弱现有玻璃头部 + stat grid。

### 6.4 模拟盘 `/paper`(改动最大)
- 丢弃 GitHub-dark 自有调色板,改用 `glass-system.css`。
- 5 个汇总数 → `.zl-stat-card` 玻璃 metric 卡;活仓 / 已平表 → `.zl-data-table` 进玻璃容器。
- 补移动端 `min-width` + 横向滚动(对齐 ranking)。
- 保留现有 XSS `esc()`、`fmtMc`、延迟估值 ⏳/⚠️ 标记等逻辑,只换皮。

## 7. 交互设计(贯穿全站)

用户定调:**B 方案 — 交互全都上**(含 FLIP 重排 + View Transitions 跨页转场;用户已亲手试 demo 后选定);术语用 **hover/点击 popover** 即时解释。所有动效统一受 `prefers-reduced-motion` 总开关管控。

### 7.1 统一玻璃导航(地基)
- **真实路由只有 `/ /ranking /paper /token/:ca`**(Codex 核实)。导航项 = `发现榜(/ranking)` · `KB 信号(/ranking 内的 tab,非独立路由 → 跳 /ranking 并激活 KB tab)` · `模拟盘(/paper)`。**`研究` 当前无路由 → 暂不放或放 disabled/“即将上线”占位**,不做死链。
- 由 `renderPageShell` 输出到 3 个 JS view;落地页(静态)内联同款导航 markup。
- 移动端收起为汉堡 / 横向 chip 滚动。

### 7.2 "活着"的实时数据
- 刷新倒计时 + live 脉冲点(强化现有)。
- **数字变化闪动**:diff 上一帧,只对**变化的数字单元格**做短暂高亮(涨绿/跌红一跳),不动整行底色。
- **FLIP 重排动画**:排名顺序变化时,行用 FLIP(First-Last-Invert-Play)平滑移动到新位置。
  - 防眩晕/性能:仅 `transform`/`opacity` 过渡(不触发 layout);一次刷新内限制并发动画数;`prefers-reduced-motion` 时**直接跳变不动画**;长列表只对视口内行做 FLIP。

### 7.3 榜单表格交互
- 行 hover 高亮 + 点击进详情(保留)。
- **点表头排序**(市值 / 24h 量 / 涨跌 / 持有),升降序切换 + 排序态指示。**`#` 列语义**:排序后 `#` 仍显示**服务端官方发现名次**(随行移动),不退化成可见行号——避免“按市值排=改了排名”的误解。
- **搜索过滤**:按名字 / symbol / CA 即时过滤(纯客户端,无需后端)。
- 滚动时表头 sticky(**实色**,不糊)。
- **刷新保状态(Codex 补)**:5 分钟刷新时保留用户当前 滚动位置 / 搜索词 / 排序态;**用户正在 inspect 某行(hover/popover 打开)时软暂停重排**,不打断。
- **新入/掉出标识**:刷新后给新进榜 `NEW`、新跌出友好提示(已在 demo 验证);刷新失败给可见「重试」而非静默。

### 7.4 术语 popover(让访客看懂信号)
- 信号徽章 / 术语(`AI 叙事`、`KB 信号`、`SWING/WATCH`、`Top10%`、`聪明钱` 等)旁加可 hover(桌面)/ 点击(移动)触发的玻璃 popover,一句话解释。
- 内容集中维护在一处字典对象(`signal-glossary.js`),四页复用,避免散落硬编码。
- a11y:`aria-describedby` 关联;键盘可聚焦触发。

### 7.5 微反馈
- 复制 CA → toast「已复制」(替换现静默);按钮按压态;外链统一 ↗ 图标 + 新标签打开。
- **事件冒泡(Codex 补)**:行内的复制按钮 / popover 触发器必须 `stopPropagation`,否则点它们会冒泡到行点击 → 误跳详情页(现表格在 `.table-card` 上委托行点击)。

### 7.6 状态(loading / 空 / 错)
- 玻璃**骨架屏 shimmer** 替代白屏(榜单、详情、HUD)。
- 落地 HUD / tab 切换 / 空榜单都有友好态;错误态给「重试」而非空玻璃框。

### 7.7 跨页转场(View Transitions API)
- 服务端多页之间用 View Transitions API 做平滑淡入 / 共享元素 morph(点"查看实时榜单"→ 榜单顺滑过渡,而非硬跳)。
- 渐进增强:不支持的浏览器自动回退为普通跳转;`prefers-reduced-motion` 时禁用。

### 7.8 移动端交互
- 表格横滑提示(边缘渐隐 + 首次"←滑动"微提示);点按区 ≥ 44px;导航收起。

## 8. 性能与可访问性守护(汇总)

- 玻璃只上大容器;一 section 一固定背景 + 一玻璃层;无逐行/逐格 blur。
- `@supports` 实色回退;`prefers-reduced-motion` **全停动效**(辉光呼吸 / 扫描线 / hover transform / 数字闪动 / FLIP 重排 / View Transitions 转场)。
- FLIP 重排只用 `transform`/`opacity`;限并发动画数;仅视口内行;reduced-motion 时跳变。
- View Transitions 渐进增强,不支持自动回退普通跳转。
- 对比预算先行;表头近不透明;数据面板高不透明填充。
- 移动端表格 `min-width` + 横向滚动;落地页 HUD 失败兜底。
- 用户可读性标签:`AI 叙事` / `模拟盘` / `知智 KB 信号` 在页面有一处面向用户的解释,不只做氛围标签。

## 9. 落地与发布

**顺序按风险从低到高(Codex 修正:不先动最危险的 ranking/token-detail)**:
1. **抽 `glass-system.css`(token + `.zl-*` 组件类)+ JS shell 助手 + `signal-glossary.js`** — 不改任何现有页面,纯新增。
2. **paper 页做 pilot**(最隔离、最弱、风险最低):全量切到玻璃系统 + `.zl-stat-card`/`.zl-data-table` + 移动端滚动。验证系统可用。
3. **ranking 页**:消费 `.zl-*`,做 keyed-row 渲染重构 + FLIP + 单元格闪动 + 排序/搜索/保状态 + 术语 popover。(最大工量项)
4. **token-detail 页**:轻触对齐(字体/背景/壳),回归对比截图确保不退化。
5. **landing 页**:hero/背景重做 + 价值主张 + 实时 HUD(`/api/ranking` + `/api/kb-signals` join + esc + 失败兜底)+ overflow 修复 + CTA 文案。
6. **跨页转场(View Transitions)** 最后统一接,渐进增强。
- **SEO head 迁移矩阵**(`renderGlassHead` 不能一刀切):ranking/token 现用 `buildSeoMeta`;landing 有静态 canonical/OG/JSON-LD;paper 几乎没有。逐页列清保留/合并,别把现有 meta 改丢。
- **本地预览矩阵**(`npm start` + headless 截图,不止一张):`/`、`/ranking` 全 4 tab、`/paper`、`/token/:ca`;视口 390px / 平板 / 桌面;`prefers-reduced-motion`;API 失败 + 空数据;Safari `backdrop-filter` 回退。**用户视觉确认后**才 push。
- 绝不自动 push 用户生产 repo / 不自动部署 Railway。

## 10. 风险与开放问题

- **最大风险**:过度改造 token-detail 把最强页改弱 → 缓解:样板只轻触,改造前后对比截图。
- **Safari `backdrop-filter` + sticky 表头**:需实机/截图验证,必要时表头 sticky 降级为实色。
- **落地页信号数据(已核实,见 §6.1)**:`/api/ranking` 无信号标签,HUD 需第二 fetch `/api/kb-signals` 按 CA join。已定方案。
- 字体退役(Exo 2 / Fira Code)后需全仓 grep 残留引用,避免半切换;**ranking 现引用 JetBrains Mono 却没在 Google font link 里加载**,务必先补 link(Codex 发现)。
- **FLIP 重排**:5 分钟刷新若顺序大变,满屏行同时移动会眩晕/掉帧 → 缓解:限并发、仅视口内、只 transform、reduced-motion 跳变;实施时实测帧率。
- **View Transitions API**:跨页转场依赖现代 Chrome MPA 支持,Safari/Firefox 回退普通跳转(可接受,渐进增强)。
- **术语字典**:`signal-glossary.js` 需与 KB 实际信号档位(pass/watch/small/swing/conviction 等)对齐,避免解释与真实语义脱节。
