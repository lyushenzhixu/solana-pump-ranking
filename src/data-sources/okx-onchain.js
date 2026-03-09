/**
 * OKX OnchainOS Market API 数据源
 * 文档：https://web3.okx.com/zh-hans/onchainos/dev-docs/home/what-is-onchainos
 *
 * 提供代币搜索、持仓分布、价格/交易信息等接口
 * 用于补充现有数据源（DexScreener / GeckoTerminal / GoPlus）不足之处
 */

import crypto from 'crypto';

const BASE_URL = 'https://web3.okx.com';
const MARKET_BASE = `${BASE_URL}/api/v6/dex/market`;

const OKX_API_KEY = (process.env.OKX_API_KEY || '').trim();
const OKX_SECRET_KEY = (process.env.OKX_SECRET_KEY || '').trim();
const OKX_PASSPHRASE = (process.env.OKX_PASSPHRASE || '').trim();

const CHAIN_INDEX = {
  solana: '501',
  eth: '1',
  bsc: '56',
  base: '8453',
  arbitrum: '42161',
  polygon: '137',
  avalanche: '43114',
  ton: '-1',
};

function getChainIndex(chain) {
  return CHAIN_INDEX[chain] || chain;
}

function isConfigured() {
  return !!(OKX_API_KEY && OKX_SECRET_KEY && OKX_PASSPHRASE);
}

function buildSignature(timestamp, method, requestPath, body = '') {
  const preHash = timestamp + method.toUpperCase() + requestPath + (body || '');
  return crypto.createHmac('sha256', OKX_SECRET_KEY).update(preHash).digest('base64');
}

function buildHeaders(method, requestPath, body = '') {
  const timestamp = new Date().toISOString();
  const sign = buildSignature(timestamp, method, requestPath, body);
  return {
    'OK-ACCESS-KEY': OKX_API_KEY,
    'OK-ACCESS-SIGN': sign,
    'OK-ACCESS-PASSPHRASE': OKX_PASSPHRASE,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'Content-Type': 'application/json',
  };
}

async function okxFetch(method, path, body = null) {
  if (!isConfigured()) throw new Error('OKX API 未配置');
  const bodyStr = body ? JSON.stringify(body) : '';
  const headers = buildHeaders(method, path, bodyStr);
  const url = BASE_URL + path;
  const res = await fetch(url, {
    method,
    headers,
    body: method === 'GET' ? undefined : bodyStr,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OKX API ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.code !== '0' && json.code !== 0) {
    throw new Error(`OKX API error ${json.code}: ${json.msg || ''}`);
  }
  return json.data;
}

// ─── 内存缓存 ───
const cache = new Map();
const CACHE_TTL = 2 * 60_000;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return undefined; }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, ts: Date.now() });
}

/**
 * 获取代币 Top20 持有者
 * GET /api/v6/dex/market/token/holder?chainIndex=501&tokenContractAddress=xxx
 */
export async function getTokenHolders(address, chain = 'solana') {
  const chainIdx = getChainIndex(chain);
  const cacheKey = `okx:holders:${address}:${chainIdx}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const path = `/api/v6/dex/market/token/holder?chainIndex=${chainIdx}&tokenContractAddress=${encodeURIComponent(address)}`;
  const data = await okxFetch('GET', path);
  const result = Array.isArray(data) ? data : [];
  cacheSet(cacheKey, result);
  return result;
}

/**
 * 根据 Top20 持有者计算 Top10 持仓比例
 * 需要配合总供应量来算百分比
 */
export async function getTop10HolderPercent(address, chain = 'solana', totalSupply = null) {
  try {
    const holders = await getTokenHolders(address, chain);
    if (!holders || holders.length === 0) return null;
    const top10 = holders.slice(0, 10);
    const totalHeld = top10.reduce((sum, h) => sum + parseFloat(h.holdAmount || 0), 0);
    if (totalSupply && totalSupply > 0) {
      return (totalHeld / totalSupply) * 100;
    }
    const allHeld = holders.reduce((sum, h) => sum + parseFloat(h.holdAmount || 0), 0);
    if (allHeld > 0) {
      return (totalHeld / allHeld) * 100;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 搜索代币
 * GET /api/v6/dex/market/token/search?keyword=xxx
 */
export async function searchTokens(keyword) {
  const cacheKey = `okx:search:${keyword}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const path = `/api/v6/dex/market/token/search?keyword=${encodeURIComponent(keyword)}`;
  const data = await okxFetch('GET', path);
  const result = Array.isArray(data) ? data : [];
  cacheSet(cacheKey, result);
  return result;
}

/**
 * 获取代币价格/交易信息（批量）
 * POST /api/v6/dex/market/price-info
 */
export async function getTokenPriceInfo(tokens) {
  if (!tokens || tokens.length === 0) return [];
  const cacheKey = `okx:priceinfo:${tokens.map(t => t.chainIndex + ':' + t.tokenContractAddress).join(',')}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const path = '/api/v6/dex/market/price-info';
  const body = tokens.slice(0, 100).map(t => ({
    chainIndex: t.chainIndex || getChainIndex(t.chain || 'solana'),
    tokenContractAddress: t.tokenContractAddress || t.address,
  }));
  const data = await okxFetch('POST', path, body);
  const result = Array.isArray(data) ? data : [];
  cacheSet(cacheKey, result);
  return result;
}

/**
 * 获取单个代币的详细价格/交易信息
 */
export async function getTokenDetail(address, chain = 'solana') {
  try {
    const result = await getTokenPriceInfo([{ address, chain }]);
    return result && result.length > 0 ? result[0] : null;
  } catch {
    return null;
  }
}

export { isConfigured, getChainIndex, CHAIN_INDEX };
