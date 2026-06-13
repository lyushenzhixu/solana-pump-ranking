// src/views/paper-page.js — 模拟盘战绩页(复用 ranking-page 暗色风格)
export function renderPaperPage({ summary, trades }) {
  const s = summary || {};
  const active = trades.filter(t => t.status === 'open');
  const closed = trades.filter(t => t.status === 'closed');
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));  // XSS guard(Codex)
  const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%`);
  const color = (v) => (v == null ? '#888' : v >= 0 ? '#3fb950' : '#f85149');
  const badge = (src) => `<span class="badge">${esc(src)}</span>`;
  const fmtMc = (v) => (v == null ? '—' : `$${(v / 1000).toFixed(0)}K`);

  const card = (label, val, c) => `<div class="card"><div class="lbl">${label}</div><div class="val" style="color:${c||'#eee'}">${val}</div></div>`;

  const activeRows = active.map(t => `<tr>
    <td>${esc(t.ticker || '?')} ${t.price_stale ? '<span title="估值延迟">⏳</span>' : ''}${t.execution_stale ? '<span title="退出逻辑本轮未评估">⚠️</span>' : ''}</td>
    <td>${badge(t.source)}</td><td>${fmtMc(t.entry_mc)}</td><td>${fmtMc(t.current_mc)}</td>
    <td style="color:${color(t.pnl_pct)}">${pct(t.pnl_pct)}</td>
    <td>${fmtMc(t.stop_loss_mc)} / ${fmtMc(t.take_profit_mc)}</td></tr>`).join('');

  const closedRows = closed.map(t => `<tr>
    <td>${esc(t.ticker || '?')}</td><td>${badge(t.source)}</td>
    <td>${fmtMc(t.entry_mc)} → ${fmtMc(t.exit_mc)}</td>
    <td style="color:${color(t.pnl_pct)}">${pct(t.pnl_pct)}</td>
    <td>${esc(t.triggered_by || '—')}</td><td>${esc((t.closed_at || '').slice(0, 16).replace('T', ' '))}</td></tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>模拟盘战绩 · zhizhi labs</title>
  <style>
    body{background:#0d1117;color:#e6edf3;font-family:system-ui,'PingFang SC',sans-serif;margin:0;padding:24px;max-width:1100px;margin:0 auto}
    .banner{background:#1f2730;border:1px solid #30363d;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:13px;color:#9aa7b3}
    .cards{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px}
    .card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px 18px;min-width:120px}
    .lbl{font-size:12px;color:#8b949e}.val{font-size:22px;font-weight:600;margin-top:4px}
    .srcrow{font-size:12px;color:#8b949e;margin:8px 0 18px}
    table{width:100%;border-collapse:collapse;margin:10px 0 26px}
    th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #21262d;font-size:13px}
    th{color:#8b949e;font-weight:500}
    .badge{background:#21262d;border-radius:4px;padding:2px 7px;font-size:11px;color:#79c0ff}
    h2{font-size:15px;margin:18px 0 6px}
    a{color:#79c0ff}
  </style></head><body>
  <div class="banner">⚠️ 模拟交易（paper trading）· 已建模手续费 + 滑点 · 非投资建议 · 不代表真实持仓。样本 ${s.closed_count || 0} 笔已平 · 初始 $${s.initial_capital_usd || 500}${s.equity_degraded ? ` · 权益含 ${s.stale_position_count} 个延迟估值仓` : ''}</div>
  <div class="cards">
    ${card('总收益', pct(s.total_return_pct), color(s.total_return_pct))}
    ${card('权益', `$${(s.equity_usd || 0).toFixed(0)}`)}
    ${card('胜率', `${s.win_rate_pct || 0}%`)}
    ${card('活仓 / 已平', `${s.active_count || 0} / ${s.closed_count || 0}`)}
    ${card('已实现 / 浮动', `$${(s.realized_pnl_usd||0).toFixed(0)} / $${(s.unrealized_pnl_usd||0).toFixed(0)}`)}
  </div>
  <div class="srcrow">来源:${Object.entries(s.source_stats || {}).map(([k, v]) => `${k} ${v.n}笔/胜率${v.win_rate}%`).join(' · ') || '—'} · 更新 ${(s.last_success_at||'').slice(0,16).replace('T',' ')}</div>
  <h2>活仓 (${active.length})</h2>
  <table><tr><th>Token</th><th>来源</th><th>Entry MC</th><th>当前 MC</th><th>浮盈</th><th>止损/目标</th></tr>${activeRows || '<tr><td colspan=6 style="color:#8b949e">无</td></tr>'}</table>
  <h2>已平 (${closed.length})</h2>
  <table><tr><th>Token</th><th>来源</th><th>Entry→Exit MC</th><th>实现</th><th>触发</th><th>平仓时间</th></tr>${closedRows || '<tr><td colspan=6 style="color:#8b949e">无</td></tr>'}</table>
  </body></html>`;
}
