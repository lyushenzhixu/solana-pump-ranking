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
import { getTokenDetail, getKline, getTokenSecurityDetail, fetchSmartMoneySignals, fetchSmartMoneyInflowRank, okxOnchain } from './data-sources/index.js';
import * as dexscreener from './data-sources/dexscreener.js';
import { getTokenNarrative, getTokenHotTweets, batchPrefetch } from './data-sources/sixfivefiveone.js';
import { refreshZhilabsNarratives } from '../scripts/refresh-zhilabs-narratives.js';
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
if (okxOnchain.isConfigured()) {
  console.log('[数据源] OKX OnchainOS API 已配置，将用于补充代币数据');
} else {
  console.log('[数据源] OKX OnchainOS API 未配置（可选），设置 OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE 启用');
}

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
    // 旧缓存不含链上叙事 → 视为过期，强制重新获取
    if (!data.twitter_narrative) return null;
    return {
      summary: data.summary || '',
      articles: data.articles || [],
      sentiment: data.sentiment || 'neutral',
      sourceCount: data.source_count || 0,
      twitterNarrative: data.twitter_narrative || null,
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
      twitter_narrative: narrative.twitterNarrative || null,
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
      --okx-black: #050505;
      --okx-white: #e0e0e0;
      --okx-accent: #a0a0a0;
      --okx-green: #7dd3a8;
      --okx-border: rgba(255,255,255,0.08);
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
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
      font-family: 'Exo 2', sans-serif;
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
      font-family: 'JetBrains Mono', 'Exo 2', monospace;
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
      font-family: 'JetBrains Mono', 'Exo 2', monospace;
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
      font-family: 'JetBrains Mono', 'Exo 2', monospace;
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
      font-family: 'JetBrains Mono', 'Exo 2', monospace;
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
      font-family: 'JetBrains Mono', 'Exo 2', monospace;
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
      font-family: 'JetBrains Mono', 'Exo 2', monospace;
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
      font-family: 'JetBrains Mono', 'Exo 2', monospace;
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
      font-family: 'JetBrains Mono', 'Exo 2', monospace;
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
      font-family: 'JetBrains Mono', 'Exo 2', monospace;
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
      font-family: 'Exo 2', sans-serif;
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
    .sub-tabs.okx-sub-tabs button.active { color: var(--okx-white); border-bottom-color: var(--okx-white); }

    /* === OKX VARIANT STYLES === */
    .signal-cards-okx .signal-card {
      background: var(--okx-black);
      border-color: var(--okx-border);
    }
    .signal-cards-okx .signal-card::before {
      background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 60%);
    }
    .signal-cards-okx .signal-card:hover {
      border-color: rgba(255,255,255,0.25);
      box-shadow: 0 0 24px rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.5);
    }
    .signal-cards-okx .signal-card-live-bar {
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .signal-cards-okx .signal-card-live-dot {
      background: var(--okx-white);
      box-shadow: 0 0 6px rgba(224,224,224,0.6);
    }
    .signal-cards-okx .signal-card-live-text {
      color: var(--okx-white);
      text-shadow: none;
    }
    .signal-cards-okx .signal-card-live-sm { color: rgba(255,255,255,0.3); }
    .signal-cards-okx .signal-card-head img {
      border-color: rgba(255,255,255,0.15);
      background: rgba(20,20,20,0.5);
      box-shadow: 0 0 8px rgba(255,255,255,0.04);
    }
    .signal-cards-okx .signal-card-logo-placeholder {
      border-color: rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.06);
      color: var(--okx-white);
      box-shadow: none;
    }
    .signal-cards-okx .signal-card-chain {
      background: rgba(255,255,255,0.08);
      color: var(--okx-accent);
    }
    .signal-cards-okx .signal-card-chain[data-chain="bsc"] {
      background: rgba(255,255,255,0.1);
      color: var(--okx-white);
    }
    .signal-cards-okx .signal-card-active {
      color: var(--okx-green);
      text-shadow: 0 0 6px rgba(125,211,168,0.3);
    }
    .signal-cards-okx .signal-card-stats-item {
      background: rgba(255,255,255,0.02);
    }
    .signal-cards-okx .signal-card-stats-item:not(:last-child) {
      border-right-color: rgba(255,255,255,0.04);
    }
    .signal-cards-okx .signal-card-stats-item .label { color: rgba(255,255,255,0.3); }
    .signal-cards-okx .signal-card-stats-item .value.inflow-positive {
      color: var(--okx-green);
      text-shadow: 0 0 6px rgba(125,211,168,0.3);
    }
    .signal-cards-okx .signal-card-bar-buy {
      background: repeating-linear-gradient(90deg, var(--okx-white), var(--okx-white) 4px, #888 4px, #888 6px);
      box-shadow: 0 0 6px rgba(224,224,224,0.2);
    }
    .signal-cards-okx .signal-card-bar-sell {
      background: repeating-linear-gradient(90deg, #ff5252, #ff5252 4px, rgba(255,82,82,0.4) 4px, rgba(255,82,82,0.4) 6px);
    }
    .signal-cards-okx .signal-card-bar-labels .buy {
      color: var(--okx-white);
      text-shadow: none;
    }
    .signal-cards-okx .signal-card-ca { color: rgba(255,255,255,0.25); }
    .signal-cards-okx .signal-card-time { color: rgba(255,255,255,0.25); }
    .signal-cards-okx .signal-card-scanline { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.015), transparent); }
    .signal-cards-okx .signal-card-stats { border-color: rgba(255,255,255,0.04); }

    .inflow-cards-okx .inflow-rank-card {
      background: var(--okx-black);
      border-color: var(--okx-border);
    }
    .inflow-cards-okx .inflow-rank-card:hover { border-color: rgba(255,255,255,0.2); }
    .inflow-cards-okx .inflow-rank-pos {
      background: rgba(255,255,255,0.08);
      color: var(--okx-white);
    }
    .inflow-cards-okx .inflow-rank-pos.top3 {
      background: var(--okx-white);
      color: var(--okx-black);
    }
    .inflow-cards-okx .inflow-rank-logo {
      border-color: rgba(255,255,255,0.15);
    }
    .inflow-cards-okx .inflow-rank-logo-placeholder {
      background: rgba(255,255,255,0.08);
      color: var(--okx-white);
      border-color: rgba(255,255,255,0.15);
    }
    .inflow-cards-okx .inflow-rank-chain {
      background: rgba(255,255,255,0.08);
      color: var(--okx-white);
    }
    .inflow-cards-okx .inflow-rank-traders {
      color: var(--okx-white);
    }
    .inflow-cards-okx .inflow-rank-bar-buy {
      background: var(--okx-white);
    }
    .inflow-cards-okx .inflow-rank-bar-labels .buy { color: var(--okx-white); }
    .inflow-cards-okx .inflow-rank-tag {
      background: rgba(255,255,255,0.06);
      border-color: rgba(255,255,255,0.1);
    }
    .inflow-cards-okx .inflow-rank-live-dot {
      background: var(--okx-white);
      box-shadow: 0 0 6px rgba(224,224,224,0.4);
    }

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
        <button type="button" class="tab-btn" data-tab="okx">OKX Skill</button>
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
    <div class="sub-tabs okx-sub-tabs" id="subTabsOkx" style="display:none">
      <button type="button" class="sub-tab-btn active" data-subtab="okx-signal">OKX 涨幅榜</button>
      <button type="button" class="sub-tab-btn" data-subtab="okx-inflow">OKX 交易量榜</button>
      <button type="button" class="sub-tab-btn" data-subtab="okx-kol">OKX 市值榜</button>
    </div>

    <p class="desc" id="desc">已成功发射、上线 &lt; 10 天、市值 &gt; 100K，需有图片，insider ≤50%，Top10 持仓 ≤30%，按 24h 交易量排序</p>

    <div class="table-card">
      <div id="panel-pump" class="panel active"><div id="root-pump"><div class="loading-text">加载中</div></div></div>
      <div id="panel-zhilabs" class="panel"><div id="root-zhilabs"><div class="loading-text">加载中</div></div></div>
      <div id="panel-bn-signal" class="panel"><div id="root-bn-signal"><div class="loading-text">加载中</div></div></div>
      <div id="panel-bn-inflow" class="panel"><div id="root-bn-inflow"><div class="loading-text">加载中</div></div></div>
      <div id="panel-bn-kol" class="panel"><div id="root-bn-kol"><div class="loading-text">加载中</div></div></div>
      <div id="panel-okx-signal" class="panel"><div id="root-okx-signal"><div class="loading-text">加载中</div></div></div>
      <div id="panel-okx-inflow" class="panel"><div id="root-okx-inflow"><div class="loading-text">加载中</div></div></div>
      <div id="panel-okx-kol" class="panel"><div id="root-okx-kol"><div class="loading-text">加载中</div></div></div>
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
      if (variant === 'okx') gridClass += ' signal-cards-okx';
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
      if (variant === 'okx') gridClass += ' inflow-cards-okx';
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
      if (panelKey === 'okx-signal') {
        return fetchJsonOrThrow('/api/okx/token-ranking?sortType=1').then(function(list) {
          if (Array.isArray(list)) renderTable(list, rootId);
          else rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">数据格式异常</div>';
        }).catch(function(e) {
          rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">' + (e && e.message ? e.message : String(e)) + '</div>';
        });
      }
      if (panelKey === 'okx-inflow') {
        return fetchJsonOrThrow('/api/okx/token-ranking?sortType=2').then(function(list) {
          if (Array.isArray(list)) renderTable(list, rootId);
          else rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">数据格式异常</div>';
        }).catch(function(e) {
          rootEl.innerHTML = '<div class="loading-text" style="color:var(--negative);animation:none">' + (e && e.message ? e.message : String(e)) + '</div>';
        });
      }
      if (panelKey === 'okx-kol') {
        return fetchJsonOrThrow('/api/okx/token-ranking?sortType=3').then(function(list) {
          if (Array.isArray(list)) renderTable(list, rootId);
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
      if (tab === 'okx') return refreshPanel(currentSubTab || 'okx-signal');
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
    var okxSubTabs = { 'okx-signal': true, 'okx-inflow': true, 'okx-kol': true };
    var defaultBnSub = 'bn-signal';
    var defaultOkxSub = 'okx-signal';
    document.getElementById('updateBtn').querySelector('span').textContent = '更新 Pump 榜单';

    function showSubTabs(tab) {
      document.getElementById('subTabsBinance').style.display = tab === 'binance' ? 'flex' : 'none';
      document.getElementById('subTabsOkx').style.display = tab === 'okx' ? 'flex' : 'none';
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
      } else if (tab === 'okx') {
        if (subTab === 'okx-signal') descEl.textContent = 'OKX OnchainOS 代币涨幅排行（Solana），按 24h 涨跌排序';
        else if (subTab === 'okx-inflow') descEl.textContent = 'OKX OnchainOS 代币交易量排行（Solana），按 24h 成交量排序';
        else if (subTab === 'okx-kol') descEl.textContent = 'OKX OnchainOS 代币市值排行（Solana），按市值排序';
      }
    }

    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach(function(btn){ btn.classList.toggle('active', btn.dataset.tab === tab); });
      showSubTabs(tab);
      if (tab === 'binance') {
        currentSubTab = defaultBnSub;
        activatePanel(currentSubTab);
        document.querySelectorAll('#subTabsBinance .sub-tab-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.subtab === currentSubTab); });
      } else if (tab === 'okx') {
        currentSubTab = defaultOkxSub;
        activatePanel(currentSubTab);
        document.querySelectorAll('#subTabsOkx .sub-tab-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.subtab === currentSubTab); });
      } else {
        currentSubTab = '';
        activatePanel(tab);
      }
      updateDesc(tab, currentSubTab);
      var btnText = tab === 'pump' ? '更新 Pump 榜单' : (tab === 'zhilabs' ? '更新 zhizhilabs 精选' : '刷新数据');
      document.getElementById('updateBtn').querySelector('span').textContent = btnText;
      var narrativeBtn = document.getElementById('refreshNarrativeBtn');
      if (narrativeBtn) narrativeBtn.style.display = tab === 'zhilabs' ? '' : 'none';
      refreshTab(tab).then(function(){ setLastSync(new Date()); }).catch(function(){});
    }

    function switchSubTab(subTab) {
      currentSubTab = subTab;
      var parentId = bnSubTabs[subTab] ? 'subTabsBinance' : 'subTabsOkx';
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
      if (tab === 'binance' || tab === 'okx') {
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
      if (tab === 'binance' || tab === 'okx') startInflowAutoRefresh();
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
  <script src="https://unpkg.com/lightweight-charts@4.2.2/dist/lightweight-charts.standalone.production.js"><\/script>
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
      font-family: 'Exo 2', system-ui, sans-serif;
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
      font-family: 'Exo 2', sans-serif;
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
      font-family: 'Exo 2', sans-serif;
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
    .chart-intervals {
      display: flex; gap: 2px; align-items: center;
      background: rgba(153,69,255,0.04);
      border-radius: 8px;
      padding: 2px;
    }
    .chart-intervals button {
      font-family: 'Exo 2', sans-serif;
      font-size: 0.6875rem; font-weight: 600;
      padding: 0.3rem 0.55rem;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .chart-intervals button.active {
      color: #fff;
      background: var(--sol-purple);
      box-shadow: 0 0 8px rgba(153,69,255,0.3);
    }
    .chart-intervals button:hover:not(.active) {
      color: var(--text-secondary);
      background: rgba(153,69,255,0.08);
    }
    .chart-ohlcv-bar {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.5rem 1rem 0.25rem;
      font-family: 'Exo 2', monospace;
      font-size: 0.6875rem;
      flex-wrap: wrap;
      min-height: 1.75rem;
    }
    .chart-ohlcv-bar .ohlcv-pair {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.75rem;
      display: flex; align-items: center; gap: 0.375rem;
    }
    .chart-ohlcv-bar .ohlcv-pair .chain-dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: var(--sol-purple);
    }
    .chart-ohlcv-bar .ohlcv-label {
      color: var(--text-muted);
    }
    .chart-ohlcv-bar .ohlcv-val {
      font-variant-numeric: tabular-nums;
    }
    .chart-ohlcv-bar .ohlcv-val.up { color: #14F195; }
    .chart-ohlcv-bar .ohlcv-val.down { color: #ff4d6a; }
    .chart-ohlcv-bar .ohlcv-val.neutral { color: var(--text-secondary); }
    .chart-ohlcv-bar .ohlcv-change {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      padding: 0.1em 0.4em;
      border-radius: 4px;
    }
    .chart-ohlcv-bar .ohlcv-change.up { color: #14F195; background: rgba(20,241,149,0.1); }
    .chart-ohlcv-bar .ohlcv-change.down { color: #ff4d6a; background: rgba(255,77,106,0.1); }
    .chart-vol-label {
      position: absolute; bottom: 72px; left: 16px;
      font-family: 'Exo 2', monospace;
      font-size: 0.625rem;
      color: var(--text-muted);
      pointer-events: none;
      z-index: 2;
      display: flex; align-items: center; gap: 0.375rem;
      opacity: 0.7;
    }
    .chart-vol-label .vol-value {
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
    }
    .chart-body {
      padding: 0 0.25rem 0.25rem;
      position: relative;
    }
    #kline-chart {
      width: 100%;
      height: 460px;
      border-radius: 0 0 10px 10px;
      overflow: hidden;
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
      font-family: 'Exo 2', sans-serif;
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
      .chart-ohlcv-bar { font-size: 0.625rem; gap: 0.5rem; }
      .chart-ohlcv-bar .ohlcv-pair { font-size: 0.6875rem; }
      .chart-intervals button { padding: 0.25rem 0.4rem; font-size: 0.625rem; }
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

      html += '</div>';

      // Two-column layout
      html += '<div class="detail-layout">';

      // Left column: chart + narrative
      html += '<div class="detail-main">';

      // K-line chart (TradingView style)
      html += '<div class="chart-card">';
      html += '<div class="chart-header">';
      html += '<div class="chart-title"><span class="live-dot"></span>K线图表</div>';
      html += '<div class="chart-intervals">';
      html += '<button data-interval="1">1分</button>';
      html += '<button data-interval="5">5分</button>';
      html += '<button class="active" data-interval="15">15分</button>';
      html += '<button data-interval="30">30分</button>';
      html += '<button data-interval="60">1小时</button>';
      html += '<button data-interval="240">4小时</button>';
      html += '<button data-interval="1440">1天</button>';
      html += '</div>';
      html += '</div>';
      html += '<div class="chart-ohlcv-bar" id="chart-ohlcv"></div>';
      html += '<div class="chart-body">';
      html += '<div id="chart-vol-label" class="chart-vol-label">Vol <span class="vol-value" id="vol-display">—</span></div>';
      html += '<div id="kline-chart"><div class="chart-loading">加载K线数据</div></div>';
      html += '</div>';
      html += '</div>';

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

    var _chartInstance = null;
    var _chartResizeHandler = null;

    function fmtPrice(n) {
      if (n == null || isNaN(n)) return '—';
      if (n >= 1) return n.toFixed(4);
      if (n >= 0.01) return n.toFixed(6);
      return n.toFixed(8);
    }

    function fmtVol(n) {
      if (n == null || isNaN(n)) return '—';
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
      return n.toFixed(2);
    }

    function updateOhlcvBar(d, symbol) {
      var bar = document.getElementById('chart-ohlcv');
      if (!bar || !d) { if (bar) bar.innerHTML = ''; return; }
      var bullish = d.close >= d.open;
      var changeAbs = d.close - d.open;
      var changePct = d.open !== 0 ? ((changeAbs / d.open) * 100) : 0;
      var cls = bullish ? 'up' : 'down';
      var sign = bullish ? '+' : '';
      bar.innerHTML =
        '<span class="ohlcv-pair"><span class="chain-dot"></span>' + (symbol || '') + '</span>' +
        '<span class="ohlcv-label">开</span><span class="ohlcv-val ' + cls + '">' + fmtPrice(d.open) + '</span>' +
        '<span class="ohlcv-label">高</span><span class="ohlcv-val ' + cls + '">' + fmtPrice(d.high) + '</span>' +
        '<span class="ohlcv-label">低</span><span class="ohlcv-val ' + cls + '">' + fmtPrice(d.low) + '</span>' +
        '<span class="ohlcv-label">收</span><span class="ohlcv-val ' + cls + '">' + fmtPrice(d.close) + '</span>' +
        '<span class="ohlcv-change ' + cls + '">' + sign + fmtPrice(changeAbs) + ' (' + sign + changePct.toFixed(2) + '%)</span>';
    }

    function loadKlineChart(token, interval) {
      var pairAddress = token.main_pair;
      var chain = token.chain || 'solana';
      interval = interval || 15;
      var sizeMap = { 1: 120, 5: 120, 15: 96, 30: 96, 60: 96, 240: 96, 1440: 60 };
      var size = sizeMap[interval] || 96;
      if (!pairAddress) {
        document.getElementById('kline-chart').innerHTML = '<div class="chart-error">无交易对数据，无法加载K线</div>';
        return;
      }
      document.getElementById('kline-chart').innerHTML = '<div class="chart-loading">加载K线数据</div>';
      document.getElementById('chart-ohlcv').innerHTML = '';
      fetch('/api/kline/' + encodeURIComponent(pairAddress) + '?chain=' + encodeURIComponent(chain) + '&interval=' + interval + '&size=' + size)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!Array.isArray(data) || data.length === 0) {
            document.getElementById('kline-chart').innerHTML = '<div class="chart-error">暂无K线数据</div>';
            return;
          }
          renderChart(data, token.symbol || '');
        })
        .catch(function(e) {
          document.getElementById('kline-chart').innerHTML = '<div class="chart-error">K线加载失败：' + (e.message || e) + '</div>';
        });
    }

    function calcPrecision(data) {
      var minP = Infinity;
      for (var i = 0; i < data.length; i++) {
        var p = Math.min(data[i].open, data[i].close, data[i].low);
        if (p > 0 && p < minP) minP = p;
      }
      if (minP >= 1) return 4;
      if (minP >= 0.01) return 6;
      if (minP >= 0.0001) return 8;
      return 10;
    }

    function renderChart(data, symbol) {
      if (_chartInstance) {
        try { _chartInstance.remove(); } catch(e) {}
        _chartInstance = null;
      }
      if (_chartResizeHandler) {
        window.removeEventListener('resize', _chartResizeHandler);
        _chartResizeHandler = null;
      }

      var precision = calcPrecision(data);
      var minMove = Math.pow(10, -precision);

      var container = document.getElementById('kline-chart');
      container.innerHTML = '';
      var chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight || 460,
        layout: {
          background: { type: 'solid', color: 'transparent' },
          textColor: 'rgba(138,132,160,0.8)',
          fontFamily: "'Exo 2', system-ui, sans-serif",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: 'rgba(153, 69, 255, 0.04)' },
          horzLines: { color: 'rgba(153, 69, 255, 0.04)' },
        },
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal,
          vertLine: {
            color: 'rgba(153, 69, 255, 0.4)',
            width: 1,
            style: LightweightCharts.LineStyle.Dashed,
            labelBackgroundColor: '#9945FF',
          },
          horzLine: {
            color: 'rgba(153, 69, 255, 0.4)',
            width: 1,
            style: LightweightCharts.LineStyle.Dashed,
            labelBackgroundColor: '#9945FF',
          },
        },
        rightPriceScale: {
          borderColor: 'rgba(153, 69, 255, 0.08)',
          scaleMargins: { top: 0.08, bottom: 0.22 },
        },
        timeScale: {
          borderColor: 'rgba(153, 69, 255, 0.08)',
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 5,
          minBarSpacing: 4,
        },
        handleScroll: { vertTouchDrag: false },
      });
      _chartInstance = chart;

      var priceFmt = function(p) {
        if (typeof p !== 'number' || isNaN(p)) return '—';
        return p.toFixed(precision);
      };
      chart.applyOptions({
        localization: { priceFormatter: priceFmt },
      });

      var candleSeries = chart.addCandlestickSeries({
        upColor: '#14F195',
        downColor: '#ff4d6a',
        borderUpColor: '#14F195',
        borderDownColor: '#ff4d6a',
        wickUpColor: 'rgba(20, 241, 149, 0.7)',
        wickDownColor: 'rgba(255, 77, 106, 0.7)',
        priceFormat: { type: 'custom', minMove: minMove, formatter: priceFmt },
      });

      var volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
      });

      var candleData = data.map(function(d) {
        return { time: d.time, open: d.open, high: d.high, low: d.low, close: d.close };
      }).sort(function(a, b) { return a.time - b.time; });

      var volumeData = data.map(function(d) {
        var bullish = d.close >= d.open;
        return {
          time: d.time,
          value: d.volume || 0,
          color: bullish ? 'rgba(20, 241, 149, 0.25)' : 'rgba(255, 77, 106, 0.25)',
        };
      }).sort(function(a, b) { return a.time - b.time; });

      candleSeries.setData(candleData);
      volumeSeries.setData(volumeData);
      chart.timeScale().fitContent();

      // Current price line
      var lastCandle = candleData[candleData.length - 1];
      if (lastCandle) {
        var bullish = lastCandle.close >= lastCandle.open;
        candleSeries.createPriceLine({
          price: lastCandle.close,
          color: bullish ? 'rgba(20,241,149,0.6)' : 'rgba(255,77,106,0.6)',
          lineWidth: 1,
          lineStyle: LightweightCharts.LineStyle.Dashed,
          axisLabelVisible: true,
          title: '',
        });

        updateOhlcvBar(lastCandle, symbol);

        var volEl = document.getElementById('vol-display');
        if (volEl) {
          var lastVol = data[data.length - 1];
          volEl.textContent = lastVol ? fmtVol(lastVol.volume) : '—';
        }
      }

      // Crosshair move → update OHLCV bar + volume label
      chart.subscribeCrosshairMove(function(param) {
        if (!param || !param.time) {
          if (lastCandle) updateOhlcvBar(lastCandle, symbol);
          return;
        }
        var cd = param.seriesData ? param.seriesData.get(candleSeries) : null;
        var vd = param.seriesData ? param.seriesData.get(volumeSeries) : null;
        if (cd) updateOhlcvBar(cd, symbol);
        var volEl = document.getElementById('vol-display');
        if (volEl && vd) volEl.textContent = fmtVol(vd.value);
      });

      _chartResizeHandler = function() {
        chart.applyOptions({ width: container.clientWidth });
      };
      window.addEventListener('resize', _chartResizeHandler);
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
  if (urlPath === '/api/okx/token-ranking') {
    try {
      if (!okxOnchain.isConfigured()) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ error: 'OKX API 未配置，请设置 OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE' }));
        return;
      }
      const u = new URL(req.url || '/', 'http://localhost');
      const sortType = parseInt(u.searchParams.get('sortType') || '1', 10) || 1;
      const chain = u.searchParams.get('chain') || 'solana';
      const page = parseInt(u.searchParams.get('page') || '1', 10) || 1;
      const pageSize = Math.min(parseInt(u.searchParams.get('pageSize') || '50', 10) || 50, 100);
      const raw = await okxOnchain.getTokenRanking({ chain, sortType, page, pageSize });
      const data = (Array.isArray(raw) ? raw : []).map((item) => ({
        token: item.tokenContractAddress || item.address || item.token || '',
        name: item.tokenName || item.name || '',
        symbol: item.tokenSymbol || item.symbol || '',
        logo_url: item.tokenLogoUrl || item.logoUrl || item.icon || null,
        market_cap: parseFloat(item.marketCap || item.market_cap || 0) || null,
        tx_volume_u_24h: parseFloat(item.volume || item.volume24h || item.liquidity || item.tx_volume_u_24h || 0) || null,
        price_change_24h: parseFloat(item.change || item.priceChange24h || item.price_change_24h || 0) || null,
        holders: item.holders != null ? parseInt(item.holders, 10) : null,
      }));
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(data));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: e?.message || String(e) }));
    }
    return;
  }
  if (urlPath === '/api/smart-money-signals') {
    try {
      const u = new URL(req.url || '/', 'http://localhost');
      const page = parseInt(u.searchParams.get('page') || '1', 10) || 1;
      const pageSize = Math.min(parseInt(u.searchParams.get('pageSize') || '100', 10) || 100, 100);
      // 同时拉取 Solana + BSC 聪明钱信号，合并展示
      const [solData, bscData] = await Promise.all([
        fetchSmartMoneySignals({ page, pageSize, chainId: 'CT_501' }),
        fetchSmartMoneySignals({ page, pageSize, chainId: '56' }),
      ]);
      const solWithChain = (Array.isArray(solData) ? solData : []).map((d) => ({ ...d, chain: 'solana', sol: true, bsc: false }));
      const bscWithChain = (Array.isArray(bscData) ? bscData : []).map((d) => ({ ...d, chain: 'bsc', sol: false, bsc: true }));
      let data = [...solWithChain, ...bscWithChain];
      // 用 DexScreener 补充 logo 备用源
      if (data.length > 0) {
        const allAddrs = data.map((d) => d.contractAddress || d.contract_address).filter(Boolean);
        if (allAddrs.length > 0) {
          try {
            const pairs = await dexscreener.getTokenPairs(allAddrs);
            const logoByKey = new Map();
            const chainMap = { solana: 'solana', bsc: 'bsc' };
            for (const p of pairs || []) {
              const addr = (p.baseToken?.address || '').toLowerCase();
              const logo = p.info?.imageUrl || null;
              const dsChain = (p.chainId || '').toLowerCase();
              const chain = chainMap[dsChain] || dsChain || 'solana';
              const key = chain + ':' + addr;
              if (addr && logo && !logoByKey.has(key)) logoByKey.set(key, logo);
            }
            data = data.map((item) => {
              const addr = (item.contractAddress || item.contract_address || '').toLowerCase();
              const key = (item.chain || 'solana') + ':' + addr;
              return { ...item, logoUrlFallback: logoByKey.get(key) || null };
            });
          } catch (_) { /* 忽略 DexScreener 失败 */ }
        }
      }
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
  if (urlPath === '/api/smart-money-inflow') {
    try {
      const tagType = parseInt(u.searchParams.get('tagType') || '1', 10) || 1;
      const [solData, bscData] = await Promise.all([
        fetchSmartMoneyInflowRank({ chainId: 'CT_501', tagType }),
        fetchSmartMoneyInflowRank({ chainId: '56', tagType }),
      ]);
      const solWithChain = (Array.isArray(solData) ? solData : []).map((d) => ({ ...d, chain: 'solana' }));
      const bscWithChain = (Array.isArray(bscData) ? bscData : []).map((d) => ({ ...d, chain: 'bsc' }));
      const data = [...solWithChain, ...bscWithChain]
        .sort((a, b) => (b.inflow || 0) - (a.inflow || 0));
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
  // 强制刷新 zhilabs 精选榜单内所有代币的叙事缓存
  if (urlPath === '/api/ranking/zhilabs/refresh-narratives' && req.method === 'POST') {
    try {
      const result = await refreshZhilabsNarratives();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({
        ok: true,
        updated: result.updated,
        errors: result.errors,
        tokens: result.tokens,
        at: new Date().toISOString(),
      }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: e?.message || String(e) }));
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
      const [detail, pumpRow, zhilabsRow, secDetail] = await Promise.all([
        getTokenDetail(address, chain),
        supabase.from('solana_pump_ranking').select('holders, holders_top10_percent').eq('token', address).maybeSingle().then(r => r.data).catch(() => null),
        supabase.from('zhilabs_ranking').select('holders').eq('token', address).maybeSingle().then(r => r.data).catch(() => null),
        getTokenSecurityDetail(address, chain).catch(() => null),
      ]);
      if (!detail) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: '未找到该代币' }));
        return;
      }
      const dbRow = pumpRow || zhilabsRow;
      if (detail.holders == null && dbRow?.holders != null) {
        detail.holders = dbRow.holders;
      }
      if (detail.holders == null && secDetail?.holderCount != null) {
        detail.holders = secDetail.holderCount;
      }
      // 优先使用数据库（Binance来源）的 top10 数据，保持与榜单一致
      let dbTop10 = pumpRow?.holders_top10_percent ?? null;
      let goplusTop10 = secDetail?.topHolderPercent ?? null;
      // GoPlus 的 topHolderPercent 是 0-1 比例，转换为百分比
      if (goplusTop10 != null && goplusTop10 < 1) goplusTop10 = goplusTop10 * 100;
      let okxTop10 = null;
      if (dbTop10 == null && okxOnchain.isConfigured()) {
        okxTop10 = await okxOnchain.getTop10HolderPercent(address, chain).catch(() => null);
      }
      const finalTop10 = dbTop10 ?? okxTop10 ?? goplusTop10;

      if (secDetail) {
        detail._security = {
          lpNotLocked: secDetail.lpNotLocked,
          isHoneypot: secDetail.isHoneypot,
          buyTax: secDetail.buyTax,
          sellTax: secDetail.sellTax,
          isMintable: secDetail.isMintable,
          isFreezable: secDetail.isFreezable,
          riskLevel: secDetail.riskLevel,
          topHolderPercent: finalTop10,
        };
      } else if (finalTop10 != null) {
        detail._security = { topHolderPercent: finalTop10 };
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
