/**
 * HTML 页面路由: /, /ranking, /token/:address, robots.txt, sitemap.xml
 */
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../supabase.js';
import { buildRankingPage } from '../views/ranking-page.js';
import { buildTokenDetailPage } from '../views/token-detail-page.js';
import { buildSitemap } from '../seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const GA_MEASUREMENT_ID = (process.env.GA_MEASUREMENT_ID || '').trim();

function gaSnippet() {
  if (!GA_MEASUREMENT_ID) return '';
  return `<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>`;
}

const router = Router();

// ── robots.txt ──
router.get('/robots.txt', (_req, res) => {
  try {
    const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
    const content = fs.readFileSync(robotsPath, 'utf8');
    res.type('text/plain').set('Cache-Control', 'public, max-age=86400').send(content);
  } catch (_) {
    res.type('text/plain').send('User-agent: *\nAllow: /\n');
  }
});

// ── sitemap.xml ──
router.get('/sitemap.xml', async (_req, res) => {
  let tokenAddresses = [];
  try {
    const [zhilabs, pump] = await Promise.all([
      supabase.from('zhilabs_ranking').select('token').limit(100),
      supabase.from('solana_pump_ranking').select('token').limit(100),
    ]);
    const addrSet = new Set();
    for (const row of (zhilabs.data || [])) { if (row.token) addrSet.add(row.token); }
    for (const row of (pump.data || [])) { if (row.token) addrSet.add(row.token); }
    tokenAddresses = [...addrSet];
  } catch (_) { /* 降级为仅静态页 */ }
  const xml = buildSitemap(tokenAddresses);
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(xml);
});

// ── 欢迎页 ──
router.get('/', (_req, res) => {
  try {
    const welcomePath = path.join(PUBLIC_DIR, 'index.html');
    let html = fs.readFileSync(welcomePath, 'utf8');
    const ga = gaSnippet();
    if (ga) html = html.replace('</head>', ga + '\n</head>');
    res.type('html').send(html);
  } catch (e) {
    res.status(500).type('text').send('Welcome page not found');
  }
});

// ── 榜单页 ──
router.get('/ranking', (_req, res) => {
  res.type('html').send(buildRankingPage());
});

// ── 代币详情页（服务端预取代币信息用于 SEO meta 标签） ──
router.get('/token/:address', async (req, res) => {
  const address = req.params.address;
  let tokenInfo = {};
  try {
    const rows = await supabase
      .from('zhilabs_ranking')
      .select('name, symbol, token')
      .eq('token', address)
      .maybeSingle();
    if (rows.data) tokenInfo = rows.data;
    if (!tokenInfo.name) {
      const pumpRows = await supabase
        .from('solana_pump_ranking')
        .select('name, symbol, token')
        .eq('token', address)
        .maybeSingle();
      if (pumpRows.data) tokenInfo = pumpRows.data;
    }
  } catch (_) { /* 降级为默认 SEO 信息 */ }
  if (!tokenInfo.token) tokenInfo.token = address;
  res.type('html').send(buildTokenDetailPage(tokenInfo));
});

export default router;
