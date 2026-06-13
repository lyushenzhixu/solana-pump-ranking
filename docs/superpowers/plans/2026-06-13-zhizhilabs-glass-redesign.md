# zhizhilabs 玻璃拟态整站重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 zhizhilabs.com 四个割裂页面统一到一套玻璃拟态(glassmorphism)设计 + 实时交互系统(FLIP 重排 + View Transitions + 单元格闪动 + 术语 popover),不引入前端框架。

**Architecture:** 抽一份共享 `glass-system.css`(命名空间 `.zl-*`,token 沿用现有 OKLCH + Solana 配色)+ 三个无框架 JS shell 助手 + 一份术语字典;按风险从低到高逐页切换(shared → paper pilot → ranking → token-detail 轻触 → landing → View Transitions)。玻璃只施于大容器,数据文字坐高不透明面板。token-detail 是系统来源,只轻触不重写。

**Tech Stack:** Node + Express(`src/views/*.js` 渲染 HTML 模板字符串 + `src/public/index.html` 静态)、Supabase、原生 CSS/JS、View Transitions API。无前端框架、无打包器。

**关于"测试":** 本仓库**无前端测试框架**(`npm test` 只是 import 自检)。本计划的验证分两类:
- **纯逻辑单元**(`esc`、术语查字典、keyed-row diff、HUD join):写独立 `node` 脚本用 `assert` 断言,`node test/<name>.mjs` 运行。
- **视觉/交互**:用 preview 工作流验证 —— `npm start` 起服务,headless 截图 + 读 console + eval DOM 状态。每个视觉任务列出具体验证步骤与期望。

**铁律(贯穿):** 绝不自动 push / 不自动部署 Railway;每阶段本地预览 + 用户视觉确认后才提交推送。分支已建 `feat/glass-redesign`。

---

## File Structure

| 文件 | 动作 | 责任 |
|---|---|---|
| `src/public/styles/glass-system.css` | 创建 | 共享 token + `.zl-*` 玻璃组件类(单一来源)|
| `src/views/_shared/glass-shell.js` | 创建 | `renderGlassHead` / `renderGlassBackground` / `renderGlassNav` 无框架字符串助手 |
| `src/views/_shared/signal-glossary.js` | 创建 | 术语→一句话解释字典 + `glossaryHtml()` |
| `test/glass-unit.mjs` | 创建 | 纯逻辑单元断言(glossary / esc / keyed-diff / hud-join)|
| `src/views/paper-page.js` | 改写 | pilot:切玻璃系统 |
| `src/views/ranking-page.js` | 改 | 字体、keyed-row 渲染、FLIP、闪动、排序/搜索/保状态、popover |
| `src/views/token-detail-page.js` | 轻改 | 字体 + glass-system 引用 + 去 Fira Code,布局不动 |
| `src/public/index.html` | 改 | hero/背景重做、价值主张、HUD、overflow、nav、CTA |
| `src/routes/pages.js` | 可能改 | 若 landing HUD 需要,确认 `/api/*` 可达(只读)|

执行顺序 = Phase 0 → 5,每个 Phase 独立可预览。

---

## Phase 0 — 共享基座(纯新增,不碰任何现有页面)

### Task 0.1: 创建 `glass-system.css`

**Files:**
- Create: `src/public/styles/glass-system.css`

- [ ] **Step 1: 写共享 token + 组件类**

写入 `src/public/styles/glass-system.css`(token 沿用 ranking/token-detail 现有 OKLCH 值,新增 `.zl-*` 命名空间组件):

