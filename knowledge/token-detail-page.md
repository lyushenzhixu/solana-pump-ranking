# 代币详情页设计记录

> 路由：`/token/:address`　｜　实现：`src/server.js` → `buildTokenDetailPage()`

## 页面结构

```
┌─────────────────────────────────────────┐
│  ← 返回榜单                             │  page-header
├─────────────────────────────────────────┤
│  [Logo]  Name  $Symbol  ◉ Solana       │
│          $0.00173800   ▲ +79.22%       │  token-hero（渐变顶边动画）
├─────────────────────────────────────────┤
│  CA  0x7oXN…pump  [复制]  │ DexScreener │ Gecko │ Solscan │
│                           action-bar（合约地址 + 外链一体化）
├────┬────┬────┬────┬────┬────────────────┤
│市值│交易量│涨跌│持币│流动性│上线时间      │  stats-grid（彩色顶线 + 图标）
├─────────────────────┬───────────────────┤
│  K 线图              │  𝕏 热门推特       │
│  [15m|1H|4H|1D]     │  （sticky 侧边栏） │  detail-layout 双栏
│                     │                   │
├─────────────────────┤                   │
│  📰 叙事总结 [AI]    │                   │
│  新闻摘要 + 文章列表  │                   │
├─────────────────────┴───────────────────┤
│  Powered by Zhizhi Labs                 │  page-footer
└─────────────────────────────────────────┘
```

## 设计要素

### 色彩体系

| 变量 | 值 | 用途 |
|---|---|---|
| `--sol-purple` | `#9945FF` | 主色调、边框发光、按钮 |
| `--sol-green` | `#14F195` | 涨/正向指标、Solana 链标识 |
| `--sol-blue` | `#00D1FF` | 合约地址、Symbol badge、推特 |
| `--negative` | `#ff4d6a` | 跌/负向指标 |
| `--bg-primary` | `#07060d` | 页面背景深色 |
| `--bg-card` | `rgba(15,12,30,0.65)` | 卡片背景（毛玻璃） |

### 动画

| 名称 | 效果 | 应用 |
|---|---|---|
| `fadeSlideUp` | 淡入 + 上移 18px | 各区块错开入场（0s / 0.08s / 0.15s / 0.22s / 0.3s） |
| `gradientShift` | 渐变色流动 | Hero 卡片顶部 2px 装饰线 |
| `dotPulse` | 透明度脉冲 | K 线图 Live 指示灯 |
| `spin` | 旋转 | 加载 spinner |
| `starDrift` | 星空漂移 | 背景层 |

### 关键交互

- **K 线周期切换**：点击 15m / 1H / 4H / 1D 按钮，动态请求 `/api/kline/:pair?interval=X&size=Y`，重新渲染 LightweightCharts。
- **复制合约地址**：点击复制按钮，优先 `navigator.clipboard`，降级 `execCommand`，按钮文字变为"已复制"。
- **推特侧边栏自隐藏**：无推文数据时调用 `hideTweetsSidebar()` 将布局退化为单栏。
- **推特侧边栏 sticky**：桌面端侧边栏 `position: sticky; top: 1.5rem`，滚动时固定。

## 数据流

```
页面加载
  ├─ GET /api/token/:address?chain=solana    → renderDetail()
  │    ├─ GET /api/kline/:pair?interval=15   → renderChart()（LightweightCharts）
  │    ├─ GET /api/token/:address/narrative   → 叙事摘要
  │    └─ GET /api/token/:address/tweets      → 热门推特
  └─ SEO：服务端从 Supabase 预取 tokenInfo 填充 <title> / og:* / JSON-LD
```

## 响应式断点

| 断点 | 变化 |
|---|---|
| ≤ 1024px | 双栏 → 单栏，推特移至底部 |
| ≤ 768px | Hero 缩小、Action Bar 纵向折行、图表高度 300px、Stats 2 列 |
| ≤ 480px | Stats 强制 2 列、链标识缩小 |

## 依赖

- **LightweightCharts 4.2.2**（CDN：unpkg）— K 线蜡烛图 + 成交量柱状图 + OHLCV 信息栏 + 当前价格线
- **Google Fonts**：Orbitron（标题/数字）、Exo 2（正文）

## 变更记录

| 日期 | 内容 |
|---|---|
| 2026-03-07 | 初始美化：Hero 卡片、统一 Action Bar、Stats 图标化、K 线周期切换、AI 叙事标签、fadeSlideUp 动画、sticky 侧边栏、品牌页脚、移动端优化 |
| 2026-03-09 | K 线图表改造为 TradingView 风格：OHLCV 信息栏（十字光标联动）、7 种时间周期（1分/5分/15分/30分/1小时/4小时/1天）、当前价格虚线、成交量标签、自动精度价格轴、LightweightCharts 升级至 4.2.2 |
