/**
 * 代币详情页 HTML 模板 — 从 server.js 原封不动提取
 */
import { buildSeoMeta, SITE_URL, SITE_NAME } from '../seo.js';

const GA_MEASUREMENT_ID = (process.env.GA_MEASUREMENT_ID || '').trim();

function gaSnippet() {
  if (!GA_MEASUREMENT_ID) return '';
  return `<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>`;
}

export function buildTokenDetailPage(tokenInfo = {}) {
const tokenName = tokenInfo.name || tokenInfo.symbol || '代币详情';
const tokenSymbol = tokenInfo.symbol || '';
const tokenAddr = tokenInfo.token || '';
const pageTitle = tokenSymbol
  ? `${tokenName} (${tokenSymbol}) 行情与数据 | Zhizhi Labs`
  : `${tokenName} | Zhizhi Labs`;
const pageDesc = tokenSymbol
  ? `查看 ${tokenName} (${tokenSymbol}) 的实时价格、K线图、市值、24h 交易量和持仓分布。由 Zhizhi Labs 提供链上数据分析。`
  : `在 Zhizhi Labs 查看代币的实时行情、K线图和链上数据分析。`;
const seoMeta = buildSeoMeta({
  title: pageTitle,
  description: pageDesc,
  canonicalPath: tokenAddr ? `/token/${encodeURIComponent(tokenAddr)}` : '/ranking',
  ogType: 'article',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    description: pageDesc,
    url: tokenAddr ? `${SITE_URL}/token/${encodeURIComponent(tokenAddr)}` : `${SITE_URL}/ranking`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  },
});
return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="view-transition" content="same-origin">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${pageTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
  ${seoMeta}
  ${gaSnippet()}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles/glass-system.css">
  <style>
    /* Design tokens (shared with welcome + ranking) */
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
      --bg-card-solid: var(--surface-1);
      --bg-card-hover: var(--surface-2);
      --border-subtle: oklch(40% 0.04 290 / 0.2);
      --border-glow: oklch(55% 0.15 290 / 0.35);
      --sol-purple: #9945FF;
      --sol-green: #14F195;
      --sol-blue: #00D1FF;
      --bn-yellow: #F0B90B;
      --accent-purple: oklch(50% 0.12 290 / 0.15);
      --accent-green: oklch(50% 0.12 155 / 0.15);
      --accent-blue: oklch(50% 0.1 230 / 0.15);
      --accent-pink: oklch(55% 0.15 25 / 0.15);
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
    .bg-layer { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
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
    button:focus-visible, a:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes borderGlow {
      0%,100% { opacity: 0.5; }
      50%     { opacity: 1; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes dotPulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes gradientShift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .page-wrapper {
      position: relative; z-index: 2;
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.5rem 1.5rem 3rem;
    }
    .page-header {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      margin-bottom: 1.5rem; flex-wrap: wrap;
    }
    .back-btn {
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
    .back-btn:hover {
      color: var(--sol-purple);
      border-color: var(--border-glow);
      box-shadow: 0 0 20px rgba(153,69,255,0.15);
      transform: translateX(-3px);
      text-decoration: none;
    }
    .back-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    /* === Token Hero Card === */
    .token-hero {
      position: relative;
      background: linear-gradient(135deg, rgba(15,12,30,0.9) 0%, rgba(25,18,50,0.8) 50%, rgba(15,12,30,0.9) 100%);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 2rem 2rem 1.75rem;
      margin-bottom: 1.5rem;
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      overflow: hidden;
      animation: fadeSlideUp 0.5s ease both;
    }
    .token-hero::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--sol-purple), var(--sol-green), var(--sol-blue), transparent);
      background-size: 200% 100%;
      animation: gradientShift 4s ease infinite;
    }
    .token-hero::after {
      content: '';
      position: absolute; top: 0; right: 0;
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(153,69,255,0.06) 0%, transparent 70%);
      pointer-events: none;
    }
    .token-hero-layout {
      display: flex; gap: 1.5rem; align-items: stretch;
    }
    .token-hero-left { flex: 1; min-width: 0; }
    .token-hero-right {
      flex: 0 0 320px;
      min-width: 0;
      display: flex; flex-direction: column;
    }
    .hero-narrative {
      background: rgba(153,69,255,0.04);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 0.875rem 1rem;
      flex: 1;
      display: flex; flex-direction: column;
    }
    .hero-narrative .narrative-title {
      margin-bottom: 0.5rem;
      font-size: 0.625rem;
    }
    .hero-narrative .narrative-grade-section {
      margin-bottom: 0.5rem;
      padding-bottom: 0.5rem;
    }
    .hero-narrative .narrative-grade-header { margin-bottom: 0.5rem; gap: 0.5rem; }
    .hero-narrative .narrative-grade-badge { width: 30px; height: 30px; font-size: 0.9rem; border-radius: 8px; }
    .hero-narrative .narrative-grade-label { font-size: 0.75rem; }
    .hero-narrative .narrative-grade-rec { font-size: 0.625rem; }
    .hero-narrative .narrative-metrics { gap: 0.375rem; grid-template-columns: repeat(2, 1fr); }
    .hero-narrative .narrative-metric { padding: 0.375rem 0.5rem; border-radius: 6px; }
    .hero-narrative .narrative-metric-value { font-size: 0.8125rem; }
    .hero-narrative .narrative-metric-label { font-size: 0.5625rem; }
    .hero-narrative .narrative-kol-list { margin-top: 0.375rem; gap: 0.25rem; }
    .hero-narrative .narrative-kol-tag { font-size: 0.625rem; padding: 0.15em 0.4em; }
    .hero-narrative .narrative-text {
      font-size: 0.75rem; line-height: 1.5;
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
    }
    .hero-narrative .narrative-articles { margin-top: 0.5rem; padding-top: 0.5rem; }
    .hero-narrative .narrative-article { padding: 0.375rem 0.25rem; font-size: 0.6875rem; }
    .hero-narrative .narrative-loading, .hero-narrative .narrative-empty { font-size: 0.6875rem; padding: 0.5rem 0; }
    .token-hero-top {
      display: flex; align-items: flex-start; gap: 1.25rem;
      flex-wrap: wrap;
    }
    .token-logo-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .token-logo {
      width: 64px; height: 64px;
      border-radius: 16px;
      border: 2px solid var(--border-glow);
      background: rgba(15,12,30,0.8);
      object-fit: cover;
      box-shadow: 0 0 30px rgba(153,69,255,0.2), 0 4px 16px rgba(0,0,0,0.3);
    }
    .token-logo-placeholder {
      width: 64px; height: 64px;
      border-radius: 16px;
      border: 2px solid var(--border-subtle);
      background: linear-gradient(135deg, rgba(153,69,255,0.2), rgba(0,209,255,0.15));
      display: flex; align-items: center; justify-content: center;
      font-family: 'Orbitron', sans-serif;
      font-size: 1.5rem; font-weight: 700;
      color: var(--sol-purple);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .token-info { flex: 1; min-width: 0; }
    .token-name-row {
      display: flex; align-items: center; gap: 0.625rem;
      flex-wrap: wrap;
      margin-bottom: 0.25rem;
    }
    .token-info h1 {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(1.2rem, 3.5vw, 1.75rem);
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }
    .symbol-badge {
      font-family: var(--font-ui);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--sol-blue);
      background: rgba(0,209,255,0.1);
      padding: 0.2em 0.6em;
      border-radius: 6px;
      border: 1px solid rgba(0,209,255,0.18);
      letter-spacing: 0.03em;
    }
    .chain-badge {
      display: inline-flex; align-items: center; gap: 0.3rem;
      font-family: var(--font-ui);
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--sol-green);
      background: rgba(20,241,149,0.08);
      padding: 0.2em 0.6em;
      border-radius: 6px;
      border: 1px solid rgba(20,241,149,0.15);
    }
    .chain-badge svg { width: 12px; height: 12px; }
    .token-price-row {
      display: flex; align-items: baseline; gap: 0.75rem;
      margin-top: 0.5rem; flex-wrap: wrap;
    }
    .token-price {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(1.4rem, 4vw, 2rem);
      font-weight: 900;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }
    .token-change {
      font-family: var(--font-ui);
      font-size: 1rem; font-weight: 700;
      padding: 0.2em 0.75em;
      border-radius: 8px;
      display: inline-flex; align-items: center; gap: 0.3rem;
    }
    .token-change.positive {
      color: var(--positive);
      background: rgba(20,241,149,0.12);
      border: 1px solid rgba(20,241,149,0.2);
    }
    .token-change.negative {
      color: var(--negative);
      background: rgba(255,77,106,0.12);
      border: 1px solid rgba(255,77,106,0.2);
    }
    .token-change svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.5; }

    /* === Action Bar (Contract + Links) === */
    .action-bar {
      display: flex; align-items: stretch; gap: 0;
      margin-bottom: 1.5rem;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      overflow: hidden;
      animation: fadeSlideUp 0.5s ease 0.08s both;
      position: relative;
    }
    .action-bar::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(153,69,255,0.2), rgba(0,209,255,0.15), transparent);
    }
    .action-bar-contract {
      display: flex; align-items: center; gap: 0.625rem;
      padding: 0.75rem 1.25rem;
      flex: 1; min-width: 0;
      border-right: 1px solid var(--border-subtle);
    }
    .contract-label {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .contract-addr {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--sol-blue);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1; min-width: 0;
    }
    .copy-btn {
      padding: 0.35rem 0.65rem;
      font-family: var(--font-ui);
      font-size: 0.6875rem; font-weight: 600;
      color: var(--text-secondary);
      background: rgba(153,69,255,0.08);
      border: 1px solid rgba(153,69,255,0.12);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
      display: inline-flex; align-items: center; gap: 0.3rem;
    }
    .copy-btn svg { width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2; }
    .copy-btn:hover {
      background: rgba(153,69,255,0.2);
      border-color: var(--sol-purple);
      color: var(--sol-purple);
    }
    .copy-btn.copied {
      background: rgba(20,241,149,0.15);
      border-color: rgba(20,241,149,0.3);
      color: var(--positive);
    }
    .action-bar-links {
      display: flex; align-items: center; gap: 0;
      flex-shrink: 0;
    }
    .ext-link {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.75rem 1rem;
      font-family: var(--font-ui);
      font-size: 0.8rem; font-weight: 600;
      color: var(--text-secondary);
      text-decoration: none;
      transition: all 0.25s ease;
      border-left: 1px solid var(--border-subtle);
      white-space: nowrap;
      position: relative;
    }
    .ext-link:first-child { border-left: none; }
    .ext-link svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; flex-shrink: 0; }
    .ext-link:hover {
      color: var(--text-primary);
      background: rgba(153,69,255,0.06);
      text-decoration: none;
    }
    .ext-link .ext-arrow { font-size: 0.75em; opacity: 0.5; transition: opacity 0.2s; }
    .ext-link:hover .ext-arrow { opacity: 1; }

    /* === Stats Grid === */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.625rem;
      margin-bottom: 0.875rem;
      animation: fadeSlideUp 0.5s ease 0.15s both;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 0.875rem 1rem 0.8rem;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
      cursor: default;
    }
    .stat-card::before {
      content: '';
      position: absolute; top: 0; left: 0;
      width: 2px; height: 100%;
      background: var(--card-accent, var(--sol-purple));
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .stat-card::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, var(--card-accent, var(--sol-purple)), transparent 80%);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .stat-card:hover {
      border-color: oklch(40% 0.04 290 / 0.35);
      background: var(--bg-card-hover);
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(0,0,0,0.25);
    }
    .stat-card:hover::before { opacity: 1; }
    .stat-card:hover::after { opacity: 0.3; }
    .stat-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .stat-label {
      font-family: var(--font-ui);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
    .stat-icon {
      width: 30px; height: 30px;
      border-radius: 5px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .stat-value {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .stat-value.positive { color: var(--positive); }
    .stat-value.negative { color: var(--negative); }
    .stat-footer {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 0.4375rem;
    }
    .stat-sub {
      font-size: 0.625rem;
      color: var(--text-muted);
      font-weight: 600;
      letter-spacing: 0.03em;
      display: flex; align-items: center; gap: 0.25rem;
    }
    .stat-tag {
      font-size: 0.5625rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 3px;
      letter-spacing: 0.04em;
    }
    .tag-green { background: rgba(20,241,149,0.12); color: var(--positive); }
    .tag-blue { background: rgba(0,209,255,0.1); color: var(--sol-blue); }
    .tag-amber { background: rgba(240,176,11,0.1); color: var(--bn-yellow); }
    .tag-purple { background: rgba(153,69,255,0.1); color: var(--sol-purple); }
    .tag-red { background: rgba(255,77,106,0.1); color: var(--negative); }
    .live-dot-sm {
      width: 5px; height: 5px; border-radius: 2px;
      background: var(--sol-green);
      display: inline-block;
      animation: dotPulse 1.6s ease-in-out infinite;
    }
    .card-mc { --card-accent: var(--sol-purple); }
    .card-mc .stat-icon { background: rgba(153,69,255,0.1); color: var(--sol-purple); }
    .card-vol { --card-accent: var(--sol-blue); }
    .card-vol .stat-icon { background: rgba(0,209,255,0.1); color: var(--sol-blue); }
    .card-chg { --card-accent: var(--positive); }
    .card-chg .stat-icon { background: rgba(20,241,149,0.1); color: var(--positive); }
    .card-chg-down { --card-accent: var(--negative); }
    .card-chg-down .stat-icon { background: rgba(255,77,106,0.1); color: var(--negative); }
    .card-hold { --card-accent: var(--bn-yellow); }
    .card-hold .stat-icon { background: rgba(240,176,11,0.08); color: var(--bn-yellow); }
    .card-liq { --card-accent: var(--sol-purple); }
    .card-liq .stat-icon { background: rgba(153,69,255,0.1); color: var(--sol-purple); }
    .card-time { --card-accent: var(--negative); }
    .card-time .stat-icon { background: rgba(255,77,106,0.08); color: var(--negative); }

    /* === Bottom Detail Row === */
    .bottom-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.625rem;
      margin-bottom: 1.5rem;
      animation: fadeSlideUp 0.5s ease 0.18s both;
    }
    .info-panel {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 1rem 1.125rem;
    }
    .info-panel-title {
      font-family: var(--font-ui);
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
      display: flex; align-items: center; gap: 0.375rem;
    }
    .info-panel-title svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .info-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.4375rem 0;
      border-bottom: 1px solid oklch(40% 0.04 290 / 0.08);
    }
    .info-row:last-child { border-bottom: none; }
    .info-row-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
    }
    .info-row-value {
      font-size: 0.75rem;
      font-weight: 700;
      font-family: 'Orbitron', monospace;
      color: var(--text-primary);
    }
    .info-row-value.green { color: var(--positive); }
    .info-row-value.red { color: var(--negative); }
    .progress-bar-wrap {
      width: 120px; height: 4px;
      background: oklch(40% 0.04 290 / 0.12);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%; border-radius: 2px;
      transition: width 0.6s ease;
    }

    /* === Chart Card (TradingView style) === */
    .chart-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      overflow: hidden;
      position: relative;
      margin-bottom: 1.5rem;
      animation: fadeSlideUp 0.5s ease 0.22s both;
    }
    .chart-card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(153,69,255,0.3), rgba(0,209,255,0.2), transparent);
    }
    .chart-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.875rem 1rem 0;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .chart-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.6875rem; font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      display: flex; align-items: center; gap: 0.5rem;
    }
    .chart-title .live-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--sol-green);
      box-shadow: 0 0 8px rgba(20,241,149,0.5);
      animation: dotPulse 2s ease-in-out infinite;
    }
    .chart-intervals { display: none; }
    .chart-ohlcv-bar { display: none; }
    .chart-vol-label { display: none; }
    .chart-body {
      padding: 0;
      position: relative;
    }
    #kline-chart {
      width: 100%;
      height: 460px;
      border-radius: 0 0 10px 10px;
      overflow: hidden;
    }
    #kline-chart iframe {
      width: 100%;
      height: 100%;
      border: 0;
      border-radius: 0 0 10px 10px;
      display: block;
    }
    .chart-loading {
      display: flex; align-items: center; justify-content: center;
      height: 460px;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    .chart-loading::after {
      content: '';
      display: inline-block;
      width: 18px; height: 18px;
      border: 2px solid var(--border-subtle);
      border-top-color: var(--sol-purple);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-left: 0.5rem;
    }
    .chart-error {
      display: flex; align-items: center; justify-content: center;
      height: 460px;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    /* === Tweet Timeline Card === */
    .tweet-timeline-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      overflow: hidden;
      position: relative;
      margin-bottom: 1.5rem;
      padding: 1.125rem 1.25rem 1rem;
      animation: fadeSlideUp 0.5s ease 0.26s both;
    }
    .tweet-timeline-card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0,209,255,0.3), rgba(153,69,255,0.2), transparent);
    }
    .tweet-timeline-header {
      display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
      margin-bottom: 12px;
    }
    .tweet-timeline-header-left {
      display: flex; align-items: baseline; gap: 8px; min-width: 0;
    }
    .tweet-timeline-symbol {
      font-size: 15px; font-weight: 500; color: var(--text-primary); flex-shrink: 0;
    }
    .tweet-timeline-name {
      font-size: 12.5px; color: var(--text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .tweet-timeline-conviction {
      font-size: 10.5px; color: var(--accent);
      background: rgba(153,69,255,0.1);
      padding: 1px 7px; border-radius: 4px; flex-shrink: 0;
    }
    .tweet-timeline-mc {
      font-size: 13px; font-weight: 500;
      font-family: var(--font-mono, ui-monospace);
      color: var(--text-primary); flex-shrink: 0;
    }
    .tweet-timeline-main-shill {
      display: block; text-decoration: none; color: inherit;
      background: rgba(153,69,255,0.04);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 10px;
      transition: background 0.2s;
    }
    .tweet-timeline-main-shill:hover {
      background: rgba(153,69,255,0.08);
      text-decoration: none;
    }
    .tweet-timeline-main-shill-row {
      display: flex; align-items: center; gap: 9px; margin-bottom: 5px;
    }
    .tweet-timeline-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: rgba(153,69,255,0.1); color: var(--accent);
      display: grid; place-items: center;
      font-size: 12px; font-weight: 500; flex-shrink: 0;
    }
    .tweet-timeline-shill-info { flex: 1; min-width: 0; }
    .tweet-timeline-shill-name {
      font-size: 12.5px; color: var(--text-primary);
    }
    .tweet-timeline-shill-sub {
      font-size: 10.5px; color: var(--text-muted);
    }
    .tweet-timeline-main-badge {
      font-size: 10.5px; color: var(--accent);
      background: rgba(153,69,255,0.1);
      padding: 0 5px; border-radius: 4px; margin-left: 6px;
    }
    .tweet-timeline-quote {
      font-size: 12px; color: var(--text-secondary); line-height: 1.5;
    }
    .tweet-timeline-list-label {
      font-size: 10.5px; color: var(--text-muted); margin-bottom: 7px;
    }
    .tweet-timeline-list {
      list-style: none; margin: 0; padding: 0;
    }
    .tweet-timeline-list li {
      margin-bottom: 8px;
    }
    .tweet-timeline-list a {
      display: flex; align-items: center; gap: 8px;
      text-decoration: none; color: inherit;
    }
    .tweet-timeline-list a:hover .tweet-tl-name { text-decoration: underline; }
    .tweet-tl-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    .tweet-tl-text {
      flex: 1; min-width: 0; font-size: 11.5px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .tweet-tl-name { font-weight: 500; color: var(--text-primary); }
    .tweet-tl-handle { color: var(--text-muted); font-size: 10.5px; margin-left: 5px; }
    .tweet-tl-label { font-size: 10px; margin-left: 5px; }
    .tweet-tl-imp {
      font-size: 10px; color: var(--text-muted);
      font-family: var(--font-mono, ui-monospace); flex-shrink: 0;
    }
    .tweet-timeline-footer {
      margin-top: 10px; padding-top: 9px;
      border-top: 1px solid var(--border-subtle);
      font-size: 10px; color: var(--text-muted);
    }

    /* === Two-column layout === */
    .detail-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 1.5rem;
      align-items: start;
      animation: fadeSlideUp 0.5s ease 0.3s both;
    }
    .detail-main { min-width: 0; }
    .detail-sidebar { min-width: 0; position: sticky; top: 1.5rem; }

    /* === Narrative Summary (inside hero) === */
    .narrative-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 0.875rem;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .narrative-title svg { flex-shrink: 0; }
    .narrative-title .ai-tag {
      font-family: var(--font-ui);
      font-size: 0.5625rem;
      font-weight: 700;
      color: var(--sol-purple);
      background: rgba(153,69,255,0.1);
      padding: 0.15em 0.5em;
      border-radius: 4px;
      border: 1px solid rgba(153,69,255,0.15);
      text-transform: none;
      letter-spacing: 0.05em;
    }
    .narrative-text {
      font-size: 0.875rem;
      line-height: 1.7;
      color: var(--text-secondary);
    }
    .narrative-articles {
      margin-top: 0.875rem;
      padding-top: 0.875rem;
      border-top: 1px solid var(--border-subtle);
    }
    .narrative-article {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding: 0.625rem 0.5rem;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      border-radius: 8px;
      transition: background 0.2s;
    }
    .narrative-article:hover { background: rgba(153,69,255,0.03); }
    .narrative-article .signal-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 5px;
    }
    .signal-dot.long { background: var(--positive); box-shadow: 0 0 6px rgba(20,241,149,0.4); }
    .signal-dot.short { background: var(--negative); box-shadow: 0 0 6px rgba(255,77,106,0.4); }
    .signal-dot.neutral { background: var(--text-muted); }
    .narrative-article a {
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.2s;
    }
    .narrative-article a:hover { color: var(--sol-blue); }
    .narrative-article .source-tag {
      font-size: 0.6875rem;
      color: var(--text-muted);
      background: rgba(153,69,255,0.06);
      padding: 0.1em 0.4em;
      border-radius: 4px;
      flex-shrink: 0;
      margin-left: auto;
      white-space: nowrap;
    }
    .narrative-loading, .narrative-empty {
      color: var(--text-muted);
      font-size: 0.8125rem;
      padding: 0.5rem 0;
    }
    .narrative-loading::after {
      content: '';
      display: inline-block;
      width: 12px; height: 12px;
      border: 2px solid var(--border-subtle);
      border-top-color: var(--sol-purple);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-left: 0.4rem;
      vertical-align: middle;
    }

    /* === Twitter Narrative Grade === */
    .narrative-grade-section {
      margin-bottom: 1rem;
      padding-bottom: 0.875rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .narrative-grade-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .narrative-grade-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px; height: 36px;
      border-radius: 10px;
      font-family: 'Orbitron', sans-serif;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .grade-S { background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.15)); color: #ffd700; border: 1px solid rgba(255,215,0,0.3); box-shadow: 0 0 12px rgba(255,215,0,0.15); }
    .grade-A { background: linear-gradient(135deg, rgba(20,241,149,0.15), rgba(0,209,255,0.1)); color: #14f195; border: 1px solid rgba(20,241,149,0.25); box-shadow: 0 0 10px rgba(20,241,149,0.12); }
    .grade-B { background: linear-gradient(135deg, rgba(153,69,255,0.15), rgba(0,209,255,0.1)); color: #b08cff; border: 1px solid rgba(153,69,255,0.2); }
    .grade-C { background: rgba(255,77,106,0.1); color: #ff4d6a; border: 1px solid rgba(255,77,106,0.2); }
    .narrative-grade-info {
      flex: 1;
    }
    .narrative-grade-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .narrative-grade-rec {
      font-size: 0.6875rem;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .narrative-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 0.5rem;
    }
    .narrative-metric {
      background: rgba(153,69,255,0.04);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 0.5rem 0.625rem;
      text-align: center;
    }
    .narrative-metric-value {
      font-family: var(--font-ui);
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .narrative-metric-label {
      font-size: 0.625rem;
      color: var(--text-muted);
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .narrative-kol-list {
      margin-top: 0.625rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    .narrative-kol-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: rgba(0,209,255,0.06);
      border: 1px solid rgba(0,209,255,0.12);
      border-radius: 6px;
      padding: 0.2em 0.5em;
      font-size: 0.6875rem;
      color: var(--text-secondary);
    }
    .narrative-kol-tag .verified-check {
      color: var(--sol-blue);
      font-size: 0.625rem;
    }
    .driver-tag {
      display: inline-block;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.15em 0.45em;
      border-radius: 4px;
      margin-left: 0.5rem;
    }
    .driver-organic { background: rgba(20,241,149,0.12); color: #14f195; }
    .driver-mixed { background: rgba(153,69,255,0.12); color: #b08cff; }
    .driver-paid { background: rgba(255,77,106,0.1); color: #ff4d6a; }
    .narrative-source-tag {
      display: inline-block;
      font-size: 0.5625rem;
      padding: 0.1em 0.4em;
      border-radius: 3px;
      margin-left: 0.5rem;
      background: rgba(0,209,255,0.08);
      color: var(--sol-blue);
    }

    /* === Hot Tweets Sidebar === */
    .tweets-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      overflow: hidden;
      position: relative;
      padding: 1.25rem;
    }
    .tweets-card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(0,209,255,0.3), rgba(153,69,255,0.2), transparent);
    }
    .tweets-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 1rem;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .tweets-title svg { flex-shrink: 0; }
    .tweets-title .update-tag {
      font-family: var(--font-ui);
      font-size: 0.625rem;
      font-weight: 600;
      color: var(--sol-blue);
      background: rgba(0,209,255,0.08);
      padding: 0.15em 0.5em;
      border-radius: 4px;
      border: 1px solid rgba(0,209,255,0.12);
      margin-left: auto;
      text-transform: none;
      letter-spacing: normal;
    }
    .tweet-item {
      padding: 0.875rem 0.5rem;
      border-bottom: 1px solid rgba(153,69,255,0.06);
      transition: all 0.2s ease;
      border-radius: 10px;
      margin: 0 -0.5rem;
    }
    .tweet-item:last-child { border-bottom: none; }
    .tweet-item:hover {
      background: rgba(153,69,255,0.04);
    }
    .tweet-user {
      display: flex; align-items: center; gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .tweet-avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      border: 1px solid var(--border-subtle);
      background: rgba(15,12,30,0.5);
      object-fit: cover;
      flex-shrink: 0;
    }
    .tweet-avatar-placeholder {
      width: 32px; height: 32px;
      border-radius: 50%;
      border: 1px solid var(--border-subtle);
      background: linear-gradient(135deg, rgba(0,209,255,0.15), rgba(153,69,255,0.1));
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700;
      color: var(--sol-blue);
      flex-shrink: 0;
    }
    .tweet-user-info { min-width: 0; }
    .tweet-user-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex; align-items: center; gap: 0.3rem;
    }
    .tweet-user-name .verified {
      color: var(--sol-blue);
      font-size: 0.75rem;
    }
    .tweet-user-handle {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }
    .tweet-text {
      font-size: 0.8125rem;
      line-height: 1.55;
      color: var(--text-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }
    .tweet-media {
      margin-top: 0.5rem;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
    }
    .tweet-media img {
      width: 100%;
      height: auto;
      max-height: 180px;
      object-fit: cover;
      display: block;
    }
    .tweet-stats {
      display: flex; gap: 1rem;
      margin-top: 0.5rem;
      font-size: 0.6875rem;
      color: var(--text-muted);
    }
    .tweet-stats span {
      display: flex; align-items: center; gap: 0.25rem;
      cursor: default;
      transition: color 0.2s;
    }
    .tweet-stats .likes:hover { color: var(--negative); }
    .tweet-stats .retweets:hover { color: var(--positive); }
    .tweet-stats .replies:hover { color: var(--sol-blue); }
    .tweets-loading, .tweets-empty {
      color: var(--text-muted);
      font-size: 0.8125rem;
      text-align: center;
      padding: 2rem 0;
    }
    .tweets-loading::after {
      content: '';
      display: inline-block;
      width: 14px; height: 14px;
      border: 2px solid var(--border-subtle);
      border-top-color: var(--sol-blue);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-left: 0.4rem;
      vertical-align: middle;
    }

    /* === Loading State === */
    .page-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 60vh;
      color: var(--text-muted);
      font-size: 1rem;
      gap: 1rem;
    }
    .page-loading-spinner {
      width: 36px; height: 36px;
      border: 3px solid var(--border-subtle);
      border-top-color: var(--sol-purple);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .page-error {
      text-align: center;
      padding: 4rem 1rem;
      color: var(--negative);
      font-size: 1rem;
    }

    /* === Footer === */
    .page-footer {
      text-align: center;
      padding: 2.5rem 0 0;
      color: var(--text-muted);
      font-size: 0.6875rem;
      letter-spacing: 0.05em;
      opacity: 0.6;
    }
    .page-footer a { color: var(--sol-purple); text-decoration: none; }
    .page-footer a:hover { text-decoration: underline; }

    /* === Mobile === */
    @media (max-width: 1024px) {
      .detail-layout {
        grid-template-columns: 1fr;
      }
      .detail-sidebar {
        order: 10;
        position: static;
      }
    }
    @media (max-width: 768px) {
      .page-wrapper { padding: 1rem 0.75rem 2rem; }
      .page-header { flex-direction: column; align-items: flex-start; }
      .token-hero { padding: 1.25rem; border-radius: 16px; }
      .token-hero-layout { flex-direction: column; gap: 1rem; }
      .token-hero-right { flex: none; }
      .token-hero-top { gap: 0.75rem; }
      .token-logo, .token-logo-placeholder { width: 48px; height: 48px; border-radius: 12px; font-size: 1.1rem; }
      .token-price { font-size: 1.25rem; }
      .action-bar { flex-direction: column; }
      .action-bar-contract { border-right: none; border-bottom: 1px solid var(--border-subtle); }
      .action-bar-links { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .ext-link { border-left: none !important; border-top: none; padding: 0.625rem 0.875rem; font-size: 0.75rem; }
      .ext-link + .ext-link { border-left: 1px solid var(--border-subtle) !important; }
      #kline-chart { height: 340px; }
      .chart-loading, .chart-error { height: 340px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
      .stat-card { padding: 0.75rem 0.875rem; }
      .stat-value { font-size: 1rem; }
      .stat-icon { width: 26px; height: 26px; border-radius: 4px; }
      .stat-icon svg { width: 14px; height: 14px; }
      .bottom-row { grid-template-columns: 1fr; }
      .hero-narrative { padding: 0.75rem; }
    }
    @media (max-width: 900px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: 1fr 1fr; }
      .token-name-row { gap: 0.4rem; }
      .chain-badge { font-size: 0.625rem; }
    }
    @media (max-width: 400px) {
      .stats-grid { grid-template-columns: 1fr; }
    }

    /* ── KB 专属详情结构 ── */
    #kb-section { grid-column: 1 / -1; }
    .kb-head {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .kb-head-item {
      background: rgba(153,69,255,0.04);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 0.625rem 0.75rem;
    }
    .kb-head-label {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }
    .kb-head-value { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }
    .kb-head-value.green { color: var(--positive); }
    .kb-head-value.red { color: var(--negative); }
    .kb-narrative-block {
      background: linear-gradient(135deg, rgba(153,69,255,0.08), rgba(20,241,149,0.03));
      border: 1px solid rgba(153,69,255,0.22);
      border-radius: 14px;
      padding: 1.125rem 1.25rem;
      margin-bottom: 1rem;
    }
    .kb-narrative-head {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--sol-purple);
      display: flex; align-items: center; gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .kb-narrative-head svg { width: 16px; height: 16px; flex-shrink: 0; }
    .kb-verified-tag {
      font-family: var(--font-ui);
      font-size: 0.5625rem;
      font-weight: 700;
      color: var(--sol-purple);
      background: rgba(153,69,255,0.15);
      padding: 0.15em 0.5em;
      border-radius: 4px;
      text-transform: none;
      letter-spacing: 0.04em;
    }
    .kb-narrative-text {
      font-size: 1.0625rem;
      line-height: 1.75;
      color: var(--text-primary);
      font-weight: 500;
    }
    .kb-narrative-catalyst {
      margin-top: 0.75rem;
      font-size: 0.9rem;
      line-height: 1.6;
      color: var(--text-secondary);
    }
    .kb-narrative-catalyst-label {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--positive);
      background: rgba(20,241,149,0.1);
      padding: 0.1em 0.5em;
      border-radius: 4px;
      margin-right: 0.5rem;
    }
    .kb-narrative-pending {
      font-size: 0.9rem;
      color: var(--text-muted);
      font-style: italic;
    }
    .kb-tweet-list {
      margin-top: 0.875rem;
      padding-top: 0.875rem;
      border-top: 1px solid var(--border-subtle);
      display: flex; flex-direction: column; gap: 0.25rem;
    }
    .kb-tweet-item {
      display: flex; align-items: flex-start; gap: 0.5rem;
      padding: 0.5rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      transition: background 0.2s;
    }
    .kb-tweet-item:hover { background: rgba(153,69,255,0.05); }
    .kb-tweet-item a, .kb-tweet-item > div { flex: 1; min-width: 0; text-decoration: none; }
    .kb-tweet-handle {
      color: var(--sol-blue);
      font-weight: 600;
      margin-right: 0.4rem;
    }
    .kb-tweet-text { color: var(--text-secondary); }
    .kb-tweet-item a:hover .kb-tweet-text { color: var(--text-primary); }
    .kb-tweet-eng {
      font-size: 0.6875rem;
      color: var(--text-muted);
      background: rgba(153,69,255,0.06);
      padding: 0.1em 0.4em;
      border-radius: 4px;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .kb-block { margin-bottom: 0.875rem; }
    .kb-block-foot { margin-bottom: 0; }
    .kb-block-title {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 0.375rem;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    @media (max-width: 768px) {
      .kb-narrative-text { font-size: 0.95rem; }
      .kb-head { gap: 0.5rem; }
      .kb-head-value { font-size: 0.9rem; }
    }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(153,69,255,0.2); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(153,69,255,0.35); }
  </style>
</head>
<body>
  <div class="bg-layer bg-stars"></div>
  <div class="bg-layer bg-nebula"></div>
  <div class="bg-layer bg-grid"></div>
  <div class="bg-layer bg-scanlines"></div>

  <div class="page-wrapper">
    <div class="page-header">
      <a href="/ranking" class="back-btn"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>返回榜单</a>
    </div>

    <div id="detail-content">
      <div class="page-loading"><div class="page-loading-spinner"></div>加载中</div>
    </div>

    <div class="page-footer">Powered by <a href="/ranking">Zhizhi Labs</a></div>
  </div>

  <script>
    var tokenAddress = location.pathname.replace(/^\\/token\\//, '');
    if (!tokenAddress) {
      document.getElementById('detail-content').innerHTML = '<div class="page-error">无效的代币地址</div>';
    }

    function esc(s) {
      if (s == null || s === '') return '';
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function formatPrice(n) {
      if (n == null || isNaN(n)) return '—';
      var num = Number(n);
      if (num === 0) return '$0';
      if (num < 0.000001) return '$' + num.toExponential(4);
      if (num < 0.01) return '$' + num.toFixed(8);
      if (num < 1) return '$' + num.toFixed(6);
      if (num < 1000) return '$' + num.toFixed(4);
      return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function formatCompact(n) {
      if (n == null || isNaN(n)) return '—';
      var num = Number(n);
      if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
      if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
      if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
      return '$' + num.toFixed(0);
    }
    function formatNumber(n) {
      if (n == null || isNaN(n)) return '—';
      return Number(n).toLocaleString();
    }

    function renderDetail(token) {
      var change = token.price_change_24h != null ? parseFloat(token.price_change_24h) : null;
      var changeCl = change != null ? (change >= 0 ? 'positive' : 'negative') : '';
      var changeStr = change != null ? (change >= 0 ? '+' : '') + change.toFixed(2) + '%' : '';
      var nameStr = token.name || token.symbol || '—';
      var symbolStr = token.symbol || '';

      var logoHtml = token.logo_url
        ? '<img class="token-logo" src="' + esc(token.logo_url) + '" alt="" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'flex\\'"><div class="token-logo-placeholder" style="display:none">' + esc(symbolStr.charAt(0) || '?') + '</div>'
        : '<div class="token-logo-placeholder">' + esc(symbolStr.charAt(0) || '?') + '</div>';

      var changeArrow = change != null
        ? (change >= 0
          ? '<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>'
          : '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>')
        : '';

      var html = '';

      // Hero card with narrative on the right
      html += '<div class="token-hero">';
      html += '<div class="token-hero-layout">';
      html += '<div class="token-hero-left">';
      html += '<div class="token-hero-top">';
      html += '<div class="token-logo-wrap">' + logoHtml + '</div>';
      html += '<div class="token-info">';
      var chainName = (token.chain === 'bsc') ? 'BSC' : 'Solana';
      html += '<div class="token-name-row">';
      html += '<h1>' + esc(nameStr) + '</h1>';
      if (symbolStr) html += '<span class="symbol-badge">' + esc(symbolStr) + '</span>';
      html += '<span class="chain-badge">' + esc(chainName) + '</span>';
      html += '</div>';
      html += '<div class="token-price-row">';
      html += '<span class="token-price">' + formatPrice(token.current_price_usd) + '</span>';
      if (changeStr) html += '<span class="token-change ' + changeCl + '">' + changeArrow + changeStr + '</span>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>'; // end token-hero-left
      html += '<div class="token-hero-right">';
      html += '<div class="hero-narrative" id="narrative-section">';
      html += '<div class="narrative-title"><svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="8" rx="0.5"/><rect x="10" y="8" width="4" height="12" rx="0.5"/><rect x="17" y="4" width="4" height="16" rx="0.5"/></svg>叙事分析<span class="ai-tag">AI</span></div>';
      html += '<div id="narrative-content"><div class="narrative-loading">分析中</div></div>';
      html += '</div>';
      html += '</div>'; // end token-hero-right
      html += '</div>'; // end token-hero-layout
      html += '</div>';

      // Action bar (contract + links)
      html += '<div class="action-bar">';
      html += '<div class="action-bar-contract">';
      html += '<span class="contract-label">CA</span>';
      html += '<span class="contract-addr" id="ca-text">' + esc(token.token) + '</span>';
      html += '<button class="copy-btn" id="copy-ca-btn"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>复制</button>';
      html += '</div>';
      var dsChain = (token.chain === 'bsc') ? 'bsc' : 'solana';
      var gtChain = (token.chain === 'bsc') ? 'bsc' : 'solana';
      var explorerBase = (token.chain === 'bsc') ? 'https://bscscan.com/token/' : 'https://solscan.io/token/';
      var explorerLabel = (token.chain === 'bsc') ? 'BscScan' : 'Solscan';
      html += '<div class="action-bar-links">';
      html += '<a class="ext-link" href="https://dexscreener.com/' + dsChain + '/' + esc(token.token) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 17l4-8 4 4 6-8"/></svg>DexScreener<span class="ext-arrow">↗</span></a>';
      html += '<a class="ext-link" href="https://www.geckoterminal.com/' + gtChain + '/tokens/' + esc(token.token) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Gecko<span class="ext-arrow">↗</span></a>';
      html += '<a class="ext-link" href="' + explorerBase + esc(token.token) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' + esc(explorerLabel) + '<span class="ext-arrow">↗</span></a>';
      html += '</div>';
      html += '</div>';

      // Stats grid
      var svgMc = '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';
      var svgVol = '<svg viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="8" rx="0.5"/><rect x="10" y="8" width="4" height="12" rx="0.5"/><rect x="17" y="4" width="4" height="16" rx="0.5"/></svg>';
      var svgUp = '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>';
      var svgDown = '<svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>';
      var svgHolders = '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
      var svgLiq = '<svg viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>';
      var svgRocket = '<svg viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>';

      var volRatio = (token.market_cap && token.tx_volume_u_24h) ? (token.tx_volume_u_24h / token.market_cap).toFixed(2) + '×' : '';
      var chgTag = change != null ? (Math.abs(change) >= 10 ? (change >= 0 ? '▲ 强势' : '▼ 弱势') : '') : '';
      var liqRatio = (token._liquidity_usd && token.market_cap) ? ((token._liquidity_usd / token.market_cap) * 100).toFixed(1) + '%' : '';

      html += '<div class="stats-grid">';
      html += '<div class="stat-card card-mc"><div class="stat-header"><span class="stat-label">市值</span><div class="stat-icon">' + svgMc + '</div></div><div class="stat-value">' + formatCompact(token.market_cap) + '</div><div class="stat-footer"><span class="stat-sub"><span class="live-dot-sm"></span>MARKET CAP</span></div></div>';
      html += '<div class="stat-card card-vol"><div class="stat-header"><span class="stat-label">24H 交易量</span><div class="stat-icon">' + svgVol + '</div></div><div class="stat-value">' + formatCompact(token.tx_volume_u_24h) + '</div><div class="stat-footer"><span class="stat-sub">VOLUME</span>' + (volRatio ? '<span class="stat-tag tag-blue">' + volRatio + '</span>' : '') + '</div></div>';
      html += '<div class="stat-card ' + (change >= 0 ? 'card-chg' : 'card-chg-down') + '"><div class="stat-header"><span class="stat-label">24H 涨跌</span><div class="stat-icon">' + (change >= 0 ? svgUp : svgDown) + '</div></div><div class="stat-value ' + changeCl + '">' + (changeStr || '—') + '</div><div class="stat-footer"><span class="stat-sub">CHANGE</span>' + (chgTag ? '<span class="stat-tag ' + (change >= 0 ? 'tag-green' : 'tag-red') + '">' + chgTag + '</span>' : '') + '</div></div>';
      html += '<div class="stat-card card-hold"><div class="stat-header"><span class="stat-label">持币地址</span><div class="stat-icon">' + svgHolders + '</div></div><div class="stat-value">' + formatNumber(token.holders) + '</div><div class="stat-footer"><span class="stat-sub">HOLDERS</span></div></div>';
      if (token._liquidity_usd != null) {
        html += '<div class="stat-card card-liq"><div class="stat-header"><span class="stat-label">流动性</span><div class="stat-icon">' + svgLiq + '</div></div><div class="stat-value">' + formatCompact(token._liquidity_usd) + '</div><div class="stat-footer"><span class="stat-sub">LIQUIDITY</span>' + (liqRatio ? '<span class="stat-tag tag-purple">' + liqRatio + '</span>' : '') + '</div></div>';
      }
      if (token.launch_at) {
        var launchDate = new Date(token.launch_at * 1000);
        var launchStr = launchDate.getFullYear() + '-' + String(launchDate.getMonth()+1).padStart(2,'0') + '-' + String(launchDate.getDate()).padStart(2,'0');
        var ageDays = Math.floor((Date.now() - launchDate.getTime()) / 86400000);
        var ageLabel = ageDays <= 0 ? 'TODAY' : 'LAUNCHED ' + ageDays + 'D AGO';
        html += '<div class="stat-card card-time"><div class="stat-header"><span class="stat-label">上线时间</span><div class="stat-icon">' + svgRocket + '</div></div><div class="stat-value" style="font-size:1rem">' + launchStr + '</div><div class="stat-footer"><span class="stat-sub">' + ageLabel + '</span></div></div>';
      }
      html += '</div>';

      // Bottom row: Trading Data + Token Info
      var svgTrade = '<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
      var svgInfo = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

      var txns = token._txns_h24 || {};
      var buys24 = txns.buys || 0;
      var sells24 = txns.sells || 0;
      var totalTxns = buys24 + sells24;
      var buyRatio = totalTxns > 0 ? ((buys24 / totalTxns) * 100).toFixed(0) : 50;
      var bsRatio = sells24 > 0 ? (buys24 / sells24).toFixed(2) : (buys24 > 0 ? '∞' : '0');

      var sec = token._security || {};
      var buyTaxStr = sec.buyTax != null ? sec.buyTax + '%' : '—';
      var sellTaxStr = sec.sellTax != null ? sec.sellTax + '%' : '—';
      var lpLocked = sec.lpNotLocked === false;
      var lpUnlocked = sec.lpNotLocked === true;
      var lpPct = lpLocked ? 100 : (lpUnlocked ? 0 : 50);

      html += '<div class="bottom-row">';

      // Trading Data Panel
      html += '<div class="info-panel">';
      html += '<div class="info-panel-title">' + svgTrade + '交易数据</div>';
      html += '<div class="info-row"><span class="info-row-label">买入次数 (24H)</span><span class="info-row-value green">' + formatNumber(buys24) + '</span></div>';
      html += '<div class="info-row"><span class="info-row-label">卖出次数 (24H)</span><span class="info-row-value red">' + formatNumber(sells24) + '</span></div>';
      html += '<div class="info-row"><span class="info-row-label">买卖比</span><span class="info-row-value ' + (buys24 >= sells24 ? 'green' : 'red') + '">' + bsRatio + ' : 1</span></div>';
      html += '<div class="info-row"><span class="info-row-label">买入压力</span><span class="info-row-value"><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + buyRatio + '%; background:linear-gradient(90deg, var(--positive), rgba(20,241,149,0.4));"></div></div></span></div>';
      html += '<div class="info-row"><span class="info-row-label">24H 总交易</span><span class="info-row-value">' + formatNumber(totalTxns) + '</span></div>';
      html += '</div>';

      // Token Info Panel
      html += '<div class="info-panel">';
      html += '<div class="info-panel-title">' + svgInfo + '代币信息</div>';
      if (sec.buyTax != null || sec.sellTax != null) {
        html += '<div class="info-row"><span class="info-row-label">税率 (买/卖)</span><span class="info-row-value ' + (sec.buyTax == 0 && sec.sellTax == 0 ? 'green' : 'red') + '">' + buyTaxStr + ' / ' + sellTaxStr + '</span></div>';
      }
      if (sec.isHoneypot != null) {
        html += '<div class="info-row"><span class="info-row-label">蜜罐检测</span><span class="info-row-value ' + (sec.isHoneypot ? 'red' : 'green') + '">' + (sec.isHoneypot ? '⚠ 风险' : '✓ 安全') + '</span></div>';
      }
      if (sec.isMintable != null) {
        html += '<div class="info-row"><span class="info-row-label">可增发</span><span class="info-row-value ' + (sec.isMintable ? 'red' : 'green') + '">' + (sec.isMintable ? '是' : '否') + '</span></div>';
      }
      if (sec.isFreezable != null) {
        html += '<div class="info-row"><span class="info-row-label">可冻结</span><span class="info-row-value ' + (sec.isFreezable ? 'red' : 'green') + '">' + (sec.isFreezable ? '是' : '否') + '</span></div>';
      }
      if (sec.lpNotLocked != null) {
        html += '<div class="info-row"><span class="info-row-label">LP 锁定</span><span class="info-row-value"><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + lpPct + '%; background:linear-gradient(90deg, var(--sol-purple), rgba(153,69,255,0.4));"></div></div></span></div>';
      }
      if (sec.topHolderPercent != null) {
        html += '<div class="info-row"><span class="info-row-label">Top10 持仓</span><span class="info-row-value">' + Number(sec.topHolderPercent).toFixed(1) + '%</span></div>';
      }
      if (sec.riskLevel && sec.riskLevel !== 'UNKNOWN') {
        var rlClass = sec.riskLevel === 'LOW' ? 'green' : (sec.riskLevel === 'MEDIUM' ? '' : 'red');
        html += '<div class="info-row"><span class="info-row-label">风险等级</span><span class="info-row-value ' + rlClass + '">' + esc(sec.riskLevel) + '</span></div>';
      }
      html += '</div>';

      // KB 分析卡片(默认隐藏,loadKBSignals 有信号才显示)
      html += '<div class="info-panel" id="kb-section" style="display:none">';
      html += '<div class="info-panel-title"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> 知智 KB 信号</div>';
      html += '<div id="kb-content"></div>';
      html += '</div>';

      html += '</div>';

      // Two-column layout
      html += '<div class="detail-layout">';

      // Left column: chart + narrative
      html += '<div class="detail-main">';

      // K-line chart — DexScreener TradingView embed
      var dsChartChain = (token.chain === 'bsc') ? 'bsc' : 'solana';
      html += '<div class="chart-card">';
      html += '<div class="chart-header">';
      html += '<div class="chart-title"><span class="live-dot"></span>K线图表</div>';
      html += '</div>';
      html += '<div class="chart-body">';
      if (token.main_pair) {
        html += '<div id="kline-chart"><iframe src="https://dexscreener.com/' + esc(dsChartChain) + '/' + esc(token.main_pair) + '?embed=1&theme=dark&info=0&trades=0" allowfullscreen></iframe></div>';
      } else {
        html += '<div id="kline-chart"><div class="chart-error">暂无交易对数据,无法加载图表</div></div>';
      }
      html += '</div>';
      html += '</div>';
      html += '<div id="tweet-timeline-section"></div>';

      html += '</div>'; // end detail-main

      // Right column: hot tweets sidebar
      html += '<div class="detail-sidebar">';
      html += '<div class="tweets-card" id="tweets-section">';
      html += '<div class="tweets-title"><svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>热门推特<span class="update-tag">每日更新</span></div>';
      html += '<div id="tweets-content"><div class="tweets-loading">加载中</div></div>';
      html += '</div>';
      html += '</div>'; // end detail-sidebar

      html += '</div>'; // end detail-layout

      document.getElementById('detail-content').innerHTML = html;

      // Copy CA button
      var copyBtn = document.getElementById('copy-ca-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(token.token).then(function() {
            copyBtn.textContent = '已复制'; copyBtn.classList.add('copied');
            setTimeout(function() { copyBtn.textContent = '复制'; copyBtn.classList.remove('copied'); }, 1500);
          }).catch(function() {
            var ta = document.createElement('textarea'); ta.value = token.token;
            ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch(ex) {}
            document.body.removeChild(ta);
            copyBtn.textContent = '已复制'; copyBtn.classList.add('copied');
            setTimeout(function() { copyBtn.textContent = '复制'; copyBtn.classList.remove('copied'); }, 1500);
          });
        });
      }

      loadNarrative(token);
      loadTweets(token);
      loadKBSignals(token.token);
      loadTweetTimeline(token);
    }

    function fmtTimeAgoTl(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      var h = Math.max(0, Math.round((Date.now() - d.getTime()) / 3600000));
      if (h < 1) return '刚刚';
      if (h < 24) return h + ' 小时前';
      return Math.round(h / 24) + ' 天前';
    }

    function fmtNumTl(n) {
      if (n == null) return '0';
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(n);
    }

    function initialTl(handle) {
      return (String(handle || '?').replace(/^@/, '') || '?').slice(0, 1).toUpperCase();
    }

    function loadTweetTimeline(token) {
      fetch('/api/kb-signals/' + encodeURIComponent(token.token))
        .then(function(r) { return r.json(); })
        .then(function(sig) {
          var el = document.getElementById('tweet-timeline-section');
          if (!el) return;
          if (!sig) return;
          var nt = sig.narrative_twitter;
          if (!nt || nt.status !== 'generated') return;

          var symbolStr = esc(token.symbol || sig.symbol || '');
          var nameStr = esc(token.name || sig.name || '');
          var convStr = esc(sig.conviction_rating || '');
          var mcStr = formatCompact(sig.market_cap || token.market_cap);

          var SENT = {
            bullish: { label: '看涨', color: 'var(--positive)' },
            bearish: { label: '转空', color: 'var(--negative)' },
            neutral: { label: '中性', color: 'var(--text-muted)' }
          };

          var h = '<div class="tweet-timeline-card">';

          // Section heading (chart-title style)
          h += '<div class="chart-title" style="margin-bottom:12px"><svg style="width:14px;height:14px;flex-shrink:0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>推特叙事 · CALL 时间线</div>';

          // Header: symbol + name + conviction + mc
          h += '<div class="tweet-timeline-header">';
          h += '<div class="tweet-timeline-header-left">';
          if (symbolStr) h += '<span class="tweet-timeline-symbol">$' + symbolStr + '</span>';
          if (nameStr && symbolStr !== nameStr) h += '<span class="tweet-timeline-name">' + nameStr + '</span>';
          if (convStr) h += '<span class="tweet-timeline-conviction">' + convStr + '</span>';
          h += '</div>';
          h += '<span class="tweet-timeline-mc">' + mcStr + '</span>';
          h += '</div>';

          // 主推 KOL
          var ms = nt.main_shill;
          if (ms && ms.tweet_id) {
            var msHandle = String(ms.handle || '').replace(/^@/, '');
            var tweetUrl = 'https://x.com/' + encodeURIComponent(msHandle) + '/status/' + encodeURIComponent(ms.tweet_id);
            h += '<a class="tweet-timeline-main-shill" href="' + esc(tweetUrl) + '" target="_blank" rel="noopener noreferrer">';
            h += '<div class="tweet-timeline-main-shill-row">';
            h += '<span class="tweet-timeline-avatar">' + esc(initialTl(ms.handle)) + '</span>';
            h += '<div class="tweet-timeline-shill-info">';
            h += '<div class="tweet-timeline-shill-name"><b>' + esc(ms.name || ms.handle) + '</b>';
            if (ms.verified) h += ' <span style="color:#3B82F6;font-size:10px">✓</span>';
            h += '<span class="tweet-timeline-main-badge">主推</span>';
            h += '</div>';
            h += '<div class="tweet-timeline-shill-sub">@' + esc(msHandle) + ' · ' + fmtNumTl(ms.followers) + ' 粉</div>';
            h += '</div>';
            h += '</div>';
            if (ms.text) h += '<div class="tweet-timeline-quote">&ldquo;' + esc(ms.text) + '&rdquo;</div>';
            h += '</a>';
          } else {
            h += '<div style="font-size:11.5px;color:var(--text-muted);margin-bottom:10px">无单一主推 KOL,caller 群驱动</div>';
          }

          // Call timeline
          var timeline = nt.timeline || [];
          var mentionCount = nt.mention_count != null ? nt.mention_count : timeline.length;
          h += '<div class="tweet-timeline-list-label">call 时间线 · ' + mentionCount + ' 条提及 · 点跳原推</div>';
          h += '<ol class="tweet-timeline-list">';
          timeline.forEach(function(t) {
            var sent = SENT[t.sentiment || 'neutral'] || SENT.neutral;
            var tHandle = String(t.handle || '').replace(/^@/, '');
            var tUrl = 'https://x.com/' + encodeURIComponent(tHandle) + '/status/' + encodeURIComponent(t.tweet_id);
            var nameColor = t.is_main_shill ? 'var(--accent)' : 'var(--text-primary)';
            h += '<li>';
            h += '<a href="' + esc(tUrl) + '" target="_blank" rel="noopener noreferrer">';
            h += '<span class="tweet-tl-dot" style="background:' + sent.color + '"></span>';
            h += '<span class="tweet-tl-text">';
            h += '<b class="tweet-tl-name" style="color:' + nameColor + '">' + esc(t.name || t.handle) + '</b>';
            if (t.verified) h += '<span style="color:#3B82F6;font-size:10px;margin-left:2px">✓</span>';
            h += '<span class="tweet-tl-handle">@' + esc(tHandle) + '</span>';
            if (t.is_first_call) h += '<span class="tweet-tl-label" style="color:var(--text-muted)">· 首 call</span>';
            h += '<span class="tweet-tl-label" style="color:' + sent.color + '">· ' + sent.label + '</span>';
            h += '</span>';
            h += '<span class="tweet-tl-imp">👁 ' + fmtNumTl(t.impressions) + '</span>';
            h += '</a>';
            h += '</li>';
          });
          h += '</ol>';

          // Footer
          h += '<div class="tweet-timeline-footer">推特数据更新于 ' + fmtTimeAgoTl(nt.fetched_at) + ' · 聚合自公开信息,非投资建议</div>';
          h += '</div>';

          el.innerHTML = h;
        })
        .catch(function() {});
    }

    function fmtCompact(n) {
      if (n == null) return '—';
      if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(n);
    }

    function renderTwitterNarrative(tn) {
      if (!tn || !tn.narrativeGrade) return '';
      var grade = tn.narrativeGrade;
      var gradeLabels = { S: '现象级叙事', A: '强叙事', B: '普通叙事', C: '弱叙事/风险' };
      var driverClass = { organic: 'driver-organic', mixed: 'driver-mixed', paid: 'driver-paid', unknown: 'driver-mixed' };
      var sourceLabels = { onchain: '链上分析', twitter: '推特分析', combined: '综合分析' };
      var html = '<div class="narrative-grade-section">';
      html += '<div class="narrative-grade-header">';
      html += '<div class="narrative-grade-badge grade-' + grade + '">' + grade + '</div>';
      html += '<div class="narrative-grade-info">';
      html += '<div class="narrative-grade-label">' + esc(gradeLabels[grade] || grade);
      if (tn.driverLabel) {
        html += '<span class="driver-tag ' + (driverClass[tn.driverType] || 'driver-mixed') + '">' + esc(tn.driverLabel) + '</span>';
      }
      if (tn.source) {
        html += '<span class="narrative-source-tag">' + esc(sourceLabels[tn.source] || tn.source) + '</span>';
      }
      html += '</div>';
      html += '<div class="narrative-grade-rec">' + esc(tn.recommendation || '') + '</div>';
      html += '</div></div>';

      // KOL 指标（推特数据可用时显示）
      if (tn.kolCount && tn.kolCount.total > 0) {
        html += '<div class="narrative-metrics">';
        html += '<div class="narrative-metric"><div class="narrative-metric-value">' + tn.kolCount.total + '</div><div class="narrative-metric-label">KOL 数量</div></div>';
        html += '<div class="narrative-metric"><div class="narrative-metric-value">' + tn.kolCount.tier1 + '</div><div class="narrative-metric-label">顶级 KOL</div></div>';
        var shillColor = (tn.shillRatio || 0) > 50 ? 'var(--negative)' : ((tn.shillRatio || 0) > 30 ? '#f0a030' : 'var(--positive)');
        html += '<div class="narrative-metric"><div class="narrative-metric-value" style="color:' + shillColor + '">' + (tn.shillRatio || 0) + '%</div><div class="narrative-metric-label">传销号占比</div></div>';
        html += '<div class="narrative-metric"><div class="narrative-metric-value">' + (tn.organicScore || 0) + '</div><div class="narrative-metric-label">有机度</div></div>';
        html += '</div>';
      }

      if (tn.topKols && tn.topKols.length > 0) {
        html += '<div class="narrative-kol-list">';
        tn.topKols.forEach(function(k) {
          html += '<span class="narrative-kol-tag">';
          html += '@' + esc(k.user);
          if (k.verified) html += ' <span class="verified-check">✓</span>';
          var f = k.followers || 0;
          var fStr = f >= 1000000 ? (f / 1000000).toFixed(1) + 'M' : (f >= 1000 ? (f / 1000).toFixed(1) + 'K' : f);
          html += ' <span style="color:var(--text-muted);font-size:0.6rem">' + fStr + '</span>';
          html += '</span>';
        });
        html += '</div>';
      }

      html += '</div>';
      return html;
    }

    function loadNarrative(token) {
      fetch('/api/token/' + encodeURIComponent(token.token) + '/narrative')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var el = document.getElementById('narrative-content');
          if (!el) return;
          if (window.__isKB) return;     // KB 币:6551 叙事整体抑制(KB 完善叙事取代,见 loadKBSignals)
          if (window.__kbNarr) return;   // KB 验证叙事已填,6551 跳过(KB 优先)
          var hasTwitter = data.twitterNarrative && data.twitterNarrative.narrativeGrade;
          var hasNews = data.summary || (data.articles && data.articles.length > 0);
          if (!hasTwitter && !hasNews) {
            el.innerHTML = '<div class="narrative-empty">暂无该代币的相关叙事分析</div>';
            return;
          }
          var html = '';
          if (hasTwitter) {
            html += renderTwitterNarrative(data.twitterNarrative);
          }
          if (data.summary) {
            html += '<div class="narrative-text">' + esc(data.summary) + '</div>';
          }
          if (data.articles && data.articles.length > 0) {
            html += '<div class="narrative-articles">';
            data.articles.forEach(function(a) {
              var sig = a.signal || 'neutral';
              var dotClass = sig === 'long' ? 'long' : (sig === 'short' ? 'short' : 'neutral');
              var textContent = a.text || '';
              if (textContent.length > 120) textContent = textContent.slice(0, 117) + '…';
              html += '<div class="narrative-article">';
              html += '<span class="signal-dot ' + dotClass + '"></span>';
              html += '<div style="flex:1;min-width:0">';
              if (a.link) {
                html += '<a href="' + esc(a.link) + '" target="_blank" rel="noopener">' + esc(textContent) + '</a>';
              } else {
                html += '<span>' + esc(textContent) + '</span>';
              }
              html += '</div>';
              if (a.source) {
                html += '<span class="source-tag">' + esc(a.source) + '</span>';
              }
              html += '</div>';
            });
            html += '</div>';
          }
          el.innerHTML = html;
        })
        .catch(function() {
          if (window.__isKB) return;
          var el = document.getElementById('narrative-content');
          if (el) el.innerHTML = '<div class="narrative-empty">暂无该代币的相关叙事分析</div>';
        });
    }

    function formatTimeAgo(dateStr) {
      if (!dateStr) return '';
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      var now = Date.now();
      var diffSec = Math.floor((now - d.getTime()) / 1000);
      if (diffSec < 60) return '刚刚';
      if (diffSec < 3600) return Math.floor(diffSec / 60) + '分钟前';
      if (diffSec < 86400) return Math.floor(diffSec / 3600) + '小时前';
      return Math.floor(diffSec / 86400) + '天前';
    }

    function formatCount(n) {
      if (n == null) return '0';
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(n);
    }

    function hideTweetsSidebar() {
      var sidebar = document.querySelector('.detail-sidebar');
      if (sidebar) sidebar.style.display = 'none';
      var layout = document.querySelector('.detail-layout');
      if (layout) layout.style.gridTemplateColumns = '1fr';
    }

    function loadTweets(token) {
      fetch('/api/token/' + encodeURIComponent(token.token) + '/tweets')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var el = document.getElementById('tweets-content');
          if (!el) return;
          if (!data.tweets || data.tweets.length === 0) {
            hideTweetsSidebar();
            return;
          }
          var html = '';
          data.tweets.forEach(function(t) {
            var avatarHtml = t.userAvatar
              ? '<img class="tweet-avatar" src="' + esc(t.userAvatar) + '" alt="" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'flex\\'">'
                + '<div class="tweet-avatar-placeholder" style="display:none">' + esc((t.userScreenName || '?').charAt(0).toUpperCase()) + '</div>'
              : '<div class="tweet-avatar-placeholder">' + esc((t.userScreenName || '?').charAt(0).toUpperCase()) + '</div>';
            html += '<div class="tweet-item">';
            html += '<div class="tweet-user">';
            html += avatarHtml;
            html += '<div class="tweet-user-info">';
            html += '<div class="tweet-user-name">' + esc(t.userName || t.userScreenName);
            if (t.userVerified) html += ' <span class="verified">✓</span>';
            html += '</div>';
            html += '<div class="tweet-user-handle">@' + esc(t.userScreenName) + ' · ' + formatTimeAgo(t.createdAt) + '</div>';
            html += '</div></div>';
            html += '<div class="tweet-text">' + esc(t.text) + '</div>';
            if (t.mediaUrls && t.mediaUrls.length > 0) {
              html += '<div class="tweet-media"><img src="' + esc(t.mediaUrls[0]) + '" alt="" loading="lazy" onerror="this.parentElement.style.display=\\'none\\'"></div>';
            }
            html += '<div class="tweet-stats">';
            html += '<span class="likes"><svg style="width:13px;height:13px;vertical-align:-2px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> ' + formatCount(t.likes) + '</span>';
            html += '<span class="retweets"><svg style="width:13px;height:13px;vertical-align:-2px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> ' + formatCount(t.retweets) + '</span>';
            html += '<span class="replies"><svg style="width:13px;height:13px;vertical-align:-2px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ' + formatCount(t.replies) + '</span>';
            html += '</div>';
            html += '</div>';
          });
          el.innerHTML = html;
        })
        .catch(function() {
          hideTweetsSidebar();
        });
    }

    function kbCardPill(text, color) {
      return '<span style="display:inline-flex;padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:600;border:1px solid ' + color + ';color:' + color + ';background:oklch(20% 0.02 270 / 0.5)">' + text + '</span>';
    }
    // cited_tweet defensive shape: handle = item.handle||item.author, text = item.quote||item.text
    function renderKBCitedTweets(tws) {
      if (!tws || !tws.length) return '';
      var h = '<div class="kb-tweet-list">';
      tws.forEach(function(t) {
        var handle = t.handle || t.author || '';
        var text = t.quote || t.text || '';
        var hClean = String(handle).replace(/^@/, '');
        var inner = '<span class="kb-tweet-handle">' + esc(handle) + '</span>'
          + '<span class="kb-tweet-text">' + esc(text) + '</span>';
        h += '<div class="kb-tweet-item">';
        if (t.tweet_id && hClean) {
          h += '<a href="https://x.com/' + encodeURIComponent(hClean) + '/status/' + encodeURIComponent(t.tweet_id) + '" target="_blank" rel="noopener">' + inner + '</a>';
        } else if (t.tweet_id) {
          h += '<a href="https://x.com/i/status/' + encodeURIComponent(t.tweet_id) + '" target="_blank" rel="noopener">' + inner + '</a>';
        } else {
          h += '<div>' + inner + '</div>';
        }
        if (t.engagement) h += '<span class="kb-tweet-eng">' + esc(t.engagement) + '</span>';
        h += '</div>';
      });
      h += '</div>';
      return h;
    }

    function loadKBSignals(ca) {
      if (!ca) return;
      fetch('/api/kb-signals/' + encodeURIComponent(ca))
        .then(function(r) { return r.json(); })
        .then(function(sig) {
          if (!sig) return;
          // 这是 KB 信号币 → 抑制 6551/hero 叙事(KB 完善叙事取代),改用 KB 专属详情结构
          window.__isKB = true;
          var heroNarr = document.getElementById('narrative-section');
          if (heroNarr) heroNarr.style.display = 'none';

          var sec = document.getElementById('kb-section');
          var content = document.getElementById('kb-content');
          if (!sec || !content) return;

          var html = '';

          // ① 头部:市值 / 价格 / 24h 涨跌
          var pc = sig.price_change_24h != null ? Number(sig.price_change_24h) : null;
          var pcCl = pc != null ? (pc >= 0 ? 'green' : 'red') : '';
          var pcStr = pc != null ? (pc >= 0 ? '+' : '') + pc.toFixed(2) + '%' : '—';
          html += '<div class="kb-head">';
          html += '<div class="kb-head-item"><div class="kb-head-label">市值</div><div class="kb-head-value">' + formatCompact(sig.market_cap) + '</div></div>';
          html += '<div class="kb-head-item"><div class="kb-head-label">价格</div><div class="kb-head-value">' + formatPrice(sig.price_usd) + '</div></div>';
          html += '<div class="kb-head-item"><div class="kb-head-label">24H</div><div class="kb-head-value ' + pcCl + '">' + pcStr + '</div></div>';
          html += '</div>';

          // ② 完善叙事(核心,醒目大字块)
          var narr = sig.narrative || {};
          html += '<div class="kb-narrative-block">';
          html += '<div class="kb-narrative-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>完善叙事<span class="kb-verified-tag">知智验证</span></div>';
          if (narr.status === 'pending') {
            html += '<div class="kb-narrative-pending">叙事生成中,稍后刷新</div>';
          } else if (narr.status === 'catalyst_unclear') {
            html += '<div class="kb-narrative-pending">催化剂暂不明</div>';
            if (narr.summary) html += '<div class="kb-narrative-text">' + esc(narr.summary) + '</div>';
          } else {
            if (narr.summary) html += '<div class="kb-narrative-text">' + esc(narr.summary) + '</div>';
            if (narr.catalyst) html += '<div class="kb-narrative-catalyst"><span class="kb-narrative-catalyst-label">催化剂</span>' + esc(narr.catalyst) + '</div>';
            html += renderKBCitedTweets(narr.cited_tweets);
            if (!narr.summary && !narr.catalyst && !(narr.cited_tweets && narr.cited_tweets.length)) {
              html += '<div class="kb-narrative-pending">叙事生成中,稍后刷新</div>';
            }
          }
          html += '</div>';

          // ③ 庄家集群(KB 币恒显示)
          var plabel = { equal_amounts: '等额注资', treasury_funder: '私人 treasury', router_chain: 'router 链', cooldown: '冷却期', same_second_snipe: '同分钟狙击' };
          html += '<div class="kb-block"><div class="kb-block-title">庄家集群</div>';
          if (sig.onchain_cluster) {
            var oc = sig.onchain_cluster;
            html += '<div class="info-row"><span class="info-row-label">结论</span><span class="info-row-value" style="font-size:0.82rem">' + esc(oc.verdict || '—') + '</span></div>';
            var pats = (oc.patterns_hit || []).map(function(p) { return plabel[p] || p; }).join(' · ');
            if (pats) html += '<div class="info-row"><span class="info-row-label">命中 pattern</span><span class="info-row-value" style="font-size:0.8rem;color:var(--text-muted)">' + esc(pats) + '</span></div>';
            if (oc.reason) html += '<div class="info-row"><span class="info-row-label">说明</span><span class="info-row-value" style="font-size:0.8rem;color:var(--text-muted)">' + esc(oc.reason) + '</span></div>';
          } else if (sig.cluster_risk && sig.cluster_risk.level && sig.cluster_risk.level !== 'none') {
            var cm = { high: 'var(--negative)', med: 'var(--bn-yellow)', low: 'var(--text-muted)' };
            var cl = { high: '⚠ 高风险', med: '中', low: '低' }[sig.cluster_risk.level] || sig.cluster_risk.level;
            html += '<div class="info-row"><span class="info-row-label">集群风险</span><span class="info-row-value">' + kbCardPill(cl, cm[sig.cluster_risk.level] || 'var(--text-muted)') + '</span></div>';
            if (sig.cluster_risk.reason) html += '<div class="info-row"><span class="info-row-label">说明</span><span class="info-row-value" style="font-size:0.8rem;color:var(--text-muted)">' + esc(sig.cluster_risk.reason) + '</span></div>';
          } else {
            html += '<div class="info-row"><span class="info-row-value" style="font-size:0.82rem;color:var(--text-muted)">未检出集群信号</span></div>';
          }
          html += '</div>';

          // ④ 聪明钱 24h
          if (sig.smart_money_24h && sig.smart_money_24h.wallet_count) {
            html += '<div class="kb-block"><div class="kb-block-title">聪明钱 (24H)</div>';
            html += '<div class="info-row"><span class="info-row-value green">' + sig.smart_money_24h.wallet_count + ' 个已验证钱包买入</span></div>';
            html += '</div>';
          }

          // ⑤ 信心评级 + 综合分
          html += '<div class="kb-block"><div class="kb-block-title">信心评级 + 综合分</div>';
          if (sig.conviction_rating) {
            var rm = { '高信心': 'var(--positive)', '中信心': 'var(--sol-blue)', '关注': 'var(--accent)', '观望': 'var(--text-muted)' };
            html += '<div class="info-row"><span class="info-row-label">研究评级</span><span class="info-row-value">' + kbCardPill(esc(sig.conviction_rating), rm[sig.conviction_rating] || 'var(--text-muted)') + '</span></div>';
          }
          if (sig.score != null) {
            html += '<div class="info-row"><span class="info-row-label">综合分</span><span class="info-row-value">' + esc(sig.score) + '</span></div>';
          }
          if (sig.revival && sig.revival.status) {
            var rv = sig.revival.status === 'confirmed' ? '确认重启' : '观察中';
            html += '<div class="info-row"><span class="info-row-label">Revival</span><span class="info-row-value">' + rv + (sig.revival.drawdown_pct != null ? '（回撤 ' + Number(sig.revival.drawdown_pct).toFixed(0) + '%）' : '') + '</span></div>';
          }
          html += '</div>';

          // ⑥ 分析依据 + 免责声明
          var ev = sig.evidence || {};
          var evParts = [];
          if (ev.verdict_file) evParts.push('verdict: ' + ev.verdict_file);
          if (ev.cluster_report) evParts.push('cluster 报告: ' + ev.cluster_report);
          if (evParts.length || sig.disclaimer) {
            html += '<div class="kb-block kb-block-foot">';
            if (evParts.length) html += '<div class="info-row"><span class="info-row-label">分析依据</span><span class="info-row-value" style="font-size:0.78rem;color:var(--text-muted)">' + esc(evParts.join(' · ')) + '</span></div>';
            if (sig.disclaimer) html += '<div class="info-row" style="border:none"><span class="info-row-value" style="font-size:0.72rem;color:var(--text-muted)">' + esc(sig.disclaimer) + '</span></div>';
            html += '</div>';
          }

          content.innerHTML = html;
          sec.style.display = '';
        })
        .catch(function() {});
    }

    // Fetch token detail
    if (tokenAddress) {
      var chain = (new URLSearchParams(location.search)).get('chain') || 'solana';
      fetch('/api/token/' + encodeURIComponent(tokenAddress) + '?chain=' + encodeURIComponent(chain))
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function(token) {
          if (!token || token.error) {
            document.getElementById('detail-content').innerHTML = '<div class="page-error">未找到代币数据：' + (token && token.error ? token.error : '未知错误') + '</div>';
            return;
          }
          renderDetail(token);
        })
        .catch(function(e) {
          document.getElementById('detail-content').innerHTML = '<div class="page-error">加载失败：' + (e.message || e) + '</div>';
        });
    }
  <\/script>
</body>
</html>
`;
}
