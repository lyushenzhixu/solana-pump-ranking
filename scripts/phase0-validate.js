#!/usr/bin/env node
/**
 * Phase 0 庄家猎手验证脚本
 * 自动分析 Solana 大涨代币的交易者聚类
 *
 * 用法: node scripts/phase0-validate.js [--tokens 10] [--days 7] [--min-gain 500]
 * 代理: HTTP_PROXY=http://127.0.0.1:7897 HTTPS_PROXY=http://127.0.0.1:7897 node scripts/phase0-validate.js
 *
 * 步骤:
 *   1. 从 GeckoTerminal 获取 Solana 大涨代币
 *   2. 用 Helius Enhanced API 获取交易者
 *   3. 追溯交易者的资金来源（1 hop）
 *   4. 按同源资金 + 同时间窗口聚类
 *   5. 输出结果（控制台 + JSON）
 */
import '../src/load-env.js';

// 全局代理设置（必须在其他 import 之前生效）
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
if (proxyUrl) {
  const { EnvHttpProxyAgent, setGlobalDispatcher } = await import('undici');
  setGlobalDispatcher(new EnvHttpProxyAgent());
  console.log(`  代理已启用: ${proxyUrl}`);
}

import * as helius from '../src/data-sources/helius.js';
import * as gecko from '../src/data-sources/geckoterminal.js';
import * as dexscreener from '../src/data-sources/dexscreener.js';
import * as dataSource from '../src/data-sources/index.js';
import { getTokenHolders } from '../src/data-sources/okx-onchain.js';
import { isCexWallet, getCexLabel } from '../src/data-sources/cex-wallets.js';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── 质量筛选常量（对齐 fetch-pump-ranking.js 标准）────────────
const MAX_TOP10_HOLDERS_PERCENT = 30;
const MIN_MARKET_CAP = 100_000;

/**
 * 从 Binance Web3 获取 Solana 代币的市场动态数据
 * 复用自 fetch-pump-ranking.js
 */
async function fetchBinanceTokenInfo(contractAddress) {
  const url = new URL('https://web3.binance.com/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info');
  url.searchParams.set('chainId', 'CT_501');
  url.searchParams.set('contractAddress', contractAddress);
  try {
    const res = await fetch(url.toString(), { headers: { 'Accept-Encoding': 'identity' } });
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.data;
    if (!d) return null;

    const top10 = parseFloat(String(d.top10HoldersPercentage ?? ''));
    const holders = parseInt(d.holders);
    const insiderPct = parseFloat(String(d.insiderHoldingPercent ?? ''));

    return {
      top10Percent: Number.isFinite(top10) ? top10 : null,
      holders: Number.isFinite(holders) ? holders : null,
      insiderPercent: Number.isFinite(insiderPct) ? insiderPct : null,
    };
  } catch {
    return null;
  }
}

// ─── CLI 参数解析 ─────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    maxTokens: 10,
    days: 7,
    minGainPercent: 500,
    minClusterSize: 3,
    fundingWindowHours: 24,
    tradingWindowMinutes: 60,
    topTradersPerToken: 20,
    maxPagesPerWallet: 3,
  };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const val = parseInt(args[i + 1]);
    if (isNaN(val)) continue;
    if (key === '--tokens') config.maxTokens = val;
    if (key === '--days') config.days = val;
    if (key === '--min-gain') config.minGainPercent = val;
  }
  return config;
}

