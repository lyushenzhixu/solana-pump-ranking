/**
 * zhilabs 自研数据源 —— 聚合 DexScreener / GeckoTerminal / Jupiter / GoPlus
 * 提供与 AVE Cloud API 功能对等的接口，无需 API Key，无额外费用
 *
 * 数据来源：
 *   - DexScreener: 代币搜索、交易对详情、boost 列表（300 req/min，免费无 Key）
 *   - GeckoTerminal: 趋势池、新池、OHLCV、交易记录（30 req/min，免费无 Key）
 *   - Jupiter: Solana 代币价格（免费无 Key）
 *   - GoPlus: 合约安全检测（30 req/min，免费无 Key）
 */

import * as dexscreener from './dexscreener.js';
import * as geckoterminal from './geckoterminal.js';
import * as jupiter from './jupiter.js';
import * as goplus from './goplus.js';
import { SUPPORTED_CHAINS, supportsJupiter, toGeckoTerminal } from './chain-map.js';

// ─── 内存缓存 ───────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 3 * 60_000; // 3 分钟，避免同一更新周期重复请求

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return undefined; }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, ts: Date.now() });
}

// ─── 去重辅助 ───────────────────────────────────────────────
function deduplicateByToken(tokens) {
  const map = new Map();
  for (const t of tokens) {
    if (!t.token) continue;
    const key = `${t.token}-${t.chain}`;
    const existing = map.get(key);
    if (!existing || (t.tx_volume_u_24h || 0) > (existing.tx_volume_u_24h || 0)) {
      map.set(key, t);
    }
  }
  return [...map.values()];
}

// ─── 公共 API ───────────────────────────────────────────────

/**
 * 搜索代币（等价 AVE /v2/tokens?keyword=）
 * @param {string} keyword 关键词
 * @param {string} [chain] 可选链筛选
 * @param {number} [limit=100] 返回数量
 */
