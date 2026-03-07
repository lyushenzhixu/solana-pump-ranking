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

const aveApiKey = (process.env.AVE_API_KEY || '').trim();
if (!aveApiKey) {
  console.warn('[提示] 未配置 AVE_API_KEY，榜单页「更新 Pump 榜单 / 更新 zhilabs 精选」将不可用。');
  console.warn('  请在项目根目录 .env 中设置 AVE_API_KEY=你的key，或部署时在环境变量中配置并重启服务。');
}

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

const HTML_PAGE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>榜单 · zhilabs</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; background: #0f0f12; color: #e4e4e7; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 0; }
    .tabs button { padding: 0.5rem 1rem; background: #27272a; color: #a1a1aa; border: 1px solid #3f3f46; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
    .tabs button:hover { color: #e4e4e7; border-color: #52525b; }
    .tabs button.active { background: #3f3f46; color: #60a5fa; border-color: #60a5fa; }
    .actions { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
    .actions button { padding: 0.5rem 1rem; background: #1e40af; color: #fff; border: 1px solid #3b82f6; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; }
    .actions button:hover { background: #2563eb; border-color: #60a5fa; }
    .actions button:disabled { opacity: 0.6; cursor: not-allowed; background: #374151; }
    .actions .status { font-size: 0.875rem; color: #a1a1aa; }
    .action-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; padding: 0.5rem 0; border-bottom: 1px solid #27272a; }
    .action-label { font-size: 0.875rem; color: #a1a1aa; }
    .desc { color: #71717a; font-size: 0.875rem; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #27272a; }
    th { color: #a1a1aa; font-weight: 500; text-align: left; }
    th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    img { width: 24px; height: 24px; border-radius: 50%; vertical-align: middle; margin-right: 0.5rem; }
    .back-home { display: inline-block; margin-bottom: 1rem; padding: 0.5rem 1rem; background: #27272a; color: #e4e4e7; border-radius: 6px; text-decoration: none; font-size: 0.875rem; border: 1px solid #3f3f46; transition: background 0.2s, border-color 0.2s; }
    .back-home:hover { background: #3f3f46; border-color: #60a5fa; color: #fff; }
    .panel { display: none; }
    .panel.active { display: block; }
  </style>
</head>
<body>
  <a href="/" class="back-home">← 返回首页</a>
  <h1>榜单</h1>
  <div class="topbar">
    <div class="tabs">
      <button type="button" class="tab-btn active" data-tab="pump">Solana Pump 榜单</button>
      <button type="button" class="tab-btn" data-tab="zhilabs">zhilabs精选</button>
    </div>
  </div>
  <div class="action-row">
    <span class="action-label">刷新数据：</span>
    <div class="actions">
      <button type="button" id="updateBtn">更新 Pump 榜单</button>
      <span class="status" id="updateStatus"></span>
    </div>
    <span class="status" id="lastSync"></span>
  </div>
  <p class="desc" id="desc">已成功发射、上线 &lt; 10 天、市值 &gt; 100K，需有图片，insider ≤50%，Top10 持仓 ≤30%，LP 已 burn/锁定，按 24h 交易量排序</p>
  <div id="panel-pump" class="panel active"><div id="root-pump">加载中…</div></div>
  <div id="panel-zhilabs" class="panel"><div id="root-zhilabs">加载中…</div></div>
  <script>
    function formatCompact(n) {
      if (n == null || Number.isNaN(n)) return '—';
      var num = Number(n);
      if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
      if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'k';
      return '$' + num.toFixed(0);
    }
    function esc(s) {
      if (s == null || s === '') return '';
      var str = String(s);
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function renderTable(list, rootId) {
      var root = document.getElementById(rootId);
      if (!list.length) { root.innerHTML = '<p>暂无数据</p>'; return; }
      var isPump = rootId === 'root-pump';
      var headers = ['#', '代币', '符号', '市值', '24h 交易量', '24h 涨跌', '持币地址'];
      if (isPump) { headers.push('Top10%'); headers.push('LP'); }
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
        table += '<td>' + (i + 1) + '</td>';
        table += '<td>' + (row.logo_url ? '<img src="' + esc(row.logo_url) + '" alt="">' : '') + esc(nameStr) + '</td>';
        table += '<td>' + esc(symbolStr) + '</td>';
        table += '<td class="num">' + formatCompact(row.market_cap) + '</td>';
        table += '<td class="num">' + formatCompact(row.tx_volume_u_24h) + '</td>';
        table += '<td class="num ' + changeCl + '">' + changeStr + '</td>';
        table += '<td class="num">' + (row.holders != null ? row.holders : '—') + '</td>';
        if (isPump) {
          table += '<td class="num">' + (row.holders_top10_percent != null ? Number(row.holders_top10_percent).toFixed(1) + '%' : '—') + '</td>';
          table += '<td>' + (row.lp_burned === true ? '已burn/锁' : (row.lp_burned === false ? '否' : '—')) + '</td>';
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
        else document.getElementById(rootId).innerHTML = '<p style="color:#ef4444">数据格式异常</p>';
      }).catch(function(e) {
        document.getElementById(rootId).innerHTML = '<p style="color:#ef4444">' + (e && e.message ? e.message : String(e)) + '</p>';
      });
    }
    function setUpdateStatus(text, isError) {
      var el = document.getElementById('updateStatus');
      el.textContent = text || '';
      el.style.color = isError ? '#ef4444' : '#a1a1aa';
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
      el.textContent = '最后同步：' + hh + ':' + mm + ':' + ss;
    }
    var currentTab = 'pump';
    document.getElementById('updateBtn').textContent = '更新 Pump 榜单';
    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach(function(btn){ btn.classList.toggle('active', btn.dataset.tab === tab); });
      document.querySelectorAll('.panel').forEach(function(p){ p.classList.toggle('active', p.id === 'panel-' + tab); });
      document.getElementById('desc').textContent = tab === 'pump'
        ? '已成功发射、上线 < 10 天、市值 > 100K，需有图片，insider ≤50%，Top10 持仓 ≤30%，LP 已 burn/锁定，按 24h 交易量排序'
        : 'zhilabs 精选 Meme 代币，按 24h 交易量排序';
      document.getElementById('updateBtn').textContent = tab === 'pump' ? '更新 Pump 榜单' : '更新 zhilabs 精选';
      // 切换 Tab 时主动刷新一次，确保与数据库联动
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
    Promise.allSettled([
        fetch('/api/ranking').then(function(r){ return r.ok ? r.json() : r.text().then(function(t){ throw new Error(t); }); }),
        fetch('/api/ranking/zhilabs').then(function(r){ return r.ok ? r.json() : r.text().then(function(t){ throw new Error(t); }); })
      ]).then(function(results) {
        var r0 = results[0], r1 = results[1];
        if (r0.status === 'fulfilled' && Array.isArray(r0.value)) renderTable(r0.value, 'root-pump');
        else document.getElementById('root-pump').innerHTML = '<p style="color:#ef4444">Pump 榜单: ' + (r0.status === 'rejected' && r0.reason ? (r0.reason.message || r0.reason) : '暂无数据') + '</p>';
        if (r1.status === 'fulfilled' && Array.isArray(r1.value)) renderTable(r1.value, 'root-zhilabs');
        else document.getElementById('root-zhilabs').innerHTML = '<p style="color:#ef4444">zhilabs 精选: ' + (r1.status === 'rejected' && r1.reason ? (r1.reason.message || r1.reason) : '暂无数据') + '</p>';
        setLastSync(new Date());
      });
  </script>
</body>
</html>
`;

const updateRunning = { pump: false, zhilabs: false };

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || '/', 'http://localhost');
  const urlPath = u.pathname || '/';
  if (urlPath === '/health' || urlPath === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, port: PORT }));
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
      let errMsg = e?.message || String(e);
      if (/AVE_API_KEY|AVE API/i.test(errMsg)) {
        errMsg += '。请确认 .env 中已设置 AVE_API_KEY 且已重启服务；若为线上部署，请在平台环境变量中配置 AVE_API_KEY。';
      }
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
      const html = fs.readFileSync(welcomePath, 'utf8');
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
    res.end(HTML_PAGE);
    return;
  }
  res.statusCode = 404;
  res.end('Not Found');
});

const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log('Server running on', HOST + ':' + PORT);
});
