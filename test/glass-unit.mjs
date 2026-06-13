import assert from 'node:assert/strict';
import { GLOSSARY, termHtml } from '../src/views/_shared/signal-glossary.js';

assert.ok(GLOSSARY['SWING'].length > 5, 'SWING 有解释');
assert.match(termHtml('SWING'), /class="zl-term"/, 'termHtml 包裹术语');
assert.match(termHtml('SWING'), /role="tooltip"/, 'termHtml 含 tooltip');
assert.equal(termHtml('未知词'), '未知词', '未知词原样返回');
console.log('glossary OK');
