# SEO 规范与指南

## 概述

本项目（zhizhilabs.com / Zhizhi Labs）已配置 SEO 基础设施，所有页面均满足谷歌收录要求。未来新增页面或前端改动必须遵循以下规范。

## 核心 SEO 文件

| 文件 | 用途 |
|------|------|
| `src/seo.js` | SEO 辅助模块，提供 `buildSeoMeta()`、`buildSitemap()` 等函数 |
| `src/public/robots.txt` | 搜索引擎爬虫规则，允许抓取所有公开页面，屏蔽 `/api/` |
| `src/public/index.html` | 首页，含完整 SEO meta 标签和 JSON-LD 结构化数据 |

## 每个页面必须包含的 SEO 元素

### 1. `<title>` 标签
- 格式：`页面关键词 | Zhizhi Labs`
- 包含品牌名 "Zhizhi Labs"
- 长度 30–60 字符

### 2. `<meta name="description">`
- 包含页面核心关键词
- 自然语言，150 字符以内
- 提到 "zhizhilabs.com" 或 "Zhizhi Labs"

### 3. Open Graph 标签
```html
<meta property="og:type" content="website">
<meta property="og:site_name" content="Zhizhi Labs">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:url" content="...">
<meta property="og:image" content="...">
```

### 4. Twitter Card 标签
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="...">
<meta name="twitter:description" content="...">
<meta name="twitter:image" content="...">
```

### 5. Canonical URL
```html
<link rel="canonical" href="https://zhizhilabs.com/当前路径">
```

### 6. `<h1>` 标签
- 每个页面有且仅有一个 `<h1>`
- 包含品牌名或页面核心关键词

### 7. `lang` 属性
```html
<html lang="zh-CN">
```

### 8. Favicon
```html
<link rel="icon" href="/favicon.ico">
```

## 使用 SEO 辅助模块

新增服务端渲染的页面时，使用 `src/seo.js` 中的 `buildSeoMeta()` 函数：

```javascript
import { buildSeoMeta, SITE_URL, SITE_NAME } from './seo.js';

const seoMeta = buildSeoMeta({
  title: '页面标题 | Zhizhi Labs',
  description: '页面描述...',
  canonicalPath: '/your-path',
  jsonLd: { /* JSON-LD 结构化数据 */ },
});
```

## Sitemap

- 路径：`/sitemap.xml`（动态生成）
- 自动包含首页、榜单页和数据库中所有代币详情页
- 新增公开页面路由时，需要在 `src/seo.js` 的 `buildSitemap()` 函数中的 `staticPages` 数组中添加

## robots.txt

- 路径：`/robots.txt`
- 允许所有爬虫抓取公开页面
- 屏蔽 `/api/` 路径防止 API 接口被索引
- 指向 sitemap URL

## 前端框架选型 SEO 原则

如果未来迁移到前端框架，必须满足：

1. **服务端渲染 (SSR) 或静态站点生成 (SSG)** — 确保搜索引擎爬虫能获取完整 HTML
2. 推荐框架：**Next.js**（SSR/SSG）、**Astro**（SSG 优先）、**Nuxt**（Vue SSR）
3. **禁止**使用纯 SPA（单页应用）模式，如纯 React/Vue client-only render
4. 每个路由页面必须在服务端生成完整的 `<head>` 标签（title, meta, OG）
5. 使用 `next/head`、`useHead()` 等框架内置的 head 管理功能

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SITE_URL` | 站点 URL，用于 canonical、sitemap、OG | `https://zhizhilabs.com` |
| `GA_MEASUREMENT_ID` | Google Analytics ID | 无 |

## Google Search Console 操作清单

1. 注册 [Google Search Console](https://search.google.com/search-console/about)
2. 通过 DNS TXT 记录验证域名所有权
3. 提交 sitemap：`https://zhizhilabs.com/sitemap.xml`
4. 请求编入索引首页 URL
5. 定期在 GSC 查看 `site:zhizhilabs.com` 的收录情况
