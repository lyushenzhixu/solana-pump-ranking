/**
 * 榜单页 HTML 模板 — 从 server.js 原封不动提取
 */
import { buildSeoMeta, SITE_URL, SITE_NAME } from '../seo.js';

const GA_MEASUREMENT_ID = (process.env.GA_MEASUREMENT_ID || '').trim();

function gaSnippet() {
  if (!GA_MEASUREMENT_ID) return '';
  return `<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>`;
}

export function buildRankingPage() {
const seoMeta = buildSeoMeta({
  title: 'Solana Meme 代币榜单 | Zhizhi Labs',
  description: '实时 Solana Meme 代币排行榜 — 按 24h 交易量排序，查看市值、涨跌、持仓分布等关键指标。由 Zhizhi Labs 提供。',
  canonicalPath: '/ranking',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Solana Meme 代币榜单',
    description: '实时 Solana Meme 代币排行榜，按 24h 交易量排序',
    url: `${SITE_URL}/ranking`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  },
});
return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Solana Meme 代币榜单 | Zhizhi Labs</title>
  ${seoMeta}
  ${gaSnippet()}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles/glass-system.css">
  <style>
    /* Design tokens (shared with welcome page — OKLCH, tinted neutrals) */
    :root {
      --surface-0: oklch(10% 0.02 270);
      --surface-1: oklch(14% 0.02 270);
      --surface-2: oklch(18% 0.02 270);
      --surface-3: oklch(22% 0.02 270);
      --text-primary: oklch(92% 0.01 270);
      --text-secondary: oklch(72% 0.02 270);
      --text-muted: oklch(55% 0.02 270);
      --accent: oklch(62% 0.2 290);
      --accent-dim: oklch(50% 0.12 290);
      --positive: oklch(72% 0.18 155);
      --negative: oklch(58% 0.22 25);
      --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
      --bg-primary: var(--surface-0);
      --bg-card: oklch(16% 0.02 270 / 0.85);
      --bg-card-hover: var(--surface-2);
      --border-subtle: oklch(40% 0.04 290 / 0.2);
      --border-glow: oklch(55% 0.15 290 / 0.35);
      --sol-purple: #9945FF;
      --sol-green: #14F195;
      --sol-blue: #00D1FF;
      --bn-yellow: #F0B90B;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { height: 100%; }
    body {
      min-height: 100%;
      font-family: var(--font-ui);
      background: var(--bg-primary);
      color: var(--text-primary);
      overflow-x: hidden;
    }

    .bg-layer {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
    }
    .bg-stars {
      background-image:
        radial-gradient(1px 1px at 10% 20%, oklch(70% 0.15 290 / 0.25), transparent),
        radial-gradient(1px 1px at 30% 65%, oklch(70% 0.12 155 / 0.2), transparent),
        radial-gradient(1.2px 1.2px at 55% 12%, oklch(75% 0.1 230 / 0.22), transparent),
        radial-gradient(1px 1px at 72% 38%, oklch(90% 0.01 270 / 0.12), transparent),
        radial-gradient(1px 1px at 88% 75%, oklch(65% 0.12 300 / 0.2), transparent),
        radial-gradient(1px 1px at 15% 85%, oklch(60% 0.1 330 / 0.15), transparent),
        radial-gradient(1.2px 1.2px at 82% 18%, oklch(68% 0.1 155 / 0.15), transparent),
        radial-gradient(1px 1px at 48% 50%, oklch(65% 0.15 290 / 0.2), transparent);
      background-size: 280px 280px;
      animation: starDrift 100s linear infinite;
    }
    @keyframes starDrift { to { background-position: 280px 280px; } }

    .bg-nebula {
      background:
        radial-gradient(ellipse at 15% 25%, oklch(55% 0.15 290 / 0.06), transparent 55%),
        radial-gradient(ellipse at 85% 75%, oklch(70% 0.12 155 / 0.04), transparent 50%),
        radial-gradient(ellipse at 50% 50%, oklch(65% 0.1 230 / 0.03), transparent 60%);
    }

    .bg-grid {
      background:
        linear-gradient(oklch(50% 0.05 290 / 0.04) 1px, transparent 1px),
        linear-gradient(90deg, oklch(50% 0.05 290 / 0.04) 1px, transparent 1px);
      background-size: 80px 80px;
      mask-image: radial-gradient(ellipse at center, oklch(0% 0 0 / 0.25) 0%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse at center, oklch(0% 0 0 / 0.25) 0%, transparent 70%);
    }

    .bg-scanlines {
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0% 0 0 / 0.015) 2px, oklch(0% 0 0 / 0.015) 4px);
      z-index: 1;
    }

    .page-wrapper {
      position: relative; z-index: 2;
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.5rem 1.5rem 3rem;
    }

    /* === HEADER === */
    .page-header {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      margin-bottom: 1.5rem; flex-wrap: wrap;
    }
    .back-home {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 1.25rem;
      font-family: var(--font-ui);
      font-size: 0.8125rem; font-weight: 600;
      color: var(--text-secondary);
      text-decoration: none;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 100px;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      transition: all 0.3s ease;
    }
    .back-home:hover {
      color: var(--accent);
      border-color: var(--border-glow);
      box-shadow: 0 0 16px oklch(55% 0.2 290 / 0.12);
      transform: translateX(-3px);
    }
    .back-home:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
    }

    .page-title {
      display: flex; align-items: center; gap: 0.75rem;
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(1.1rem, 3vw, 1.6rem); font-weight: 700;
      color: var(--text-primary);
    }

    /* === SCHEDULER BAR === */
    .scheduler-bar {
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
      margin-bottom: 1.25rem;
      padding: 0.75rem 1.25rem;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      font-size: 0.8125rem;
    }
    .scheduler-bar .dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      transition: all 0.3s ease;
    }
    .scheduler-bar .dot.active {
      background: var(--positive);
      box-shadow: 0 0 8px oklch(72% 0.18 155 / 0.4);
    }
    .scheduler-bar .dot.running {
      background: var(--bn-yellow);
      box-shadow: 0 0 8px oklch(75% 0.15 90 / 0.4);
      animation: dotPulse 1s ease-in-out infinite;
    }
    @keyframes dotPulse { 0%,100%{opacity:1; transform:scale(1);} 50%{opacity:0.4; transform:scale(0.8);} }
    .scheduler-bar .label { color: var(--text-muted); }
    .scheduler-bar .sep { color: oklch(55% 0.1 290 / 0.25); }
    .scheduler-bar .value {
      color: var(--text-primary);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    /* === TABS + ACTIONS ROW === */
    .controls-row {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      flex-wrap: wrap; margin-bottom: 1rem;
    }
    .tabs { display: flex; gap: 0.25rem; position: relative; }
    .tabs::after {
      content: '';
      position: absolute; bottom: -1px; left: 0; right: 0;
      height: 1px;
      background: var(--border-subtle);
    }
    .tabs button {
      position: relative;
      padding: 0.625rem 1.25rem;
      font-family: var(--font-ui);
      font-size: 0.875rem; font-weight: 600;
      color: var(--text-secondary);
      background: transparent;
      border: none; border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      z-index: 1;
    }
    .tabs button:hover {
      color: var(--text-primary);
      background: oklch(50% 0.08 290 / 0.08);
    }
    .tabs button.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }
    .tabs button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .actions {
      display: flex; align-items: center; gap: 0.75rem;
    }
    .actions button {
      position: relative;
      padding: 0.5rem 1.25rem;
      font-family: var(--font-ui);
      font-size: 0.8125rem; font-weight: 600;
      color: var(--text-primary);
      background: oklch(28% 0.06 290 / 0.9);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s var(--ease-out), border-color 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out);
      overflow: hidden;
    }
    .actions button::before {
      content: '';
      position: absolute; inset: 0;
      background: var(--accent);
      opacity: 0;
      transition: opacity 0.2s var(--ease-out);
    }
    .actions button:hover::before { opacity: 0.15; }
    .actions button:hover {
      border-color: var(--accent);
      box-shadow: 0 0 16px oklch(55% 0.2 290 / 0.15);
      transform: translateY(-1px);
    }
    .actions button:active { transform: translateY(0); }
    .actions button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .actions button:disabled {
      opacity: 0.4; cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }
    .actions button span { position: relative; z-index: 1; }
    .actions button.secondary-btn::before { background: transparent; }
    .actions button.secondary-btn { background: oklch(22% 0.04 290 / 0.8); border-color: var(--accent); }
    .actions button.secondary-btn:hover::before { opacity: 0.1; }
    .actions .status {
      font-size: 0.8125rem; color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
    }
    .sync-label {
      font-size: 0.8125rem; color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    /* === DESCRIPTION === */
    .desc {
      color: var(--text-muted);
      font-size: 0.8125rem;
      margin-bottom: 1rem;
      padding: 0.625rem 1rem;
      background: oklch(18% 0.02 270 / 0.5);
      border-left: 2px solid var(--accent-dim);
      border-radius: 0 8px 8px 0;
    }

    /* === TABLE CONTAINER === */
    .table-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      overflow: hidden;
      position: relative;
    }
    .table-card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, oklch(55% 0.15 290 / 0.25), oklch(65% 0.1 230 / 0.15), transparent);
    }

    .panel { display: none; }
    .panel.active { display: block; }
    .panel > div { padding: 0; }

    table {
      width: 100%; border-collapse: collapse;
      font-size: 0.875rem;
    }
    thead { position: sticky; top: 0; z-index: 2; }
    th {
      padding: 0.875rem 1rem;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      text-align: left;
      background: var(--surface-1);
      border-bottom: 1px solid var(--border-subtle);
      white-space: nowrap;
    }
    th.num { text-align: right; }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-subtle);
      vertical-align: middle;
      transition: background 0.2s var(--ease-out);
    }
    td.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      font-weight: 600;
    }
    tbody tr {
      transition: all 0.2s ease;
    }
    tbody tr:hover {
      background: var(--bg-card-hover);
    }
    tbody tr:hover td {
      border-bottom-color: oklch(50% 0.08 290 / 0.2);
    }

    /* Rank column */
    td .rank {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px;
      border-radius: 8px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.75rem; font-weight: 700;
      background: oklch(30% 0.05 290 / 0.5);
      color: var(--text-secondary);
      border: 1px solid transparent;
    }
    td .rank.gold {
      background: linear-gradient(135deg, rgba(240,185,11,0.2), rgba(240,185,11,0.05));
      color: var(--bn-yellow);
      border-color: rgba(240,185,11,0.3);
      box-shadow: 0 0 12px rgba(240,185,11,0.15);
    }
    td .rank.silver {
      background: linear-gradient(135deg, rgba(192,192,210,0.15), rgba(192,192,210,0.05));
      color: #c0c0d2;
      border-color: rgba(192,192,210,0.25);
    }
    td .rank.bronze {
      background: linear-gradient(135deg, rgba(205,127,50,0.15), rgba(205,127,50,0.05));
      color: #cd7f32;
      border-color: rgba(205,127,50,0.25);
    }

    /* KB signal pills + disclaimer */
    .kb-pill { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; border: 1px solid; background: oklch(20% 0.02 270 / 0.5); white-space: nowrap; }
    .kb-disclaimer { font-size: 0.75rem; color: var(--text-muted); padding: 8px 14px; border-bottom: 1px solid var(--border-subtle); }
    .kb-tier-head { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); padding: 12px 14px 6px; }
    summary.kb-tier-head { cursor: pointer; user-select: none; }
    .kb-tier-count { display: inline-block; margin-left: 6px; font-size: 0.72rem; font-weight: 600; color: var(--text-muted); }
    .kb-tier-details { border-top: 1px solid var(--border-subtle); }

    /* Token name + logo */
    td .token-cell {
      display: flex; align-items: center; gap: 0.625rem;
    }
    td .token-cell img {
      width: 30px; height: 30px;
      border-radius: 50%;
      border: 1px solid var(--border-subtle);
      background: rgba(15,12,30,0.5);
      flex-shrink: 0;
      object-fit: cover;
    }
    td .token-cell .token-name {
      font-weight: 600;
      color: var(--text-primary);
      max-width: 200px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    /* Symbol */
    td .symbol {
      font-weight: 700;
      color: var(--accent);
      font-size: 0.8125rem;
      letter-spacing: 0.02em;
    }

    .positive { color: var(--positive) !important; }
    .negative { color: var(--negative) !important; }

    tbody tr.clickable-row {
      cursor: pointer;
    }
    tbody tr.clickable-row:hover {
      background: var(--bg-card-hover);
      box-shadow: inset 3px 0 0 var(--accent);
    }

    .copy-ca-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px;
      margin-left: 4px;
      padding: 0;
      background: oklch(28% 0.05 290 / 0.6);
      border: 1px solid var(--border-subtle);
      border-radius: 5px;
      color: var(--text-muted);
      cursor: pointer;
      transition: background 0.2s var(--ease-out), border-color 0.2s var(--ease-out), color 0.2s var(--ease-out);
      flex-shrink: 0;
      vertical-align: middle;
    }
    .copy-ca-btn:hover {
      background: oklch(35% 0.08 290 / 0.7);
      border-color: var(--accent);
      color: var(--accent);
    }
    .copy-ca-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .copy-ca-btn.copied {
      background: oklch(35% 0.12 155 / 0.25);
      border-color: var(--positive);
      color: var(--positive);
    }
    .copy-ca-btn svg {
      width: 12px; height: 12px;
      fill: none; stroke: currentColor; stroke-width: 2;
      stroke-linecap: round; stroke-linejoin: round;
    }

    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    .loading-text {
      text-align: center; padding: 3rem 1rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    .loading-text::after {
      content: '';
      display: inline-block;
      width: 16px; height: 16px;
      border: 2px solid var(--border-subtle);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
      margin-left: 0.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* === 聪明钱信号卡片 — 币安风格（金黄） === */
    .signal-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      padding: 1rem 1.25rem;
    }
    .signal-card {
      position: relative;
      background: #0d0c08;
      border: 1px solid rgba(240, 185, 11, 0.15);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: box-shadow 0.5s ease, border-color 0.3s ease;
    }
    .signal-card::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--bn-yellow), transparent 50%, rgba(240, 185, 11, 0.4));
      opacity: 0.25;
      pointer-events: none;
      z-index: 0;
      transition: opacity 0.5s ease;
    }
    .signal-card::after {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 12px;
      box-shadow: 0 0 20px rgba(240, 185, 11, 0.35);
      opacity: 0;
      pointer-events: none;
      z-index: 0;
      transition: opacity 0.5s ease;
    }
    .signal-card:hover::before { opacity: 0.5; }
    .signal-card:hover::after { opacity: 1; }
    .signal-card:hover { border-color: rgba(240, 185, 11, 0.4); }
    .signal-card:focus-visible {
      outline: 2px solid var(--bn-yellow);
      outline-offset: 2px;
    }
    .signal-card-inner {
      position: relative;
      z-index: 1;
    }
    .signal-card-scanline {
      position: absolute;
      inset: 0;
      opacity: 0.02;
      pointer-events: none;
      background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px);
    }
    .signal-card-live-bar {
      height: 2rem;
      display: flex;
      align-items: center;
      padding: 0 1rem;
      gap: 0.5rem;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      background: rgba(240, 185, 11, 0.08);
      border-bottom: 1px solid rgba(240, 185, 11, 0.2);
      font-family: 'JetBrains Mono', monospace;
    }
    .signal-card-live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--bn-yellow);
      box-shadow: 0 0 6px rgba(240, 185, 11, 0.8);
      animation: signal-pulse 1.5s ease-in-out infinite;
    }
    @keyframes signal-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .signal-card-live-text {
      color: var(--bn-yellow);
      text-shadow: 0 0 8px rgba(240, 185, 11, 0.5);
    }
    .signal-card-live-sm {
      margin-left: auto;
      color: #555870;
      font-family: 'JetBrains Mono', monospace;
    }
    .signal-card-body { padding: 1rem; padding-top: 0.75rem; }
    .signal-card-head {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .signal-card-head img {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid rgba(240, 185, 11, 0.3);
      background: rgba(13,12,8,0.5);
      object-fit: cover;
      flex-shrink: 0;
      box-shadow: 0 0 12px rgba(240, 185, 11, 0.12), inset 0 0 12px rgba(240, 185, 11, 0.04);
    }
    .signal-card-logo-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid rgba(240, 185, 11, 0.3);
      background: oklch(35% 0.08 85 / 0.5);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-muted);
      box-shadow: 0 0 12px rgba(240, 185, 11, 0.12), inset 0 0 12px rgba(240, 185, 11, 0.04);
    }
    .signal-card-head .token-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 1rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
    .signal-card-ca {
      font-size: 10px;
      color: #555870;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-family: 'JetBrains Mono', monospace;
    }
    .signal-card-chain {
      font-size: 0.6875rem;
      padding: 0.15em 0.4em;
      border-radius: 4px;
      background: oklch(45% 0.06 290 / 0.4);
      color: var(--text-secondary);
      font-weight: 600;
    }
    .signal-card-chain[data-chain="bsc"] {
      background: oklch(55% 0.15 85 / 0.25);
      color: var(--bn-yellow);
    }
    .signal-card-ca span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .signal-card-stats {
      display: flex;
      border: 1px solid rgba(255,255,255,0.03);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 0.75rem;
    }
    .signal-card-stats-item {
      flex: 1;
      padding: 0.5rem 0.75rem;
      text-align: center;
      background: rgba(255,255,255,0.015);
      font-family: 'JetBrains Mono', monospace;
    }
    .signal-card-stats-item:not(:last-child) {
      border-right: 1px solid rgba(255,255,255,0.03);
    }
    .signal-card-stats-item .label {
      font-size: 9px;
      color: #555870;
      letter-spacing: 0.1em;
      margin-bottom: 0.25rem;
    }
    .signal-card-stats-item .value {
      font-size: 0.75rem;
      color: #fff;
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
    .signal-card-stats-item .value.inflow-positive {
      color: var(--bn-yellow);
      text-shadow: 0 0 6px rgba(240, 185, 11, 0.5);
    }
    .signal-card-stats-item .value.inflow-negative {
      color: #ff5252;
    }
    .signal-card-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .signal-card-time { color: #555870; }
    .signal-card-active {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--bn-yellow);
      font-size: 11px;
      text-shadow: 0 0 6px rgba(240, 185, 11, 0.5);
    }
    .signal-card-bar-wrap {
      display: flex;
      gap: 2px;
      height: 12px;
      border-radius: 4px;
      overflow: hidden;
    }
    .signal-card-bar-buy {
      height: 100%;
      background: repeating-linear-gradient(90deg, var(--bn-yellow), var(--bn-yellow) 4px, #B88A08 4px, #B88A08 6px);
      box-shadow: 0 0 8px rgba(240, 185, 11, 0.4);
    }
    .signal-card-bar-sell {
      height: 100%;
      background: repeating-linear-gradient(90deg, #ff5252, #ff5252 4px, rgba(255,82,82,0.56) 4px, rgba(255,82,82,0.56) 6px);
      box-shadow: 0 0 6px rgba(255,82,82,0.4);
    }
    .signal-card-bar-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 0.25rem;
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
    }
    .signal-card-bar-labels .buy {
      color: var(--bn-yellow);
      text-shadow: 0 0 4px rgba(240, 185, 11, 0.5);
    }
    .signal-card-bar-labels .sell {
      color: #ff5252;
    }

    /* === 聪明钱流入排行表格 === */
    .inflow-rank-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 12px;
      padding: 1rem 1.25rem;
    }
    .inflow-rank-card {
      position: relative;
      background: #0d0c08;
      border: 1px solid rgba(240, 185, 11, 0.15);
      border-radius: 14px;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.2s, transform 0.15s;
    }
    .inflow-rank-card:hover {
      border-color: rgba(240, 185, 11, 0.4);
      transform: translateY(-2px);
    }
    .inflow-rank-card-inner {
      padding: 14px 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .inflow-rank-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .inflow-rank-pos {
      min-width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      background: rgba(240, 185, 11, 0.12);
      color: var(--bn-yellow);
    }
    .inflow-rank-pos.top3 {
      background: var(--bn-yellow);
      color: #0d0c08;
    }
    .inflow-rank-logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1.5px solid rgba(240, 185, 11, 0.25);
      object-fit: cover;
    }
    .inflow-rank-logo-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(240, 185, 11, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: var(--bn-yellow);
      border: 1.5px solid rgba(240, 185, 11, 0.25);
    }
    .inflow-rank-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 120px;
    }
    .inflow-rank-chain {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(240, 185, 11, 0.15);
      color: var(--bn-yellow);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .inflow-rank-chain[data-chain="bsc"] {
      background: rgba(240, 185, 11, 0.2);
      color: var(--bn-yellow);
    }
    .inflow-rank-inflow {
      margin-left: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      font-weight: 700;
    }
    .inflow-rank-inflow.positive { color: var(--positive); text-shadow: 0 0 8px rgba(76,175,80,0.3); }
    .inflow-rank-inflow.negative { color: var(--negative); }
    .inflow-rank-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    .inflow-rank-stat {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .inflow-rank-stat .label {
      font-size: 10px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .inflow-rank-stat .value {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      font-family: 'JetBrains Mono', monospace;
    }
    .inflow-rank-bar-wrap {
      display: flex;
      height: 5px;
      border-radius: 3px;
      overflow: hidden;
      background: rgba(255, 82, 82, 0.25);
    }
    .inflow-rank-bar-buy {
      height: 100%;
      background: var(--bn-yellow);
      border-radius: 3px 0 0 3px;
      transition: width 0.3s;
    }
    .inflow-rank-bar-labels {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
    }
    .inflow-rank-bar-labels .buy { color: var(--bn-yellow); }
    .inflow-rank-bar-labels .sell { color: #ff5252; }
    .inflow-rank-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--text-secondary);
    }
    .inflow-rank-traders {
      display: flex;
      align-items: center;
      gap: 3px;
      color: var(--bn-yellow);
      font-weight: 600;
    }
    .inflow-rank-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .inflow-rank-tag {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(240, 185, 11, 0.08);
      color: var(--text-secondary);
      border: 1px solid rgba(240, 185, 11, 0.12);
    }
    .inflow-rank-live-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--bn-yellow);
      box-shadow: 0 0 6px rgba(240, 185, 11, 0.6);
      animation: pulse 1.5s infinite;
    }
    .inflow-rank-change.positive { color: var(--positive); }
    .inflow-rank-change.negative { color: var(--negative); }

    /* === SUB TABS === */
    .sub-tabs {
      display: flex;
      gap: 0;
      margin-bottom: 0;
      padding: 0 0.5rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .sub-tabs button {
      position: relative;
      padding: 0.5rem 1rem;
      font-family: var(--font-ui);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-muted);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.25s ease;
      z-index: 1;
    }
    .sub-tabs button:hover { color: var(--text-secondary); }
    .sub-tabs button.active { color: var(--bn-yellow); border-bottom-color: var(--bn-yellow); font-weight: 600; }

    /* === MOBILE === */
    @media (max-width: 768px) {
      .page-wrapper { padding: 1rem 0.75rem 2rem; }
      .page-header { flex-direction: column; align-items: flex-start; }
      .controls-row { flex-direction: column; align-items: flex-start; }
      .tabs { flex-wrap: wrap; }
      .tabs button { padding: 0.5rem 0.75rem; font-size: 0.8125rem; }
      .sub-tabs { flex-wrap: wrap; }
      .sub-tabs button { padding: 0.4rem 0.625rem; font-size: 0.75rem; }
      th, td { padding: 0.5rem 0.625rem; font-size: 0.8125rem; }
      .table-card { border-radius: 12px; overflow-x: auto; }
      table { min-width: 640px; }
      .signal-cards-grid { grid-template-columns: 1fr; padding: 0.75rem 1rem; }
      .inflow-rank-grid { grid-template-columns: 1fr; padding: 0.75rem 1rem; }
      .inflow-rank-stats { grid-template-columns: repeat(2, 1fr); }
    }

    /* === SCROLLBAR === */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background: oklch(45% 0.06 290 / 0.5);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover { background: oklch(50% 0.08 290 / 0.6); }
  </style>
