import assert from 'node:assert/strict';
import { GLOSSARY, termHtml } from '../src/views/_shared/signal-glossary.js';

assert.ok(GLOSSARY['SWING'].length > 5, 'SWING 有解释');
assert.match(termHtml('SWING'), /class="zl-term"/, 'termHtml 包裹术语');
assert.match(termHtml('SWING'), /role="tooltip"/, 'termHtml 含 tooltip');
assert.equal(termHtml('未知词'), '未知词', '未知词原样返回');
console.log('glossary OK');

import { esc, renderGlassNav, renderGlassHead } from '../src/views/_shared/glass-shell.js';
assert.equal(esc('<b>"x"&'), '&lt;b&gt;&quot;x&quot;&amp;', 'esc 转义');
assert.match(renderGlassNav('paper'), /\/paper" class="on"/, 'nav 高亮当前页');
assert.match(renderGlassNav(''), /aria-disabled="true"/, '研究 为 disabled 占位');
assert.match(renderGlassHead({title:'t',seoHead:'<meta name="x">'}), /<meta name="x">/, 'seoHead 透传');
assert.match(renderGlassHead({title:'t'}), /glass-system\.css/, '引共享 CSS');
console.log('shell OK');