// ─── Step 1: 查找大涨代币 ────────────────────────────────────
async function findPumpedTokens(config) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Step 1: 查找 Solana 大涨代币');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 多源获取候选代币：GeckoTerminal trending + DexScreener boosted
  console.log('  获取候选代币 (GeckoTerminal trending + DexScreener boosted)...');
  const [trendingPools, boostedTokens] = await Promise.all([
    gecko.getTrendingPools('solana', 2).catch((e) => {
      console.warn(`  [GeckoTerminal 失败] ${e.message}`);
      return [];
    }),
    dexscreener.getLatestBoosts().catch((e) => {
      console.warn(`  [DexScreener boosts 失败] ${e.message}`);
      return [];
    }),
  ]);
  console.log(`  GeckoTerminal trending: ${trendingPools.length} 个`);

  // 将 DexScreener boosted tokens 转为标准格式并获取详细数据
  const solBoosts = boostedTokens.filter((b) => b.chainId === 'solana' && b.tokenAddress);
  console.log(`  DexScreener boosted (Solana): ${solBoosts.length} 个`);

  let boostedPools = [];
  if (solBoosts.length > 0) {
    try {
      const addrs = [...new Set(solBoosts.map((b) => b.tokenAddress))].slice(0, 30);
      const pairs = await dexscreener.batchGetTokenPairs(addrs);
      boostedPools = pairs
        .filter((p) => p.chainId === 'solana')
        .map(dexscreener.normalizePair);
      console.log(`  DexScreener boosted 解析后: ${boostedPools.length} 个`);
    } catch (e) {
      console.warn(`  [DexScreener 详情获取失败] ${e.message}`);
    }
  }

  // 合并两个来源
  const allPools = [...trendingPools, ...boostedPools];

  // 预过滤：24h 涨幅 >50% 的才值得查 7 日数据
  const candidates = allPools.filter(
    (p) => p.token && p.main_pair && (p.price_change_24h ?? 0) > 50
  );
  console.log(`  24h 涨幅 >50% 的候选: ${candidates.length} 个`);

  // 去重（按 token 地址）
  const seen = new Set();
  const unique = candidates.filter((p) => {
    if (seen.has(p.token)) return false;
    seen.add(p.token);
    return true;
  });
  console.log(`  去重后: ${unique.length} 个`);

  // 计算 7 日涨幅（通过 OHLCV）
  // GeckoTerminal 免费 API 限流严格（~15 req/min），逐个请求并等待
  const withGain = [];
  for (let idx = 0; idx < unique.length; idx++) {
    const pool = unique[idx];
    // 每次 OHLCV 请求间隔 5s，避免 429
    if (idx > 0) await new Promise((r) => setTimeout(r, 5000));
    process.stdout.write(`  OHLCV 进度: ${idx + 1}/${unique.length} (${pool.symbol || '?'})\r`);
    try {
      const ohlcv = await gecko.getPoolOhlcv('solana', pool.main_pair, 'day', {
        limit: config.days,
      });
      if (!ohlcv || ohlcv.length < 2) continue;

      // ohlcv 格式: [[timestamp, open, high, low, close, volume], ...]
      // 按时间正序（最早在前）
      const sorted = [...ohlcv].sort((a, b) => a[0] - b[0]);
      const firstOpen = sorted[0][1];
      const lastClose = sorted[sorted.length - 1][4];
      if (!firstOpen || firstOpen === 0) continue;

      const gain = ((lastClose - firstOpen) / firstOpen) * 100;
      if (gain >= config.minGainPercent) {
        withGain.push({ ...pool, priceChange7d: Math.round(gain) });
      }
    } catch (e) {
      console.warn(`  [跳过] ${pool.symbol || pool.token}: ${e.message}`);
    }
  }

  // 按涨幅排序
  withGain.sort((a, b) => b.priceChange7d - a.priceChange7d);

  console.log(`\n  OHLCV 扫描完成，${withGain.length} 个代币达到涨幅门槛`);

  if (withGain.length === 0) return [];

  // ── 质量筛选 1: 市值门槛 ──
  let filtered = withGain.filter((t) => {
    const cap = parseFloat(t.market_cap);
    return !isNaN(cap) && cap >= MIN_MARKET_CAP;
  });
  console.log(`  市值 >$${(MIN_MARKET_CAP / 1000).toFixed(0)}K 后: ${filtered.length} 个`);

  // ── 质量筛选 2: GoPlus 蜜罐 + 高风险检测 ──
  if (filtered.length > 0) {
    console.log('  GoPlus 安全检测中...');
    try {
      const addresses = filtered.map((t) => t.token);
      const securityMap = await dataSource.batchGetTokenSecurity('solana', addresses);

      const preCount = filtered.length;
      filtered = filtered.filter((t) => {
        const sec = securityMap.get(t.token.toLowerCase());
        if (!sec) return true; // GoPlus 无数据不排除
        if (sec.is_honeypot === true) {
          console.log(`    [排除] ${t.symbol}: 蜜罐`);
          return false;
        }
        if (sec.risk_level === 'CRITICAL') {
          console.log(`    [排除] ${t.symbol}: CRITICAL 风险`);
          return false;
        }
        return true;
      });
      console.log(`  排除蜜罐/高风险后: ${filtered.length} 个（排除 ${preCount - filtered.length} 个）`);
    } catch (e) {
      console.warn(`  [GoPlus 检测失败，跳过] ${e.message}`);
    }
  }

  // ── 质量筛选 3: Binance Web3 Top10 持有者占比 ──
  if (filtered.length > 0) {
    console.log(`  Binance Top10 持有者校验中 (排除 >${MAX_TOP10_HOLDERS_PERCENT}%)...`);
    const preCount = filtered.length;
    const kept = [];
    for (let i = 0; i < filtered.length; i++) {
      const t = filtered[i];
      process.stdout.write(`  Top10 校验: ${i + 1}/${filtered.length} (${t.symbol || '?'})\r`);
      try {
        const info = await fetchBinanceTokenInfo(t.token);
        if (info && info.top10Percent != null && info.top10Percent > MAX_TOP10_HOLDERS_PERCENT) {
          console.log(`    [排除] ${t.symbol}: Top10 占比 ${info.top10Percent.toFixed(1)}%`);
        } else {
          // 附加 Binance 数据到 token 对象
          if (info) {
            t._top10Percent = info.top10Percent;
            t._holders = info.holders;
            t._insiderPercent = info.insiderPercent;
          }
          kept.push(t);
        }
      } catch {
        kept.push(t); // Binance 请求失败不排除
      }
      // Binance API 间隔 220ms
      await new Promise((r) => setTimeout(r, 220));
    }
    filtered = kept;
    console.log(`  排除 Top10 >${MAX_TOP10_HOLDERS_PERCENT}% 后: ${filtered.length} 个（排除 ${preCount - filtered.length} 个）`);
  }

  // 取 top N
  const result = filtered.slice(0, config.maxTokens);

  console.log(`\n  最终筛选: ${result.length} 个代币，${config.days}日涨幅 >${config.minGainPercent}%:\n`);
  for (const t of result) {
    const top10Str = t._top10Percent != null ? `  Top10: ${t._top10Percent.toFixed(1)}%` : '';
    console.log(`    ${(t.symbol || '???').padEnd(12)} +${t.priceChange7d}%  ${t.token.slice(0, 8)}...${top10Str}`);
  }

  return result;
}

