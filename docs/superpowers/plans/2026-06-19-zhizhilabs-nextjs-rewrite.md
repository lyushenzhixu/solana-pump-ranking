# zhizhilabs Next.js 忠实重写 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前线上 Express 版 zhizhilabs 用 Next.js 忠实重写——保持老版聚焦结构(hero / 发现榜 / 代币详情 / 模拟盘)与玻璃态视觉,消除 Express SSR 整页重载的「卡」。

**Architecture:** 基于 archive/nextjs-frame(已是 Express 的完整 Next.js 移植)reshape:删平台臃肿外层(营销页 / dashboard / perps / 预测 / 侧栏壳),IA 收回老版顶部 nav + 4 个聚焦页。数据层(`lib/sources/*` + 12 个 `app/api/**/route.ts`)原样复用。补 hero 移植、`instrumentation.ts` 榜单刷新、代币详情 server 预取(灭「—」)、推特时间线内嵌。

**Tech Stack:** Next.js 15.5(App Router)/ React 19 / TypeScript / Supabase JS / lightweight-charts / vitest。Node runtime,Railway `next start`。

## Global Constraints

- **分支**:在 `feat/nextjs-rewrite`(已从 `origin/archive/nextjs-frame-20260619` 拉)上作业。**绝不 push 生产分支 `feat/nextjs-frame`**(线上 Express),直到 user 确认。
- **本地预览铁律(KB feedback)**:任何改动 push 生产前,必须 `npm run dev` 本地跑 + user 视觉确认 + style-match。subagent 不 push 生产。
- **脱敏**:任何 Supabase 读必须走 `lib/queries.ts` + `lib/columns.ts` 白名单;禁 select 敏感列(`assertNoSensitive` 已强制)。不新增暴露列。
- **铁则#14**:不编造叙事/推文;`narrative_twitter.status !== 'generated'` 时不渲染时间线卡(组件已内建该 guard)。
- **设计 tokens**:沿用 `app/globals.css` 现有 OKLCH 变量(`--surface-1/2`、`--line`/`--line-soft`、`--text`/`-2`/`-3`、`--accent`/`--accent-bg`、`--up`/`--down`/`--warn`、`--radius`/`-sm`/`-xs`)。app 页字体 Noto Sans SC + JetBrains Mono(`app/layout.tsx` 已加载);**仅 hero 用 Orbitron**(其 `<style>` 自带 import)。
- **统一性**:`pump/zhilabs/KB信号` 三 tab 共用同一 `RankingTable` 行布局;`持有人` 列对无 holders 数据的 KB 行显示「—」。每行 → `/token/[ca]`。代币详情页对所有币是同一模板。
- **不删 `src/data-sources/`**:`scripts/fetch-*.js`(榜单刷新,被 `instrumentation.ts` 调用)仍依赖它。它不是死代码。
- 每个 task 完成后 `npm run build` 必须绿;UI task 额外本地 preview 截图。
- spec 真相源:`docs/superpowers/specs/2026-06-19-zhizhilabs-nextjs-rewrite-design.md`。

---

## File Structure(决策锁定)

**新建**:
- `app/page.tsx` — 宇宙 hero 欢迎页(替换 `app/(marketing)/page.tsx`)。
- `components/shell/TopNav.tsx` — 顶部 nav 条(替换 Sidebar/AppShell)。client component(`usePathname` 高亮)。
- `components/ranking/RankingTable.tsx` — 统一表格行(server component)。pump/zhilabs/KB 共用。
- `components/ranking/RankingTabs.tsx` — 4-tab 客户端切换壳(client)。
- `lib/rankingMerge.ts` — 纯函数:把 kb_signals 摘要 join 到 ranking 行 + KB 行→统一行映射(可单测)。
- `instrumentation.ts` — server 启动起 scheduler interval。
- 测试:`test/rankingMerge.test.ts`、`test/instrumentation-guard.test.ts`。

**改造**:
- `app/(app)/layout.tsx` — 去 AppShell,改极简 `<TopNav/> + 居中容器`。
- `app/(app)/meme/` → 移到 `app/(app)/ranking/`(目录重命名);`page.tsx` 接 `RankingTabs`。
- `app/token/[address]/page.tsx` — RSC server 预取 + 传 initialData + 内嵌时间线卡 + 面包屑 `/meme`→`/ranking`。
- `components/token/{DexChart,TokenSections}.tsx` — 接 `initialToken` prop(消除首屏「—」)。
- `components/signals/SignalListItem.tsx` — `href` `/signals/`→`/token/`。
- `app/globals.css` — 删 `.app-shell` 等壳规则。
- `next.config.mjs` — redirect 反转 `/meme`→`/ranking`。
- `app/sitemap.ts` — `/meme`→`/ranking`(若有)。

**删除**:`app/(marketing)/`、`app/(app)/dashboard/`、`app/(app)/perps/`、`app/(app)/prediction/`、`app/(app)/smart-money/`、`app/(app)/signals/`(含 `[ca]`)、`components/shell/{AppShell,Sidebar}.tsx`、`lib/nav.ts`、`test/nav.test.ts`。

**复用不动**:`lib/queries.ts`、`lib/columns.ts`、`lib/supabase.ts`、`lib/sources/*`、`app/api/**`、`components/ui/*`、`components/token/TokenSections`(只加 prop)、`components/signals/TweetTimelineCard.tsx`、`components/smart-money/SmartMoneyPanels.tsx`、`app/(app)/paper/page.tsx`(只换 Topbar 由共享 layout 提供)。

---

## Increment 1:壳 + hero + 发现榜

### Task 1: 移植宇宙 hero 为 `/`

**Files:**
- Create: `app/page.tsx`
- Create: `app/hero.css`(从 Express `<style>` 块抽出的 hero 专用 CSS)
- Delete: `app/(marketing)/page.tsx`(及空的 `app/(marketing)/` 目录)
- Source(只读参考):Express 分支 `feat/nextjs-frame:src/public/index.html`

**Interfaces:**
- Produces: 路由 `/` 渲染 hero;CTA `查看实时榜单` → `/ranking`;实时 Top-3 HUD 调 `/api/ranking` + `/api/kb-signals`。

- [ ] **Step 1: 取出 Express hero 源**

