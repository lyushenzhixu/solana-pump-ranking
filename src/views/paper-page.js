// src/views/paper-page.js — 模拟盘战绩页(glass 系统皮肤, 2026-06-13)
import { renderGlassHead, renderGlassBackground, renderGlassNav } from './_shared/glass-shell.js';

export function renderPaperPage({ summary, trades }) {
  const s = summary || {};
  const active = trades.filter(t => t.status === 'open');
  const closed = trades.filter(t => t.status === 'closed');
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));  // XSS guard(Codex)
  const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}%`);
  const color = (v) => (v == null ? '#888' : v >= 0 ? '#3fb950' : '#f85149');
  const badge = (src) => `<span class="zl-bdg new">${esc(src)}</span>`;
  const fmtMc = (v) => {
    if (v == null) return '—';
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;   // ≥$1M 显示为 $X.XM,读起来更顺
    return `$${(v / 1000).toFixed(0)}K`;
  };

  const card = (label, val, c) =>
    `<div class="zl-stat-card"><div class="zl-l">${label}</div><div class="zl-v zl-num" style="color:${c || ''}">${val}</div></div>`;

  const activeRows = active.map(t => `<tr>
    <td>${esc(t.ticker || '?')} ${t.price_stale ? '<span title="估值延迟">⏳</span>' : ''}${t.execution_stale ? '<span title="退出逻辑本轮未评估">⚠️</span>' : ''}</td>
    <td>${badge(t.source)}</td><td>${fmtMc(t.entry_mc)}</td><td>${fmtMc(t.current_mc)}</td>
    <td class="zl-num" style="color:${color(t.pnl_pct)}">${pct(t.pnl_pct)}</td>
    <td class="zl-num">${fmtMc(t.stop_loss_mc)} / ${fmtMc(t.take_profit_mc)}</td></tr>`).join('');

  const closedRows = closed.map(t => `<tr>
    <td>${esc(t.ticker || '?')}</td><td>${badge(t.source)}</td>
    <td class="zl-num">${fmtMc(t.entry_mc)} → ${fmtMc(t.exit_mc)}</td>
    <td class="zl-num" style="color:${color(t.pnl_pct)}">${pct(t.pnl_pct)}</td>
    <td>${esc(t.triggered_by || '—')}</td><td>${esc((t.closed_at || '').slice(0, 16).replace('T', ' '))}</td></tr>`).join('');

  const extraCss = `
    body{font-family:var(--font-ui);color:var(--text-primary);margin:0}
    .srcrow{font-size:12px;color:var(--text-muted);margin:8px 0 18px}
    h2{font-size:15px;font-family:var(--font-ui);color:var(--text-secondary);margin:22px 0 8px;font-weight:600}
  `;

  return `<!doctype html><html lang="zh">
${renderGlassHead({ title: '模拟盘战绩 · Zhizhi Labs', extraCss })}
<body>
${renderGlassBackground()}
${renderGlassNav('paper')}
<main style="max-width:1100px;margin:0 auto;padding:24px">
  <div class="zl-glass-panel" style="padding:12px 16px;margin-bottom:18px;font-size:13px;color:var(--text-muted)">
    ⚠️ 模拟交易（paper trading）· 已建模手续费 + 滑点 · 非投资建议 · 不代表真实持仓。样本 ${s.closed_count || 0} 笔已平 · 初始 $${s.initial_capital_usd || 500}${s.equity_degraded ? ` · 权益含 ${s.stale_position_count} 个延迟估值仓` : ''}
  </div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px">
    ${card('总收益', pct(s.total_return_pct), color(s.total_return_pct))}
    ${card('权益', `$${(s.equity_usd || 0).toFixed(0)}`)}
    ${card('胜率', `${s.win_rate_pct || 0}%`)}
    ${card('活仓 / 已平', `${s.active_count || 0} / ${s.closed_count || 0}`)}
    ${card('已实现 / 浮动', `$${(s.realized_pnl_usd || 0).toFixed(0)} / $${(s.unrealized_pnl_usd || 0).toFixed(0)}`)}
  </div>
  <div class="srcrow">来源:${Object.entries(s.source_stats || {}).map(([k, v]) => `${esc(k)} ${esc(v.n)}笔/胜率${esc(v.win_rate)}%`).join(' · ') || '—'} · 更新 ${(s.last_success_at || '').slice(0, 16).replace('T', ' ')}</div>
  <h2>活仓 (${active.length})</h2>
  <div class="zl-data-card zl-table-scroll">
    <table class="zl-data-table">
      <thead><tr><th>Token</th><th>来源</th><th>Entry MC</th><th>当前 MC</th><th>浮盈</th><th>止损/目标</th></tr></thead>
      <tbody>${activeRows || '<tr><td colspan=6 style="color:var(--text-muted)">无</td></tr>'}</tbody>
    </table>
  </div>
  <h2>已平 (${closed.length})</h2>
  <div class="zl-data-card zl-table-scroll">
    <table class="zl-data-table">
      <thead><tr><th>Token</th><th>来源</th><th>Entry→Exit MC</th><th>实现</th><th>触发</th><th>平仓时间</th></tr></thead>
      <tbody>${closedRows || '<tr><td colspan=6 style="color:var(--text-muted)">无</td></tr>'}</tbody>
    </table>
  </div>
</main>
</body></html>`;
}