// ─── Step 2: 获取 Top 获利者 ─────────────────────────────────
/**
 * 核心思路：对于已经涨了 500%+ 的代币，当前持仓价值最高的钱包 ≈ 获利最多的钱包。
 * 数据源：OKX getTokenHolders（按持仓量排序的 Top 20）
 * 计算：持仓价值 = holdAmount × 当前代币价格
 */
async function getTopTraders(token, config) {
  const tradersMap = new Map(); // wallet → { holdingValueUsd, holdAmount, txCount, firstBuyTime }

  const currentPrice = parseFloat(token.current_price_usd || 0);

  // 主数据源: OKX Top 持有者（按持仓量排序）
  try {
    const holders = await getTokenHolders(token.token, 'solana');
    console.log(`    [OKX] ${token.symbol}: ${holders.length} 个持有者`);

    for (const h of holders) {
      const wallet = h.holderWalletAddress || h.holderAddress || h.address;
      if (!wallet) continue;
      const holdAmount = parseFloat(h.holdAmount || 0);
      const holdingValueUsd = currentPrice > 0 ? holdAmount * currentPrice : 0;

      tradersMap.set(wallet, {
        holdingValueUsd,
        holdAmount,
        txCount: 0,
        firstBuyTime: 0,
      });
    }
  } catch (e) {
    console.warn(`  [OKX 持有者获取失败] ${token.symbol}: ${e.message}`);
  }

  // 排序：按当前持仓价值（获利代理）从高到低
  const sorted = [...tradersMap.entries()]
    .map(([wallet, data]) => ({
      wallet,
      buyAmountUsd: data.holdingValueUsd, // 用持仓价值作为排序依据
      holdAmount: data.holdAmount,
      txCount: data.txCount,
      firstBuyTime: data.firstBuyTime,
    }))
    .filter((t) => !isCexWallet(t.wallet)) // 排除 CEX 钱包
    .filter((t) => t.buyAmountUsd > 0) // 排除零持仓
    .sort((a, b) => b.buyAmountUsd - a.buyAmountUsd)
    .slice(0, config.topTradersPerToken);

  if (sorted.length > 0) {
    const topValue = sorted[0].buyAmountUsd;
    const bottomValue = sorted[sorted.length - 1].buyAmountUsd;
    console.log(`    Top ${sorted.length} 获利者: $${Math.round(topValue)} ~ $${Math.round(bottomValue)}`);
  }

  return sorted;
}

