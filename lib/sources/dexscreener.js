/**
 * DexScreener API 客户端
 * 免费，无需 API Key，300 req/min (search/pairs), 60 req/min (profiles/boosts)
 * 文档: https://docs.dexscreener.com/api/reference
 */
import { RateLimiter } from './rate-limiter.js';
import { fromDexScreener, toDexScreener } from './chain-map.js';

const BASE = 'https://api.dexscreener.com';

const pairLimiter = new RateLimiter(280);
const profileLimiter = new RateLimiter(55);

async function fetchJSON(url, limiter) {
  await limiter.acquire();
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`DexScreener ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * 搜索代币/交易对
 * @returns {Promise<Array>} DexScreener pair 对象数组
 */
export async function search(query) {
  const json = await fetchJSON(
    `${BASE}/latest/dex/search?q=${encodeURIComponent(query)}`,
    pairLimiter,
  );
  return json.pairs || [];
}

/**
 * 按代币地址获取所有交易对（支持批量，逗号分隔，每批最多 30 个）
 */
export async function getTokenPairs(tokenAddresses) {
  const addrs = Array.isArray(tokenAddresses) ? tokenAddresses.join(',') : tokenAddresses;
  const json = await fetchJSON(`${BASE}/latest/dex/tokens/${addrs}`, pairLimiter);
  return json.pairs || [];
}

/**
 * 按链 + 交易对地址获取（逗号分隔）
 */
export async function getPairsByChain(chain, pairAddresses) {
  const chainId = toDexScreener(chain);
  const addrs = Array.isArray(pairAddresses) ? pairAddresses.join(',') : pairAddresses;
  const json = await fetchJSON(`${BASE}/latest/dex/pairs/${chainId}/${addrs}`, pairLimiter);
  return json.pairs || json.pair ? [json.pair] : [];
}

/**
 * 获取最新 boost 的代币列表
 */
export async function getLatestBoosts() {
  const json = await fetchJSON(`${BASE}/token-boosts/latest/v1`, profileLimiter);
  return Array.isArray(json) ? json : [];
}

/**
 * 获取最新 token profiles
 */
export async function getLatestProfiles() {
  const json = await fetchJSON(`${BASE}/token-profiles/latest/v1`, profileLimiter);
  return Array.isArray(json) ? json : [];
}

/**
 * 批量获取多个代币的交易对数据（自动拆分为每批 30 个）
 * @param {string[]} addresses 代币地址数组
 * @returns {Promise<Array>} 所有 pair 数据
 */
export async function batchGetTokenPairs(addresses) {
  const all = [];
  const BATCH = 30;
  for (let i = 0; i < addresses.length; i += BATCH) {
    const batch = addresses.slice(i, i + BATCH);
    const pairs = await getTokenPairs(batch);
    all.push(...pairs);
  }
  return all;
}

/**
 * 将 DexScreener pair 数据规范化为 AVE 兼容的代币格式
 */
export function normalizePair(pair) {
  const chain = fromDexScreener(pair.chainId);
  return {
    token: pair.baseToken?.address || '',
    chain,
    name: pair.baseToken?.name || null,
    symbol: pair.baseToken?.symbol || null,
    market_cap: pair.marketCap ?? pair.fdv ?? null,
    tx_volume_u_24h: pair.volume?.h24 ?? null,
    current_price_usd: pair.priceUsd != null ? parseFloat(pair.priceUsd) : null,
    price_change_24h: pair.priceChange?.h24 ?? null,
    holders: null,
    main_pair: pair.pairAddress || null,
    logo_url: pair.info?.imageUrl || null,
    launch_at: pair.pairCreatedAt ? Math.floor(pair.pairCreatedAt / 1000) : null,
    is_lp_not_locked: undefined,
    insider_wallet_rate: undefined,
    _liquidity_usd: pair.liquidity?.usd ?? null,
    _dex_id: pair.dexId || null,
    _pair_url: pair.url || null,
    _txns_h24: pair.txns?.h24 || null,
  };
}

/**
 * 按代币地址获取规范化的代币数据（选择流动性最高的交易对）
 * @param {string} address 代币地址
 * @param {string} [chain] 可选链筛选
 * @returns {Promise<object|null>} AVE 兼容代币对象
 */
export async function getTokenDetail(address, chain) {
  const pairs = await getTokenPairs(address);
  if (!pairs.length) return null;

  let filtered = pairs;
  if (chain) {
    const dsChain = toDexScreener(chain);
    filtered = pairs.filter((p) => p.chainId === dsChain);
    if (!filtered.length) filtered = pairs;
  }

  filtered.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
  return normalizePair(filtered[0]);
}