Run: `git -C /Users/zhizhi/Desktop/solana-pump-ranking show feat/nextjs-frame:src/public/index.html > /tmp/express-hero.html`
Expected: 文件写出,约 1287 行(含 `<style>` cosmic 背景 + 中心标题 + HUD + 末尾 `<script>`)。

- [ ] **Step 2: 抽 CSS 到 `app/hero.css`**

把 `/tmp/express-hero.html` `<style>…</style>` 内的全部 CSS **逐字** copy 到 `app/hero.css`,**但去掉** `html, body { ... font-family: 'Orbitron' }` 里对 `html,body` 的全局 background/font 设定改为 scope 到 `.hero-universe` 根容器(避免污染全站 Noto Sans SC)。即:把原 `html, body { background: var(--surface-0); font-family: 'Orbitron' }` 改成 `.hero-root { background: var(--surface-0); font-family: 'Orbitron', sans-serif; }`,其余 `.universe`/`.stars`/`.nebula`/`.brand-logo`/`.explore-btn`/`.hud-row` 等选择器保持原样。保留顶部 `@import url('...Orbitron...JetBrains+Mono...')`。保留 `@media (prefers-reduced-motion)` 块。

- [ ] **Step 3: 写 `app/page.tsx`(client component 包 hero markup + HUD)**

把 `/tmp/express-hero.html` `<body>` 内 `<nav>` 之后到 `</body>` 之前的 markup(`.universe` 整块 + 所有 `.brand-logo`/`.glyphs`/`.center-content`/overlay)逐字搬进 JSX(注意 JSX 化:`class`→`className`、自闭合标签、`<use href>` 保留、inline `style="..."` 改成 `style={{...}}` 或移到 hero.css)。顶部 `import './hero.css'`。HUD + parallax 的 `<script>` 逻辑改写为 `useEffect`。CTA `<a href="/ranking">`。根元素加 `className="hero-root"`。

```tsx
'use client'

import { useEffect } from 'react'
import './hero.css'

export default function HomeHero() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // 1) 点击辉光 ripple(原 index.html 脚本逐字搬,选择器不变)
    const btn = document.getElementById('exploreBtn')
    const ripple = document.getElementById('ripple')
    const onClick = () => {
      if (reduce || !ripple || !btn) return
      const r = btn.getBoundingClientRect()
      ripple.style.left = r.left + r.width / 2 + 'px'
      ripple.style.top = r.top + r.height / 2 + 'px'
      ripple.classList.remove('active'); void ripple.offsetWidth; ripple.classList.add('active')
    }
    btn?.addEventListener('click', onClick)

    // 2) 鼠标 parallax(仅非 reduced-motion;原脚本逐字搬)
    let onMove: ((e: MouseEvent) => void) | null = null
    if (!reduce) {
      onMove = (e: MouseEvent) => {
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2
        const dx = (e.clientX - cx) / cx, dy = (e.clientY - cy) / cy
        const nebula = document.querySelector('.nebula') as HTMLElement | null
        if (nebula) nebula.style.transform = `translate(${dx * 20}px, ${dy * 20}px)`
        const orb = document.querySelector('.distortion-orb') as HTMLElement | null
        if (orb) orb.style.transform = `translate(${dx * -15}px, ${dy * -15}px)`
        const content = document.querySelector('.center-content') as HTMLElement | null
        if (content) content.style.transform = `translate(${dx * 5}px, ${dy * 5}px)`
      }
      document.addEventListener('mousemove', onMove)
    }

    // 3) Top-3 HUD(原 IIFE 逻辑;ranking 必需,kb-signals 可选 join)
    const hud = document.getElementById('zl-hud')
    const fmtVol = (v: number) => v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'K' : '$' + Math.round(v || 0)
    const fmtChg = (c: number) => (c >= 0 ? '+' : '') + (Number(c) || 0).toFixed(1) + '%'
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] as string))
    if (hud) {
      Promise.allSettled([
        fetch('/api/ranking').then((r) => (r.ok ? r.json() : Promise.reject())),
        fetch('/api/kb-signals').then((r) => (r.ok ? r.json() : Promise.reject())),
      ]).then(([rk, kb]) => {
        const ranking = rk.status === 'fulfilled' ? rk.value : null
        const rows = Array.isArray(ranking) ? ranking : ranking?.rows || []
        if (!rows.length) { hud.innerHTML = '<div class="hud-fallback">榜单加载中,稍后重试<br><a href="/ranking">查看完整榜单 →</a></div>'; return }
        const kbRows = kb.status === 'fulfilled' ? (Array.isArray(kb.value) ? kb.value : kb.value?.rows || []) : []
        const map = new Map(kbRows.map((s: any) => [s.ca, s.conviction_rating || (s.smart_money_24h ? '聪明钱' : '')]))
        hud.innerHTML = rows.slice(0, 3).map((row: any, i: number) => {
          const chg = Number(row.price_change_24h) || 0
          const sig = map.get(row.token) || '—'
          return `<div class="hud-row"><span class="hud-rank zl-num">#${i + 1}</span><span class="hud-name">${esc(row.name || row.symbol || '?')}<span class="hud-sym">${esc(row.symbol || '')}</span></span><span class="hud-vol zl-num">${fmtVol(row.tx_volume_u_24h)}</span><span class="hud-chg zl-num ${chg >= 0 ? 'zl-up' : 'zl-dn'}">${fmtChg(chg)}</span><span class="hud-sig">${esc(sig)}</span></div>`
        }).join('')
      }).catch(() => { hud.innerHTML = '<div class="hud-fallback">榜单加载中,稍后重试<br><a href="/ranking">查看完整榜单 →</a></div>' })
    }

    return () => { btn?.removeEventListener('click', onClick); if (onMove) document.removeEventListener('mousemove', onMove) }
  }, [])

  return (
    <div className="hero-root">
      {/* …此处粘贴 index.html <body> 内 .universe 整块(JSX 化:class→className)… */}
    </div>
  )
}
```

注:`.zl-glass-panel`/`.zl-skel`/`.zl-num`/`.zl-up`/`.zl-dn` 等类来自 Express `glass-system.css`;若 hero 用到,把这些类的规则一并并入 `app/hero.css`(从 `git show feat/nextjs-frame:src/public/styles/glass-system.css` 取)。

- [ ] **Step 4: 删营销页**

Run: `git -C /Users/zhizhi/Desktop/solana-pump-ranking rm -r 'app/(marketing)'`
Expected: marketing 落地页移除;`/` 现由 `app/page.tsx` 提供。

- [ ] **Step 5: 构建 + 预览**

Run: `cd /Users/zhizhi/Desktop/solana-pump-ranking && npm run build`
Expected: 构建成功,无 type 错误。
然后 `npm run dev`,用 preview 工具开 `/`:验证 cosmic 动画顺滑、品牌 logo 漂浮、Top-3 HUD 出真实数据、CTA → `/ranking`、`prefers-reduced-motion` 降级。截图给 user。

- [ ] **Step 6: Commit**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking add app/page.tsx app/hero.css && \
git -C /Users/zhizhi/Desktop/solana-pump-ranking rm -r --cached 'app/(marketing)' 2>/dev/null; \
git -C /Users/zhizhi/Desktop/solana-pump-ranking commit -m "feat(hero): 移植 Express 宇宙 hero 为 Next.js / 删营销落地页"
```