export async function searchTokens(keyword, chain, limit = 100) {
  const cacheKey = `search:${keyword}:${chain || ''}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached.slice(0, limit);

  const [dsPairs, gtPools] = await Promise.all([
    dexscreener.search(keyword).catch(() => []),
    geckoterminal.searchPools(keyword).catch(() => []),
  ]);

  let results = [
    ...dsPairs.map(dexscreener.normalizePair),
    ...gtPools,
  ];

  if (chain) results = results.filter((t) => t.chain === chain);
  results = deduplicateByToken(results);
  results.sort((a, b) => (b.tx_volume_u_24h || 0) - (a.tx_volume_u_24h || 0));

  cacheSet(cacheKey, results);
  return results.slice(0, limit);
}

/**
 * 获取平台/标签代币列表（等价 AVE /v2/tokens/platform?tag=）
 *
 * 以 DexScreener 为主力（300 req/min，极少限流），GeckoTerminal 为补充。
 * 通过多关键词搜索 + boosts/profiles 确保 Solana 候选池 100+ 条。
 */
export async function getPlatformTokens(tag, limit = 200) {
  const cacheKey = `platform:${tag}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached.slice(0, limit);

  const isHot = /hot|trending/i.test(tag);
  const isNew = /new/i.test(tag);
  const chain = extractChainFromTag(tag) || 'solana';
  const pages = Math.min(Math.ceil(limit / 20), 5);

  const dsFilter = (p) => fromChain(p.chainId) === chain;
  const dsNorm = (pairs) => pairs.filter(dsFilter).map(dexscreener.normalizePair);

  const hotKeywords = [
    'pump solana', 'solana meme', 'raydium SOL', 'solana hot',
    'pumpfun', 'solana new token', 'meteora solana',
  ];
  const newKeywords = [
    'new solana', 'solana launch', 'pumpfun new', 'raydium new',
    'solana meme new', 'pump.fun',
  ];

  let tokens = [];

  if (isNew) {
    const searchTerms = newKeywords;
    const [gtNew, profiles, ...dsResults] = await Promise.all([
      geckoterminal.getNewPools(chain, pages).catch(() => []),
      dexscreener.getLatestProfiles().catch(() => []),
      ...searchTerms.map((q) => dexscreener.search(q).catch(() => [])),
    ]);

    const profileAddrs = profiles.filter((p) => fromChain(p.chainId) === chain).map((p) => p.tokenAddress).filter(Boolean);
    let profileTokens = [];
    if (profileAddrs.length > 0) {
      const pairs = await dexscreener.batchGetTokenPairs(profileAddrs.slice(0, 90));
      profileTokens = dsNorm(pairs);
    }

    tokens = [...gtNew, ...profileTokens];
    for (const r of dsResults) tokens.push(...dsNorm(r));
  } else if (isHot) {
    const searchTerms = hotKeywords;
    const [trending, boosts, profiles, ...dsResults] = await Promise.all([
      geckoterminal.getTrendingPools(chain, pages).catch(() => []),
      dexscreener.getLatestBoosts().catch(() => []),
      dexscreener.getLatestProfiles().catch(() => []),
      ...searchTerms.map((q) => dexscreener.search(q).catch(() => [])),
    ]);

    const boostAddrs = boosts.filter((b) => fromChain(b.chainId) === chain).map((b) => b.tokenAddress).filter(Boolean);
    const profileAddrs = profiles.filter((p) => fromChain(p.chainId) === chain).map((p) => p.tokenAddress).filter(Boolean);
    const allAddrs = [...new Set([...boostAddrs, ...profileAddrs])];

    let enrichedTokens = [];
    if (allAddrs.length > 0) {
      const pairs = await dexscreener.batchGetTokenPairs(allAddrs.slice(0, 120));
      enrichedTokens = dsNorm(pairs);
    }

    tokens = [...trending, ...enrichedTokens];
    for (const r of dsResults) tokens.push(...dsNorm(r));
  } else {
    const searchTerms = ['solana meme', 'solana trending'];
    const [gtTrending, ...dsResults] = await Promise.all([
      geckoterminal.getTrendingPools(chain, pages).catch(() => []),
      ...searchTerms.map((q) => dexscreener.search(q).catch(() => [])),
    ]);
    tokens = [...gtTrending];
    for (const r of dsResults) tokens.push(...dsNorm(r));
  }

  tokens = tokens.filter((t) => t.chain === chain);
  tokens = deduplicateByToken(tokens);
  tokens.sort((a, b) => (b.tx_volume_u_24h || 0) - (a.tx_volume_u_24h || 0));

  cacheSet(cacheKey, tokens);
  return tokens.slice(0, limit);
}

/**
 * 获取排行榜代币（等价 AVE /v2/ranks?topic=）
 * GeckoTerminal trending + DexScreener search 双源
 */
export async function getRanks(topic) {
  const cacheKey = `ranks:${topic}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const chain = topic || 'solana';
  const [gtTokens, dsPairs] = await Promise.all([
    geckoterminal.getTrendingPools(chain, 3).catch(() => []),
    dexscreener.search(`${chain} top`).catch(() => []),
  ]);

  const dsNormalized = dsPairs
    .filter((p) => fromChain(p.chainId) === chain)
    .map(dexscreener.normalizePair);

  const all = [...gtTokens, ...dsNormalized];
  const deduped = deduplicateByToken(all);
  deduped.sort((a, b) => (b.tx_volume_u_24h || 0) - (a.tx_volume_u_24h || 0));

  cacheSet(cacheKey, deduped);
  return deduped;
}

/**
 * 获取单个代币详情（等价 AVE /v2/tokens/{address}-{chain}）
 * 聚合 DexScreener + GeckoTerminal + Jupiter（Solana）数据
 * 返回 AVE 兼容格式
 */
export async function getTokenDetail(address, chain = 'solana') {
  const cacheKey = `detail:${address}:${chain}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const [dsResult, gtResult] = await Promise.all([
    dexscreener.getTokenDetail(address, chain).catch(() => null),
    geckoterminal.getToken(chain, address).catch(() => null),
  ]);

  if (!dsResult && !gtResult) return null;

  const merged = { ...(gtResult || {}), ...(dsResult || {}) };

  if (supportsJupiter(chain)) {
    try {
      const price = await jupiter.getPrice(address);
      if (price != null && (merged.current_price_usd == null || merged.current_price_usd === 0)) {
        merged.current_price_usd = price;
      }
    } catch { /* 忽略 */ }
  }

  if (!merged.logo_url && gtResult?.logo_url) merged.logo_url = gtResult.logo_url;
  if (!merged.main_pair && gtResult?.main_pair) merged.main_pair = gtResult.main_pair;
  if (merged.market_cap == null && gtResult?.market_cap) merged.market_cap = gtResult.market_cap;

  cacheSet(cacheKey, merged);
  return merged;
}

