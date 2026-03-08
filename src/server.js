/**
 * 榜单 Web 服务：从 Supabase 读取 solana_pump_ranking 并对外提供 API + 简单页面
 * 根路径 / 为欢迎页，/ranking 为榜单页。Railway 部署时通过 PORT 启动
 */
import './load-env.js';
import { createClient } from '@supabase/supabase-js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { updatePumpRanking } from '../scripts/fetch-pump-ranking.js';
import { updateZhilabsRanking } from '../scripts/fetch-zhilabs-ranking.js';
import { getTokenDetail, getKline, getTokenSecurityDetail } from './data-sources/index.js';
import { getTokenNarrative, getTokenHotTweets, batchPrefetch } from './data-sources/sixfivefiveone.js';
import { buildSeoMeta, buildHomepageJsonLd, buildOrganizationJsonLd, buildSitemap, SITE_URL, SITE_NAME } from './seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = process.env.PORT || 3000;
const GA_MEASUREMENT_ID = (process.env.GA_MEASUREMENT_ID || '').trim();

function gaSnippet() {
  if (!GA_MEASUREMENT_ID) return '';
  return `<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>`;
}

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || '').trim();
const isPlaceholder = /你的|项目ID|anon|公钥/i.test(supabaseUrl + supabaseKey);
if (!supabaseUrl || !supabaseKey || isPlaceholder) {
  console.error('[错误] 未配置 Supabase，无法启动服务。');
  console.error('请编辑项目根目录的 .env 文件，填入：');
  console.error('  SUPABASE_URL=https://你的项目ID.supabase.co');
  console.error('  SUPABASE_ANON_KEY=你的 anon 公钥');
  console.error('从 Supabase 控制台获取：项目设置 -> API → https://app.supabase.com/project/_/settings/api');
  process.exit(1);
}