---

### Task 2: 极简 layout + TopNav + globals 清壳

**Files:**
- Create: `components/shell/TopNav.tsx`
- Modify: `app/(app)/layout.tsx`(全量替换内容)
- Modify: `app/globals.css`(删壳规则 + 加居中容器)
- Test: 无(纯 UI;靠 build + preview)

**Interfaces:**
- Consumes: 现有 `app/globals.css` token 变量。
- Produces: `<TopNav/>`(brand + 发现榜/`/ranking` + KB信号/`/ranking#kb` + 模拟盘/`/paper`);`app/(app)/layout.tsx` 用 TopNav + `.page-container` 居中包裹 children。

- [ ] **Step 1: 写 `components/shell/TopNav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { label: '发现榜', href: '/ranking' },
  { label: 'KB 信号', href: '/ranking#kb' },
  { label: '模拟盘', href: '/paper' },
]

export default function TopNav() {
  const pathname = usePathname()
  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 18,
        padding: '12px 22px',
        borderBottom: '1px solid var(--line-soft)',
        background: 'color-mix(in oklch, var(--bg) 80%, transparent)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text)', fontWeight: 700 }}>
        <span style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #9945FF, #14F195)' }} />
        Zhizhi Labs
      </Link>
      <span style={{ display: 'flex', gap: 14, marginLeft: 8 }}>
        {LINKS.map((l) => {
          const active = pathname === l.href.split('#')[0]
          return (
            <Link key={l.href} href={l.href} style={{ fontSize: 13.5, textDecoration: 'none', color: active ? 'var(--text)' : 'var(--text-2)' }}>
              {l.label}
            </Link>
          )
        })}
      </span>
    </nav>
  )
}
```

- [ ] **Step 2: 全量替换 `app/(app)/layout.tsx`**

```tsx
import TopNav from '@/components/shell/TopNav'
import React from 'react'

/** 聚焦版 layout:顶部 nav + 居中容器(替换平台侧栏壳) */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <div className="page-container">{children}</div>
    </>
  )
}
```

- [ ] **Step 3: 改 `app/globals.css`**

先 `grep -n 'app-shell\|app-sidebar\|mobile-bar\|app-scrim\|app-content\|drawer-open\|hamburger' app/globals.css` 找到这些选择器的规则块,**删除**它们(平台侧栏壳专用,已无引用)。在文件末尾追加:

```css
/* 聚焦版居中容器(替换 .app-shell grid) */
.page-container {
  max-width: 1080px;
  margin: 0 auto;
  width: 100%;
}
```

- [ ] **Step 4: 构建 + 预览**

Run: `npm run build`
Expected: 绿(注意:此时 `AppShell`/`Sidebar` 仍在但已无 import → 不报错;若 lint 报 unused 忽略,Task 3 删)。
`npm run dev` 开 `/meme` + `/paper`:验证顶部 nav 出现、无侧栏、内容居中、链接可点。截图给 user。

- [ ] **Step 5: Commit**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking add components/shell/TopNav.tsx 'app/(app)/layout.tsx' app/globals.css && \
git -C /Users/zhizhi/Desktop/solana-pump-ranking commit -m "feat(shell): 极简顶部 nav + 居中容器,去平台侧栏壳"
```

---

### Task 3: 删平台页 + 侧栏组件 + nav 配置

**Files:**
- Delete: `app/(app)/dashboard/`、`app/(app)/perps/`、`app/(app)/prediction/`、`app/(app)/smart-money/`、`components/shell/AppShell.tsx`、`components/shell/Sidebar.tsx`、`lib/nav.ts`、`test/nav.test.ts`

**Interfaces:**
- Produces: 这些路由不再存在;nav 只剩 `/`、`/ranking`(下 Task)、`/paper`、`/token/[ca]`、`/signals`(下下 Task 删)。

- [ ] **Step 1: 确认无残留 import**

Run: `cd /Users/zhizhi/Desktop/solana-pump-ranking && grep -rn "AppShell\|components/shell/Sidebar\|lib/nav\|@/lib/nav" app components lib test --include='*.ts' --include='*.tsx' | grep -v 'TopNav'`
Expected: 仅可能命中 `app/(app)/layout.tsx`(Task 2 已改不引 AppShell)→ 实际应**无输出**。若有残留引用先清。

- [ ] **Step 2: 删文件**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking rm -r \
  'app/(app)/dashboard' 'app/(app)/perps' 'app/(app)/prediction' 'app/(app)/smart-money' \
  components/shell/AppShell.tsx components/shell/Sidebar.tsx lib/nav.ts test/nav.test.ts
```
Expected: 删除成功。注意 `components/smart-money/SmartMoneyPanels.tsx` **保留**(下个 increment binance tab 用)。

- [ ] **Step 3: 构建 + 测试**

Run: `npm run build && npx vitest run`
Expected: build 绿;vitest 不再跑 nav.test(已删),其余通过。
`npm run dev` 开 `/dashboard` → 应 404;`/ranking`(暂仍 `/meme`)、`/paper`、`/` 正常。