```css
:root{
  /* 深空表面(与 index.html / ranking 现值一致) */
  --surface-0: oklch(10% 0.02 270);
  --surface-1: oklch(14% 0.02 270);
  --surface-2: oklch(18% 0.02 270);
  --surface-3: oklch(22% 0.02 270);
  --text-primary: oklch(92% 0.01 270);
  --text-secondary: oklch(72% 0.02 270);
  --text-muted: oklch(55% 0.02 270);
  --accent: oklch(62% 0.2 290);
  --positive: oklch(72% 0.18 155);
  --negative: oklch(58% 0.22 25);
  --sol-purple:#9945FF; --sol-green:#14F195; --sol-blue:#00D1FF; --sol-cyan:#22D3EE;
  --ease-out: cubic-bezier(0.33,1,0.68,1);
  /* 玻璃 */
  --zl-glass-fill: oklch(16% 0.02 270 / 0.55);
  --zl-glass-fill-solid: oklch(13% 0.02 270 / 0.88); /* 数据面板:高不透明,保读数 */
  --zl-glass-border: oklch(55% 0.15 290 / 0.22);
  --zl-blur-strong: 16px;
  --zl-blur-soft: 11px;
  --font-display:'Orbitron',sans-serif;
  --font-ui:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
}
*{box-sizing:border-box}
.zl-num{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
.zl-up{color:var(--positive)} .zl-dn{color:var(--negative)}

/* 固定辉光背景层:整站一层,内容浮其上 */
.zl-page-bg{position:fixed;inset:0;z-index:-1;background:
  radial-gradient(600px 380px at 20% 8%, oklch(55% 0.18 290 / .22), transparent 70%),
  radial-gradient(560px 360px at 85% 22%, oklch(65% 0.12 230 / .16), transparent 70%),
  var(--surface-0);}
@media (prefers-reduced-motion:no-preference){
  .zl-page-bg{animation:zlGlow 14s ease-in-out infinite}
}
@keyframes zlGlow{0%,100%{opacity:1}50%{opacity:.82}}

/* 玻璃面板 */
.zl-glass-panel{background:var(--zl-glass-fill);
  -webkit-backdrop-filter:blur(var(--zl-blur-strong));backdrop-filter:blur(var(--zl-blur-strong));
  border:1px solid var(--zl-glass-border);border-radius:16px;
  box-shadow:inset 0 1px 0 oklch(100% 0 0 / .06)}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .zl-glass-panel{background:var(--surface-1)} /* 不支持 blur → 实色回退 */
}

/* 数据表容器:soft blur + 高不透明 */
.zl-data-card{background:var(--zl-glass-fill-solid);
  -webkit-backdrop-filter:blur(var(--zl-blur-soft));backdrop-filter:blur(var(--zl-blur-soft));
  border:1px solid var(--zl-glass-border);border-radius:14px;overflow:hidden}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .zl-data-card{background:var(--surface-1)}
}
.zl-data-table{width:100%;border-collapse:collapse;color:var(--text-primary)}
.zl-data-table th{font-family:var(--font-ui);font-size:11px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--text-muted);text-align:right;padding:12px 18px;font-weight:500;
  position:sticky;top:0;background:var(--surface-1);z-index:2} /* 表头近实色,不糊 */
.zl-data-table th:first-child,.zl-data-table th:nth-child(2){text-align:left}
.zl-data-table td{padding:13px 18px;border-top:1px solid oklch(55% 0.04 290 / .12);
  text-align:right;font-size:14px;background:oklch(11% 0.02 270 / .66)}
.zl-data-table td:first-child,.zl-data-table td:nth-child(2){text-align:left}
.zl-data-table tbody tr:hover td{background:oklch(20% 0.03 270 / .72);cursor:pointer}

/* metric 卡 */
.zl-stat-card{background:var(--zl-glass-fill);
  -webkit-backdrop-filter:blur(var(--zl-blur-soft));backdrop-filter:blur(var(--zl-blur-soft));
  border:1px solid var(--zl-glass-border);border-radius:12px;padding:16px 18px}
.zl-stat-card .zl-l{font-family:var(--font-ui);font-size:12px;color:var(--text-muted)}
.zl-stat-card .zl-v{font-family:var(--font-mono);font-size:22px;font-weight:700;margin-top:6px}

/* 导航 */
.zl-nav{display:flex;align-items:center;justify-content:space-between;
  padding:14px 24px;font-family:var(--font-ui)}
.zl-nav .zl-brand{font-family:var(--font-display);font-weight:700;font-size:18px;letter-spacing:.04em;
  display:flex;align-items:center;gap:10px;color:var(--text-primary);text-decoration:none}
.zl-nav .zl-links{display:flex;gap:26px}
.zl-nav .zl-links a{color:var(--text-secondary);text-decoration:none;font-size:14px}
.zl-nav .zl-links a.on{color:var(--text-primary)}
.zl-nav .zl-links a[aria-disabled="true"]{color:var(--text-muted);cursor:default}

/* 数字闪动 */
@keyframes zlFlashUp{0%{background:oklch(72% 0.18 155 / .42)}100%{background:transparent}}
@keyframes zlFlashDn{0%{background:oklch(58% 0.22 25 / .42)}100%{background:transparent}}
.zl-flash-up{animation:zlFlashUp .9s ease-out}
.zl-flash-dn{animation:zlFlashDn .9s ease-out}
@media (prefers-reduced-motion:reduce){
  .zl-flash-up,.zl-flash-dn{animation:none}
}

/* 名次/状态徽章 */
.zl-bdg{font-family:var(--font-mono);font-size:10px;font-weight:700;padding:2px 6px;border-radius:5px;margin-left:7px}
.zl-bdg.new{color:var(--sol-green);background:oklch(72% 0.18 155 / .18);border:1px solid oklch(72% 0.18 155 / .4)}
.zl-bdg.up{color:var(--sol-cyan);background:oklch(65% 0.12 230 / .16)}
.zl-bdg.dn{color:var(--negative);background:oklch(58% 0.22 25 / .16)}

/* 术语 popover */
.zl-term{border-bottom:1px dashed var(--text-muted);cursor:help;position:relative}
.zl-pop{position:absolute;bottom:130%;left:0;width:220px;padding:10px 12px;font-size:12px;line-height:1.5;
  color:var(--text-primary);background:var(--surface-2);border:1px solid var(--zl-glass-border);
  border-radius:10px;box-shadow:0 6px 24px oklch(0% 0 0 / .4);z-index:50;display:none}
.zl-term:hover .zl-pop,.zl-term:focus-within .zl-pop{display:block}

/* toast */
.zl-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);
  background:var(--surface-2);border:1px solid var(--zl-glass-border);color:var(--text-primary);
  font-family:var(--font-ui);font-size:13px;padding:10px 18px;border-radius:10px;opacity:0;
  transition:opacity .2s,transform .2s;z-index:100;pointer-events:none}
.zl-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}

/* 骨架屏 */
.zl-skel{background:linear-gradient(90deg,oklch(18% 0.02 270 / .4) 25%,oklch(24% 0.02 270 / .6) 50%,oklch(18% 0.02 270 / .4) 75%);
  background-size:200% 100%;border-radius:8px;height:1em}
@media (prefers-reduced-motion:no-preference){.zl-skel{animation:zlShimmer 1.3s infinite}}
@keyframes zlShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* 移动端数据表横滚 */
.zl-table-scroll{overflow-x:auto}
.zl-table-scroll .zl-data-table{min-width:640px}
```