/**
 * 获取代币安全/风控详情（等价 fetchAveTokenDetail 中的 LP 和 insider 检查）
 * 使用 GoPlus 替代 AVE
 * @returns {{ lpNotLocked: boolean|null, insiderRate: number|null, holderCount: number|null, riskLevel: string|null }}
 */
export async function getTokenSecurityDetail(address, chain = 'solana') {
  const cacheKey = `security:${address}:${chain}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const secInfo = await goplus.getTokenSecuritySingle(chain, address);

  const result = {
    lpNotLocked: null,
    insiderRate: null,
    holderCount: null,
    riskLevel: null,
    isHoneypot: null,
    buyTax: null,
    sellTax: null,
  };

  if (secInfo) {
    if (secInfo.is_lp_locked === true) result.lpNotLocked = false;
    else if (secInfo.is_lp_locked === false) result.lpNotLocked = true;
    else result.lpNotLocked = null;

    result.holderCount = secInfo.holder_count;
    result.riskLevel = secInfo.risk_level;
    result.isHoneypot = secInfo.is_honeypot;
    result.buyTax = secInfo.buy_tax;
    result.sellTax = secInfo.sell_tax;
    result.isMintable = secInfo.is_mintable ?? null;
    result.isFreezable = secInfo.is_freezable ?? null;
    result.topHolderPercent = secInfo.top_holder_percent ?? null;
  }

  cacheSet(cacheKey, result);
  return result;
}

/**
 * 批量获取代币安全信息
 * @param {string} chain 链
 * @param {string[]} addresses 地址数组
 * @returns {Promise<Map<string, object>>}
 */
export async function batchGetTokenSecurity(chain, addresses) {
  return goplus.getTokenSecurity(chain, addresses);
}

/**
 * 批量获取代币价格（等价 AVE /v2/tokens/price）
 * @param {Array<{address: string, chain: string}>} tokens
 * @returns {Promise<Map<string, number>>} tokenId → price
 */
export async function getTokenPrices(tokens) {
  const result = new Map();

  const solMints = tokens.filter((t) => t.chain === 'solana').map((t) => t.address);
  if (solMints.length > 0) {
    const jupPrices = await jupiter.getPrices(solMints);
    for (const [mint, info] of jupPrices) {
      result.set(`${mint}-solana`, info.price);
    }
  }

  const nonSol = tokens.filter((t) => t.chain !== 'solana');
  if (nonSol.length > 0) {
    const addrs = nonSol.map((t) => t.address);
    const pairs = await dexscreener.batchGetTokenPairs(addrs);
    for (const pair of pairs) {
      if (pair.priceUsd) {
        const chain = fromChain(pair.chainId);
        result.set(`${pair.baseToken.address}-${chain}`, parseFloat(pair.priceUsd));
      }
    }
  }

  return result;
}

/**
 * 获取 K 线/OHLCV 数据（等价 AVE /v2/klines/）
 * @param {string} pairOrTokenAddress 交易对或代币地址
 * @param {string} chain 链
 * @param {number} [interval=60] 间隔（分钟）
 * @param {number} [size=24] 数量
 */
export async function getKline(pairOrTokenAddress, chain, interval = 60, size = 24) {
  let timeframe = 'hour';
  let aggregate = 1;

  if (interval < 60) {
    timeframe = 'minute';
    aggregate = interval;
  } else if (interval >= 1440) {
    timeframe = 'day';
    aggregate = Math.round(interval / 1440);
  } else {
    timeframe = 'hour';
    aggregate = Math.round(interval / 60);
  }

  const ohlcvList = await geckoterminal.getPoolOhlcv(chain, pairOrTokenAddress, timeframe, {
    aggregate,
    limit: size,
  });

  return ohlcvList.map((item) => {
    const [ts, open, high, low, close, volume] = item;
    return { time: ts, open, high, low, close, volume };
  });
}

/**
 * 获取交易记录（等价 AVE /v2/txs/）
 */
export async function getSwapTxs(pairAddress, chain) {
  const trades = await geckoterminal.getPoolTrades(chain, pairAddress);
  return trades.map((t) => {
    const a = t.attributes || {};
    return {
      time: a.block_timestamp ? Math.floor(new Date(a.block_timestamp).getTime() / 1000) : null,
      tx_hash: a.tx_hash || null,
      type: a.kind || null,
      amount_usd: parseFloat(a.volume_in_usd) || null,
      price: parseFloat(a.price_to_in_usd) || parseFloat(a.price_from_in_usd) || null,
      sender: a.tx_from_address || null,
    };
  });
}

/**
 * 获取合约风险报告（等价 AVE /v2/contracts/）
 */
export async function getContractRisk(address, chain) {
  const secInfo = await goplus.getTokenSecuritySingle(chain, address);
  if (!secInfo) return null;
  return {
    risk_level: secInfo.risk_level,
    is_honeypot: secInfo.is_honeypot,
    buy_tax: secInfo.buy_tax,
    sell_tax: secInfo.sell_tax,
    is_open_source: secInfo.is_open_source,
    is_mintable: secInfo.is_mintable,
    is_freezable: secInfo.is_freezable ?? null,
    is_closable: secInfo.is_closable ?? null,
    owner_address: secInfo.owner_address,
    creator_address: secInfo.creator_address,
    holder_count: secInfo.holder_count,
    lp_holder_count: secInfo.lp_holder_count,
    total_supply: secInfo.total_supply,
    is_lp_locked: secInfo.is_lp_locked,
    trusted_token: secInfo.trusted_token ?? null,
    top_holder_percent: secInfo.top_holder_percent ?? null,
  };
}

/**
 * 获取链上趋势代币（等价 AVE /v2/tokens/trending）
 */
export async function getTrendingTokens(chain, page = 0, pageSize = 20) {
  const offset = page * pageSize;
  const tokens = await geckoterminal.getTrendingPools(chain, Math.ceil((offset + pageSize) / 20));
  const deduped = deduplicateByToken(tokens);
  return deduped.slice(offset, offset + pageSize);
}

/**
 * 获取支持的链列表
 */
export async function getSupportedChains() {
  try {
    return await geckoterminal.getNetworks();
  } catch {
    return SUPPORTED_CHAINS.map((id) => ({ id, name: id, chain: id }));
  }
}

/**
 * 获取链的主要代币（SOL / ETH / BNB 等）
 * 静态映射 + DexScreener 搜索补充
 */
export async function getMainTokens(chain) {
  const MAIN = {
    solana: [
      { token: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana' },
      { token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin' },
      { token: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', name: 'Tether USD' },
    ],
    eth: [
      { token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether' },
      { token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin' },
      { token: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD' },
    ],
    bsc: [
      { token: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', name: 'Wrapped BNB' },
      { token: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD' },
    ],
  };
  const list = MAIN[chain];
  if (list) return list.map((t) => ({ ...t, chain }));
  return [];
}

// ─── 辅助 ───────────────────────────────────────────────────
function extractChainFromTag(tag) {
  if (!tag) return null;
  const t = tag.toLowerCase();
  if (t.includes('solana') || t.includes('pump') || t.includes('sol')) return 'solana';
  if (t.includes('eth')) return 'eth';
  if (t.includes('bsc') || t.includes('bnb') || t.includes('fourmeme')) return 'bsc';
  if (t.includes('base')) return 'base';
  return null;
}

function fromChain(dexScreenerChainId) {
  const map = {
    ethereum: 'eth', solana: 'solana', bsc: 'bsc', base: 'base',
    arbitrum: 'arbitrum', polygon: 'polygon', avalanche: 'avalanche',
    optimism: 'optimism', ton: 'ton',
  };
  return map[dexScreenerChainId] || dexScreenerChainId;
}