- [ ] **Step 4: Commit**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking commit -m "chore(strip): 删 dashboard/perps/prediction/smart-money 页 + 侧栏壳 + nav 配置"
```

---

### Task 4: `/meme`→`/ranking` 重命名 + 删 `/signals` 页 + 修内部链接

**Files:**
- Rename: `app/(app)/meme/` → `app/(app)/ranking/`
- Delete: `app/(app)/signals/`(含 `[ca]/`)
- Modify: `next.config.mjs`、`components/signals/SignalListItem.tsx`、`app/token/[address]/page.tsx`(面包屑)、`app/sitemap.ts`(若引用 `/meme`)

**Interfaces:**
- Produces: 路由 `/ranking` 上线;`/meme` 永久重定向到 `/ranking`;`SignalListItem` 链接指 `/token/[ca]`。

- [ ] **Step 1: 重命名目录**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking mv 'app/(app)/meme' 'app/(app)/ranking'
```

- [ ] **Step 2: 删独立 signals 页**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking rm -r 'app/(app)/signals'
```
(信号已并进发现榜 KB tab + 代币详情;`SignalListItem`/`TweetTimelineCard` 组件保留复用。)

- [ ] **Step 3: 反转 `next.config.mjs` 重定向**

全量替换为:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // 旧 /meme 永久重定向到 /ranking
      { source: '/meme', destination: '/ranking', permanent: true },
    ]
  },
}

export default nextConfig
```

- [ ] **Step 4: 修内部 `/meme` 引用**

Run: `grep -rn '"/meme"\|/meme`\|href=./meme' app components lib --include='*.ts' --include='*.tsx'`
Expected: 命中 `app/token/[address]/page.tsx` 面包屑 `<a href="/meme">meme 榜单</a>`。把它改成 `<a href="/ranking">发现榜</a>`。同时若 `app/sitemap.ts` 列了 `/meme` 改 `/ranking`。

- [ ] **Step 5: 修 `SignalListItem` 链接**

In `components/signals/SignalListItem.tsx`,把 `href={`/signals/${row.ca}`}` 改为 `href={`/token/${row.ca}`}`。把首行注释 `点 → /signals/[ca] 详情` 改成 `点 → /token/[ca]`。

- [ ] **Step 6: 构建 + 预览**

Run: `npm run build`
Expected: 绿。
`npm run dev`:`/ranking` 渲染发现榜;`/meme` 302/308→`/ranking`;`/signals` 404;代币详情面包屑指 `/ranking`。

- [ ] **Step 7: Commit**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking add -A && \
git -C /Users/zhizhi/Desktop/solana-pump-ranking commit -m "refactor(routes): /meme→/ranking 重命名 + 删独立 /signals 页 + 修内部链接"
```

---

### Task 5: 发现榜 4-tab(统一 RankingTable + KB tab + binance)

**Files:**
- Create: `lib/rankingMerge.ts`
- Create: `components/ranking/RankingTable.tsx`
- Create: `components/ranking/RankingTabs.tsx`
- Modify: `app/(app)/ranking/page.tsx`(改成 RSC 取数 → 传 RankingTabs)
- Test: `test/rankingMerge.test.ts`

**Interfaces:**
- Consumes: `getPumpRanking`/`getKbSignals`/`getZhilabsRanking`(`lib/queries`)、`SmartMoneyPanels`(`components/smart-money/SmartMoneyPanels`)。
- Produces:
  - `lib/rankingMerge.ts` 导出 `type RankingRowData = { ca: string|null; name: string; symbol: string|null; marketCap: number|null; vol24h: number|null; pct24h: number|null; holders: number|null; badges: SignalBadge[] }`、`type SignalBadge = { kind: 'smart'|'revival'|'cluster'|'conviction'; label: string }`、`buildKbBadgeMap(kbRows): Map<string, SignalBadge[]>`、`toRankingRows(rankRows, badgeMap): RankingRowData[]`、`kbToRankingRows(kbRows): RankingRowData[]`。
  - `RankingTable({ rows }: { rows: RankingRowData[] })` server component。
  - `RankingTabs({ pump, zhilabs, kb }: { pump: RankingRowData[]; zhilabs: RankingRowData[]; kb: RankingRowData[] })` client component(tab state;`#kb` hash 默认开 KB tab;binance tab 渲 `<SmartMoneyPanels/>`)。

- [ ] **Step 1: 写失败测试 `test/rankingMerge.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildKbBadgeMap, toRankingRows, kbToRankingRows } from '../lib/rankingMerge'

describe('rankingMerge', () => {
  it('buildKbBadgeMap 抽取聪明钱/复活/cluster/conviction 徽章', () => {
    const m = buildKbBadgeMap([
      { ca: 'A', smart_money_24h: { wallet_count: 3 }, revival: { status: 'revived' }, cluster_risk: { level: 'high' }, conviction_rating: 'swing' },
      { ca: 'B', smart_money_24h: { wallet_count: 0 } },
    ] as any)
    expect(m.get('A')!.map((b) => b.kind)).toEqual(['smart', 'revival', 'cluster', 'conviction'])
    expect(m.get('B') ?? []).toEqual([]) // wallet_count 0 不出徽章
  })

  it('toRankingRows 把 badgeMap 按 token join 到行,holders 保留', () => {
    const m = buildKbBadgeMap([{ ca: 'A', conviction_rating: 'small' }] as any)
    const rows = toRankingRows([{ token: 'A', name: 'Aaa', symbol: 'AAA', market_cap: 1e6, tx_volume_u_24h: 5e5, holders: 1200 }] as any, m)
    expect(rows[0]).toMatchObject({ ca: 'A', name: 'Aaa', holders: 1200 })
    expect(rows[0].badges.map((b) => b.kind)).toEqual(['conviction'])
  })

  it('kbToRankingRows holders 为 null(kb_signals 无 holders)', () => {
    const rows = kbToRankingRows([{ ca: 'A', name: 'Aaa', market_cap: 2e6, vol_24h_usd: 1e5, price_change_24h: 12.3, conviction_rating: 'swing', smart_money_24h: { wallet_count: 2 } }] as any)
    expect(rows[0].holders).toBeNull()
    expect(rows[0].pct24h).toBe(12.3)
    expect(rows[0].badges.some((b) => b.kind === 'smart')).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/zhizhi/Desktop/solana-pump-ranking && npx vitest run test/rankingMerge.test.ts`
Expected: FAIL（`lib/rankingMerge` 不存在）。

- [ ] **Step 3: 写 `lib/rankingMerge.ts`**

