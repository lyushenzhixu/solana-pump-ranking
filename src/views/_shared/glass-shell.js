// 无框架字符串助手:消除 3 个 JS view 重复的 head/背景/导航 markup。
export const esc = (v) => String(v == null ? '' : v)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">`;

// seoHead = buildSeoMeta() 输出原样透传;ga = 各 view 现有 GA snippet,务必透传否则统计丢失
// (ranking-page.js / token-detail-page.js 现在在模板内注入 GA;切到本助手时把那段作为 ga 传入)。
export function renderGlassHead({ title, seoHead = '', ga = '', extraCss = '' }) {
  return `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${seoHead}
${FONTS}
<link rel="stylesheet" href="/styles/glass-system.css">
<meta name="view-transition" content="same-origin">
<style>${extraCss}</style>
${ga}</head>`;
}

export function renderGlassBackground() {
  return `<div class="zl-page-bg" aria-hidden="true"></div>`;
}

// active: 'ranking' | 'kb' | 'paper'
export function renderGlassNav(active = '') {
  const link = (href, key, label, disabled) => disabled
    ? `<a aria-disabled="true" title="即将上线">${label}</a>`
    : `<a href="${href}" class="${active === key ? 'on' : ''}">${label}</a>`;
  return `<nav class="zl-nav zl-glass-panel" style="border-radius:0;border-left:0;border-right:0;border-top:0">
    <a class="zl-brand" href="/"><span style="width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,var(--sol-purple),var(--sol-green))"></span>Zhizhi Labs</a>
    <span class="zl-links">
      ${link('/ranking','ranking','发现榜')}
      ${link('/ranking#kb','kb','KB 信号')}
      ${link('/paper','paper','模拟盘')}
      ${link('#','research','研究', true)}
    </span></nav>`;
}
