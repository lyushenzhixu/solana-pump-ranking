/**
 * GeckoTerminal (CoinGecko) API 客户端
 * 免费 Beta API，无需 Key，~30 req/min
 * 文档: https://apiguide.geckoterminal.com/
 */
import { RateLimiter } from './rate-limiter.js';
import { toGeckoTerminal, fromGeckoTerminal } from './chain-map.js';

const BASE = 'https://api.geckoterminal.com/api/v2';

const limiter = new RateLimiter(20);

async function fetchJSON(url) {
  await limiter.acquire();
  const res = await fetch(url, {
    headers: { Accept: 'application/json;version=20230302' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GeckoTerminal ${res.status}: ${body}`);
  }
  return res.json();
}

function buildIncludedMap(included) {
  const map = new Map();
  if (!Array.isArray(included)) return map;
  for (const item of included) {
    if (item.id) map.set(item.id, item);
  }
  return map;
}

function extractTokenAddress(relId) {
  if (!relId || typeof relId !== 'string') return '';
  const idx = relId.indexOf('_');
  return idx >= 0 ? relId.slice(idx + 1) : relId;
}

function extractNetworkFromId(id) {
  if (!id || typeof id !== 'string') return '';
  const idx = id.indexOf('_');
  return idx >= 0 ? id.slice(0, idx) : '';
}

function normalizePool(pool, includedMap) {
  const attrs = pool.attributes || {};
  const rels = pool.relationships || {};

  const baseTokenId = rels.base_token?.data?.id || '';
  const networkId = rels.network?.data?.id || extractNetworkFromId(pool.id || '');
  const chain = fromGeckoTerminal(networkId);

  const tokenInfo = includedMap.get(baseTokenId)?.attributes || {};
  const tokenAddress = tokenInfo.address || extractTokenAddress(baseTokenId);

  const createdAt = attrs.pool_created_at;
  let launchTs = null;
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) launchTs = Math.floor(d.getTime() / 1000);
  }

  const vol24 = parseFloat(attrs.volume_usd?.h24) || null;
  const priceUsd = parseFloat(attrs.base_token_price_usd) || null;
  const mcap = parseFloat(attrs.market_cap_usd) || parseFloat(attrs.fdv_usd) || null;
  const priceChange24h = attrs.price_change_percentage?.h24 != null
    ? parseFloat(attrs.price_change_percentage.h24)
    : null;
  const reserveUsd = parseFloat(attrs.reserve_in_usd) || null;

  return {
    token: tokenAddress,
    chain,
    name: tokenInfo.name || attrs.name?.split(/\s*\/\s*/)[0] || null,
    symbol: tokenInfo.symbol || null,
    market_cap: mcap,
    tx_volume_u_24h: vol24,
    current_price_usd: priceUsd,
    price_change_24h: priceChange24h,
    holders: null,
    main_pair: attrs.address || null,
    logo_url: tokenInfo.image_url || null,
    launch_at: launchTs,
    is_lp_not_locked: undefined,
    insider_wallet_rate: undefined,
    _reserve_usd: reserveUsd,
    _dex_id: rels.dex?.data?.id || null,
    _gt_score: tokenInfo.gt_score ?? null,
  };
}

/**
 * 获取链上热门/趋势交易池
 * @param {string} chain 链标识（如 solana）
 * @param {number} [pages=5] 获取页数（每页约 20 个）
 */
export async function getTrendingPools(chain, pages = 5) {
  const network = toGeckoTerminal(chain);
  const results = [];
  for (let page = 1; page <= pages; page++) {
    try {
      const json = await fetchJSON(
        `${BASE}/networks/${network}/trending_pools?include=base_token,quote_token&page=${page}`,
      );
      const map = buildIncludedMap(json.included);
      const pools = (json.data || []).map((p) => normalizePool(p, map));
      results.push(...pools);
      if (!json.data?.length || json.data.length < 20) break;
    } catch (e) {
      console.warn(`GeckoTerminal trending page ${page} 失败:`, e.message);
      break;
    }
  }
  return results;
}

/**
 * 获取链上新交易池
 */
export async function getNewPools(chain, pages = 5) {
  const network = toGeckoTerminal(chain);
  const results = [];
  for (let page = 1; page <= pages; page++) {
    try {
      const json = await fetchJSON(
        `${BASE}/networks/${network}/new_pools?include=base_token,quote_token&page=${page}`,
      );
      const map = buildIncludedMap(json.included);
      const pools = (json.data || []).map((p) => normalizePool(p, map));
      results.push(...pools);
      if (!json.data?.length || json.data.length < 20) break;
    } catch (e) {
      console.warn(`GeckoTerminal new_pools page ${page} 失败:`, e.message);
      break;
    }
  }
  return results;
}

/**
 * 获取单个代币信息
 */
export async function getToken(chain, address) {
  const network = toGeckoTerminal(chain);
  try {
    const json = await fetchJSON(
      `${BASE}/networks/${network}/tokens/${address}?include=top_pools`,
    );
    const attrs = json.data?.attributes || {};
    const topPoolId = json.data?.relationships?.top_pools?.data?.[0]?.id;
    const poolAddr = topPoolId ? extractTokenAddress(topPoolId) : null;

    return {
      token: attrs.address || address,
      chain: fromGeckoTerminal(network),
      name: attrs.name || null,
      symbol: attrs.symbol || null,
      market_cap: parseFloat(attrs.market_cap_usd) || parseFloat(attrs.fdv_usd) || null,
      tx_volume_u_24h: parseFloat(attrs.volume_usd?.h24) || null,
      current_price_usd: parseFloat(attrs.price_usd) || null,
      price_change_24h: null,
      holders: null,
      main_pair: poolAddr,
      logo_url: attrs.image_url || null,
      launch_at: null,
      is_lp_not_locked: undefined,
      insider_wallet_rate: undefined,
      _gt_score: attrs.gt_score ?? null,
      _total_reserve_usd: parseFloat(attrs.total_reserve_in_usd) || null,
    };
  } catch {
    return null;
  }
}

/**
 * 获取交易池 OHLCV K 线数据
 * @param {string} chain 链
 * @param {string} poolAddress 交易池地址
 * @param {'minute'|'hour'|'day'} timeframe 时间粒度
 * @param {object} [options] 额外参数 { aggregate, before_timestamp, limit, currency, token }
 */
export async function getPoolOhlcv(chain, poolAddress, timeframe = 'hour', options = {}) {
  const network = toGeckoTerminal(chain);
  const params = new URLSearchParams();
  if (options.aggregate) params.set('aggregate', options.aggregate);
  if (options.before_timestamp) params.set('before_timestamp', options.before_timestamp);
  if (options.limit) params.set('limit', options.limit);
  if (options.currency) params.set('currency', options.currency);
  if (options.token) params.set('token', options.token);
  const qs = params.toString() ? `?${params}` : '';
  const json = await fetchJSON(
    `${BASE}/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}${qs}`,
  );
  return json.data?.attributes?.ohlcv_list || [];
}

/**
 * 获取交易池最近交易记录
 */
export async function getPoolTrades(chain, poolAddress) {
  const network = toGeckoTerminal(chain);
  const json = await fetchJSON(`${BASE}/networks/${network}/pools/${poolAddress}/trades`);
  return json.data || [];
}

/**
 * 搜索交易池
 */
export async function searchPools(query) {
  const json = await fetchJSON(`${BASE}/search/pools?query=${encodeURIComponent(query)}&include=base_token,quote_token`);
  const map = buildIncludedMap(json.included);
  return (json.data || []).map((p) => normalizePool(p, map));
}

/**
 * 获取支持的网络列表
 */
export async function getNetworks() {
  const json = await fetchJSON(`${BASE}/networks`);
  return (json.data || []).map((n) => ({
    id: n.id,
    name: n.attributes?.name || n.id,
    chain: fromGeckoTerminal(n.id),
  }));
}

/**
 * 批量获取多个代币信息（逐个请求，遵守限流）
 */
export async function batchGetTokens(chain, addresses) {
  const results = [];
  for (const addr of addresses) {
    const info = await getToken(chain, addr);
    if (info) results.push(info);
  }
  return results;
}
