/**
 * 榜单 Web 服务：从 Supabase 读取 solana_pump_ranking 并对外提供 API + 简单页面
 * 根路径 / 为欢迎页，/ranking 为榜单页。Railway 部署时通过 PORT 启动
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = process.env.PORT || 3000;
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

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
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .tabs button { padding: 0.5rem 1rem; background: #27272a; color: #a1a1aa; border: 1px solid #3f3f46; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
    .tabs button:hover { color: #e4e4e7; border-color: #52525b; }
    .tabs button.active { background: #3f3f46; color: #60a5fa; border-color: #60a5fa; }
    .desc { color: #71717a; font-size: 0.875rem; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #27272a; }
    th { color: #a1a1aa; font-weight: 500; }
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
  <div class="tabs">
    <button type="button" class="tab-btn active" data-tab="pump">Solana Pump 榜单</button>
    <button type="button" class="tab-btn" data-tab="zhilabs">zhilabs精选</button>
  </div>
  <p class="desc" id="desc">已成功发射、上线 &lt; 10 天、市值 &gt; 100K，按 24h 交易量排序</p>
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
      var headers = ['#', '代币', '符号', '市值', '24h 交易量', '24h 涨跌', '持币地址'];
      var table = '<table><thead><tr>' + headers.map(function(h){ return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>';
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
        table += '</tr>';
      });
      table += '</tbody></table>';
      root.innerHTML = table;
    }
    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(function(btn){ btn.classList.toggle('active', btn.dataset.tab === tab); });
      document.querySelectorAll('.panel').forEach(function(p){ p.classList.toggle('active', p.id === 'panel-' + tab); });
      document.getElementById('desc').textContent = tab === 'pump'
        ? '已成功发射、上线 < 10 天、市值 > 100K，按 24h 交易量排序'
        : 'zhilabs 精选 Meme 代币，按 24h 交易量排序';
    }
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
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
      });
  </script>
</body>
</html>
`;

const server = http.createServer(async (req, res) => {
  const urlPath = req.url?.split('?')[0] || '/';
  if (urlPath === '/health' || urlPath === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, port: PORT }));
    return;
  }
  if (urlPath === '/api/ranking') {
    try {
      const data = await getRanking();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
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