- [ ] **Step 2: 浏览器自检 CSS 不报错**

Run: `npx --yes csstree-validator src/public/styles/glass-system.css` (若网络不可用则跳过,改用 Step 3 的实测)
Expected: 无 parse error(警告可接受)。

- [ ] **Step 3: 提交**

```bash
git add src/public/styles/glass-system.css
git commit -m "feat(glass): 新增共享 glass-system.css 设计系统(token + .zl-* 组件)"
```

### Task 0.2: 创建术语字典 `signal-glossary.js`

**Files:**
- Create: `src/views/_shared/signal-glossary.js`
- Test: `test/glass-unit.mjs`

- [ ] **Step 1: 写字典 + 渲染助手**

写入 `src/views/_shared/signal-glossary.js`。字典项对齐 KB 真实信号档位(pass/watch/small/swing/conviction)与榜单常见术语:

```js
// 术语 → 一句话解释。与 KB 信号档位语义对齐,避免脱节。
export const GLOSSARY = {
  'AI 叙事': 'AI 对该代币社区叙事/题材的归纳分析,非投资建议。',
  'KB 信号': '知智 KB(链上分析知识库)对该币的判断标签,来源 /api/kb-signals。',
  'CONVICTION': 'KB 最高档位:多维证据齐备的高确信信号(5-10% 仓位级别)。',
  'SWING': 'KB 波段档:satisfies 部分证据,适合波段而非重仓(1-3% 级别)。',
  'WATCH': 'KB 观察档:有苗头但证据不足,先观察不入场。',
  'SMALL': 'KB 小仓档:可小仓试探(0.5-1% 级别)。',
  'PASS': 'KB 跳过:不构成入场依据。',
  'Top10%': '前 10 大持有地址占总供应比例,越高越集中(庄控/砸盘风险)。',
  '聪明钱': '历史上有可验证盈利轨迹的链上钱包;其建仓常作为早期信号之一。',
};

const escTerm = (v)=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 把术语包成可 hover 的 .zl-term。**内部转义 label**,可安全接受动态信号文本(如 termHtml(sig))。
export function termHtml(label, key) {
  const safe = escTerm(label);
  const def = GLOSSARY[key || label];
  if (!def) return safe;
  return `<span class="zl-term" tabindex="0" aria-label="${safe}:${escTerm(def)}">${safe}` +
    `<span class="zl-pop" role="tooltip">${escTerm(def)}</span></span>`;
}
```

- [ ] **Step 2: 写失败测试**

写入 `test/glass-unit.mjs`:

```js
import assert from 'node:assert/strict';
import { GLOSSARY, termHtml } from '../src/views/_shared/signal-glossary.js';

assert.ok(GLOSSARY['SWING'].length > 5, 'SWING 有解释');
assert.match(termHtml('SWING'), /class="zl-term"/, 'termHtml 包裹术语');
assert.match(termHtml('SWING'), /role="tooltip"/, 'termHtml 含 tooltip');
assert.equal(termHtml('未知词'), '未知词', '未知词原样返回');
console.log('glossary OK');
```

- [ ] **Step 3: 运行测试(应通过)**

Run: `node test/glass-unit.mjs`
Expected: 打印 `glossary OK`,退出码 0。

- [ ] **Step 4: 提交**

```bash
git add src/views/_shared/signal-glossary.js test/glass-unit.mjs
git commit -m "feat(glass): 术语字典 signal-glossary + 单元测试"
```

### Task 0.3: 创建 shell 助手 `glass-shell.js`

**Files:**
- Create: `src/views/_shared/glass-shell.js`
- Test: `test/glass-unit.mjs`(追加)

- [ ] **Step 1: 写助手**

写入 `src/views/_shared/glass-shell.js`:

```js
// 无框架字符串助手:消除 3 个 JS view 重复的 head/背景/导航 markup。
export const esc = (v) => String(v == null ? '' : v)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">`;

// seoHead = buildSeoMeta() 输出原样透传;ga = 各 view 现有 GA snippet,**务必透传否则统计丢失**
// (ranking-page.js:36 / token-detail-page.js:45 现在在模板内注入 GA;切到本助手时把那段作为 ga 传入)。
export function renderGlassHead({ title, seoHead = '', ga = '', extraCss = '' }) {
  return `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${seoHead}
${FONTS}
<link rel="stylesheet" href="/styles/glass-system.css">
<meta name="view-transition" content="same-origin">
<style>${extraCss}</style>
${ga}</head>`;
}

export function renderGlassBackground() {
  return `<div class="zl-page-bg" aria-hidden="true"></div>`;
}

