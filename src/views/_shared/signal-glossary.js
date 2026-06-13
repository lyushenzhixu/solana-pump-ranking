// 术语 → 一句话解释。与 KB 信号档位语义对齐,避免脱节。
export const GLOSSARY = {
  'AI 叙事': 'AI 对该代币社区叙事/题材的归纳分析,非投资建议。',
  'KB 信号': '知智 KB(链上分析知识库)对该币的判断标签,来源 /api/kb-signals。',
  'CONVICTION': 'KB 最高档位:多维证据齐备的高确信信号(5-10% 仓位级别)。',
  'SWING': 'KB 波段档:satisfies 部分证据,适合波段而非重仓(1-3% 级别)。',
  'WATCH': 'KB 观察档:有苗头但证据不足,先观察不入场。',
  'SMALL': 'KB 小仓档:可小仓试探(0.5-1% 级别)。',
  'PASS': 'KB 跳过:不构成入场依据。',
  'Top10%': '前 10 大持有地址占总供应比例,越高越集中(庄控/砸盘风险)。',
  '聪明钱': '历史上有可验证盈利轨迹的链上钱包;其建仓常作为早期信号之一。',
};

const escTerm = (v)=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 把术语包成可 hover 的 .zl-term。内部转义 label,可安全接受动态信号文本(如 termHtml(sig))。
export function termHtml(label, key) {
  const safe = escTerm(label);
  const def = GLOSSARY[key || label];
  if (!def) return safe;
  return `<span class="zl-term" tabindex="0" aria-label="${safe}:${escTerm(def)}">${safe}` +
    `<span class="zl-pop" role="tooltip">${escTerm(def)}</span></span>`;
}