console.log('[数据源] 使用自研数据源（DexScreener + GeckoTerminal + Jupiter + GoPlus），无需 AVE_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── 叙事/推文 Supabase 持久化缓存 ─────────────────
const NARRATIVE_CACHE_TTL_MS = parseInt(process.env.NARRATIVE_CACHE_TTL_HOURS || '4', 10) * 3600_000;
const TWEET_CACHE_TTL_MS = parseInt(process.env.TWEET_CACHE_TTL_HOURS || '2', 10) * 3600_000;
const ENABLE_TWEET_PREFETCH = (process.env.ENABLE_TWEET_PREFETCH || 'false').toLowerCase() === 'true';

let narrativeCacheAvailable = null; // null = 未检测, true/false

async function checkNarrativeCacheTable() {
  if (narrativeCacheAvailable !== null) return narrativeCacheAvailable;
  try {
    await supabase.from('token_narratives').select('token').limit(1);
    narrativeCacheAvailable = true;
    console.log('[缓存] token_narratives 表可用，启用持久化缓存');
  } catch {
    narrativeCacheAvailable = false;
    console.log('[缓存] token_narratives 表不存在，仅使用内存缓存（可执行 config/sql/token-narrative-cache.sql 创建）');
  }
  return narrativeCacheAvailable;
}

async function getCachedNarrative(tokenAddr) {
  if (!(await checkNarrativeCacheTable())) return null;
  try {
    const { data } = await supabase
      .from('token_narratives')
      .select('*')
      .eq('token', tokenAddr)
      .maybeSingle();
    if (!data) return null;
    const age = Date.now() - new Date(data.fetched_at).getTime();
    if (age > NARRATIVE_CACHE_TTL_MS) return null;
    return {
      summary: data.summary || '',
      articles: data.articles || [],
      sentiment: data.sentiment || 'neutral',
      sourceCount: data.source_count || 0,
      updatedAt: data.fetched_at,
      cached: true,
    };
  } catch { return null; }
}

async function saveNarrativeCache(tokenAddr, symbol, name, narrative) {
  if (!(await checkNarrativeCacheTable())) return;
  try {
    await supabase.from('token_narratives').upsert({
      token: tokenAddr,
      symbol: symbol || '',
      name: name || '',
      summary: narrative.summary || '',
      articles: narrative.articles || [],
      sentiment: narrative.sentiment || 'neutral',
      source_count: narrative.sourceCount || 0,
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'token' });
  } catch (e) {
    console.error('[缓存] 保存叙事缓存失败:', e?.message);
  }
}

async function getCachedTweets(tokenAddr) {
  if (!(await checkNarrativeCacheTable())) return null;
  try {
    const { data } = await supabase
      .from('token_tweets')
      .select('*')
      .eq('token', tokenAddr)
      .maybeSingle();
    if (!data) return null;
    const age = Date.now() - new Date(data.fetched_at).getTime();
    if (age > TWEET_CACHE_TTL_MS) return null;
    return {
      tweets: data.tweets || [],
      searchQueries: [],
      updatedAt: data.fetched_at,
      cached: true,
    };
  } catch { return null; }
}

async function saveTweetsCache(tokenAddr, symbol, name, tweetsResult) {
  if (!(await checkNarrativeCacheTable())) return;
  try {
    await supabase.from('token_tweets').upsert({
      token: tokenAddr,
      symbol: symbol || '',
      name: name || '',
      tweets: tweetsResult.tweets || [],
      tweet_count: (tweetsResult.tweets || []).length,
      search_query: (tweetsResult.searchQueries || []).join(' | '),
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'token' });
  } catch (e) {
    console.error('[缓存] 保存推文缓存失败:', e?.message);
  }
}

async function getRanking() {
  const { data, error } = await supabase
    .from('solana_pump_ranking')
    .select('*')
    .order('tx_volume_u_24h', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

async function getRankingZhilabs() {
  const { data, error } = await supabase
    .from('zhilabs_ranking')
    .select('*')
    .order('tx_volume_u_24h', { ascending: false });
  if (error) throw error;
  return data || [];
}

function buildRankingPage() {
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
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --sol-purple: #9945FF;
      --sol-green: #14F195;
      --sol-blue: #00D1FF;
      --phantom-pink: #AB47FF;
      --phantom-deep: #1a0a2e;
      --warp-magenta: #FF00FF;
      --bn-yellow: #F0B90B;
      --bg-primary: #07060d;
      --bg-card: rgba(15, 12, 30, 0.65);
      --bg-card-hover: rgba(25, 20, 50, 0.8);
      --border-subtle: rgba(153, 69, 255, 0.12);
      --border-glow: rgba(153, 69, 255, 0.3);
      --text-primary: #e8e6f0;
      --text-secondary: #8a84a0;
      --text-muted: #5c5672;
      --positive: #14F195;
      --negative: #ff4d6a;
    }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { height: 100%; }
    body {
      min-height: 100%;
      font-family: 'Exo 2', system-ui, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      overflow-x: hidden;
    }

    .bg-layer {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
    }
    .bg-stars {
      background-image:
        radial-gradient(1px 1px at 10% 20%, rgba(153,69,255,0.7), transparent),
        radial-gradient(1px 1px at 30% 65%, rgba(20,241,149,0.5), transparent),
        radial-gradient(1.2px 1.2px at 55% 12%, rgba(0,209,255,0.6), transparent),
        radial-gradient(1px 1px at 72% 38%, rgba(255,255,255,0.35), transparent),
        radial-gradient(1px 1px at 88% 75%, rgba(171,71,255,0.5), transparent),
        radial-gradient(1px 1px at 15% 85%, rgba(255,0,255,0.3), transparent),
        radial-gradient(1.2px 1.2px at 82% 18%, rgba(20,241,149,0.4), transparent),
        radial-gradient(1px 1px at 48% 50%, rgba(153,69,255,0.5), transparent);
      background-size: 280px 280px;
      animation: starDrift 100s linear infinite;
    }
    @keyframes starDrift { to { background-position: 280px 280px; } }

    .bg-nebula {
      background:
        radial-gradient(ellipse at 15% 25%, rgba(153,69,255,0.08), transparent 55%),
        radial-gradient(ellipse at 85% 75%, rgba(20,241,149,0.05), transparent 50%),
        radial-gradient(ellipse at 50% 50%, rgba(0,209,255,0.04), transparent 60%);
    }

    .bg-grid {
      background:
        linear-gradient(rgba(153,69,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(153,69,255,0.025) 1px, transparent 1px);
      background-size: 80px 80px;
      mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%);
    }

    .bg-scanlines {
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px);
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
      font-family: 'Exo 2', sans-serif;
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
      color: var(--sol-purple);
      border-color: var(--border-glow);
      box-shadow: 0 0 20px rgba(153,69,255,0.15);
      transform: translateX(-3px);
    }

    .page-title {
      display: flex; align-items: center; gap: 0.75rem;
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(1.1rem, 3vw, 1.6rem); font-weight: 700;
      background: linear-gradient(135deg, var(--sol-purple) 0%, var(--sol-blue) 50%, var(--sol-green) 100%);
      background-size: 200% 200%;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: titleShift 6s ease-in-out infinite;
    }
    @keyframes titleShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
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
      background: var(--sol-green);
      box-shadow: 0 0 8px rgba(20,241,149,0.6), 0 0 20px rgba(20,241,149,0.2);
    }
    .scheduler-bar .dot.running {
      background: var(--bn-yellow);
      box-shadow: 0 0 8px rgba(240,185,11,0.6), 0 0 20px rgba(240,185,11,0.2);
      animation: dotPulse 1s ease-in-out infinite;
    }
    @keyframes dotPulse { 0%,100%{opacity:1; transform:scale(1);} 50%{opacity:0.4; transform:scale(0.8);} }
    .scheduler-bar .label { color: var(--text-muted); }
    .scheduler-bar .sep { color: rgba(153,69,255,0.2); }
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
      font-family: 'Exo 2', sans-serif;
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
      background: rgba(153,69,255,0.05);
    }
    .tabs button.active {
      color: var(--sol-purple);
      border-bottom-color: var(--sol-purple);
      text-shadow: 0 0 20px rgba(153,69,255,0.3);
    }

    .actions {
      display: flex; align-items: center; gap: 0.75rem;
    }
    .actions button {
      position: relative;
      padding: 0.5rem 1.25rem;
      font-family: 'Exo 2', sans-serif;
      font-size: 0.8125rem; font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, rgba(153,69,255,0.3), rgba(0,209,255,0.2));
      border: 1px solid rgba(153,69,255,0.3);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      overflow: hidden;
    }
    .actions button::before {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(135deg, var(--sol-purple), var(--sol-blue));
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .actions button:hover::before { opacity: 0.3; }
    .actions button:hover {
      border-color: var(--sol-purple);
      box-shadow: 0 0 20px rgba(153,69,255,0.2), 0 4px 16px rgba(0,0,0,0.3);
      transform: translateY(-1px);
    }
    .actions button:active { transform: translateY(0); }
    .actions button:disabled {
      opacity: 0.4; cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }
    .actions button span { position: relative; z-index: 1; }
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
      background: rgba(153,69,255,0.03);
      border-left: 2px solid rgba(153,69,255,0.2);
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
      background: linear-gradient(90deg, transparent, rgba(153,69,255,0.3), rgba(0,209,255,0.2), transparent);
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
      background: rgba(10, 8, 20, 0.9);
      border-bottom: 1px solid var(--border-subtle);
      white-space: nowrap;
    }
    th.num { text-align: right; }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(153,69,255,0.06);
      vertical-align: middle;
      transition: background 0.2s ease;
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
      border-bottom-color: rgba(153,69,255,0.12);
    }

    /* Rank column */
    td .rank {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px;
      border-radius: 8px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.75rem; font-weight: 700;
      background: rgba(153,69,255,0.08);
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
      color: var(--sol-blue);
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
      box-shadow: inset 3px 0 0 var(--sol-purple);
    }

    .copy-ca-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px;
      margin-left: 4px;
      padding: 0;
      background: rgba(153,69,255,0.08);
      border: 1px solid rgba(153,69,255,0.15);
      border-radius: 5px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
      vertical-align: middle;
    }
    .copy-ca-btn:hover {
      background: rgba(153,69,255,0.2);
      border-color: var(--sol-purple);
      color: var(--sol-purple);
      box-shadow: 0 0 8px rgba(153,69,255,0.2);
    }
    .copy-ca-btn.copied {
      background: rgba(20,241,149,0.15);
      border-color: rgba(20,241,149,0.3);
      color: var(--positive);
    }
    .copy-ca-btn svg {
      width: 12px; height: 12px;
      fill: none; stroke: currentColor; stroke-width: 2;
      stroke-linecap: round; stroke-linejoin: round;
    }

    a { color: var(--sol-blue); text-decoration: none; }
    a:hover { text-decoration: underline; }

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
      border-top-color: var(--sol-purple);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
      margin-left: 0.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* === MOBILE === */
    @media (max-width: 768px) {
      .page-wrapper { padding: 1rem 0.75rem 2rem; }
      .page-header { flex-direction: column; align-items: flex-start; }
      .controls-row { flex-direction: column; align-items: flex-start; }
      .tabs button { padding: 0.5rem 0.75rem; font-size: 0.8125rem; }
      th, td { padding: 0.5rem 0.625rem; font-size: 0.8125rem; }
      .table-card { border-radius: 12px; overflow-x: auto; }
      table { min-width: 640px; }
    }

    /* === SCROLLBAR === */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background: rgba(153,69,255,0.2);
      border-radius: 3px;
    }
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
      <a href="/" class="back-home">← 返回首页</a>
      <h1 class="page-title">⟡ Zhizhi Labs 榜单</h1>
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
        <button type="button" class="tab-btn" data-tab="zhilabs">zhilabs 精选</button>
      </div>
      <div class="actions">
        <button type="button" id="updateBtn"><span>更新 Pump 榜单</span></button>
        <span class="status" id="updateStatus"></span>
        <span class="sync-label" id="lastSync"></span>
      </div>
    </div>

    <p class="desc" id="desc">已成功发射、上线 &lt; 10 天、市值 &gt; 100K，需有图片，insider ≤50%，Top10 持仓 ≤30%，按 24h 交易量排序</p>

    <div class="table-card">
      <div id="panel-pump" class="panel active"><div id="root-pump"><div class="loading-text">加载中</div></div></div>
      <div id="panel-zhilabs" class="panel"><div id="root-zhilabs"><div class="loading-text">加载中</div></div></div>
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
        table += '</tr>';
      });
      table += '</tbody></table>';
      root.innerHTML = table;
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
    function refreshTab(tab) {
      var url = tab === 'pump' ? '/api/ranking' : '/api/ranking/zhilabs';
      var rootId = tab === 'pump' ? 'root-pump' : 'root-zhilabs';
      return fetchJsonOrThrow(url).then(function(list) {
        if (Array.isArray(list)) renderTable(list, rootId);
        else document.getElementById(rootId).innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">数据格式异常</div>';
      }).catch(function(e) {
        document.getElementById(rootId).innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">' + (e && e.message ? e.message : String(e)) + '</div>';
      });
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
      }
    });
    var currentTab = 'pump';
    document.getElementById('updateBtn').querySelector('span').textContent = '更新 Pump 榜单';
    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach(function(btn){ btn.classList.toggle('active', btn.dataset.tab === tab); });
      document.querySelectorAll('.panel').forEach(function(p){ p.classList.toggle('active', p.id === 'panel-' + tab); });
      document.getElementById('desc').textContent = tab === 'pump'
        ? '已成功发射、上线 < 10 天、市值 > 100K，需有图片，insider ≤50%，Top10 持仓 ≤30%，按 24h 交易量排序'
        : 'zhilabs 精选 Meme 代币，按 24h 交易量排序';
      document.getElementById('updateBtn').querySelector('span').textContent = tab === 'pump' ? '更新 Pump 榜单' : '更新 zhilabs 精选';
      refreshTab(tab).then(function(){ setLastSync(new Date()); }).catch(function(){});
    }
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
    });
    document.getElementById('updateBtn').addEventListener('click', function() {
      var btn = document.getElementById('updateBtn');
      var tab = currentTab || 'pump';
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
          if (s.lastResult.zhilabs) parts.push('zhilabs ' + (s.lastResult.zhilabs.ok ? s.lastResult.zhilabs.count + '条' : '失败'));
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
    fetchSchedulerStatus();
    setInterval(fetchSchedulerStatus, 15000);
    setInterval(updateCountdown, 1000);

    Promise.allSettled([
        fetch('/api/ranking').then(function(r){ return r.ok ? r.json() : r.text().then(function(t){ throw new Error(t); }); }),
        fetch('/api/ranking/zhilabs').then(function(r){ return r.ok ? r.json() : r.text().then(function(t){ throw new Error(t); }); })
      ]).then(function(results) {
        var r0 = results[0], r1 = results[1];
        if (r0.status === 'fulfilled' && Array.isArray(r0.value)) renderTable(r0.value, 'root-pump');
        else document.getElementById('root-pump').innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">Pump 榜单: ' + (r0.status === 'rejected' && r0.reason ? (r0.reason.message || r0.reason) : '暂无数据') + '</div>';
        if (r1.status === 'fulfilled' && Array.isArray(r1.value)) renderTable(r1.value, 'root-zhilabs');
        else document.getElementById('root-zhilabs').innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">zhilabs 精选: ' + (r1.status === 'rejected' && r1.reason ? (r1.reason.message || r1.reason) : '暂无数据') + '</div>';
        setLastSync(new Date());
      });
  </script>
</body>
</html>
`;
}
function buildTokenDetailPage(tokenInfo = {}) {
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
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${pageTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
  ${seoMeta}
  ${gaSnippet()}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"><\/script>
  <style>
    :root {
      --sol-purple: #9945FF;
      --sol-green: #14F195;
      --sol-blue: #00D1FF;
      --phantom-pink: #AB47FF;
      --phantom-deep: #1a0a2e;
      --warp-magenta: #FF00FF;
      --bn-yellow: #F0B90B;
      --bg-primary: #07060d;
      --bg-card: rgba(15, 12, 30, 0.65);
      --bg-card-solid: #0d0b18;
      --bg-card-hover: rgba(25, 20, 50, 0.8);
      --border-subtle: rgba(153, 69, 255, 0.12);
      --border-glow: rgba(153, 69, 255, 0.3);
      --text-primary: #e8e6f0;
      --text-secondary: #8a84a0;
      --text-muted: #5c5672;
      --positive: #14F195;
      --negative: #ff4d6a;
      --accent-purple: rgba(153,69,255,0.08);
      --accent-green: rgba(20,241,149,0.08);
      --accent-blue: rgba(0,209,255,0.08);
      --accent-pink: rgba(255,77,106,0.08);
    }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { height: 100%; }
    body {
      min-height: 100%;
      font-family: 'Exo 2', system-ui, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      overflow-x: hidden;
    }
    .bg-layer { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
    .bg-stars {
      background-image:
        radial-gradient(1px 1px at 10% 20%, rgba(153,69,255,0.7), transparent),
        radial-gradient(1px 1px at 30% 65%, rgba(20,241,149,0.5), transparent),
        radial-gradient(1.2px 1.2px at 55% 12%, rgba(0,209,255,0.6), transparent),
        radial-gradient(1px 1px at 72% 38%, rgba(255,255,255,0.35), transparent),
        radial-gradient(1px 1px at 88% 75%, rgba(171,71,255,0.5), transparent),
        radial-gradient(1px 1px at 15% 85%, rgba(255,0,255,0.3), transparent),
        radial-gradient(1.2px 1.2px at 82% 18%, rgba(20,241,149,0.4), transparent),
        radial-gradient(1px 1px at 48% 50%, rgba(153,69,255,0.5), transparent);
      background-size: 280px 280px;
      animation: starDrift 100s linear infinite;
    }
    @keyframes starDrift { to { background-position: 280px 280px; } }
    .bg-nebula {
      background:
        radial-gradient(ellipse at 15% 25%, rgba(153,69,255,0.08), transparent 55%),
        radial-gradient(ellipse at 85% 75%, rgba(20,241,149,0.05), transparent 50%),
        radial-gradient(ellipse at 50% 50%, rgba(0,209,255,0.04), transparent 60%);
    }
    .bg-grid {
      background:
        linear-gradient(rgba(153,69,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(153,69,255,0.025) 1px, transparent 1px);
      background-size: 80px 80px;
      mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%);
    }
    .bg-scanlines {
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px);
      z-index: 1;
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
      font-family: 'Exo 2', sans-serif;
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
      font-family: 'Exo 2', sans-serif;
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
      font-family: 'Exo 2', sans-serif;
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
      font-family: 'Exo 2', sans-serif;
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
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 0.8rem;
      color: var(--sol-blue);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1; min-width: 0;
    }
    .copy-btn {
      padding: 0.35rem 0.65rem;
      font-family: 'Exo 2', sans-serif;
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
      font-family: 'Exo 2', sans-serif;
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
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.875rem;
      margin-bottom: 1.5rem;
      animation: fadeSlideUp 0.5s ease 0.15s both;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 1.125rem 1.25rem;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0;
      height: 2px;
      background: var(--stat-accent, linear-gradient(90deg, transparent, rgba(153,69,255,0.2), transparent));
    }
    .stat-card:hover {
      border-color: var(--border-glow);
      box-shadow: 0 4px 24px rgba(153,69,255,0.08);
      transform: translateY(-2px);
    }
    .stat-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.625rem;
    }
    .stat-label {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }
    .stat-icon {
      width: 28px; height: 28px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.875rem;
      flex-shrink: 0;
    }
    .stat-value {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
    }
    .stat-value.positive { color: var(--positive); }
    .stat-value.negative { color: var(--negative); }

    /* === Chart Card === */
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
      padding: 1.125rem 1.25rem 0;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .chart-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.75rem; font-weight: 700;
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
    .chart-intervals {
      display: flex; gap: 0.25rem;
    }
    .chart-intervals button {
      font-family: 'Exo 2', sans-serif;
      font-size: 0.6875rem; font-weight: 600;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }
    .chart-intervals button.active {
      color: var(--sol-purple);
      background: rgba(153,69,255,0.1);
      border-color: rgba(153,69,255,0.2);
    }
    .chart-intervals button:hover:not(.active) {
      color: var(--text-secondary);
      background: rgba(153,69,255,0.04);
    }
    .chart-body { padding: 0.75rem 1.25rem 1.25rem; }
    #kline-chart {
      width: 100%;
      height: 420px;
      border-radius: 10px;
      overflow: hidden;
    }
    .chart-loading {
      display: flex; align-items: center; justify-content: center;
      height: 420px;
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
      height: 420px;
      color: var(--text-muted);
      font-size: 0.875rem;
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

    /* === Narrative Summary === */
    .narrative-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      position: relative;
      overflow: hidden;
    }
    .narrative-card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(153,69,255,0.2), transparent);
    }
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
    .narrative-title .icon { font-size: 0.875rem; }
    .narrative-title .ai-tag {
      font-family: 'Exo 2', sans-serif;
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
    .tweets-title .icon { font-size: 0.875rem; }
    .tweets-title .update-tag {
      font-family: 'Exo 2', sans-serif;
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
      .token-hero-top { gap: 0.75rem; }
      .token-logo, .token-logo-placeholder { width: 48px; height: 48px; border-radius: 12px; font-size: 1.1rem; }
      .token-price { font-size: 1.25rem; }
      .action-bar { flex-direction: column; }
      .action-bar-contract { border-right: none; border-bottom: 1px solid var(--border-subtle); }
      .action-bar-links { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .ext-link { border-left: none !important; border-top: none; padding: 0.625rem 0.875rem; font-size: 0.75rem; }
      .ext-link + .ext-link { border-left: 1px solid var(--border-subtle) !important; }
      #kline-chart { height: 300px; }
      .chart-loading, .chart-error { height: 300px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.625rem; }
      .stat-card { padding: 0.875rem; border-radius: 12px; }
      .stat-value { font-size: 1rem; }
      .stat-icon { width: 24px; height: 24px; font-size: 0.75rem; border-radius: 6px; }
      .narrative-card { padding: 1rem; }
    }
    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: 1fr 1fr; }
      .token-name-row { gap: 0.4rem; }
      .chain-badge { font-size: 0.625rem; }
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

      // Hero card
      html += '<div class="token-hero">';
      html += '<div class="token-hero-top">';
      html += '<div class="token-logo-wrap">' + logoHtml + '</div>';
      html += '<div class="token-info">';
      html += '<div class="token-name-row">';
      html += '<h1>' + esc(nameStr) + '</h1>';
      if (symbolStr) html += '<span class="symbol-badge">' + esc(symbolStr) + '</span>';
      html += '<span class="chain-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>Solana</span>';
      html += '</div>';
      html += '<div class="token-price-row">';
      html += '<span class="token-price">' + formatPrice(token.current_price_usd) + '</span>';
      if (changeStr) html += '<span class="token-change ' + changeCl + '">' + changeArrow + changeStr + '</span>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      // Action bar (contract + links)
      html += '<div class="action-bar">';
      html += '<div class="action-bar-contract">';
      html += '<span class="contract-label">CA</span>';
      html += '<span class="contract-addr" id="ca-text">' + esc(token.token) + '</span>';
      html += '<button class="copy-btn" id="copy-ca-btn"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>复制</button>';
      html += '</div>';
      html += '<div class="action-bar-links">';
      html += '<a class="ext-link" href="https://dexscreener.com/solana/' + esc(token.token) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 17l4-8 4 4 6-8"/></svg>DexScreener<span class="ext-arrow">↗</span></a>';
      html += '<a class="ext-link" href="https://www.geckoterminal.com/solana/tokens/' + esc(token.token) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Gecko<span class="ext-arrow">↗</span></a>';
      html += '<a class="ext-link" href="https://solscan.io/token/' + esc(token.token) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Solscan<span class="ext-arrow">↗</span></a>';
      html += '</div>';
      html += '</div>';

      // Stats grid (full width, prominent)
      html += '<div class="stats-grid">';
      html += '<div class="stat-card" style="--stat-accent:linear-gradient(90deg,transparent,rgba(153,69,255,0.35),transparent)"><div class="stat-header"><span class="stat-label">市值</span><span class="stat-icon" style="background:var(--accent-purple);color:var(--sol-purple)">💎</span></div><div class="stat-value">' + formatCompact(token.market_cap) + '</div></div>';
      html += '<div class="stat-card" style="--stat-accent:linear-gradient(90deg,transparent,rgba(0,209,255,0.35),transparent)"><div class="stat-header"><span class="stat-label">24H 交易量</span><span class="stat-icon" style="background:var(--accent-blue);color:var(--sol-blue)">📊</span></div><div class="stat-value">' + formatCompact(token.tx_volume_u_24h) + '</div></div>';
      html += '<div class="stat-card" style="--stat-accent:linear-gradient(90deg,transparent,' + (change >= 0 ? 'rgba(20,241,149,0.35)' : 'rgba(255,77,106,0.35)') + ',transparent)"><div class="stat-header"><span class="stat-label">24H 涨跌</span><span class="stat-icon" style="background:' + (change >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)') + ';color:' + (change >= 0 ? 'var(--positive)' : 'var(--negative)') + '">' + (change >= 0 ? '📈' : '📉') + '</span></div><div class="stat-value ' + changeCl + '">' + (changeStr || '—') + '</div></div>';
      html += '<div class="stat-card" style="--stat-accent:linear-gradient(90deg,transparent,rgba(20,241,149,0.35),transparent)"><div class="stat-header"><span class="stat-label">持币地址</span><span class="stat-icon" style="background:var(--accent-green);color:var(--sol-green)">👥</span></div><div class="stat-value">' + formatNumber(token.holders) + '</div></div>';
      if (token._liquidity_usd != null) {
        html += '<div class="stat-card" style="--stat-accent:linear-gradient(90deg,transparent,rgba(0,209,255,0.35),transparent)"><div class="stat-header"><span class="stat-label">流动性</span><span class="stat-icon" style="background:var(--accent-blue);color:var(--sol-blue)">💧</span></div><div class="stat-value">' + formatCompact(token._liquidity_usd) + '</div></div>';
      }
      if (token.launch_at) {
        var launchDate = new Date(token.launch_at * 1000);
        var launchStr = launchDate.getFullYear() + '-' + String(launchDate.getMonth()+1).padStart(2,'0') + '-' + String(launchDate.getDate()).padStart(2,'0');
        html += '<div class="stat-card" style="--stat-accent:linear-gradient(90deg,transparent,rgba(153,69,255,0.35),transparent)"><div class="stat-header"><span class="stat-label">上线时间</span><span class="stat-icon" style="background:var(--accent-purple);color:var(--sol-purple)">🚀</span></div><div class="stat-value" style="font-size:1rem">' + launchStr + '</div></div>';
      }
      html += '</div>';

      // Two-column layout
      html += '<div class="detail-layout">';

      // Left column: chart + narrative
      html += '<div class="detail-main">';

      // K-line chart
      html += '<div class="chart-card">';
      html += '<div class="chart-header"><div class="chart-title"><span class="live-dot"></span>K 线图</div>';
      html += '<div class="chart-intervals"><button class="active" data-interval="15">15m</button><button data-interval="60">1H</button><button data-interval="240">4H</button><button data-interval="1440">1D</button></div>';
      html += '</div>';
      html += '<div class="chart-body"><div id="kline-chart"><div class="chart-loading">加载K线数据</div></div></div>';
      html += '</div>';

      // Narrative summary
      html += '<div class="narrative-card" id="narrative-section">';
      html += '<div class="narrative-title"><span class="icon">📰</span>叙事总结<span class="ai-tag">AI</span></div>';
      html += '<div id="narrative-content"><div class="narrative-loading">分析中</div></div>';
      html += '</div>';
      html += '</div>'; // end detail-main

      // Right column: hot tweets sidebar
      html += '<div class="detail-sidebar">';
      html += '<div class="tweets-card" id="tweets-section">';
      html += '<div class="tweets-title"><span class="icon">𝕏</span>热门推特<span class="update-tag">每日更新</span></div>';
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

      // K-line interval buttons
      var intervalBtns = document.querySelectorAll('.chart-intervals button');
      intervalBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          intervalBtns.forEach(function(b){ b.classList.remove('active'); });
          btn.classList.add('active');
          loadKlineChart(token, parseInt(btn.dataset.interval, 10));
        });
      });

      loadKlineChart(token, 15);
      loadNarrative(token);
      loadTweets(token);
    }

    function loadKlineChart(token, interval) {
      var pairAddress = token.main_pair;
      var chain = token.chain || 'solana';
      interval = interval || 15;
      var sizeMap = { 15: 96, 60: 96, 240: 96, 1440: 60 };
      var size = sizeMap[interval] || 96;
      if (!pairAddress) {
        document.getElementById('kline-chart').innerHTML = '<div class="chart-error">无交易对数据，无法加载K线</div>';
        return;
      }
      document.getElementById('kline-chart').innerHTML = '<div class="chart-loading">加载K线数据</div>';
      fetch('/api/kline/' + encodeURIComponent(pairAddress) + '?chain=' + encodeURIComponent(chain) + '&interval=' + interval + '&size=' + size)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!Array.isArray(data) || data.length === 0) {
            document.getElementById('kline-chart').innerHTML = '<div class="chart-error">暂无K线数据</div>';
            return;
          }
          renderChart(data);
        })
        .catch(function(e) {
          document.getElementById('kline-chart').innerHTML = '<div class="chart-error">K线加载失败：' + (e.message || e) + '</div>';
        });
    }

    function renderChart(data) {
      var container = document.getElementById('kline-chart');
      container.innerHTML = '';
      var chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight || 420,
        layout: {
          background: { type: 'solid', color: 'transparent' },
          textColor: '#8a84a0',
          fontFamily: "'Exo 2', system-ui, sans-serif",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: 'rgba(153, 69, 255, 0.06)' },
          horzLines: { color: 'rgba(153, 69, 255, 0.06)' },
        },
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal,
          vertLine: { color: 'rgba(153, 69, 255, 0.3)', labelBackgroundColor: '#9945FF' },
          horzLine: { color: 'rgba(153, 69, 255, 0.3)', labelBackgroundColor: '#9945FF' },
        },
        rightPriceScale: {
          borderColor: 'rgba(153, 69, 255, 0.1)',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: 'rgba(153, 69, 255, 0.1)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { vertTouchDrag: false },
      });

      var candleSeries = chart.addCandlestickSeries({
        upColor: '#14F195',
        downColor: '#ff4d6a',
        borderUpColor: '#14F195',
        borderDownColor: '#ff4d6a',
        wickUpColor: 'rgba(20, 241, 149, 0.6)',
        wickDownColor: 'rgba(255, 77, 106, 0.6)',
      });

      var volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      var candleData = data.map(function(d) {
        return { time: d.time, open: d.open, high: d.high, low: d.low, close: d.close };
      }).sort(function(a, b) { return a.time - b.time; });

      var volumeData = data.map(function(d) {
        var color = d.close >= d.open ? 'rgba(20, 241, 149, 0.3)' : 'rgba(255, 77, 106, 0.3)';
        return { time: d.time, value: d.volume || 0, color: color };
      }).sort(function(a, b) { return a.time - b.time; });

      candleSeries.setData(candleData);
      volumeSeries.setData(volumeData);
      chart.timeScale().fitContent();

      window.addEventListener('resize', function() {
        chart.applyOptions({ width: container.clientWidth });
      });
    }

    function loadNarrative(token) {
      fetch('/api/token/' + encodeURIComponent(token.token) + '/narrative')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var el = document.getElementById('narrative-content');
          if (!el) return;
          if (!data.summary && (!data.articles || data.articles.length === 0)) {
            el.innerHTML = '<div class="narrative-empty">暂无该代币的相关新闻叙事</div>';
            return;
          }
          var html = '';
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
          var el = document.getElementById('narrative-content');
          if (el) el.innerHTML = '<div class="narrative-empty">暂无该代币的相关新闻叙事</div>';
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
            html += '<span class="likes">♡ ' + formatCount(t.likes) + '</span>';
            html += '<span class="retweets">⟲ ' + formatCount(t.retweets) + '</span>';
            html += '<span class="replies">💬 ' + formatCount(t.replies) + '</span>';
            html += '</div>';
            html += '</div>';
          });
          el.innerHTML = html;
        })
        .catch(function() {
          hideTweetsSidebar();
        });
    }

    // Fetch token detail
    if (tokenAddress) {
      fetch('/api/token/' + encodeURIComponent(tokenAddress) + '?chain=solana')
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

const updateRunning = { pump: false, zhilabs: false };

/* ── 定时自动更新调度器 ── */
const AUTO_UPDATE_INTERVAL_MS = Math.max(
  60_000,
  parseInt(process.env.AUTO_UPDATE_INTERVAL_MIN || '5', 10) * 60_000,
);
const scheduler = {
  enabled: true,
  intervalMs: AUTO_UPDATE_INTERVAL_MS,
  lastRun: null,
  lastResult: null,
  running: false,
  timer: null,
};

async function runScheduledUpdate() {
  if (scheduler.running) {
    console.log('[定时更新] 上一轮仍在执行，跳过');
    return;
  }
  scheduler.running = true;
  const started = Date.now();
  console.log('[定时更新] 开始自动更新 Pump + zhilabs 榜单...');
  const result = { pump: null, zhilabs: null, startedAt: new Date().toISOString() };
  try {
    if (!updateRunning.pump) {
      updateRunning.pump = true;
      try {
        const out = await updatePumpRanking();
        result.pump = { ok: true, count: Array.isArray(out) ? out.length : 0 };
        console.log('[定时更新] Pump 榜单更新完成，共', result.pump.count, '条');
      } catch (e) {
        result.pump = { ok: false, error: e?.message || String(e) };
        console.error('[定时更新] Pump 榜单更新失败:', e?.message);
      } finally {
        updateRunning.pump = false;
      }
    } else {
      result.pump = { ok: false, error: '手动更新进行中，跳过' };
    }
    if (!updateRunning.zhilabs) {
      updateRunning.zhilabs = true;
      try {
        const out = await updateZhilabsRanking();
        result.zhilabs = { ok: true, count: Array.isArray(out) ? out.length : 0 };
        console.log('[定时更新] zhilabs 精选更新完成，共', result.zhilabs.count, '条');
      } catch (e) {
        result.zhilabs = { ok: false, error: e?.message || String(e) };
        console.error('[定时更新] zhilabs 精选更新失败:', e?.message);
      } finally {
        updateRunning.zhilabs = false;
      }
    } else {
      result.zhilabs = { ok: false, error: '手动更新进行中，跳过' };
    }
  } finally {
    scheduler.running = false;
    scheduler.lastRun = new Date().toISOString();
    scheduler.lastResult = { ...result, durationMs: Date.now() - started };
    console.log('[定时更新] 完成，用时', Date.now() - started, 'ms');
  }

  // 后台预取叙事/推文（不阻塞下次更新周期）
  scheduleNarrativePrefetch().catch(e =>
    console.error('[预取] 叙事预取出错:', e?.message)
  );
}

async function scheduleNarrativePrefetch() {
  try {
    const [zhilabs, pump] = await Promise.all([
      supabase.from('zhilabs_ranking').select('token, symbol, name').limit(50),
      supabase.from('solana_pump_ranking').select('token, symbol, name').limit(20),
    ]);
    const seen = new Set();
    const tokens = [];
    for (const row of [...(zhilabs.data || []), ...(pump.data || [])]) {
      if (row.token && !seen.has(row.token)) {
        seen.add(row.token);
        tokens.push(row);
      }
    }
    if (tokens.length === 0) return;

    // 仅预取未缓存或已过期的代币
    const toFetch = [];
    for (const t of tokens) {
      const cached = await getCachedNarrative(t.token);
      if (!cached) toFetch.push(t);
    }

    if (toFetch.length === 0) {
      console.log('[预取] 所有代币叙事缓存均有效，跳过预取');
      return;
    }

    console.log(`[预取] 开始为 ${toFetch.length} 个代币预取叙事…`);
    const prefetchResult = await batchPrefetch(toFetch, {
      fetchTweets: ENABLE_TWEET_PREFETCH,
      concurrency: 2,
      delayMs: 3000,
    });
    console.log(`[预取] 完成：叙事 ${prefetchResult.narratives} 条，推文 ${prefetchResult.tweets} 条，错误 ${prefetchResult.errors}`);

    // 将预取结果保存到 Supabase
    for (const t of toFetch) {
      try {
        const narrative = await getTokenNarrative(t.symbol, t.name, { contractAddress: t.token });
        if (narrative && !narrative.error) {
          await saveNarrativeCache(t.token, t.symbol, t.name, narrative);
        }
        if (ENABLE_TWEET_PREFETCH) {
          const tweets = await getTokenHotTweets(t.symbol, {
            contractAddress: t.token,
            symbol: t.symbol,
            name: t.name,
          });
          if (tweets && !tweets.error) {
            await saveTweetsCache(t.token, t.symbol, t.name, tweets);
          }
        }
      } catch { /* 单个代币失败不影响整体 */ }
    }
  } catch (e) {
    console.error('[预取] 获取榜单代币失败:', e?.message);
  }
}

function startScheduler() {
  if (scheduler.timer) clearInterval(scheduler.timer);
  scheduler.timer = setInterval(runScheduledUpdate, scheduler.intervalMs);
  console.log(`[定时更新] 已启动，每 ${scheduler.intervalMs / 60000} 分钟自动更新`);
  setTimeout(runScheduledUpdate, 3000);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || '/', 'http://localhost');
  const urlPath = u.pathname || '/';
  // robots.txt
  if (urlPath === '/robots.txt') {
    try {
      const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
      const content = fs.readFileSync(robotsPath, 'utf8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(content);
    } catch (_) {
      res.setHeader('Content-Type', 'text/plain');
      res.end('User-agent: *\nAllow: /\n');
    }
    return;
  }
  // sitemap.xml（动态生成，包含数据库中的代币页面）
  if (urlPath === '/sitemap.xml') {
    let tokenAddresses = [];
    try {
      const [zhilabs, pump] = await Promise.all([
        supabase.from('zhilabs_ranking').select('token').limit(100),
        supabase.from('solana_pump_ranking').select('token').limit(100),
      ]);
      const addrSet = new Set();
      for (const row of (zhilabs.data || [])) { if (row.token) addrSet.add(row.token); }
      for (const row of (pump.data || [])) { if (row.token) addrSet.add(row.token); }
      tokenAddresses = [...addrSet];
    } catch (_) { /* 降级为仅静态页 */ }
    const xml = buildSitemap(tokenAddresses);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(xml);
    return;
  }
  if (urlPath === '/health' || urlPath === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, port: PORT }));
    return;
  }
  if (urlPath === '/api/scheduler/status') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({
      enabled: scheduler.enabled,
      intervalMs: scheduler.intervalMs,
      intervalMin: scheduler.intervalMs / 60000,
      running: scheduler.running,
      lastRun: scheduler.lastRun,
      lastResult: scheduler.lastResult,
    }));
    return;
  }
  if (urlPath === '/api/update') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: '仅支持 POST' }));
      return;
    }
    const type = (u.searchParams.get('type') || '').toLowerCase();
    if (type !== 'pump' && type !== 'zhilabs') {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: '参数 type 必须为 pump 或 zhilabs' }));
      return;
    }
    if (updateRunning[type]) {
      res.statusCode = 409;
      res.end(JSON.stringify({ error: '更新中，请稍后再试' }));
      return;
    }
    updateRunning[type] = true;
    const started = Date.now();
    try {
      const out = type === 'pump' ? await updatePumpRanking() : await updateZhilabsRanking();
      const durationMs = Date.now() - started;
      const updated = Array.isArray(out) ? out.length : 0;
      res.end(JSON.stringify({ ok: true, type, updated, durationMs, at: new Date().toISOString() }));
    } catch (e) {
      res.statusCode = 500;
      const errMsg = e?.message || String(e);
      res.end(JSON.stringify({ error: errMsg }));
    } finally {
      updateRunning[type] = false;
    }
    return;
  }
  if (urlPath === '/api/ranking') {
    try {
      const data = await getRanking();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(data));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  if (urlPath === '/api/ranking/zhilabs') {
    try {
      const data = await getRankingZhilabs();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(data));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  // 代币叙事总结 API（必须在通用 /api/token/:address 之前匹配）
  const narrativeMatchApi = urlPath.match(/^\/api\/token\/(.+)\/narrative$/);
  if (narrativeMatchApi && req.method === 'GET') {
    const address = decodeURIComponent(narrativeMatchApi[1]);
    try {
      // 1. 检查 Supabase 持久化缓存
      const cached = await getCachedNarrative(address);
      if (cached) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=1800');
        res.end(JSON.stringify(cached));
        return;
      }

      // 2. 从数据库获取代币元数据
      let tokenInfo = null;
      try {
        const row = await supabase
          .from('zhilabs_ranking')
          .select('name, symbol')
          .eq('token', address)
          .maybeSingle();
        tokenInfo = row.data;
        if (!tokenInfo) {
          const pumpRow = await supabase
            .from('solana_pump_ranking')
            .select('name, symbol')
            .eq('token', address)
            .maybeSingle();
          tokenInfo = pumpRow.data;
        }
      } catch { /* fallback */ }

      const symbol = tokenInfo?.symbol || '';
      const name = tokenInfo?.name || '';

      // 3. 调用增强版叙事搜索（传入合约地址）
      const narrative = await getTokenNarrative(symbol, name, { contractAddress: address });

      // 4. 保存到 Supabase 持久化缓存
      saveNarrativeCache(address, symbol, name, narrative).catch(() => {});

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=1800');
      res.end(JSON.stringify(narrative));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: e?.message || String(e) }));
    }
    return;
  }
  // 代币热门推特 API（必须在通用 /api/token/:address 之前匹配）
  const tweetsMatchApi = urlPath.match(/^\/api\/token\/(.+)\/tweets$/);
  if (tweetsMatchApi && req.method === 'GET') {
    const address = decodeURIComponent(tweetsMatchApi[1]);
    try {
      // 1. 检查 Supabase 持久化缓存
      const cached = await getCachedTweets(address);
      if (cached) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.end(JSON.stringify(cached));
        return;
      }

      // 2. 从数据库获取代币元数据
      let tokenInfo = null;
      try {
        const row = await supabase
          .from('zhilabs_ranking')
          .select('name, symbol')
          .eq('token', address)
          .maybeSingle();
        tokenInfo = row.data;
        if (!tokenInfo) {
          const pumpRow = await supabase
            .from('solana_pump_ranking')
            .select('name, symbol')
            .eq('token', address)
            .maybeSingle();
          tokenInfo = pumpRow.data;
        }
      } catch { /* fallback */ }

      const symbol = tokenInfo?.symbol || '';
      const name = tokenInfo?.name || '';
      const keyword = symbol || name || address.slice(0, 8);

      // 3. 调用增强版推特搜索（传入合约地址 + 元数据）
      const tweets = await getTokenHotTweets(keyword, {
        contractAddress: address,
        symbol,
        name,
      });

      // 4. 保存到 Supabase 持久化缓存
      saveTweetsCache(address, symbol, name, tweets).catch(() => {});

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(JSON.stringify(tweets));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: e?.message || String(e) }));
    }
    return;
  }
  // 代币详情 API
  const tokenMatch = urlPath.match(/^\/api\/token\/(.+)$/);
  if (tokenMatch && req.method === 'GET') {
    const address = decodeURIComponent(tokenMatch[1]);
    const chain = u.searchParams.get('chain') || 'solana';
    try {
      const [detail, dbRow, secDetail] = await Promise.all([
        getTokenDetail(address, chain),
        supabase.from('zhilabs_ranking').select('holders').eq('token', address).maybeSingle().then(r => r.data),
        getTokenSecurityDetail(address, chain).catch(() => null),
      ]);
      if (!detail) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: '未找到该代币' }));
        return;
      }
      if (detail.holders == null && dbRow?.holders != null) {
        detail.holders = dbRow.holders;
      }
      if (detail.holders == null && secDetail?.holderCount != null) {
        detail.holders = secDetail.holderCount;
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(detail));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: e?.message || String(e) }));
    }
    return;
  }
  // K线 API
  const klineMatch = urlPath.match(/^\/api\/kline\/(.+)$/);
  if (klineMatch && req.method === 'GET') {
    const pairAddress = decodeURIComponent(klineMatch[1]);
    const chain = u.searchParams.get('chain') || 'solana';
    const interval = parseInt(u.searchParams.get('interval') || '15', 10);
    const size = parseInt(u.searchParams.get('size') || '96', 10);
    try {
      const data = await getKline(pairAddress, chain, interval, size);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(data));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: e?.message || String(e) }));
    }
    return;
  }
  // 代币详情页（服务端预取代币信息用于 SEO meta 标签）
  if (urlPath.startsWith('/token/') && urlPath.length > 7) {
    const address = decodeURIComponent(urlPath.slice(7));
    let tokenInfo = {};
    try {
      const rows = await supabase
        .from('zhilabs_ranking')
        .select('name, symbol, token')
        .eq('token', address)
        .maybeSingle();
      if (rows.data) tokenInfo = rows.data;
      if (!tokenInfo.name) {
        const pumpRows = await supabase
          .from('solana_pump_ranking')
          .select('name, symbol, token')
          .eq('token', address)
          .maybeSingle();
        if (pumpRows.data) tokenInfo = pumpRows.data;
      }
    } catch (_) { /* 降级为默认 SEO 信息 */ }
    if (!tokenInfo.token) tokenInfo.token = address;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(buildTokenDetailPage(tokenInfo));
    return;
  }
  // 欢迎页：根路径
  if (urlPath === '/' || urlPath === '/index.html') {
    try {
      const welcomePath = path.join(PUBLIC_DIR, 'index.html');
      let html = fs.readFileSync(welcomePath, 'utf8');
      const ga = gaSnippet();
      if (ga) html = html.replace('</head>', ga + '\n</head>');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Welcome page not found');
    }
    return;
  }
  // 榜单页
  if (urlPath === '/ranking') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(buildRankingPage());
    return;
  }
  // 静态文件服务（favicon.ico 等 public 目录下的文件）
  const safeName = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safeName);
  if (filePath.startsWith(PUBLIC_DIR)) {
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
          '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2',
          '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain',
          '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
        };
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.end(fs.readFileSync(filePath));
        return;
      }
    } catch (_) { /* fall through to 404 */ }
  }
  res.statusCode = 404;
  res.end('Not Found');
});

const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log('Server running on', HOST + ':' + PORT);
  startScheduler();
});
