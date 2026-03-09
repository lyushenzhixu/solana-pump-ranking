# 聪明钱信号模块 — 前端设计规范（与项目统一）

> 榜单页「Binance Skill」「OKX Skill」两个一级 Tab，各含二级：聪明钱信号、聪明钱流入、KOL追踪。数据统一来自 Binance Web3 API，风格分别为 binance（金黄）、okx（OKX 黑）。

## 设计原则

- **复用现有 Design Tokens**：不新增色值，一律使用 `server.js` 内榜单/详情页已定义的 CSS 变量。
- **字体与层级**：与榜单一致——`Exo 2` 正文，`Orbitron` 数字/标题；字号、字重与现有表格/按钮一致。
- **卡片与容器**：信号区域仍放在 `.table-card` 内，与 Pump/zhilabs 共用同一容器样式（背景、圆角、边框、毛玻璃）。
- **交互**：点击卡片跳转 `/token/:address`；复制合约使用现有 `.copy-ca-btn` 行为与样式；hover/focus 与现有行、按钮一致。

## 色彩与变量（仅用现有）

| 用途 | 变量 |
|------|------|
| 卡片背景 | `--bg-card`、hover 时 `--bg-card-hover` |
| 边框 | `--border-subtle`，高亮可用 `--border-glow` |
| 正文/标题 | `--text-primary`、`--text-secondary`、`--text-muted` |
| 涨/买入/净流入正 | `--positive`（绿） |
| 跌/卖出/净流入负 | `--negative`（红） |
| 强调/链接/标签 | `--accent` |
| 品牌色（可选点缀） | `--sol-purple`、`--sol-green`、`--sol-blue`、`--bn-yellow` |

## 信号卡片布局与样式

- **外层**：`.signal-cards-grid` 使用 `display: grid`，如 `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`，`gap` 与页面 `padding` 与 `.table-card` 内边距协调（如 1rem～1.25rem）。
- **单卡**：`.signal-card`
  - 背景：`var(--bg-card)` 或 `var(--bg-card-solid)`，`border: 1px solid var(--border-subtle)`，`border-radius: 12px`（与现有按钮、小块卡片一致，不超出 table-card 的 16px）。
  - 内边距：与表格单元格视觉密度接近，如 `padding: 1rem`。
  - 悬停：`background: var(--bg-card-hover)`，可选 `transition` 使用 `var(--ease-out)`；与现有 `tbody tr:hover` 一致。
  - 可选用 `animation: fadeSlideUp` 与榜单页其它区块统一入场感。
- **代币头**：头像 + 名称 + 合约
  - 头像：圆形，尺寸与榜单表格内 logo 一致（如 30px 或 32px），`border-radius: 50%`，`border: 1px solid var(--border-subtle)`，`object-fit: cover`。
  - 名称：`font-weight: 600`，`color: var(--text-primary)`，过长用 `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`。
  - 合约：小字 `--text-muted`，短显示 + 复制按钮，复用 `.copy-ca-btn` 的样式与逻辑（复制后勾选态）。
- **数据行**：流动性/市值/平均买入价/持币者
  - 数字右对齐，`font-variant-numeric: tabular-nums`，用 `formatCompact` 等与榜单一致格式（k/M/B）。
  - 标签用 `--text-muted`，数值用 `--text-primary`。
- **底部信号区**
  - 「Xm以前买入」：`--text-secondary`。
  - 「X个聪明钱正在交易」：可用 `--positive` 或 `--sol-green` 强调。
  - 资金净流入：正数 `color: var(--positive)`，负数 `color: var(--negative)`；金额格式与榜单一致。
  - 买入/卖出比例条：一条横条，左侧绿 `var(--positive)`、右侧红 `var(--negative)`，比例用 `flex` 或 `grid` 分两段，文字「买入(X%) 卖出(Y%)」用 `--text-secondary`，字号略小。

## 与现有组件对齐

- **一级 Tab**：Solana Pump 榜单 | zhizhilabs 精选 | Binance Skill | OKX Skill
- **二级 Tab**（仅在 Binance/OKX Skill 下显示）：聪明钱信号 | 聪明钱流入 | KOL追踪
- **风格变体**：binance 金黄 `--bn-yellow`；okx OKX 黑（#050505 背景 + #e0e0e0 灰白强调）
- **说明文案**：`#desc` 在 signal 下的文案风格与另外两个 Tab 一致（一句话说明数据来源与含义）。
- **加载与错误**：复用 `.loading-text` 与现有错误态（如 `color: var(--negative); animation: none`）。
- **响应式**：小屏下 grid 可改为单列或两列，与现有 `@media (max-width: 768px)` 断点一致；避免卡片过窄导致排版混乱。

## 可访问性与动效

- `prefers-reduced-motion: reduce` 下不添加额外动画（项目已全局缩短/禁用动效）。
- 焦点：卡片若可点击，需保证 `:focus-visible` 与现有按钮一致（`outline: 2px solid var(--accent)`）。

实现时以 [src/server.js](src/server.js) 内榜单页的 `:root`、`.table-card`、`.panel`、`td .token-cell`、`.copy-ca-btn`、`.positive`/`.negative` 为唯一样式来源，不引入新设计语言。