```ts
export type SignalBadge = { kind: 'smart' | 'revival' | 'cluster' | 'conviction'; label: string }

export type RankingRowData = {
  ca: string | null
  name: string
  symbol: string | null
  marketCap: number | null
  vol24h: number | null
  pct24h: number | null
  holders: number | null
  badges: SignalBadge[]
}

function badgesFromKb(r: any): SignalBadge[] {
  const out: SignalBadge[] = []
  const sm = r.smart_money_24h as { wallet_count?: number } | null
  if (sm && (sm.wallet_count ?? 0) > 0) out.push({ kind: 'smart', label: `聪明钱 ${sm.wallet_count}` })
  const rev = r.revival as { status?: string } | null
  if (rev?.status && rev.status !== 'none') out.push({ kind: 'revival', label: '复活' })
  const cr = r.cluster_risk as { level?: string } | null
  if (cr?.level === 'high' || cr?.level === 'medium') out.push({ kind: 'cluster', label: `cluster ${cr.level === 'high' ? '高' : '中'}` })
  else if (!cr?.level && r.onchain_cluster != null) out.push({ kind: 'cluster', label: '链上集群' })
  if (r.conviction_rating) out.push({ kind: 'conviction', label: String(r.conviction_rating) })
  return out
}

export function buildKbBadgeMap(kbRows: any[]): Map<string, SignalBadge[]> {
  const m = new Map<string, SignalBadge[]>()
  for (const r of kbRows ?? []) if (r.ca) m.set(r.ca, badgesFromKb(r))
  return m
}

function displayName(name: unknown, symbol: unknown, ca: unknown): string {
  return (name as string) || (symbol as string) || (ca ? String(ca).slice(0, 6) + '…' : '—')
}

export function toRankingRows(rankRows: any[], badgeMap: Map<string, SignalBadge[]>): RankingRowData[] {
  return (rankRows ?? []).map((r) => ({
    ca: r.token ?? null,
    name: displayName(r.name, r.symbol, r.token),
    symbol: r.symbol ?? null,
    marketCap: r.market_cap ?? null,
    vol24h: r.tx_volume_u_24h ?? null,
    pct24h: r.price_change_24h ?? null,
    holders: r.holders ?? null,
    badges: (r.token && badgeMap.get(r.token)) || [],
  }))
}

export function kbToRankingRows(kbRows: any[]): RankingRowData[] {
  return (kbRows ?? []).map((r) => ({
    ca: r.ca ?? null,
    name: displayName(r.name, r.symbol, r.ca),
    symbol: r.symbol ?? null,
    marketCap: r.market_cap ?? null,
    vol24h: r.vol_24h_usd ?? null,
    pct24h: r.price_change_24h ?? null,
    holders: null, // kb_signals 无 holders
    badges: badgesFromKb(r),
  }))
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run test/rankingMerge.test.ts`
Expected: PASS（3 个用例）。

- [ ] **Step 5: 写 `components/ranking/RankingTable.tsx`**

```tsx
import ClickableRow from '@/components/ui/ClickableRow'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import type { RankingRowData } from '@/lib/rankingMerge'

function fmtMc(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${Math.round(v)}`
}
function fmtVol(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${Math.round(v)}`
}
function fmtPct(v: number | null): { text: string; cls: 'up' | 'down' | '' } {
  if (v == null) return { text: '—', cls: '' }
  return { text: `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, cls: v > 0 ? 'up' : v < 0 ? 'down' : '' }
}