// ─── Step 3: 追溯资金来源 ────────────────────────────────────
async function traceFundingSources(traders, config) {
  const fundingMap = new Map(); // wallet → [{ funder, amountSol, timestamp }]
  const batchSize = 3; // Free Plan Enhanced API 限 2 req/s，3 并行 + 重试比较稳

  for (let i = 0; i < traders.length; i += batchSize) {
    const batch = traders.slice(i, i + batchSize);
    const promises = batch.map(async (trader) => {
      try {
        // 不限 type，查全部交易来获取所有 SOL 流入
        const txns = await helius.getAllEnhancedTransactions(trader.wallet, {
          maxPages: config.maxPagesPerWallet,
          limit: 100,
        });

        const fundings = [];
        for (const tx of txns) {
          // 从所有交易类型中寻找入账的 SOL 转账
          const nativeTransfers = tx.nativeTransfers || [];
          for (const nt of nativeTransfers) {
            if (nt.toUserAccount === trader.wallet && nt.amount > 0) {
              const amountSol = nt.amount / 1e9; // lamports → SOL
              if (amountSol < 0.01) continue; // 忽略极小额
              // 排除自身转账和系统程序
              if (nt.fromUserAccount === trader.wallet) continue;
              fundings.push({
                funder: nt.fromUserAccount,
                amountSol,
                timestamp: tx.timestamp,
              });
            }
          }
        }

        // 按金额排序，保留最大的 5 笔资金来源（扩大覆盖范围）
        fundings.sort((a, b) => b.amountSol - a.amountSol);
        fundingMap.set(trader.wallet, fundings.slice(0, 5));
      } catch (e) {
        console.warn(`  [资金追溯失败] ${trader.wallet.slice(0, 8)}...: ${e.message}`);
        fundingMap.set(trader.wallet, []);
      }
    });
    await Promise.all(promises);

    if (i + batchSize < traders.length) {
      process.stdout.write(`  追溯进度: ${Math.min(i + batchSize, traders.length)}/${traders.length}\r`);
    }
  }
  console.log(`  追溯完成: ${fundingMap.size} 个钱包                  `);

  // 诊断：显示资金来源统计
  let totalFundings = 0;
  let walletsWithFundings = 0;
  for (const [wallet, fundings] of fundingMap) {
    if (fundings.length > 0) {
      walletsWithFundings++;
      totalFundings += fundings.length;
    }
  }
  console.log(`    有资金来源的钱包: ${walletsWithFundings}/${fundingMap.size}, 共 ${totalFundings} 笔资金记录`);

  return fundingMap;
}

