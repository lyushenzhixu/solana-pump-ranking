/**
 * 榜单 Web 服务：从 Supabase 读取 solana_pump_ranking 并对外提供 API + 简单页面
 * Railway 部署时通过 PORT 启动
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import http from 'http';

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

const HTML_PAGE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Solana Pump 榜单</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem; background: #0f0f12; color: #e4e4e7; }
    h1 { font-size: 1.25rem; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #27272a; }
    th { color: #a1a1aa; font-weight: 500; }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    img { width: 24px; height: 24px; border-radius: 50%; vertical-align: middle; margin-right: 0.5rem; }
  </style>
</head>
<body>
  <h1>Solana Pump 榜单</h1>
  <p style="color:#71717a;font-size:0.875rem;">已成功发射、上线 &lt; 10 天、市值 &gt; 100K，按 24h 交易量排序</p>
  <div id="root">加载中…</div>
  <script>
    fetch('/api/ranking')
      .then(r => r.json())
      .then(list => {
        if (!list.length) { document.getElementById('root').innerHTML = '<p>暂无数据</p>'; return; }
        const headers = ['#', '代币', '符号', '市值 (USD)', '24h 交易量', '24h 涨跌', '持币地址'];
        let table = '<table><thead><tr>' + headers.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>';
        list.forEach((row, i) => {
          const change = row.price_change_24h != null ? parseFloat(row.price_change_24h) : null;
          const changeCl = change != null ? (change >= 0 ? 'positive' : 'negative') : '';
          const changeStr = change != null ? (change >= 0 ? '+' : '') + change.toFixed(2) + '%' : '—';
          table += '<tr>';
          table += '<td>' + (i + 1) + '</td>';
          table += '<td>' + (row.logo_url ? '<img src="' + row.logo_url + '" alt="">' : '') + (row.name || '—') + '</td>';
          table += '<td>' + (row.symbol || '—') + '</td>';
          table += '<td class="num">' + (row.market_cap != null ? '$' + Number(row.market_cap).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—') + '</td>';
          table += '<td class="num">' + (row.tx_volume_u_24h != null ? '$' + Number(row.tx_volume_u_24h).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—') + '</td>';
          table += '<td class="num ' + changeCl + '">' + changeStr + '</td>';
          table += '<td class="num">' + (row.holders != null ? row.holders : '—') + '</td>';
          table += '</tr>';
        });
        table += '</tbody></table>';
        document.getElementById('root').innerHTML = table;
      })
      .catch(e => { document.getElementById('root').innerHTML = '<p style="color:#ef4444">加载失败: ' + e.message + '</p>'; });
  </script>
</body>
</html>
`;

const server = http.createServer(async (req, res) => {
  const path = req.url?.split('?')[0] || '/';
  if (path === '/health' || path === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, port: PORT }));
    return;
  }
  if (path === '/api/ranking') {
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
  if (path === '/' || path === '/index.html') {
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
