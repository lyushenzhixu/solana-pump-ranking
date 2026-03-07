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
return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>榜单 · zhilabs</title>
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
      <h1 class="page-title">⟡ 榜单</h1>
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
        table += '<tr>';
        table += '<td><span class="' + rankClass(i) + '">' + (i + 1) + '</span></td>';
        var caStr = typeof row.token === 'string' ? row.token : '';
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
      if (!btn) return;
      e.preventDefault();
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
  res.statusCode = 404;
  res.end('Not Found');
});

const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log('Server running on', HOST + ':' + PORT);
  startScheduler();
});