// ─── Step 4: 钱包聚类 ────────────────────────────────────────
function clusterWallets(token, traders, fundingMap, config) {
  // 构建 funder → [{ wallet, fundingTime }] 映射
  const funderToWallets = new Map();

  for (const trader of traders) {
    const fundings = fundingMap.get(trader.wallet) || [];
    // 同一 funder 对同一 wallet 的多笔资金只记一次（取最早时间）
    const seenFunders = new Set();
    for (const f of fundings) {
      if (!f.funder) continue;
      if (seenFunders.has(f.funder)) continue;
      seenFunders.add(f.funder);
      const list = funderToWallets.get(f.funder) || [];
      list.push({
        wallet: trader.wallet,
        fundingTime: f.timestamp,
        buyAmountUsd: trader.buyAmountUsd,
        txCount: trader.txCount,
        firstBuyTime: trader.firstBuyTime,
      });
      funderToWallets.set(f.funder, list);
    }
  }

  // 诊断：显示 funder 分布
  const funderSizes = [...funderToWallets.entries()].map(([f, w]) => w.length).sort((a, b) => b - a);
  console.log(`    Funder 映射: ${funderToWallets.size} 个 funder, 钱包分布: [${funderSizes.slice(0, 10).join(', ')}${funderSizes.length > 10 ? '...' : ''}]`);

  const clusters = [];
  let clusterIdx = 1;

  for (const [funder, wallets] of funderToWallets) {
    if (wallets.length < config.minClusterSize) continue;

    // 检查资金时间窗口：所有资金转入在 24h 内
    const fundingTimes = wallets.map((w) => w.fundingTime).filter((t) => t > 0);
    if (fundingTimes.length < config.minClusterSize) continue;

    const minFundingTime = Math.min(...fundingTimes);
    const maxFundingTime = Math.max(...fundingTimes);
    const fundingWindowHours = (maxFundingTime - minFundingTime) / 3600;

    if (fundingWindowHours > config.fundingWindowHours) continue;

    // 检查交易时间窗口：所有首次买入在 1h 内
    const buyTimes = wallets.map((w) => w.firstBuyTime).filter((t) => t > 0);
    let tradingWindowMinutes = Infinity;
    if (buyTimes.length >= 2) {
      const minBuyTime = Math.min(...buyTimes);
      const maxBuyTime = Math.max(...buyTimes);
      tradingWindowMinutes = (maxBuyTime - minBuyTime) / 60;
    }

    // 计算 distinctness（该 funder 一共资助了多少钱包）
    const distinctnessScore = wallets.length;

    // CEX 检测
    const flags = [];
    let confidence = 'high';

    if (isCexWallet(funder)) {
      flags.push('known_cex');
      confidence = 'low';
    } else if (distinctnessScore > 100) {
      flags.push('probable_cex');
      confidence = 'low';
    } else if (distinctnessScore > 20) {
      flags.push('possible_cex');
      confidence = 'medium';
    }

    // 时间窗口越紧密，置信度越高
    if (confidence === 'high') {
      if (fundingWindowHours > 12 || tradingWindowMinutes > 30) {
        confidence = 'medium';
      }
    }

    // 小聚类降级
    if (wallets.length === config.minClusterSize && confidence === 'high') {
      confidence = 'medium';
    }

    const totalBuyInUsd = wallets.reduce((sum, w) => sum + (w.buyAmountUsd || 0), 0);

    clusters.push({
      id: `CLU-${String(clusterIdx++).padStart(3, '0')}`,
      tokenAddress: token.token,
      tokenSymbol: token.symbol || '???',
      wallets: wallets.map((w) => ({
        address: w.wallet,
        buyAmountUsd: Math.round(w.buyAmountUsd),
        txCount: w.txCount,
        firstBuyTimestamp: w.firstBuyTime,
        solscanUrl: `https://solscan.io/account/${w.wallet}`,
      })),
      commonFunder: funder,
      funderLabel: getCexLabel(funder),
      funderSolscanUrl: `https://solscan.io/account/${funder}`,
      fundingWindow: {
        start: minFundingTime,
        end: maxFundingTime,
        durationHours: Math.round(fundingWindowHours * 10) / 10,
      },
      tradingWindow: {
        start: buyTimes.length ? Math.min(...buyTimes) : 0,
        end: buyTimes.length ? Math.max(...buyTimes) : 0,
        durationMinutes: tradingWindowMinutes === Infinity ? null : Math.round(tradingWindowMinutes),
      },
      totalBuyInUsd: Math.round(totalBuyInUsd),
      confidence,
      distinctnessScore,
      flags,
    });
  }

  // 按置信度排序（high > medium > low），同级按总买入排序
  const confidenceOrder = { high: 0, medium: 1, low: 2 };
  clusters.sort(
    (a, b) =>
      (confidenceOrder[a.confidence] ?? 9) - (confidenceOrder[b.confidence] ?? 9) ||
      b.totalBuyInUsd - a.totalBuyInUsd
  );

  return clusters;
}

// ─── Step 5: 输出结果 ────────────────────────────────────────
function formatTimestamp(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toISOString().replace('T', ' ').slice(0, 16);
}

function confidenceBadge(c) {
  if (c === 'high') return '[高置信]';
  if (c === 'medium') return '[中置信]';
  return '[低置信]';
}