// active: 'ranking' | 'kb' | 'paper'
export function renderGlassNav(active = '') {
  const link = (href, key, label, disabled) => disabled
    ? `<a aria-disabled="true" title="即将上线">${label}</a>`
    : `<a href="${href}" class="${active === key ? 'on' : ''}">${label}</a>`;
  return `<nav class="zl-nav zl-glass-panel" style="border-radius:0;border-left:0;border-right:0;border-top:0">
    <a class="zl-brand" href="/"><span style="width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,var(--sol-purple),var(--sol-green))"></span>Zhizhi Labs</a>
    <span class="zl-links">
      ${link('/ranking','ranking','发现榜')}
      ${link('/ranking#kb','kb','KB 信号')}
      ${link('/paper','paper','模拟盘')}
      ${link('#','research','研究', true)}
    </span></nav>`;
}
```

- [ ] **Step 2: 追加测试到 `test/glass-unit.mjs`**

在文件末尾追加:

```js
import { esc, renderGlassNav, renderGlassHead } from '../src/views/_shared/glass-shell.js';
assert.equal(esc('<b>"x"&'), '&lt;b&gt;&quot;x&quot;&amp;', 'esc 转义');
assert.match(renderGlassNav('paper'), /\/paper" class="on"/, 'nav 高亮当前页');
assert.match(renderGlassNav(''), /aria-disabled="true"/, '研究 为 disabled 占位');
assert.match(renderGlassHead({title:'t',seoHead:'<meta name="x">'}), /<meta name="x">/, 'seoHead 透传');
assert.match(renderGlassHead({title:'t'}), /glass-system\.css/, '引共享 CSS');
console.log('shell OK');
```

- [ ] **Step 3: 运行测试**

Run: `node test/glass-unit.mjs`
Expected: 打印 `glossary OK` + `shell OK`,退出码 0。

- [ ] **Step 4: 提交**

```bash
git add src/views/_shared/glass-shell.js test/glass-unit.mjs
git commit -m "feat(glass): glass-shell 助手(head/bg/nav)+ esc + 单元测试"
```

---

## Phase 1 — paper 页 pilot(最低风险,验证系统可用)

### Task 1.1: 改写 `paper-page.js` 到玻璃系统

**Files:**
- Modify: `src/views/paper-page.js`(整文件改写)

- [ ] **Step 1: 改写渲染**

把 `renderPaperPage` 的 `<head>`/`<style>`/`<body>` 改为消费 shell + `.zl-*`。保留所有现有数据逻辑(`esc`/`pct`/`color`/`fmtMc`/延迟标记)。关键变更:

- `import { renderGlassHead, renderGlassBackground, renderGlassNav } from './_shared/glass-shell.js';`(顶部)
- `<head>` ← `renderGlassHead({ title:'模拟盘战绩 · Zhizhi Labs' })`
- `<body>` 开头插入 `${renderGlassBackground()}${renderGlassNav('paper')}`,内容包一层 `<main style="max-width:1100px;margin:0 auto;padding:24px">`
- 删除原 `<style>` 里的 `body{background:#0d1117...}` 等 GitHub-dark 调色板;改用 `glass-system.css`
- 汇总卡 `card()` → `<div class="zl-stat-card"><div class="zl-l">${label}</div><div class="zl-v zl-num" style="color:${c}">${val}</div></div>`,外层 `<div style="display:flex;gap:12px;flex-wrap:wrap">`
- 两张表外层包 `<div class="zl-data-card zl-table-scroll"><table class="zl-data-table">…</table></div>`;`pnl` 单元格用 `class="zl-num"` + 涨跌 inline color
- banner 用 `.zl-glass-panel` 样式

- [ ] **Step 2: 起服务预览**

Run: `npm start`(后台);浏览器 headless 打开 `http://localhost:<port>/paper`
Expected: 页面深空辉光背景 + 玻璃汇总卡 + 玻璃表格,无 GitHub-dark 蓝;console 无 error。

- [ ] **Step 3: 验证关键点(eval/截图)**

- 截图确认视觉;eval 确认表格在玻璃容器内、数字用 mono:
  `document.querySelector('.zl-data-card .zl-data-table') !== null` → true
- 移动端 390px 截图:表格可横向滚动不溢出。
- 切 `prefers-reduced-motion: reduce` 截图:辉光不呼吸、骨架不闪。

- [ ] **Step 4: 提交**

```bash
git add src/views/paper-page.js
git commit -m "feat(glass): paper 页切玻璃系统(pilot)"
```

- [ ] **Step 5: 用户视觉确认**

把 `/paper` 截图给用户看,确认 pilot 通过再进 Phase 2。

---

## Phase 2 — ranking 页(最大工量:keyed-row + FLIP + 交互)

### Task 2.1: 字体迁移(加载 JetBrains Mono,退役 Exo 2)

**Files:**
- Modify: `src/views/ranking-page.js:39`(font link)、`:72`/`:132` 等 `font-family` 引用

- [ ] **Step 1: 改 font link + body 字体**

- `ranking-page.js:39` 的 `<link href=...Orbitron...Exo+2...>` 改为加载 `Orbitron` + `JetBrains Mono`(去掉 Exo 2)。
- 全文件 `font-family: 'Exo 2', ...` → `font-family: var(--font-ui)`(需先在该文件 `:root` 或引 glass-system 提供 `--font-ui`);数字相关 `font-family` → `var(--font-mono)`。
- 引入共享 CSS:在 `<head>` 加 `<link rel="stylesheet" href="/styles/glass-system.css">`(token 统一来源)。

- [ ] **Step 2: 预览确认无字体回退方块**

Run: `npm start` → 打开 `/ranking`,截图。
Expected: 正文中文用系统无衬线、数字用 JetBrains Mono(等宽对齐),标题仍 Orbitron;console 无 404 字体。

- [ ] **Step 3: grep 残留**

Run: `grep -n "Exo 2\|Exo+2" src/views/ranking-page.js`
Expected: 无输出(或仅注释)。

- [ ] **Step 4: 提交**

```bash
git add src/views/ranking-page.js
git commit -m "feat(glass): ranking 字体迁移(JetBrains Mono + 系统无衬线,退役 Exo 2)"
```

### Task 2.2: keyed-row 渲染重构 + 单元格闪动

**Files:**
- Modify: `src/views/ranking-page.js`(`renderTable` 1035-1077 区域)
- Test: `test/glass-unit.mjs`(追加 keyed-diff 纯函数测试)

- [ ] **Step 1: 抽出 keyed-diff 纯函数并测试**

在 `src/views/_shared/glass-shell.js` 追加(纯函数,便于测试):

```js
// 比较两帧行数据(按 key=CA),返回每行的变化标记。
// prev/next: [{key, rank(从0), mc, vol}]
export function diffRows(prev, next) {
  const pmap = new Map((prev||[]).map((r,i)=>[r.key,{...r,rank:i}]));
  return next.map((r,i)=>{
    const p = pmap.get(r.key);
    return {
      key:r.key, rank:i,
      isNew: !p,
      rankDelta: p ? p.rank - i : 0,         // >0 上升
      mcFlash: p ? (r.mc>p.mc?'up':r.mc<p.mc?'dn':'') : '',
      volFlash: p ? (r.vol>p.vol?'up':r.vol<p.vol?'dn':'') : '',
    };
  });
}
```

追加测试到 `test/glass-unit.mjs`:

```js
import { diffRows } from '../src/views/_shared/glass-shell.js';
const prev=[{key:'A',mc:10,vol:5},{key:'B',mc:20,vol:3}];
const next=[{key:'B',mc:25,vol:9},{key:'A',mc:10,vol:5},{key:'C',mc:1,vol:1}];
const d=diffRows(prev,next);
assert.equal(d[0].key,'B'); assert.equal(d[0].rankDelta,1,'B 上升1');
assert.equal(d[0].mcFlash,'up'); assert.equal(d[2].isNew,true,'C 新入');
assert.equal(d[1].rankDelta,-1,'A 下降1');
console.log('diff OK');
```

Run: `node test/glass-unit.mjs` → Expected: 追加打印 `diff OK`,退出码 0。

- [ ] **Step 2: 改 `renderTable` 为 keyed-row 复用**

> **范围(Codex 核实)**:`renderTable` 只服务 **pump(`root-pump`)与 zhilabs(`root-zhilabs`)** 两个 tab(`ranking-page.js:1360/1614`)。**KB tab 走另一套 `renderKBSignals → kbRowsTable`**(多 `<tbody>` 分区,`:1102/1128/1144`)—— **本任务不改 KB renderer**;KB tab 只在 Task 2.1 拿玻璃样式 + Task 2.5 拿术语 popover,**不做 keyed-row/FLIP/排序/搜索**(v1 保留其现有 `innerHTML` 渲染)。这样 `root.__prev` 单缓存只用于 pump/zhilabs 两个独立 root,无冲突。

把 `renderTable(list, rootId)` 从 `root.innerHTML = table`(全量替换)改为:
- **CA 字段 = `row.token`**(Codex 核实;不是 `row.ca`)。每行 `<tr>` **同时**带 `data-key="${esc(row.token)}"` 和 `data-token="${esc(row.token)}"` —— 后者是现有行点击进详情读取的属性(`:1415`),漏了会断导航。
- 首次:建 `<table class="zl-data-table">` + `<tbody>`,按上述生成行。
- 后续刷新:读上一帧缓存(挂在 `root.__prev`,**per-root**),`diffRows`(key=`row.token`)算变化;按 next 顺序 **复用已存在的 `tr`(按 `data-key` 查),更新单元格文本**,新行创建并标 `.enter`,消失行移除;给变化的 MC/量单元格加 `.zl-flash-up/.zl-flash-dn`(动画结束后移除 class)。
- 把 next 帧缓存回 `root.__prev = next.map(r=>({key:r.token,mc:r.market_cap,vol:r.tx_volume_u_24h}))`。
- **请求版本守护(Codex 核实:刷新有竞态)**:初始 `Promise.allSettled` + `loadKbMap` 回灌 + 轮询(`:1557/1573/1609`)可能并发。给每个 root 维护递增 `root.__reqSeq`,fetch 发起时记 `myseq`,回来若 `myseq < root.__reqSeq` 则丢弃(不渲染、不 FLIP),避免旧响应覆盖新状态。
- 行点击进详情逻辑保留(读 `data-token`)。

(完整函数较长;实现时严格按上面 diffRows 的标记驱动 DOM 更新。)

- [ ] **Step 3: 预览验证闪动**

Run: `npm start` → `/ranking`;eval 触发一次刷新(或等自动刷新),截图。
Expected: 变化的市值/量格短暂闪绿/红;无整表重建闪烁;console 无 error。
Verify: `document.querySelectorAll('tbody tr[data-key]').length > 0` → true。

- [ ] **Step 4: 提交**

```bash
git add src/views/ranking-page.js src/views/_shared/glass-shell.js test/glass-unit.mjs
git commit -m "feat(glass): ranking keyed-row 渲染 + 单元格闪动 + diffRows 测试"
```

### Task 2.3: FLIP 重排动画

**Files:**
- Modify: `src/views/ranking-page.js`(`renderTable` 内)

- [ ] **Step 1: 接 FLIP**

在 Task 2.2 的 keyed 更新中,重排前后做 FLIP:
- 重排前:`const olds={}; [...tbody.children].forEach(tr=>olds[tr.dataset.key]=tr.getBoundingClientRect());`
- 复用/排序 DOM 到新顺序后:对每个 `tr`,新位置 `n=getBoundingClientRect()`,`dy=olds[key].top-n.top`;若 `dy` 非零:`tr.style.transform='translateY('+dy+'px)';tr.style.transition='none';requestAnimationFrame(()=>{tr.style.transition='transform .6s var(--ease-out)';tr.style.transform='';});`
- 新行(无 old)加 `.enter` 入场。
- **守护**:`if (matchMedia('(prefers-reduced-motion: reduce)').matches) { /* 跳过 transform,直接定位 */ }`;只对视口内行做 FLIP(`n.top` 在 `[0, innerHeight]` 才动画)。

- [ ] **Step 2: 预览验证 + 帧率**

Run: `/ranking`,触发顺序变化的刷新,录屏/连续截图确认行平滑滑动;DevTools Performance 抽查刷新瞬间无明显长任务(>50ms 掉帧)。
Expected: 行滑到新名次;reduced-motion 模式下直接跳变无动画。

- [ ] **Step 3: 提交**

```bash
git add src/views/ranking-page.js
git commit -m "feat(glass): ranking FLIP 重排动画(视口内 + reduced-motion 跳变)"
```

### Task 2.4: 表头排序 + 搜索 + 保状态 + 软暂停

**Files:**
- Modify: `src/views/ranking-page.js`

- [ ] **Step 1: 排序(含派生 serverRank)**

- **`serverRank` 不存在于 API**(Codex 核实:`/api/ranking` 直接吐 Supabase 行,无名次字段)。在 `renderTable` 拿到 list 时**派生** `serverRank = originalIndex + 1`(排序/过滤**之前**打标),挂到行对象。
- 表头加可点击排序(市值/24h 量/涨跌/持有),`<th>` 加 `data-sort` + 排序态箭头;点击切升降序,客户端 sort 后走 Task 2.2 的 keyed 更新。**`#` 列始终渲染 `serverRank`**(排序只改显示顺序,名次列不变)。

- [ ] **Step 1.5: `#kb` hash 激活 KB tab**

现 ranking JS 默认 pump,只在按钮点击切 tab,**不读 `location.hash`**(`:1430/1487`)。导航 `/ranking#kb`(Task 0.3)要生效,需:页面加载时读 `location.hash`(`#kb`→激活 KB tab),并监听 `hashchange` 切 tab。无 hash 时维持默认 pump。

- [ ] **Step 2: 搜索**

榜单上方加一个 `<input class="zl-num" placeholder="搜索名字 / symbol / CA">`,`input` 事件即时过滤当前帧(纯客户端),走 keyed 更新。

- [ ] **Step 3: 保状态 + 软暂停**

自动刷新时:保留 `scrollY`、搜索词、排序态(存模块变量,刷新后重应用);若用户正 hover 某行或 popover 打开(`document.querySelector('.zl-term:focus-within')` 或 hover 标志),本次重排延后到交互结束(软暂停)。

- [ ] **Step 4: 预览验证**

Run: `/ranking`;eval/交互验证:点表头排序后 `#` 列仍是原名次;输入搜索过滤生效;滚动后触发刷新滚动位置不跳;hover 行时刷新不打断。截图。

- [ ] **Step 5: 提交**

```bash
git add src/views/ranking-page.js
git commit -m "feat(glass): ranking 排序+搜索+刷新保状态+inspect 软暂停"
```

### Task 2.5: 术语 popover + 复制 toast + stopPropagation

**Files:**
- Modify: `src/views/ranking-page.js`

- [ ] **Step 1: 接术语 popover**

`import { termHtml } from './_shared/signal-glossary.js';`;表头/信号徽章用 `termHtml('KB 信号')`、`termHtml(sig)` 等包裹(信号列、Top10% 列、表头"信号")。

- [ ] **Step 2: 复制 CA toast + 冒泡控制**

复制 CA 按钮 `onclick` 里 `event.stopPropagation()`(防冒泡到行→误跳详情)+ 复制成功显示 `.zl-toast`「已复制」(0.2s 显示、1.5s 后隐藏)。popover 触发元素同样 `stopPropagation`。

- [ ] **Step 3: 预览验证**

Run: `/ranking`;hover 信号徽章出解释;点复制 CA 出 toast 且**不**跳详情页;键盘 Tab 到术语可聚焦出 popover。截图 + console 检查。

- [ ] **Step 4: 提交**

```bash
git add src/views/ranking-page.js
git commit -m "feat(glass): ranking 术语 popover + 复制 toast + stopPropagation"
```

- [ ] **Step 5: 用户视觉确认 ranking 全部交互**

---

## Phase 3 — token-detail 轻触(样板页,只对齐不重写)

### Task 3.1: 字体 + glass-system 对齐 + 去 Fira Code

**Files:**
- Modify: `src/views/token-detail-page.js:49`(font link)、`:379`(Fira Code)、`<head>`

- [ ] **Step 1: 改字体 + 引共享 CSS**

- `:49` font link 加载 `JetBrains Mono`(去 Exo 2);`<head>` 加 `<link rel="stylesheet" href="/styles/glass-system.css">`。
- `:379` `font-family:'Fira Code',...` → `var(--font-mono)`。
- `Exo 2` 引用 → `var(--font-ui)`。
- **布局/玻璃头部/stat grid/K 线集成一律不动**。

- [ ] **Step 2: 回归对比(关键:不退化)**

Run: `npm start` → `/token/<任一CA>`,与改前截图逐区对比(头部、stat 卡、K 线、叙事卡)。
Expected: 视觉等价或更统一,无错位/无丢内容;console 无 error;K 线正常渲染。

- [ ] **Step 3: grep 残留**

Run: `grep -n "Fira Code\|Exo 2\|Exo+2" src/views/token-detail-page.js`
Expected: 无输出。

- [ ] **Step 4: 提交**

```bash
git add src/views/token-detail-page.js
git commit -m "feat(glass): token-detail 字体/CSS 对齐共享系统(布局不动)"
```

---

## Phase 4 — landing 页(hero 重做 + 价值主张 + 实时 HUD)

### Task 4.1: hero/背景重做 + 引共享系统 + 内联导航

**Files:**
- Modify: `src/public/index.html`

- [ ] **Step 1: 背景/overflow 重做**

- `<head>` 加 `<link rel="stylesheet" href="/styles/glass-system.css">` + `<meta name="view-transition" content="same-origin">`。
- `body{overflow:hidden;height:100%}` → 允许纵向滚动(去掉 `overflow:hidden`,`min-height:100vh`)。
- **保留一层** `.zl-page-bg` 辉光;**删除**多余的 mousemove 视差 JS + 扫描线/多动画层(只留一层辉光 + 可选缓慢呼吸,受 reduced-motion 管控)。
- 顶部内联 `renderGlassNav` 等价 markup(静态页手写同款 `.zl-nav`,当前页无高亮)。

- [ ] **Step 2: 预览**

Run: `npm start` → `/`;截图 + 移动端 390px 截图。
Expected: 可纵向滚动;辉光背景统一;无视差卡顿;console 无 error。

- [ ] **Step 3: 提交**

```bash
git add src/public/index.html
git commit -m "feat(glass): landing 背景/overflow 重做 + 共享系统 + 内联导航"
```

### Task 4.2: 价值主张 + CTA 文案

**Files:**
- Modify: `src/public/index.html`

- [ ] **Step 1: 改文案**

- H1 保留 `Zhizhi Labs`;其下加价值主张:`实时发现 Solana meme 新币 —— 按交易量、持仓、聪明钱与 AI 叙事信号交叉排序。`
- CTA `discovery` → `查看实时榜单`,`href="/ranking"`。

- [ ] **Step 2: 预览确认**

Run: `/` 截图。Expected: 首屏可读懂产品;CTA 跳 `/ranking`。

- [ ] **Step 3: 提交**

```bash
git add src/public/index.html
git commit -m "feat(glass): landing 中文价值主张 + CTA 改 查看实时榜单"
```

### Task 4.3: 实时 top-3 HUD(/api/ranking + /api/kb-signals join + esc + 兜底)

**Files:**
- Modify: `src/public/index.html`
- Test: `test/glass-unit.mjs`(追加 join 纯函数测试)

- [ ] **Step 1: 抽 join 纯函数 + 测试**

在 `src/views/_shared/glass-shell.js` 追加:

```js
// 把 ranking 行与 kb-signals 合并,取 top N。
// Codex 核实:kb-signals 按 `ca` keyed(不是 token);信号档位字段是 conviction_rating(无顶层 verdict/tier/label)。
export function joinHudRows(ranking, kbSignals, n = 3) {
  const sigMap = new Map((kbSignals||[]).map(s => [s.ca, s.conviction_rating || (s.smart_money_24h ? '聪明钱' : '') ]));
  return (ranking||[]).slice(0, n).map(r => ({
    name: r.name, symbol: r.symbol, token: r.token,
    vol: r.tx_volume_u_24h, change: r.price_change_24h, mc: r.market_cap,
    signal: sigMap.get(r.token) || '—',   // ranking 行的 CA = r.token,与 kb 的 s.ca 对齐
  }));
}
```

追加测试:

```js
import { joinHudRows } from '../src/views/_shared/glass-shell.js';
const rk=[{token:'A',name:'Aa',symbol:'A',tx_volume_u_24h:9,market_cap:1,price_change_24h:5}];
const kb=[{ca:'A',conviction_rating:'SWING'}];
const h=joinHudRows(rk,kb,3);
assert.equal(h[0].signal,'SWING','ranking.token 与 kb.ca join 到信号');
assert.equal(joinHudRows([{token:'X',name:'x'}],[],3)[0].signal,'—','无信号回退—');
console.log('hud OK');
```

Run: `node test/glass-unit.mjs` → Expected: 追加 `hud OK`,退出码 0。
注意:实现前 `curl localhost:<port>/api/kb-signals | head` 核对 `conviction_rating` 实际取值(若主显示用别的字段,如 `revival`/`cluster_risk`,按 `kbSignalCell` 语义调整)。

- [ ] **Step 2: 首屏内嵌 HUD + 客户端拉数据**

在 `index.html` 首屏加 `<div id="zl-hud" class="zl-glass-panel">…骨架占位…</div>` + 内联 `<script>`:
- **必须内联 join + esc 逻辑**(Codex 核实:Express 只静态服务 `src/public`,`src/views/_shared/glass-shell.js` 浏览器**无法 import**会 404)。把 `joinHudRows` 与 `esc` 的逻辑**复制进 `index.html` 的 `<script>`**(landing 是静态页,本就独立)。
- `Promise.all([fetch('/api/ranking'), fetch('/api/kb-signals')])`,各自 `.ok ? json : 抛错`;
- 成功:join 取 top3(ranking 行 CA=`r.token` 对 kb 的 `s.ca`),渲染 3 行;**所有 name/symbol 经 esc**;数字用 `.zl-num`,涨跌用 `.zl-up/.zl-dn`。
- 失败/空:渲染静态占位「榜单加载中,稍后重试」+「查看完整榜单 →」按钮,**不留空玻璃框**。

- [ ] **Step 3: 预览验证(含失败态)**

Run: `npm start` → `/`,截图确认 top3 真数据 + 信号标签。
- 模拟失败:DevTools 把 `/api/ranking` 置为 offline / eval 覆写 fetch 抛错,刷新确认显示占位而非空框。
- eval 确认无 XSS 注入风险:`document.querySelector('#zl-hud').innerHTML` 中名称已转义。

- [ ] **Step 4: 提交**

```bash
git add src/public/index.html src/views/_shared/glass-shell.js test/glass-unit.mjs
git commit -m "feat(glass): landing 实时 top-3 HUD(ranking+kb-signals join + esc + 失败兜底)"
```

- [ ] **Step 5: 用户视觉确认 landing**

---

## Phase 5 — View Transitions 跨页转场(最后统一接)

### Task 5.1: 跨页 same-origin 转场 + 守护

**Files:**
- Modify: `src/public/index.html`、`src/views/ranking-page.js`、`src/views/token-detail-page.js`、`src/views/paper-page.js`(均已在各自 `<head>` 有 `<meta name="view-transition" content="same-origin">`,Task 0.3/4.1 已加;补齐遗漏页)

- [ ] **Step 1: 确认每页 head 有 view-transition opt-in**

Run: `grep -rl 'name="view-transition"' src/views src/public/index.html`
Expected: 4 个页面文件都命中;缺的补 `<meta name="view-transition" content="same-origin">`。

- [ ] **Step 2: 命名共享元素 + reduced-motion 守护**

在 `glass-system.css` 追加:
```css
@media (prefers-reduced-motion:reduce){
  ::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none !important}
}
```
(可选)给 token 标题/品牌 logo 加 `view-transition-name` 让其跨页 morph;v1 默认整页淡入即可。

- [ ] **Step 3: 预览验证**

Run: Chrome 打开 `/` → 点「查看实时榜单」→ 平滑过渡到 `/ranking`;`/ranking` 点行 → `/token/:ca` 过渡。
- reduced-motion 模式:转场被禁,普通跳转。
- 非 Chrome(或 eval 删除 `document.startViewTransition`)确认回退普通跳转,功能不坏。

- [ ] **Step 4: 提交**

```bash
git add src/public/styles/glass-system.css src/views/*.js src/public/index.html
git commit -m "feat(glass): View Transitions 跨页转场 + reduced-motion 守护"
```

---

## Phase 6 — 全站预览矩阵 + 收尾

### Task 6.1: 完整预览矩阵 + 用户终审

- [ ] **Step 1: 跑预览矩阵**

`npm start`,headless 逐项截图:
- 页面:`/`、`/ranking`(4 tab:Pump / zhizhilabs / Binance / KB)、`/paper`、`/token/:ca`
- 视口:390px / 768px / 1280px
- `prefers-reduced-motion: reduce`
- API 失败 + 空数据(landing HUD + ranking)
- Safari `backdrop-filter` 回退(或 `@supports` 关闭模拟):确认玻璃面板退实色仍可读

- [ ] **Step 2: 字体残留终检**

Run: `grep -rn "Exo 2\|Exo+2\|Fira Code" src/`
Expected: 无输出(注释除外)。

- [ ] **Step 3: 单元测试全绿**

Run: `node test/glass-unit.mjs`
Expected: `glossary OK` / `shell OK` / `diff OK` / `hud OK` 全部打印,退出码 0。

- [ ] **Step 4: 用户终审 + 决定 push**

把矩阵截图给用户;用户确认后再决定是否 push `feat/glass-redesign` / 部署 Railway(本计划不自动 push)。

---

## Self-Review(对照 spec)

- **§4 设计系统** → Task 0.1 ✓(token + .zl-* 全覆盖,含 @supports 回退、reduced-motion、对比用高不透明数据面板)
- **§5 架构(命名空间 + shell 助手,无框架)** → Task 0.1/0.3 ✓
- **§6.1 landing(价值主张/HUD/overflow/signal join/esc)** → Phase 4 ✓
- **§6.2 ranking(table-card 保留 + keyed-row)** → Phase 2 ✓
- **§6.3 token-detail 轻触** → Phase 3 ✓
- **§6.4 paper 玻璃化** → Phase 1 ✓
- **§7.1 nav 真实路由(KB tab / 研究 disabled)** → Task 0.3 ✓
- **§7.2 闪动 + FLIP** → Task 2.2 / 2.3 ✓
- **§7.3 排序(# 保留名次)/ 搜索 / 保状态 / 软暂停 / 新入掉出** → Task 2.4 + 2.2(diffRows isNew/rankDelta)✓
- **§7.4 术语 popover** → Task 0.2 + 2.5 ✓
- **§7.5 toast + stopPropagation** → Task 2.5 ✓
- **§7.6 骨架屏 / 失败重试** → Task 0.1(.zl-skel)+ 4.3 ✓
- **§7.7 View Transitions** → Phase 5 ✓
- **§7.8 移动端横滚** → Task 0.1(.zl-table-scroll)+ 各页验证 ✓
- **§8 守护 / §9 顺序 / 预览矩阵** → Phase 顺序 + Task 6.1 ✓
- **字体迁移(JetBrains Mono 加载 / 退役 Exo2+Fira)** → Task 2.1 / 3.1 / 6.1 grep ✓

无占位符;类型/函数名一致(`diffRows`/`joinHudRows`/`termHtml`/`esc`/`renderGlassNav` 跨任务一致)。
