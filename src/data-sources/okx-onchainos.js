/**
 * OKX OnChainOS API 数据源
 * 用于补充代币数据（Top 持有人、代币信息等）
 * 文档：https://web3.okx.com/zh-hans/onchainos/dev-docs/home/what-is-onchainos
 *
 * 需配置环境变量：OKX_API_KEY、OKX_SECRET_KEY、OKX_PASSPHRASE
 */

import { createHmac } from 'crypto';

const OKX_BASE = 'https://www.okx.com';
const OKX_ONCHAIN_BASE = 'https://web3.okx.com';

// OKX 链标识：内部 chain -> OKX chainIndex / chainId
const OKX_CHAIN_MAP = {
  solana: 'solana',
  eth: '1',
  ethereum: '1',
  bsc: '56',
  base: '8453',
  arbitrum: '42161',
  polygon: '137',
  avalanche: '43114',
  optimism: '10',
};

/**
 * 生成 OKX API 签名
 */
function signOKX(timestamp, method, path, body = '') {
  const secret = process.env.OKX_SECRET_KEY;
  if (!secret) return '';
  const prehash = timestamp + method + path + body;
  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(prehash);
    return hmac.digest('base64');
  } catch {
    return '';
  }
}

/**
 * 发起 OKX 认证请求
 */
async function okxRequest(method, path, body = null) {
  const key = process.env.OKX_API_KEY;
  const passphrase = process.env.OKX_PASSPHRASE;
  if (!key || !passphrase) {
    return null;
  }
  const timestamp = new Date().toISOString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const sign = signOKX(timestamp, method, path, bodyStr);
  const url = path.startsWith('http') ? path : OKX_BASE + path;
  const headers = {
    'OK-ACCESS-KEY': key,
    'OK-ACCESS-SIGN': sign,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'Content-Type': 'application/json',
  };
  const res = await fetch(url, {
    method,
    headers,
    body: bodyStr || undefined,
  }).catch(() => null);
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * OKX OnChainOS 公开接口（部分接口可能无需签名，先尝试无签名的 DEX Market API）
 * 参考：https://web3.okx.com/api/v6/dex/market/token/holder
 */
async function okxOnChainRequest(method, path, params = {}) {
  const key = process.env.OKX_API_KEY;
  const passphrase = process.env.OKX_PASSPHRASE;
  const hasAuth = key && passphrase;
  const url = new URL(path.startsWith('http') ? path : OKX_ONCHAIN_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  });
  const headers = { 'Content-Type': 'application/json' };
  if (hasAuth) {
    const timestamp = new Date().toISOString();
    const pathWithQuery = url.pathname + (url.search || '');
    const sign = signOKX(timestamp, method, pathWithQuery, '');
    headers['OK-ACCESS-KEY'] = key;
    headers['OK-ACCESS-SIGN'] = sign;
    headers['OK-ACCESS-PASSPHRASE'] = passphrase;
    headers['OK-ACCESS-TIMESTAMP'] = timestamp;
  }
  const res = await fetch(url.toString(), { method, headers }).catch(() => null);
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * 获取代币 Top 持有人（Top 20）
 * 用于计算 Top10 占比，补充 GoPlus/Binance 数据
 * @param {string} tokenAddress 代币合约地址
 * @param {string} chain 链标识 solana/eth/bsc 等
 * @returns {Promise<{ topHolderPercent: number|null, holders: Array }>}
 */
export async function getTokenHolders(tokenAddress, chain = 'solana') {
  const chainIndex = OKX_CHAIN_MAP[chain] ?? chain;
  const path = `/api/v6/dex/market/token/holder?chainIndex=${encodeURIComponent(chainIndex)}&tokenContractAddress=${encodeURIComponent(tokenAddress)}`;
  const json = await okxOnChainRequest('GET', path);
  if (!json?.data || !Array.isArray(json.data)) return { topHolderPercent: null, holders: [] };
  const holders = json.data;
  let totalPct = 0;
  const top10 = holders.slice(0, 10);
  for (const h of top10) {
    const pct = parseFloat(h.percent || h.holdPercent || '0');
    if (Number.isFinite(pct)) totalPct += pct;
  }
  const topHolderPercent = Number.isFinite(totalPct) && totalPct > 0 ? totalPct : null;
  return { topHolderPercent, holders };
}

/**
 * 获取代币动态信息（价格、市值等）
 * 若 OKX 有此接口，可作为 DexScreener/GeckoTerminal 的补充
 */
export async function getTokenDynamicInfo(tokenAddress, chain = 'solana') {
  const chainIndex = OKX_CHAIN_MAP[chain] ?? chain;
  const path = `/api/v6/dex/market/token/dynamic?chainIndex=${encodeURIComponent(chainIndex)}&tokenContractAddress=${encodeURIComponent(tokenAddress)}`;
  const json = await okxOnChainRequest('GET', path);
  if (!json?.data) return null;
  return json.data;
}

/**
 * 检查 OKX API 是否可用
 */
export function isOKXConfigured() {
  return !!(process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE);
}