function printResults(tokensAnalyzed, allClusters, config, startTime) {
  const duration = Date.now() - startTime;
  const heliusCredits = helius.getApiCreditsUsed();

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Phase 0 庄家猎手验证结果');
  console.log(`  ${new Date().toISOString().slice(0, 10)}`);
  console.log('═══════════════════════════════════════════════════════════');

  if (allClusters.length === 0) {
    console.log('\n  未找到任何聚类。可能原因:');
    console.log('    - 大涨代币的交易者没有共同资金来源');
    console.log('    - 时间窗口限制过严（当前: 资金24h, 交易1h）');
    console.log('    - 代币交易者太少');
    console.log('    - CEX 提币导致的假阳性已被过滤');
  }

  for (const token of tokensAnalyzed) {
    const tokenClusters = allClusters.filter((c) => c.tokenAddress === token.token);
    console.log(`\n  代币: $${token.symbol || '???'} (${token.token})`);
    console.log(`  ${config.days}日涨幅: +${token.priceChange7d}%`);
    console.log('  ───────────────────────────────────────────────────────');

    if (tokenClusters.length === 0) {
      console.log('  (无聚类)');
      continue;
    }

    for (const cluster of tokenClusters) {
      console.log(
        `\n  聚类 ${cluster.id} ${confidenceBadge(cluster.confidence)} — ` +
          `${cluster.wallets.length} 个钱包 — 共同资金源: ${cluster.commonFunder.slice(0, 8)}...` +
          (cluster.funderLabel ? ` (${cluster.funderLabel})` : '')
      );
      if (cluster.flags.length) {
        console.log(`  标记: ${cluster.flags.join(', ')}`);
      }

      for (const w of cluster.wallets) {
        console.log(
          `    ${w.address.slice(0, 8)}...${w.address.slice(-4)}   ` +
            `买入 $${w.buyAmountUsd.toLocaleString()}  ` +
            `${w.txCount} 笔  ${w.solscanUrl}`
        );
      }

      console.log(`    累计买入: $${cluster.totalBuyInUsd.toLocaleString()}`);
      console.log(
        `    资金时间窗: ${formatTimestamp(cluster.fundingWindow.start)} ~ ` +
          `${formatTimestamp(cluster.fundingWindow.end)} (${cluster.fundingWindow.durationHours}h)`
      );
      if (cluster.tradingWindow.durationMinutes !== null) {
        console.log(
          `    交易时间窗: ${formatTimestamp(cluster.tradingWindow.start)} ~ ` +
            `${formatTimestamp(cluster.tradingWindow.end)} (${cluster.tradingWindow.durationMinutes}min)`
        );
      }
      console.log(`    资金源: ${cluster.funderSolscanUrl}`);
    }
  }

  // 统计摘要
  const high = allClusters.filter((c) => c.confidence === 'high').length;
  const medium = allClusters.filter((c) => c.confidence === 'medium').length;
  const low = allClusters.filter((c) => c.confidence === 'low').length;
  const cexFlagged = allClusters.filter((c) => c.flags.some((f) => f.includes('cex'))).length;

  console.log('\n  ───────────────────────────────────────────────────────');
  console.log(`  代币扫描: ${tokensAnalyzed.length}`);
  console.log(`  聚类总数: ${allClusters.length} (高: ${high}, 中: ${medium}, 低: ${low})`);
  console.log(`  CEX 标记: ${cexFlagged}`);
  console.log(`  Helius credits: ${heliusCredits} (Developer Plan: 2,000,000/月)`);
  console.log(`  预估月度成本 (1次/天): ~${heliusCredits * 30} credits/月 (${((heliusCredits * 30) / 2_000_000 * 100).toFixed(2)}%)`);
  console.log(`  运行耗时: ${(duration / 1000).toFixed(1)}s`);
  console.log('═══════════════════════════════════════════════════════════\n');

  return { high, medium, low, cexFlagged, heliusCredits, duration };
}