</head>
<body>
  <div class="bg-layer bg-stars"></div>
  <div class="bg-layer bg-nebula"></div>
  <div class="bg-layer bg-grid"></div>
  <div class="bg-layer bg-scanlines"></div>

  <div class="page-wrapper">
    <div class="page-header">
      <a href="/" class="back-home">← 返回首页</a>
      <h1 class="page-title">⟡ Zhizhi Labs 榜单</h1>
      <a href="/paper" class="back-home">模拟盘战绩 →</a>
    </div>

    <div class="scheduler-bar" id="schedulerBar">
      <span class="dot active" id="schedulerDot"></span>
      <span class="label">自动更新</span>
      <span class="value" id="schedulerInfo">加载中…</span>
      <span class="sep">|</span>
      <span class="label">下次更新</span>
      <span class="value" id="schedulerCountdown">--:--</span>
      <span class="sep">|</span>
      <span class="label">上次结果</span>
      <span class="value" id="schedulerLastResult">—</span>
    </div>

    <div class="controls-row">
      <div class="tabs">
        <button type="button" class="tab-btn active" data-tab="pump">Solana Pump 榜单</button>
        <button type="button" class="tab-btn" data-tab="zhilabs">zhizhilabs 精选</button>
        <button type="button" class="tab-btn" data-tab="binance">Binance Skill</button>
        <button type="button" class="tab-btn" data-tab="kb">知智 KB 信号</button>
      </div>
      <div class="actions">
        <button type="button" id="updateBtn"><span>更新 Pump 榜单</span></button>
        <button type="button" id="refreshNarrativeBtn" class="secondary-btn" style="display:none" title="强制刷新当前精选榜单内所有代币的叙事分析缓存"><span>刷新叙事</span></button>
        <span class="status" id="updateStatus"></span>
        <span class="sync-label" id="lastSync"></span>
      </div>
    </div>

    <div class="sub-tabs" id="subTabsBinance" style="display:none">
      <button type="button" class="sub-tab-btn active" data-subtab="bn-signal">Binance 聪明钱信号</button>
      <button type="button" class="sub-tab-btn" data-subtab="bn-inflow">Binance 聪明钱流入</button>
      <button type="button" class="sub-tab-btn" data-subtab="bn-kol">Binance KOL 追踪</button>
    </div>
    <p class="desc" id="desc">已成功发射、上线 &lt; 10 天、市值 &gt; 100K，需有图片，insider ≤50%，Top10 持仓 ≤30%，按 24h 交易量排序</p>

    <div class="table-card">
      <div id="panel-pump" class="panel active"><div id="root-pump"><div class="loading-text">加载中</div></div></div>
      <div id="panel-zhilabs" class="panel"><div id="root-zhilabs"><div class="loading-text">加载中</div></div></div>
      <div id="panel-bn-signal" class="panel"><div id="root-bn-signal"><div class="loading-text">加载中</div></div></div>
      <div id="panel-bn-inflow" class="panel"><div id="root-bn-inflow"><div class="loading-text">加载中</div></div></div>
      <div id="panel-bn-kol" class="panel"><div id="root-bn-kol"><div class="loading-text">加载中</div></div></div>
      <div id="panel-kb" class="panel"><div id="root-kb"><div class="loading-text">加载中</div></div></div>
    </div>
  </div>

  <script>
    function formatCompact(n) {
      if (n == null || Number.isNaN(n)) return '—';
      var num = Number(n);
      if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
      if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
      if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'k';
      return '$' + num.toFixed(0);
    }
    function esc(s) {
      if (s == null || s === '') return '';
      var str = String(s);
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function rankClass(i) {
      if (i === 0) return 'rank gold';
      if (i === 1) return 'rank silver';
      if (i === 2) return 'rank bronze';
      return 'rank';
    }
    function renderTable(list, rootId) {
      var root = document.getElementById(rootId);
      if (!list.length) { root.innerHTML = '<div class="loading-text" style="animation:none">暂无数据</div>'; return; }
      var isPump = rootId === 'root-pump';
      var headers = ['#', '代币', '符号', '市值', '24h 交易量', '24h 涨跌', '持币地址'];
      if (isPump) { headers.push('Top10%'); }
      headers.push('知智信号');
      var numColIdx = { 3: true, 4: true, 5: true, 6: true };
      if (isPump) numColIdx[7] = true;
      var table = '<table><thead><tr>' + headers.map(function(h, idx){ return '<th' + (numColIdx[idx] ? ' class="num"' : '') + '>' + h + '</th>'; }).join('') + '</tr></thead><tbody>';
      list.forEach(function(row, i) {
        var change = row.price_change_24h != null ? parseFloat(row.price_change_24h) : null;
        var changeCl = change != null ? (change >= 0 ? 'positive' : 'negative') : '';
        var changeStr = change != null ? (change >= 0 ? '+' : '') + change.toFixed(2) + '%' : '—';
        var nameStr = typeof row.name === 'string' ? row.name : (typeof row.token === 'string' ? row.token : '—');
        var symbolStr = typeof row.symbol === 'string' ? row.symbol : (typeof row.token === 'string' ? row.token : '—');
        if (nameStr.length > 200) nameStr = nameStr.slice(0, 200) + '…';
        if (symbolStr.length > 50) symbolStr = symbolStr.slice(0, 50) + '…';
        var caStr = typeof row.token === 'string' ? row.token : '';
        table += '<tr class="clickable-row" data-token="' + esc(caStr) + '">';
        table += '<td><span class="' + rankClass(i) + '">' + (i + 1) + '</span></td>';
        var copyBtn = caStr ? '<button class="copy-ca-btn" data-ca="' + esc(caStr) + '"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>' : '';
        table += '<td><div class="token-cell">' + (row.logo_url ? '<img src="' + esc(row.logo_url) + '" alt="" loading="lazy">' : '') + '<span class="token-name">' + esc(nameStr) + '</span>' + copyBtn + '</div></td>';
        table += '<td><span class="symbol">' + esc(symbolStr) + '</span></td>';
        table += '<td class="num">' + formatCompact(row.market_cap) + '</td>';
        table += '<td class="num">' + formatCompact(row.tx_volume_u_24h) + '</td>';
        table += '<td class="num ' + changeCl + '">' + changeStr + '</td>';
        table += '<td class="num">' + (row.holders != null ? Number(row.holders).toLocaleString() : '—') + '</td>';
        if (isPump) {
          table += '<td class="num">' + (row.holders_top10_percent != null ? Number(row.holders_top10_percent).toFixed(1) + '%' : '—') + '</td>';
        }
        var kbSig = kbSignalsMap[caStr];
        var kbCell = '—';
        if (kbSig) {
          if (kbSig.conviction_rating) kbCell = kbRatingPill(kbSig.conviction_rating);
          else if (kbSig.cluster_risk && kbSig.cluster_risk.level && kbSig.cluster_risk.level !== 'none') kbCell = kbClusterPill(kbSig.cluster_risk);
          else if (kbSig.smart_money_24h && kbSig.smart_money_24h.wallet_count) kbCell = kbPill('聪明钱', '--positive');
        }
        table += '<td>' + kbCell + '</td>';
        table += '</tr>';
      });
      table += '</tbody></table>';
      root.innerHTML = table;
    }
    function kbPill(text, colorVar) {
      return '<span class="kb-pill" style="color:var(' + colorVar + ');border-color:var(' + colorVar + ')">' + esc(text) + '</span>';
    }
    function kbRatingPill(r) {
      if (!r) return '—';
      var m = { '高信心': '--positive', '中信心': '--sol-blue', '关注': '--accent', '观望': '--text-muted' };
      return kbPill(r, m[r] || '--text-muted');
    }
    function kbClusterPill(c) {
      if (!c || !c.level || c.level === 'none') return '—';
      var m = { high: '--negative', med: '--bn-yellow', low: '--text-muted' };
      var label = { high: '⚠ 高', med: '中', low: '低' }[c.level] || c.level;
      return kbPill(label, m[c.level] || '--text-muted');
    }
    function kbSignalCell(row) {
      // 知智信号 pill — 复用标准榜单的 KB 信号列逻辑(评级 > 庄家风险 > 聪明钱)
      if (row.conviction_rating) return kbRatingPill(row.conviction_rating);
      if (row.cluster_risk && row.cluster_risk.level && row.cluster_risk.level !== 'none') return kbClusterPill(row.cluster_risk);
      if (row.smart_money_24h && row.smart_money_24h.wallet_count) return kbPill('聪明钱', '--positive');
      var rev = row.revival;
      if (rev && rev.status) return kbPill(rev.status === 'confirmed' ? 'Revival' : '观察中', rev.status === 'confirmed' ? '--sol-green' : '--text-secondary');
      return '—';
    }
    function kbRowsTable(rows) {
      // 复用标准榜单列:#, 代币, 符号, 市值, 24h 涨跌, 24h 交易量, 知智信号
      var html = '<table><thead><tr><th>#</th><th>代币</th><th>符号</th><th class="num">市值</th><th class="num">24h 涨跌</th><th class="num">24h 交易量</th><th>知智信号</th></tr></thead><tbody>';
      rows.forEach(function(row, i) {
        var caStr = typeof row.ca === 'string' ? row.ca : '';
        var nameStr = row.name || row.symbol || '未命名';   // 永不直显 CA
        var symbolStr = typeof row.symbol === 'string' ? row.symbol : '—';
        if (typeof nameStr === 'string' && nameStr.length > 200) nameStr = nameStr.slice(0, 200) + '…';
        if (symbolStr.length > 50) symbolStr = symbolStr.slice(0, 50) + '…';
        var change = row.price_change_24h != null ? parseFloat(row.price_change_24h) : null;
        var changeCl = change != null ? (change >= 0 ? 'positive' : 'negative') : '';
        var changeStr = change != null ? (change >= 0 ? '+' : '') + change.toFixed(2) + '%' : '—';
        var copyBtn = caStr ? '<button class="copy-ca-btn" data-ca="' + esc(caStr) + '"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>' : '';
        html += '<tr class="clickable-row" data-token="' + esc(caStr) + '">';
        html += '<td><span class="' + rankClass(i) + '">' + (i + 1) + '</span></td>';
        html += '<td><div class="token-cell"><span class="token-name">' + esc(nameStr) + '</span>' + copyBtn + '</div></td>';
        html += '<td><span class="symbol">' + esc(symbolStr) + '</span></td>';
        html += '<td class="num">' + formatCompact(row.market_cap) + '</td>';
        html += '<td class="num ' + changeCl + '">' + changeStr + '</td>';
        html += '<td class="num">' + formatCompact(row.vol_24h_usd) + '</td>';
        html += '<td>' + kbSignalCell(row) + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      return html;
    }
    function renderKBSignals(list, rootId) {
      var root = document.getElementById(rootId);
      if (!list.length) { root.innerHTML = '<div class="loading-text" style="animation:none">暂无 KB 信号</div>'; return; }
      var disc = (list[0] && list[0].disclaimer) ? list[0].disclaimer : '';
      var html = disc ? '<div class="kb-disclaimer">' + esc(disc) + '</div>' : '';
      // 分层:深度分析(narrative 已生成 或 有研究评级)置顶,其余为雷达发现(可折叠)
      var deep = [], radar = [];
      list.forEach(function(row) {
        var isDeep = (row.narrative && row.narrative.status === 'generated') || !!row.conviction_rating;
        (isDeep ? deep : radar).push(row);
      });
      var byScore = function(a, b) { return (Number(b.score) || 0) - (Number(a.score) || 0); };
      deep.sort(byScore);
      radar.sort(byScore);
      if (deep.length) {
        html += '<div class="kb-tier-head">🔬 KB 深度分析 <span class="kb-tier-count">' + deep.length + '</span></div>';
        html += kbRowsTable(deep);
      }
      if (radar.length) {
        html += '<details class="kb-tier-details"' + (deep.length ? '' : ' open') + '>';
        html += '<summary class="kb-tier-head">📡 雷达发现 <span class="kb-tier-count">' + radar.length + '</span></summary>';
        html += kbRowsTable(radar);
        html += '</details>';
      }
      root.innerHTML = html;
    }
    function formatSignalTime(ms) {
      if (ms == null || !Number(ms)) return '';
      var diff = Math.max(0, Math.floor((Date.now() - Number(ms)) / 60000));
      if (diff < 1) return '刚刚买入';
      if (diff < 60) return diff + 'm以前买入';
      var h = Math.floor(diff / 60);
      if (h < 24) return h + 'h以前买入';
      var d = Math.floor(h / 24);
      return d + 'd以前买入';
    }
    function renderSignalCards(list, rootId, variant) {
      variant = variant || 'binance';
      var root = document.getElementById(rootId);
      if (!root) return;
      if (!list.length) {
        root.innerHTML = '<div class="loading-text" style="animation:none">暂无数据</div>';
        return;
      }
      var gridClass = 'signal-cards-grid';
      var html = '<div class="' + gridClass + '">';
      list.forEach(function(item) {
        var ca = item.contractAddress || item.contract_address || '';
        var name = item.ticker || item.symbol || ca.slice(0, 8) + '…' || '—';
        if (typeof name !== 'string') name = String(name);
        if (name.length > 24) name = name.slice(0, 24) + '…';
        var logoUrl = item.logoUrl || '';
        var copyBtn = ca ? '<button class="copy-ca-btn" data-ca="' + esc(ca) + '"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>' : '';
        var marketCap = item.currentMarketCap != null ? parseFloat(item.currentMarketCap) : (item.alertMarketCap != null ? parseFloat(item.alertMarketCap) : null);
        var avgPrice = item.alertPrice != null ? parseFloat(item.alertPrice) : null;
        var totalVal = item.totalTokenValue != null ? parseFloat(item.totalTokenValue) : null;
        var direction = (item.direction || '').toLowerCase();
        var isBuy = direction === 'buy';
        var exitRate = item.exitRate != null ? Number(item.exitRate) : 0;
        var buyPct = Math.round(100 - exitRate);
        var sellPct = Math.round(exitRate);
        if (buyPct < 0) buyPct = 0;
        if (sellPct < 0) sellPct = 0;
        var timeStr = formatSignalTime(item.signalTriggerTime);
        var smartCount = item.smartMoneyCount != null ? Number(item.smartMoneyCount) : 0;
        var chainLabel = (item.chain === 'bsc' || item.bsc) ? 'BSC' : 'Sol';
        var buyW = buyPct;
        var sellW = sellPct;
        if (buyW + sellW === 0) { buyW = 50; sellW = 50; }
        var inflowDisplay = totalVal != null ? (isBuy ? '$' + totalVal.toFixed(2) : '-$' + Math.abs(totalVal).toFixed(2)) : '—';
        html += '<div class="signal-card clickable-signal-card" data-token="' + esc(ca) + '" data-chain="' + esc(item.chain || 'solana') + '" tabindex="0">';
        html += '<div class="signal-card-inner">';
        html += '<div class="signal-card-scanline"></div>';
        html += '<div class="signal-card-live-bar"><span class="signal-card-live-dot"></span><span class="signal-card-live-text">LIVE</span><span class="signal-card-live-sm">SM:' + smartCount + '</span></div>';
        html += '<div class="signal-card-body">';
        html += '<div class="signal-card-head">';
        var logoFallback = item.logoUrlFallback || '';
        if (logoUrl) {
          html += '<img src="' + esc(logoUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback="' + esc(logoFallback) + '" onerror="var fb=this.dataset.fallback;if(fb){this.src=fb;this.dataset.fallback=\\'\\';}else{this.style.display=\\'none\\';var p=this.nextElementSibling;if(p)p.style.display=\\'flex\\'}"><div class="signal-card-logo-placeholder" style="display:none">' + esc((name || '?').charAt(0)) + '</div>';
        } else if (logoFallback) {
          html += '<img src="' + esc(logoFallback) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\\'none\\';var p=this.nextElementSibling;if(p)p.style.display=\\'flex\\'"><div class="signal-card-logo-placeholder" style="display:none">' + esc((name || '?').charAt(0)) + '</div>';
        } else {
          html += '<div class="signal-card-logo-placeholder">' + esc((name || '?').charAt(0)) + '</div>';
        }
        html += '<span class="token-name">' + esc(name) + '</span>' + copyBtn + '</div>';
        html += '<div class="signal-card-ca"><span class="signal-card-chain" data-chain="' + esc(item.chain || 'solana') + '">' + esc(chainLabel) + '</span><span>' + esc(ca ? (ca.length > 16 ? ca.slice(0, 8) + '…' + ca.slice(-6) : ca) : '—') + '</span></div>';
        html += '<div class="signal-card-stats">';
        html += '<div class="signal-card-stats-item"><div class="label">MCAP</div><div class="value">' + (marketCap != null ? formatCompact(marketCap) : '—') + '</div></div>';
        html += '<div class="signal-card-stats-item"><div class="label">AVG</div><div class="value">' + (avgPrice != null ? '$' + (avgPrice < 0.01 ? avgPrice.toPrecision(2) : avgPrice.toFixed(4)) : '—') + '</div></div>';
        html += '<div class="signal-card-stats-item"><div class="label">INFLOW</div><div class="value ' + (isBuy ? 'inflow-positive' : 'inflow-negative') + '">' + esc(inflowDisplay) + '</div></div>';
        html += '</div>';
        html += '<div class="signal-card-row">';
        if (timeStr) html += '<span class="signal-card-time">' + esc(timeStr) + '</span>';
        html += '<span class="signal-card-active">⚡ Active</span></div>';
        html += '<div class="signal-card-bar-wrap"><div class="signal-card-bar-buy" style="width:' + buyW + '%"></div><div class="signal-card-bar-sell" style="width:' + sellW + '%"></div></div>';
        html += '<div class="signal-card-bar-labels"><span class="buy">BUY ' + buyPct + '%</span><span class="sell">SELL ' + sellPct + '%</span></div>';
        html += '</div></div></div>';
      });
      html += '</div>';
      root.innerHTML = html;
    }
    function renderInflowRank(list, rootId, variant) {
      variant = variant || 'binance';
      var root = document.getElementById(rootId);
      if (!root) return;
      if (!list.length) {
        root.innerHTML = '<div class="loading-text" style="animation:none">暂无数据</div>';
        return;
      }
      list.sort(function(a, b) { return (b.inflow || 0) - (a.inflow || 0); });
      var gridClass = 'inflow-rank-grid';
      var html = '<div class="' + gridClass + '">';
      list.forEach(function(item, idx) {
        var ca = item.ca || '';
        var name = item.tokenName || ca.slice(0, 8) + '…' || '—';
        if (typeof name !== 'string') name = String(name);
        if (name.length > 20) name = name.slice(0, 20) + '…';
        var logoUrl = item.tokenIconUrl || '';
        var chain = item.chain || 'solana';
        var chainLabel = chain === 'bsc' ? 'BSC' : 'Sol';
        var inflowVal = item.inflow != null ? Number(item.inflow) : 0;
        var inflowStr = inflowVal >= 0 ? '+$' + formatCompact(Math.abs(inflowVal)).replace('$','') : '-$' + formatCompact(Math.abs(inflowVal)).replace('$','');
        var inflowCls = inflowVal >= 0 ? 'positive' : 'negative';
        var mcap = item.marketCap != null ? parseFloat(item.marketCap) : null;
        var vol = item.volume != null ? parseFloat(item.volume) : null;
        var liq = item.liquidity != null ? parseFloat(item.liquidity) : null;
        var traders = item.traders != null ? Number(item.traders) : 0;
        var holders = item.holders != null ? Number(item.holders) : 0;
        var countBuy = item.countBuy != null ? Number(item.countBuy) : 0;
        var countSell = item.countSell != null ? Number(item.countSell) : 0;
        var totalCount = countBuy + countSell;
        var buyPct = totalCount > 0 ? Math.round(countBuy / totalCount * 100) : 50;
        var sellPct = 100 - buyPct;
        var changeRate = item.priceChangeRate != null ? parseFloat(item.priceChangeRate) : null;
        var changeCls = changeRate != null ? (changeRate >= 0 ? 'positive' : 'negative') : '';
        var changeStr = changeRate != null ? (changeRate >= 0 ? '+' : '') + changeRate.toFixed(1) + '%' : '—';
        var posClass = idx < 3 ? 'inflow-rank-pos top3' : 'inflow-rank-pos';
        var copyBtn = ca ? '<button class="copy-ca-btn" data-ca="' + esc(ca) + '"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>' : '';
        var tags = [];
        if (item.tokenTag) {
          Object.values(item.tokenTag).forEach(function(arr) {
            if (Array.isArray(arr)) arr.forEach(function(t) { if (t.tagName && tags.length < 3) tags.push(t.tagName); });
          });
        }
        html += '<div class="inflow-rank-card clickable-signal-card" data-token="' + esc(ca) + '" data-chain="' + esc(chain) + '" tabindex="0">';
        html += '<div class="inflow-rank-card-inner">';
        html += '<div class="inflow-rank-header">';
        html += '<span class="' + posClass + '">' + (idx + 1) + '</span>';
        if (logoUrl) {
          html += '<img class="inflow-rank-logo" src="' + esc(logoUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'flex\\'"><span class="inflow-rank-logo-placeholder" style="display:none">' + esc((name || '?').charAt(0)) + '</span>';
        } else {
          html += '<span class="inflow-rank-logo-placeholder">' + esc((name || '?').charAt(0)) + '</span>';
        }
        html += '<span class="inflow-rank-name">' + esc(name) + '</span>' + copyBtn;
        html += '<span class="inflow-rank-chain" data-chain="' + esc(chain) + '">' + esc(chainLabel) + '</span>';
        html += '<span class="inflow-rank-inflow ' + inflowCls + '">' + esc(inflowStr) + '</span>';
        html += '</div>';
        html += '<div class="inflow-rank-stats">';
        html += '<div class="inflow-rank-stat"><span class="label">MCAP</span><span class="value">' + (mcap != null ? formatCompact(mcap) : '—') + '</span></div>';
        html += '<div class="inflow-rank-stat"><span class="label">VOL</span><span class="value">' + (vol != null ? formatCompact(vol) : '—') + '</span></div>';
        html += '<div class="inflow-rank-stat"><span class="label">LIQ</span><span class="value">' + (liq != null ? formatCompact(liq) : '—') + '</span></div>';
        html += '<div class="inflow-rank-stat"><span class="label">24h</span><span class="value inflow-rank-change ' + changeCls + '">' + esc(changeStr) + '</span></div>';
        html += '</div>';
        html += '<div class="inflow-rank-bar-wrap"><div class="inflow-rank-bar-buy" style="width:' + buyPct + '%"></div></div>';
        html += '<div class="inflow-rank-bar-labels"><span class="buy">BUY ' + countBuy + ' (' + buyPct + '%)</span><span class="sell">SELL ' + countSell + ' (' + sellPct + '%)</span></div>';
        html += '<div class="inflow-rank-meta">';
        html += '<span class="inflow-rank-live-dot"></span>';
        html += '<span class="inflow-rank-traders">SM: ' + traders + '</span>';
        html += '<span>Holders: ' + holders.toLocaleString() + '</span>';
        if (tags.length) {
          html += '<span class="inflow-rank-tags">';
          tags.forEach(function(t) { html += '<span class="inflow-rank-tag">' + esc(t) + '</span>'; });
          html += '</span>';
        }
        html += '</div>';
        html += '</div></div>';
      });
      html += '</div>';
      root.innerHTML = html;
    }
    function fetchJsonOrThrow(url, options) {
      return fetch(url, options).then(function(r) {
        return r.text().then(function(t) {
          var json = null;
          try { json = t ? JSON.parse(t) : null; } catch (e) {}
          if (!r.ok) {
            var msg = (json && (json.error || json.message)) ? (json.error || json.message) : (t || ('HTTP ' + r.status));
            throw new Error(msg);
          }
          return json;
        });
      });
    }
    function refreshPanel(panelKey) {
      var rootId = 'root-' + panelKey;
      var rootEl = document.getElementById(rootId);
      if (!rootEl) return Promise.resolve();

      if (panelKey === 'bn-signal') {
        return fetchJsonOrThrow('/api/smart-money-signals').then(function(list) {
          if (Array.isArray(list)) renderSignalCards(list, rootId, 'binance');
          else rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">数据格式异常</div>';
        }).catch(function(e) {
          rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">' + (e && e.message ? e.message : String(e)) + '</div>';
        });
      }
      if (panelKey === 'bn-inflow') {
        return fetchJsonOrThrow('/api/smart-money-inflow?tagType=1').then(function(list) {
          if (Array.isArray(list)) renderInflowRank(list, rootId, 'binance');
          else rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">数据格式异常</div>';
        }).catch(function(e) {
          rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">' + (e && e.message ? e.message : String(e)) + '</div>';
        });
      }
      if (panelKey === 'bn-kol') {
        return fetchJsonOrThrow('/api/smart-money-inflow?tagType=2').then(function(list) {
          if (Array.isArray(list)) renderInflowRank(list, rootId, 'binance');
          else rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">数据格式异常</div>';
        }).catch(function(e) {
          rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">' + (e && e.message ? e.message : String(e)) + '</div>';
        });
      }
      if (panelKey === 'kb') {
        return fetchJsonOrThrow('/api/kb-signals').then(function(list) {
          if (Array.isArray(list)) renderKBSignals(list, rootId);
          else rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">数据格式异常</div>';
        }).catch(function(e) {
          rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">' + (e && e.message ? e.message : String(e)) + '</div>';
        });
      }
      var url = panelKey === 'pump' ? '/api/ranking' : '/api/ranking/zhilabs';
      return fetchJsonOrThrow(url).then(function(list) {
        if (Array.isArray(list)) renderTable(list, rootId);
        else rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">数据格式异常</div>';
      }).catch(function(e) {
        rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">' + (e && e.message ? e.message : String(e)) + '</div>';
      });
    }
    function refreshTab(tab) {
      if (tab === 'binance') return refreshPanel(currentSubTab || 'bn-signal');
      return refreshPanel(tab);
    }
    function setUpdateStatus(text, isError) {
      var el = document.getElementById('updateStatus');
      el.textContent = text || '';
      el.style.color = isError ? 'var(--negative)' : 'var(--text-secondary)';
    }
    function setLastSync(date) {
      var el = document.getElementById('lastSync');
      if (!el) return;
      if (!date) { el.textContent = ''; return; }
      var d = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(d.getTime())) { el.textContent = ''; return; }
      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');
      var ss = String(d.getSeconds()).padStart(2, '0');
      el.textContent = '同步 ' + hh + ':' + mm + ':' + ss;
    }
    function showCopied(btn) {
      btn.classList.add('copied');
      btn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(function() {
        btn.classList.remove('copied');
        btn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      }, 1200);
    }
    document.querySelector('.table-card').addEventListener('click', function(e) {
      var btn = e.target.closest('.copy-ca-btn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        var ca = btn.getAttribute('data-ca');
        if (!ca) return;
        navigator.clipboard.writeText(ca).then(function() {
          showCopied(btn);
        }).catch(function() {
          var ta = document.createElement('textarea');
          ta.value = ca; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch(ex) {}
          document.body.removeChild(ta);
          showCopied(btn);
        });
        return;
      }
      var row = e.target.closest('.clickable-row');
      if (row) {
        var token = row.getAttribute('data-token');
        if (token) window.location.href = '/token/' + encodeURIComponent(token);
        return;
      }
      var card = e.target.closest('.clickable-signal-card');
      if (card) {
        var token = card.getAttribute('data-token');
        var chain = card.getAttribute('data-chain');
        if (token) {
          var url = '/token/' + encodeURIComponent(token);
          if (chain && chain !== 'solana') url += '?chain=' + encodeURIComponent(chain);
          window.location.href = url;
        }
      }
    });
    var currentTab = 'pump';
    var currentSubTab = '';
    var bnSubTabs = { 'bn-signal': true, 'bn-inflow': true, 'bn-kol': true };
    var defaultBnSub = 'bn-signal';
    document.getElementById('updateBtn').querySelector('span').textContent = '更新 Pump 榜单';

    function showSubTabs(tab) {
      document.getElementById('subTabsBinance').style.display = tab === 'binance' ? 'flex' : 'none';
    }

    function activatePanel(panelKey) {
      document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
      var target = document.getElementById('panel-' + panelKey);
      if (target) target.classList.add('active');
    }

    function updateDesc(tab, subTab) {
      var descEl = document.getElementById('desc');
      if (tab === 'pump') descEl.textContent = '已成功发射、上线 < 10 天、市值 > 100K，需有图片，insider ≤50%，Top10 持仓 ≤30%，按 24h 交易量排序';
      else if (tab === 'zhilabs') descEl.textContent = 'zhizhilabs 精选 Meme 代币，按 24h 交易量排序';
      else if (tab === 'binance') {
        if (subTab === 'bn-signal') descEl.textContent = 'Binance 链上聪明钱买入/卖出信号，数据来自 Binance Web3';
        else if (subTab === 'bn-inflow') descEl.textContent = 'Binance 聪明钱净流入排行（Solana + BSC），实时追踪聪明钱资金流向';
        else if (subTab === 'bn-kol') descEl.textContent = 'Binance KOL 大 V 资金流入排行，追踪 KOL 投资动向';
      }
      else if (tab === 'kb') descEl.textContent = '知智 KB 链上分析信号(庄家风险 / 聪明钱 / Revival / 研究评级)· 仅研究参考,非投资建议';
    }

    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach(function(btn){ btn.classList.toggle('active', btn.dataset.tab === tab); });
      showSubTabs(tab);
      if (tab === 'binance') {
        currentSubTab = defaultBnSub;
        activatePanel(currentSubTab);
        document.querySelectorAll('#subTabsBinance .sub-tab-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.subtab === currentSubTab); });
      } else {
        currentSubTab = '';
        activatePanel(tab);
      }
      updateDesc(tab, currentSubTab);
      var btnText = tab === 'pump' ? '更新 Pump 榜单' : (tab === 'zhilabs' ? '更新 zhizhilabs 精选' : (tab === 'kb' ? 'KB 信号' : '刷新数据'));
      document.getElementById('updateBtn').querySelector('span').textContent = btnText;
      var narrativeBtn = document.getElementById('refreshNarrativeBtn');
      if (narrativeBtn) narrativeBtn.style.display = tab === 'zhilabs' ? '' : 'none';
      refreshTab(tab).then(function(){ setLastSync(new Date()); }).catch(function(){});
    }

    function switchSubTab(subTab) {
      currentSubTab = subTab;
      var parentId = 'subTabsBinance';
      document.querySelectorAll('#' + parentId + ' .sub-tab-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.subtab === subTab); });
      activatePanel(subTab);
      updateDesc(currentTab, subTab);
      refreshPanel(subTab).then(function(){ setLastSync(new Date()); }).catch(function(){});
    }

    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
    });
    document.querySelectorAll('.sub-tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { switchSubTab(btn.dataset.subtab); });
    });
    document.getElementById('updateBtn').addEventListener('click', function() {
      var btn = document.getElementById('updateBtn');
      var tab = currentTab || 'pump';
      if (tab === 'binance') {
        btn.disabled = true;
        setUpdateStatus('刷新中…');
        refreshTab(tab).then(function() {
          setUpdateStatus('刷新完成');
          setLastSync(new Date());
        }).catch(function(e) {
          setUpdateStatus('刷新失败：' + (e && e.message ? e.message : String(e)), true);
        }).finally(function() { btn.disabled = false; });
        return;
      }
      btn.disabled = true;
      setUpdateStatus('更新中…');
      var started = Date.now();
      fetchJsonOrThrow('/api/update?type=' + encodeURIComponent(tab), { method: 'POST' })
        .then(function(out) {
          var ms = Date.now() - started;
          var updated = out && typeof out.updated === 'number' ? out.updated : null;
          var dur = out && typeof out.durationMs === 'number' ? out.durationMs : ms;
          setUpdateStatus('更新完成' + (updated != null ? ('：' + updated + ' 条') : '') + '，用时 ' + dur + 'ms');
          return refreshTab(tab).then(function(){ setLastSync(new Date()); });
        })
        .catch(function(e) {
          setUpdateStatus('更新失败：' + (e && e.message ? e.message : String(e)), true);
        })
        .finally(function() {
          btn.disabled = false;
        });
    });
    document.getElementById('refreshNarrativeBtn').addEventListener('click', function() {
      var btn = document.getElementById('refreshNarrativeBtn');
      btn.disabled = true;
      setUpdateStatus('正在刷新 zhizhilabs 叙事…');
      fetchJsonOrThrow('/api/ranking/zhilabs/refresh-narratives', { method: 'POST' })
        .then(function(out) {
          var u = out && out.updated != null ? out.updated : 0;
          var e = out && out.errors != null ? out.errors : 0;
          var t = out && out.tokens != null ? out.tokens : 0;
          setUpdateStatus('叙事刷新完成：成功 ' + u + ' 条，失败 ' + e + ' 条（共 ' + t + ' 个代币）');
        })
        .catch(function(err) {
          setUpdateStatus('叙事刷新失败：' + (err && err.message ? err.message : String(err)), true);
        })
        .finally(function() { btn.disabled = false; });
    });
    var _schedState = { intervalMs: 300000, lastRun: null, running: false };
    function fetchSchedulerStatus() {
      return fetchJsonOrThrow('/api/scheduler/status').then(function(s) {
        _schedState = s;
        var dot = document.getElementById('schedulerDot');
        var info = document.getElementById('schedulerInfo');
        var lastEl = document.getElementById('schedulerLastResult');
        dot.className = 'dot ' + (s.running ? 'running' : 'active');
        info.textContent = s.running ? '更新中…' : '每 ' + s.intervalMin + ' 分钟';
        if (s.lastResult) {
          var parts = [];
          if (s.lastResult.pump) parts.push('Pump ' + (s.lastResult.pump.ok ? s.lastResult.pump.count + '条' : '失败'));
          if (s.lastResult.zhilabs) parts.push('zhizhilabs ' + (s.lastResult.zhilabs.ok ? s.lastResult.zhilabs.count + '条' : '失败'));
          if (s.lastResult.durationMs) parts.push(s.lastResult.durationMs + 'ms');
          lastEl.textContent = parts.join(' · ') || '—';
        }
        if (s.running) {
          refreshTab(currentTab).then(function(){ setLastSync(new Date()); }).catch(function(){});
        }
      }).catch(function(){});
    }
    function updateCountdown() {
      var el = document.getElementById('schedulerCountdown');
      if (!_schedState.lastRun || !_schedState.intervalMs) { el.textContent = '--:--'; return; }
      var next = new Date(_schedState.lastRun).getTime() + _schedState.intervalMs;
      var diff = Math.max(0, Math.round((next - Date.now()) / 1000));
      var mm = String(Math.floor(diff / 60)).padStart(2, '0');
      var ss = String(diff % 60).padStart(2, '0');
      el.textContent = mm + ':' + ss;
      if (diff <= 0) fetchSchedulerStatus();
    }
    var kbSignalsMap = {};
    function loadKbMap() {
      return fetch('/api/kb-signals').then(function(r){ return r.json(); }).then(function(list) {
        kbSignalsMap = {};
        (Array.isArray(list) ? list : []).forEach(function(s){ if (s.ca) kbSignalsMap[s.ca] = s; });
        if (currentTab === 'pump' || currentTab === 'zhilabs') refreshPanel(currentTab);
      }).catch(function(){});
    }
    loadKbMap();
    fetchSchedulerStatus();
    setInterval(fetchSchedulerStatus, 15000);
    setInterval(updateCountdown, 1000);

    var inflowAutoRefreshTimer = null;
    function startInflowAutoRefresh() {
      stopInflowAutoRefresh();
      inflowAutoRefreshTimer = setInterval(function() {
        if (currentSubTab && (currentSubTab.indexOf('inflow') >= 0 || currentSubTab.indexOf('kol') >= 0)) {
          refreshPanel(currentSubTab).then(function() { setLastSync(new Date()); }).catch(function(){});
        }
      }, 30000);
    }
    function stopInflowAutoRefresh() {
      if (inflowAutoRefreshTimer) { clearInterval(inflowAutoRefreshTimer); inflowAutoRefreshTimer = null; }
    }
    var origSwitchTab = switchTab;
    switchTab = function(tab) {
      origSwitchTab(tab);
      if (tab === 'binance') startInflowAutoRefresh();
      else stopInflowAutoRefresh();
    };
    var origSwitchSubTab = switchSubTab;
    switchSubTab = function(subTab) {
      origSwitchSubTab(subTab);
      if (subTab.indexOf('inflow') >= 0 || subTab.indexOf('kol') >= 0) startInflowAutoRefresh();
    };

    Promise.allSettled([
        fetch('/api/ranking').then(function(r){ return r.ok ? r.json() : r.text().then(function(t){ throw new Error(t); }); }),
        fetch('/api/ranking/zhilabs').then(function(r){ return r.ok ? r.json() : r.text().then(function(t){ throw new Error(t); }); })
      ]).then(function(results) {
        var r0 = results[0], r1 = results[1];
        if (r0.status === 'fulfilled' && Array.isArray(r0.value)) renderTable(r0.value, 'root-pump');
        else document.getElementById('root-pump').innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">Pump 榜单: ' + (r0.status === 'rejected' && r0.reason ? (r0.reason.message || r0.reason) : '暂无数据') + '</div>';
        if (r1.status === 'fulfilled' && Array.isArray(r1.value)) renderTable(r1.value, 'root-zhilabs');
        else document.getElementById('root-zhilabs').innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">zhizhilabs 精选: ' + (r1.status === 'rejected' && r1.reason ? (r1.reason.message || r1.reason) : '暂无数据') + '</div>';
        setLastSync(new Date());
      });
  </script>
</body>
</html>
`;
}