export default function RankingTable({ rows }: { rows: RankingRowData[] }) {
  if (!rows.length) return <EmptyState title="暂无数据" hint="链上数据稍后同步" />
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line-soft)', color: 'var(--text-3)', fontSize: 11, fontWeight: 400 }}>
            <th style={{ padding: '9px 14px', textAlign: 'left', width: 32 }}>#</th>
            <th style={{ padding: '9px 14px', textAlign: 'left' }}>名称</th>
            <th style={{ padding: '9px 14px', textAlign: 'right' }}>市值</th>
            <th style={{ padding: '9px 14px', textAlign: 'right' }}>24h 量</th>
            <th style={{ padding: '9px 14px', textAlign: 'right' }}>24h</th>
            <th style={{ padding: '9px 14px', textAlign: 'right' }}>持有人</th>
            <th style={{ padding: '9px 14px', textAlign: 'left' }}>信号</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const pct = fmtPct(row.pct24h)
            return (
              <ClickableRow key={row.ca ?? idx} href={row.ca ? `/token/${row.ca}` : null}
                style={{ borderBottom: idx < rows.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <td className="num" style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}>{idx + 1}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{row.name}</td>
                <td className="num" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{fmtMc(row.marketCap)}</td>
                <td className="num" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{fmtVol(row.vol24h)}</td>
                <td className={`num ${pct.cls}`} style={{ padding: '10px 14px', textAlign: 'right' }}>{pct.text}</td>
                <td className="num" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{row.holders != null ? row.holders.toLocaleString() : '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {row.badges.map((b, i) => <Badge key={i} kind={b.kind}>{b.label}</Badge>)}
                  </div>
                </td>
              </ClickableRow>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```
注:先确认 `components/ui/Badge.tsx` 的 `kind` prop 接受 `'smart'|'revival'|'cluster'|'conviction'`(meme 页原代码就这么用,应已支持);若类型不符按 Badge 实际签名调整 `SignalBadge.kind`。

- [ ] **Step 6: 写 `components/ranking/RankingTabs.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import RankingTable from './RankingTable'
import SmartMoneyPanels from '@/components/smart-money/SmartMoneyPanels'
import type { RankingRowData } from '@/lib/rankingMerge'

type Tab = 'pump' | 'zhilabs' | 'kb' | 'binance'
const TABS: { key: Tab; label: string }[] = [
  { key: 'pump', label: '成交量榜' },
  { key: 'zhilabs', label: 'Zhilabs' },
  { key: 'kb', label: 'KB 信号' },
  { key: 'binance', label: '聪明钱' },
]

export default function RankingTabs({ pump, zhilabs, kb }: { pump: RankingRowData[]; zhilabs: RankingRowData[]; kb: RankingRowData[] }) {
  const [tab, setTab] = useState<Tab>('pump')
  useEffect(() => { if (typeof window !== 'undefined' && window.location.hash === '#kb') setTab('kb') }, [])

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line-soft)', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 14px', fontSize: 13.5,
              color: tab === t.key ? 'var(--text)' : 'var(--text-3)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'pump' && <RankingTable rows={pump} />}
      {tab === 'zhilabs' && <RankingTable rows={zhilabs} />}
      {tab === 'kb' && <RankingTable rows={kb} />}
      {tab === 'binance' && <SmartMoneyPanels />}
    </div>
  )
}
```

- [ ] **Step 7: 改 `app/(app)/ranking/page.tsx`**

全量替换为 RSC 取数 + 传 RankingTabs(保留 `runtime`/`dynamic`):
```tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import DataFreshness from '@/components/ui/DataFreshness'
import RankingTabs from '@/components/ranking/RankingTabs'
import { getPumpRanking, getKbSignals, getZhilabsRanking } from '@/lib/queries'
import { buildKbBadgeMap, toRankingRows, kbToRankingRows } from '@/lib/rankingMerge'

export default async function RankingPage() {
  const [pumpResult, kbResult, zhilabsResult] = await Promise.all([
    getPumpRanking(20), getKbSignals(), getZhilabsRanking(),
  ])
  if (pumpResult.error && kbResult.error) {
    throw new Error(`数据加载失败: ${pumpResult.error.message} / ${kbResult.error.message}`)
  }
  const pumpRows = (pumpResult.data as any[]) ?? []
  const kbRows = (kbResult.data as any[]) ?? []
  const zhilabsRows = (zhilabsResult.data as any[]) ?? []

  const badgeMap = buildKbBadgeMap(kbRows)
  const pump = toRankingRows(pumpRows, badgeMap)
  const zhilabs = toRankingRows(zhilabsRows, badgeMap)
  const kb = kbToRankingRows(kbRows.filter((r) => r.has_signal === true)).concat(
    kbToRankingRows(kbRows.filter((r) => r.has_signal !== true)),
  ) // 有信号优先,其余存活在后

  const latestKbIso = kbRows.reduce<string | null>((acc, r) => (r.discovered_at && (!acc || r.discovered_at > acc) ? r.discovered_at : acc), null)

  return (
    <main style={{ padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>发现榜</h1>
        <DataFreshness iso={latestKbIso} />
      </div>
      <RankingTabs pump={pump} zhilabs={zhilabs} kb={kb} />
    </main>
  )
}
```
注:`getKbSignals()` 默认按 score 降序(`lib/queries`),故 `has_signal===true` 子集已按 score 排。

- [ ] **Step 8: 构建 + 测试 + 预览**

Run: `npm run build && npx vitest run`
Expected: 绿。
`npm run dev` 开 `/ranking`:4 个 tab 切换**无整页重载**;pump/zhilabs/KB 三表同列布局;KB 行持有人列「—」+ 徽章列有 conviction/聪明钱;`聪明钱` tab 出 SmartMoneyPanels(信号+净流入两表);`/ranking#kb` 默认开 KB tab。截图给 user(含 tab 切换录屏/连续截图)。

- [ ] **Step 9: Commit**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking add lib/rankingMerge.ts components/ranking 'app/(app)/ranking/page.tsx' test/rankingMerge.test.ts && \
git -C /Users/zhizhi/Desktop/solana-pump-ranking commit -m "feat(ranking): 发现榜 4-tab + 统一 RankingTable + KB 信号子集 + binance 独立面板"
```

---

## Increment 2:代币详情

### Task 6: 代币详情 server 预取(灭「—」)

**Files:**
- Modify: `app/token/[address]/page.tsx`
- Modify: `components/token/DexChart.tsx`(加 `initialToken` 可选 prop)
- Modify: `components/token/TokenSections.tsx`(MarketCard 接 `initialDetail` 可选 prop)

**Interfaces:**
- Consumes: `getTokenDetail`(`lib/sources/index.js`)。
- Produces: `DexChart({ address, initialToken? })`、`TokenSections({ address, initialDetail? })`;page 在 RSC 内 `getTokenDetail(address,'solana')` 预取,作 prop 传入,首屏即有数据。

- [ ] **Step 1: 验证 `/api/token/[ca]` 真实返回(确认 main_pair 逻辑)**

`npm run dev` 后,Run: `curl -s "http://localhost:3000/api/token/<一个活跃CA>" | python3 -m json.tool | grep -E 'main_pair|price|market_cap|vol'`
Expected: 看到 `main_pair`(非 null)+ price/market_cap 有真实值。**若 main_pair 为 null 但该币在 DexScreener 有池** → 进 `lib/sources/dexscreener.js` 确认 `normalizePair` 的 `main_pair: pair.pairAddress` 没被过滤;`lib/sources/index.js` `getTokenDetail` merge 没漏。记录实测结果(这是「—」根因判定的 ground truth)。

- [ ] **Step 2: `DexChart` 接 `initialToken` prop**

In `components/token/DexChart.tsx`,改签名 + 用 initialToken 作初值跳过首屏 loading:
```tsx
interface Props { address: string; initialToken?: { name?: string; symbol?: string; chain?: string; main_pair?: string | null } | null }
```
在 `useState` 初始化时,若 `initialToken` 有值则直接算 title/iframeSrc/state(`ready` 或 `no-pair`),否则维持 `loading` 走原 `useEffect` fetch。`useEffect` 内逻辑保留(initialToken 缺失时仍 client fetch 兜底)。

- [ ] **Step 3: `TokenSections` MarketCard 接 `initialDetail`**

In `components/token/TokenSections.tsx`,给 `TokenSections` 加 `initialDetail?` prop 透传给内部 MarketCard;MarketCard 的 `useState(data)` 初值用 `initialDetail ?? null`,有初值则不显 loading(`useEffect` fetch 仍保留作 revalidate / 兜底)。只改 MarketCard 取数初值,叙事/推文卡维持 client fetch(它们走另两个 `/api` 端点,server 预取非必需)。

- [ ] **Step 4: page RSC 预取 + 传 prop + 面包屑**

In `app/token/[address]/page.tsx`,加 `import { getTokenDetail } from '@/lib/sources/index.js'`,在 `TokenPage` 内 `const detail = await getTokenDetail(address, 'solana').catch(() => null)`,传 `<DexChart address={address} initialToken={detail} />` + `<TokenSections address={address} initialDetail={detail} />`。面包屑 `href="/meme"` → `/ranking`、文案 `meme 榜单`→`发现榜`(若 Task 4 已改则跳过)。

- [ ] **Step 5: 构建 + 预览**

Run: `npm run build`
Expected: 绿。
`npm run dev` 开 `/token/<活跃CA>`:**首屏**(不等客户端)即显 price/MC/vol 真实值 + K线 iframe;无 pair 的币优雅显「该代币暂无可用图表」不卡 loading。截图给 user。

- [ ] **Step 6: Commit**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking add 'app/token/[address]/page.tsx' components/token/DexChart.tsx components/token/TokenSections.tsx && \
git -C /Users/zhizhi/Desktop/solana-pump-ranking commit -m "fix(token): RSC server 预取 token detail 灭首屏「—」+ 面包屑指 /ranking"
```

---

### Task 7: 代币详情内嵌推特时间线卡

**Files:**
- Modify: `app/token/[address]/page.tsx`

**Interfaces:**
- Consumes: `getKbSignalByCa`(`lib/queries`)、`TweetTimelineCard`(`components/signals/TweetTimelineCard`,props `{ row: SignalRow; now: number }`)。
- Produces: 代币详情在 K线下、三卡上,渲染 `TweetTimelineCard`(仅当该 CA 的 `narrative_twitter.status === 'generated'`,组件内建 guard 会自动 return null)。

- [ ] **Step 1: page 取 kb 信号 + 渲染时间线卡**

In `app/token/[address]/page.tsx`(已是 async RSC),加:
```tsx
import { getKbSignalByCa } from '@/lib/queries'
import TweetTimelineCard, { type SignalRow } from '@/components/signals/TweetTimelineCard'
```
在 TokenPage 内(已有 `address`、`detail`):
```tsx
const { data: kb } = await getKbSignalByCa(address).catch(() => ({ data: null }))
const signalRow: SignalRow | null = kb
  ? { ca: address, symbol: (kb as any).symbol ?? (detail as any)?.symbol ?? null, name: (kb as any).name ?? null, market_cap: (kb as any).market_cap ?? null, conviction_rating: (kb as any).conviction_rating ?? null, narrative_twitter: (kb as any).narrative_twitter ?? null }
  : null
```
在 `<DexChart .../>` 之后、`<TokenSections .../>` 之前插:
```tsx
{signalRow ? <TweetTimelineCard row={signalRow} now={Date.now()} /> : null}
```
(`TweetTimelineCard` 对 `status !== 'generated'` 自动 return null,故无时间线的币不显空卡。)

- [ ] **Step 2: 构建 + 预览**

Run: `npm run build`
Expected: 绿。
`npm run dev` 开一个**有** `narrative_twitter.status='generated'` 的 KB 信号 CA(从 `/ranking` KB tab 点进):验证推特时间线卡渲染(主推 KOL 头像/名/handle + call 时间线 + 点跳 x.com);开一个无时间线的普通 CA:不显该卡。截图给 user。

- [ ] **Step 3: Commit**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking add 'app/token/[address]/page.tsx' && \
git -C /Users/zhizhi/Desktop/solana-pump-ranking commit -m "feat(token): 详情页内嵌推特叙事时间线卡(KB narrative_twitter)"
```

---

## Increment 3:模拟盘(验证对齐)

### Task 8: 模拟盘在新壳下渲染对齐

**Files:**
- Modify: `app/(app)/paper/page.tsx`(仅去 `Topbar` 依赖,标题由页面内 h1 或保留)

**Interfaces:**
- Produces: `/paper` 在新 TopNav + 居中容器下正确渲染。

- [ ] **Step 1: 去 Topbar(已不在共享 layout,改页面内标题)**

In `app/(app)/paper/page.tsx`:删 `import Topbar` + `<Topbar title="模拟盘战绩" />`,在 `<main>` 顶部加 `<h1 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)', marginBottom: 14 }}>模拟盘战绩</h1>`。
(`components/shell/Topbar.tsx` 现仅 paper/ranking 旧引用;ranking 已重写不用 Topbar,paper 改后也不用 → Topbar 可在 Task 9 一并删,若无其它引用。)

- [ ] **Step 2: 构建 + 预览**

Run: `npm run build`
Expected: 绿。
`npm run dev` 开 `/paper`:免责 banner + summary 指标卡 + 交易表 在新壳下正常居中渲染,脱敏字段无泄漏。截图给 user。

- [ ] **Step 3: Commit**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking add 'app/(app)/paper/page.tsx' && \
git -C /Users/zhizhi/Desktop/solana-pump-ranking commit -m "chore(paper): 适配新壳,页面内标题替 Topbar"
```

---

## Increment 4:scheduler + 收尾

### Task 9: `instrumentation.ts` 榜单刷新

**Files:**
- Create: `instrumentation.ts`(项目根)
- Create: `test/instrumentation-guard.test.ts`
- Possibly Delete: `components/shell/Topbar.tsx`(若 grep 无残留引用)

**Interfaces:**
- Consumes: `updatePumpRanking`(`scripts/fetch-pump-ranking.js`)、`updateZhilabsRanking`(`scripts/fetch-zhilabs-ranking.js`)。
- Produces: `shouldRegister(runtime: string | undefined): boolean` 纯函数(可单测);`register()`(Next.js instrumentation hook)在 nodejs runtime 起 interval 刷新 pump+zhilabs 榜单。

- [ ] **Step 1: 写失败测试 `test/instrumentation-guard.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { shouldRegister } from '../instrumentation'

describe('shouldRegister', () => {
  it('仅 nodejs runtime 注册', () => {
    expect(shouldRegister('nodejs')).toBe(true)
    expect(shouldRegister('edge')).toBe(false)
    expect(shouldRegister(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/instrumentation-guard.test.ts`
Expected: FAIL（`instrumentation` 无 `shouldRegister` 导出）。

- [ ] **Step 3: 写 `instrumentation.ts`**

```ts
export function shouldRegister(runtime: string | undefined): boolean {
  return runtime === 'nodejs'
}

let started = false

export async function register() {
  if (!shouldRegister(process.env.NEXT_RUNTIME)) return
  if (started) return
  started = true
  if ((process.env.SCHEDULER_ENABLED || 'true').toLowerCase() === 'false') return

  const intervalMs = Math.max(60_000, parseInt(process.env.AUTO_UPDATE_INTERVAL_MIN || '5', 10) * 60_000)
  const running = { v: false }

  const run = async () => {
    if (running.v) return
    running.v = true
    try {
      const { updatePumpRanking } = await import('./scripts/fetch-pump-ranking.js')
      const { updateZhilabsRanking } = await import('./scripts/fetch-zhilabs-ranking.js')
      try { await updatePumpRanking() } catch (e) { console.error('[scheduler] pump 失败:', (e as Error)?.message) }
      try { await updateZhilabsRanking() } catch (e) { console.error('[scheduler] zhilabs 失败:', (e as Error)?.message) }
    } finally { running.v = false }
  }

  console.log(`[scheduler] 启动,每 ${intervalMs / 60000} 分钟刷新 pump+zhilabs 榜单`)
  setTimeout(run, 3000)
  setInterval(run, intervalMs)
}
```
注:动态 `import()` 在 interval 内执行,避免 build 期触发 script 顶层副作用。script 依赖 `src/data-sources/` + `src/supabase.js`(保留,见 Global Constraints)。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run test/instrumentation-guard.test.ts`
Expected: PASS。

- [ ] **Step 5: 删 Topbar(若无残留引用)**

Run: `grep -rn 'shell/Topbar\|components/shell/Topbar' app components --include='*.tsx'`
Expected: 无输出 → `git rm components/shell/Topbar.tsx`。若仍有引用先清。

- [ ] **Step 6: 构建 + 启动验证**

Run: `npm run build && (PORT=3010 npm start &) ; sleep 8 ; curl -s localhost:3010/api/health > /dev/null; echo done`
Expected: build 绿;`next start` 启动日志含 `[scheduler] 启动,每 5 分钟刷新…`(确认 instrumentation 注册)。验证后 `kill %1`。

- [ ] **Step 7: Commit**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking add instrumentation.ts test/instrumentation-guard.test.ts && \
git -C /Users/zhizhi/Desktop/solana-pump-ranking rm components/shell/Topbar.tsx 2>/dev/null; \
git -C /Users/zhizhi/Desktop/solana-pump-ranking commit -m "feat(scheduler): instrumentation.ts 进程内榜单刷新 + 清 Topbar"
```

---

### Task 10: 全站联调 + SEO + 最终预览

**Files:**
- Modify: `app/sitemap.ts`(如有 `/meme`)、`app/layout.tsx`(metadata 文案对齐聚焦定位,可选)
- Verify: 全站

**Interfaces:**
- Produces: 全站 build 绿 + 所有页面本地预览通过,等 user 批准部署。

- [ ] **Step 1: 全仓残留检查**

Run: `cd /Users/zhizhi/Desktop/solana-pump-ranking && grep -rn '/meme\|/dashboard\|/perps\|/prediction\|/smart-money\|/signals\|AppShell\|lib/nav' app components lib --include='*.ts' --include='*.tsx'`
Expected: 仅 `next.config.mjs` 的 `/meme→/ranking` redirect(预期)。其余无残留(`/smart-money` 作为 nav 路由应已无;`SmartMoneyPanels` 组件路径 `components/smart-money/` 是组件不是路由,允许)。逐条清理意外命中。

- [ ] **Step 2: sitemap / metadata 对齐**

若 `app/sitemap.ts` 列 `/meme` 改 `/ranking`,删 `/dashboard`/`/perps` 等已删路由条目。`app/layout.tsx` metadata 描述可由「综合 crypto 数据看板…永续/预测」收敛为聚焦文案(可选,不强制)。

- [ ] **Step 3: 全量构建 + 测试**

Run: `npm run build && npx vitest run && node test/glass-unit.mjs`
Expected: 全绿。

- [ ] **Step 4: 全站预览 walkthrough**

`npm run dev`,用 preview 工具逐页:
- `/` hero 顺滑 + HUD 真实数据 + CTA→/ranking
- `/ranking` 4 tab 切换无整页重载、三表同列、KB 徽章、binance 独立、`#kb` 深链
- `/token/<CA>` 首屏真实行情+K线(无「—」)+ 有信号币显时间线卡
- `/paper` 正常 + 脱敏
- `/meme`→`/ranking` 重定向、删的路由 404
逐页截图汇总给 user,等批准。

- [ ] **Step 5: Commit**

```bash
git -C /Users/zhizhi/Desktop/solana-pump-ranking add -A && \
git -C /Users/zhizhi/Desktop/solana-pump-ranking commit -m "chore(integration): 全站联调 + SEO 路由对齐 + 残留清理"
```

---

## 部署(user 批准后,单独执行,不在本计划自动跑)

- user 本地预览确认全部页面 OK + style-match。
- 把 `feat/nextjs-rewrite` 合/force-push 到 Railway 跟踪的生产分支 `feat/nextjs-frame`(或改 Railway 跟踪分支)。**仅 user 明确批准后执行。**
- Railway env 确认:`SUPABASE_URL` + 轮换后的 `SUPABASE_SERVICE_ROLE_KEY` + `SITE_URL` + 可选 `GA_MEASUREMENT_ID` + `AUTO_UPDATE_INTERVAL_MIN`/`SCHEDULER_ENABLED`。
- 回滚锚点:`nextjs-frame-backup-20260619`(平台版)+ 当前 express-legacy。

---

## Self-Review(writing-plans 自审)

**1. Spec coverage:** hero(T1)/ 发现榜 4-tab+统一行+KB+binance(T5)/ 代币详情灭「—」(T6)+时间线(T7)/ 模拟盘(T8)/ instrumentation(T9)/ 删壳+路由+signals(T2/3/4)/ SEO(T10)/ SignalListItem 链接修(T4)/ main_pair 验证(T6 step1)—— spec 各节均有对应 task。binance「金黄卡」spec 提及,本计划用现成 `SmartMoneyPanels`(表格,glass 风格)替代以降风险,金黄卡视觉留预览时可选打磨(已在 T5 预览步留口)。

**2. Placeholder scan:** 无 TBD/TODO。hero CSS 用「逐字从 `feat/nextjs-frame:src/public/index.html` port」而非内联 1200 行——这是精确 port-from-source 指令(有确切 ref:path + 转换规则),非占位。其余新文件均给完整代码,改动给确切 diff。

**3. Type consistency:** `RankingRowData`/`SignalBadge` 在 `lib/rankingMerge.ts` 定义,T5 RankingTable/RankingTabs/page 一致消费;`SignalRow` 用 `TweetTimelineCard` 导出的同名类型(T7);`shouldRegister` T9 定义+测试一致;`getTokenDetail`/`getKbSignalByCa`/`getPumpRanking` 等签名与 `lib/queries.ts`/`lib/sources` 实测一致。