async function saveJSON(tokensAnalyzed, allClusters, config, stats) {
  const outputDir = path.join(__dirname, 'output');
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `phase0-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  const output = {
    timestamp: new Date().toISOString(),
    config,
    tokensAnalyzed: tokensAnalyzed.map((t) => ({
      address: t.token,
      symbol: t.symbol,
      name: t.name,
      pairAddress: t.main_pair,
      priceChange7d: t.priceChange7d,
      marketCap: t.market_cap,
      volume24h: t.tx_volume_u_24h,
      tradersFound: 0, // will be set by caller if needed
      clustersFound: allClusters.filter((c) => c.tokenAddress === t.token).length,
    })),
    clusters: allClusters,
    rpcStats: {
      heliusCreditsUsed: stats.heliusCredits,
      totalDurationMs: stats.duration,
    },
    summary: {
      tokensScanned: tokensAnalyzed.length,
      tokensWithClusters: new Set(allClusters.map((c) => c.tokenAddress)).size,
      totalClusters: allClusters.length,
      highConfidence: stats.high,
      mediumConfidence: stats.medium,
      lowConfidence: stats.low,
      cexFlagged: stats.cexFlagged,
    },
  };

  await writeFile(filepath, JSON.stringify(output, null, 2));
  console.log(`  结果已保存: ${filepath}\n`);
  return filepath;
}

// ─── 主流程 ──────────────────────────────────────────────────
async function main() {
  const config = parseArgs();
  const startTime = Date.now();
  const errors = [];

  console.log('\n  Phase 0 庄家猎手验证');
  console.log(`  配置: ${config.maxTokens} 代币, ${config.days}日, 最低涨幅 ${config.minGainPercent}%`);

  // 检查 Helius 配置
  if (!helius.isConfigured()) {
    console.error('\n  [错误] HELIUS_API_KEY 未配置');
    console.error('  请在 .env 文件中添加: HELIUS_API_KEY=你的API_KEY');
    console.error('  获取地址: https://dashboard.helius.dev/\n');
    process.exit(1);
  }

  helius.resetCreditsCounter();

  // Step 1: 查找大涨代币
  let tokens;
  try {
    tokens = await findPumpedTokens(config);
  } catch (e) {
    console.error(`\n  [Step 1 失败] ${e.message}`);
    process.exit(2);
  }

  if (tokens.length === 0) {
    console.log('\n  未找到符合条件的大涨代币，退出');
    process.exit(0);
  }

  // Steps 2-4: 对每个代币分析交易者和聚类
  const allClusters = [];
  for (const token of tokens) {
    console.log(`\n───────────────────────────────────────────────────────────`);
    console.log(`  分析: $${token.symbol || '???'} (+${token.priceChange7d}%)`);
    console.log(`───────────────────────────────────────────────────────────`);

    // Step 2: 获取 Top 交易者
    console.log('\n  Step 2: 获取 Top 交易者...');
    let traders;
    try {
      traders = await getTopTraders(token, config);
      console.log(`  找到 ${traders.length} 个交易者`);
    } catch (e) {
      console.warn(`  [Step 2 失败] ${token.symbol}: ${e.message}`);
      errors.push({ step: 'getTopTraders', token: token.symbol, message: e.message });
      continue;
    }

    if (traders.length === 0) {
      console.log('  无交易者数据，跳过');
      continue;
    }

    // Step 3: 追溯资金来源
    console.log('\n  Step 3: 追溯资金来源...');
    let fundingMap;
    try {
      fundingMap = await traceFundingSources(traders, config);
    } catch (e) {
      console.warn(`  [Step 3 失败] ${token.symbol}: ${e.message}`);
      errors.push({ step: 'traceFundingSources', token: token.symbol, message: e.message });
      continue;
    }

    // Step 4: 聚类
    console.log('\n  Step 4: 聚类分析...');
    const clusters = clusterWallets(token, traders, fundingMap, config);
    console.log(`  找到 ${clusters.length} 个聚类`);
    allClusters.push(...clusters);
  }

  // Step 5: 输出结果
  const stats = printResults(tokens, allClusters, config, startTime);
  await saveJSON(tokens, allClusters, config, stats);

  // 退出码
  if (tokens.length > 0 && allClusters.length === 0 && errors.length === tokens.length) {
    process.exit(2); // 全部失败
  }
  if (errors.length > 0) {
    process.exit(3); // 部分失败
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('\n  [未预期错误]', e);
  process.exit(1);
});
