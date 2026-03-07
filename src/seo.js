/**
 * SEO 辅助模块：为所有页面提供统一的 meta 标签、结构化数据和 SEO 基础设施
 * 站点域名通过环境变量 SITE_URL 配置，默认 https://zhizhilabs.com
 */

const SITE_URL = (process.env.SITE_URL || 'https://zhizhilabs.com').replace(/\/+$/, '');
const SITE_NAME = 'Zhizhi Labs';
const DEFAULT_DESCRIPTION = 'Zhizhi Labs (zhizhilabs.com) — 探索 Solana Meme 代币排行榜、实时行情与链上数据分析。发现下一个潜力币。';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * 生成完整的 <head> SEO 标签块
 * @param {object} opts
 * @param {string} opts.title - 页面标题
 * @param {string} [opts.description] - 页面描述
 * @param {string} [opts.canonicalPath] - 规范路径，如 /ranking
 * @param {string} [opts.ogType] - Open Graph 类型，默认 website
 * @param {string} [opts.ogImage] - OG 图片 URL
 * @param {object} [opts.jsonLd] - JSON-LD 结构化数据对象
 * @returns {string} HTML meta 标签字符串
 */
export function buildSeoMeta(opts = {}) {
  const title = opts.title || `${SITE_NAME} | 探索 Solana Meme 代币`;
  const description = opts.description || DEFAULT_DESCRIPTION;
  const canonical = opts.canonicalPath ? `${SITE_URL}${opts.canonicalPath}` : SITE_URL;
  const ogType = opts.ogType || 'website';
  const ogImage = opts.ogImage || DEFAULT_OG_IMAGE;

  let html = '';

  html += `<meta name="description" content="${escAttr(description)}">\n`;
  html += `  <link rel="canonical" href="${escAttr(canonical)}">\n`;

  html += `  <!-- Open Graph -->\n`;
  html += `  <meta property="og:type" content="${escAttr(ogType)}">\n`;
  html += `  <meta property="og:site_name" content="${escAttr(SITE_NAME)}">\n`;
  html += `  <meta property="og:title" content="${escAttr(title)}">\n`;
  html += `  <meta property="og:description" content="${escAttr(description)}">\n`;
  html += `  <meta property="og:url" content="${escAttr(canonical)}">\n`;
  html += `  <meta property="og:image" content="${escAttr(ogImage)}">\n`;

  html += `  <!-- Twitter Card -->\n`;
  html += `  <meta name="twitter:card" content="summary_large_image">\n`;
  html += `  <meta name="twitter:title" content="${escAttr(title)}">\n`;
  html += `  <meta name="twitter:description" content="${escAttr(description)}">\n`;
  html += `  <meta name="twitter:image" content="${escAttr(ogImage)}">\n`;

  html += `  <!-- Favicon -->\n`;
  html += `  <link rel="icon" href="/favicon.ico">\n`;

  if (opts.jsonLd) {
    html += `  <!-- Structured Data -->\n`;
    html += `  <script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>\n`;
  }

  return html;
}

/**
 * 生成首页的 JSON-LD 结构化数据
 */
export function buildHomepageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/token/{search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * 生成组织 JSON-LD
 */
export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
  };
}

/**
 * 生成 sitemap.xml 内容
 * @param {string[]} [dynamicTokenAddresses] - 可选的动态代币地址列表
 * @returns {string} sitemap XML 字符串
 */
export function buildSitemap(dynamicTokenAddresses = []) {
  const now = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  const staticPages = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/ranking', changefreq: 'hourly', priority: '0.9' },
  ];

  for (const page of staticPages) {
    xml += '  <url>\n';
    xml += `    <loc>${SITE_URL}${page.loc}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  for (const addr of dynamicTokenAddresses) {
    xml += '  <url>\n';
    xml += `    <loc>${SITE_URL}/token/${encodeURIComponent(addr)}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';
  return xml;
}

export { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION };

function escAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
