/**
 * GoPlus Security API 客户端
 * 免费 30 req/min，支持 30+ 条链 + Solana 专用端点
 * 文档: https://docs.gopluslabs.io/
 *
 * Solana: /api/v1/solana/token_security（专用端点）
 * EVM 链: /api/v1/token_security/{chain_id}
 */
import { RateLimiter } from './rate-limiter.js';
import { toGoPlus } from './chain-map.js';

const BASE = 'https://api.gopluslabs.io/api/v1';

const limiter = new RateLimiter(25);

/**
 * 批量查询代币安全信息
 * @param {string} chain 链标识
 * @param {string[]} addresses 合约地址数组
 * @returns {Promise<Map<string, object>>} address → 安全信息
 */
export async function getTokenSecurity(chain, addresses) {
  const result = new Map();
  const isSolana = chain === 'solana';
  const chainId = isSolana ? null : toGoPlus(chain);
  if (!isSolana && !chainId) return result;

  const BATCH = 20;
  for (let i = 0; i < addresses.length; i += BATCH) {
    const batch = addresses.slice(i, i + BATCH);
    await limiter.acquire();
    try {
      const endpoint = isSolana
        ? `${BASE}/solana/token_security`
        : `${BASE}/token_security/${chainId}`;
      const url = `${endpoint}?contract_addresses=${batch.join(',')}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.code !== 1 && json.code !== '1') continue;
      const data = json.result || {};
      for (const [addr, info] of Object.entries(data)) {
        const normalized = isSolana
          ? normalizeSolanaSecurityInfo(info)
          : normalizeEvmSecurityInfo(info);
        result.set(addr.toLowerCase(), normalized);
      }
    } catch (e) {
      console.warn('GoPlus 安全检测请求失败:', e.message);
    }
  }
  return result;
}

/**
 * 查询单个代币安全信息
 */
export async function getTokenSecuritySingle(chain, address) {
  const map = await getTokenSecurity(chain, [address]);
  return map.get(address.toLowerCase()) ?? null;
}

// ─── Solana 专用解析 ─────────────────────────────────────────

function normalizeSolanaSecurityInfo(info) {
  if (!info) return null;

  const mintable = info.mintable?.status === '1' || info.mintable?.status === 1;
  const freezable = info.freezable?.status === '1' || info.freezable?.status === 1;
  const closable = info.closable?.status === '1' || info.closable?.status === 1;
  const metadataMutable = info.metadata_mutable?.status === '1' || info.metadata_mutable?.status === 1;
  const holderCount = parseInt(info.holder_count) || null;
  const totalSupply = parseFloat(info.total_supply) || null;
  const trustedToken = info.trusted_token === 1 || info.trusted_token === '1';

  const isLpLocked = checkSolanaLpLocked(info);

  const topHolders = (info.holders || []).slice(0, 10);
  const topHolderPercent = topHolders.reduce((sum, h) => sum + (parseFloat(h.percent) || 0), 0);

  let riskLevel = 'LOW';
  if (freezable) riskLevel = 'HIGH';
  else if (mintable) riskLevel = 'MEDIUM';
  else if (closable) riskLevel = 'MEDIUM';
  else if (topHolderPercent > 0.5) riskLevel = 'MEDIUM';

  return {
    is_honeypot: freezable || closable ? true : null,
    buy_tax: null,
    sell_tax: null,
    is_open_source: null,
    is_mintable: mintable,
    is_freezable: freezable,
    is_closable: closable,
    metadata_mutable: metadataMutable,
    owner_address: null,
    creator_address: info.creators?.[0]?.address || null,
    holder_count: holderCount,
    lp_holder_count: (info.lp_holders || []).length,
    total_supply: totalSupply,
    is_lp_locked: isLpLocked,
    trusted_token: trustedToken,
    top_holder_percent: topHolderPercent,
    risk_level: riskLevel,
    _raw: info,
  };
}

function checkSolanaLpLocked(info) {
  if (info.lp_holders && Array.isArray(info.lp_holders)) {
    for (const h of info.lp_holders) {
      if (h.is_locked === 1 || h.is_locked === '1' || h.is_locked === true) return true;
    }
  }
  if (info.dex && Array.isArray(info.dex)) {
    for (const d of info.dex) {
      const burnPct = parseFloat(d.burn_percent);
      if (burnPct > 0) return true;
    }
  }
  return null;
}

// ─── EVM 链解析 ──────────────────────────────────────────────

function normalizeEvmSecurityInfo(info) {
  if (!info) return null;

  const isHoneypot = parseBool(info.is_honeypot);
  const buyTax = parsePercent(info.buy_tax);
  const sellTax = parsePercent(info.sell_tax);
  const isOpenSource = parseBool(info.is_open_source);
  const isMintable = parseBool(info.is_mintable);
  const holderCount = parseInt(info.holder_count) || null;
  const lpHolderCount = parseInt(info.lp_holder_count) || null;
  const totalSupply = parseFloat(info.total_supply) || null;

  const isLpLocked = checkEvmLpLocked(info);

  let riskLevel = 'LOW';
  if (isHoneypot === true) riskLevel = 'CRITICAL';
  else if (buyTax > 10 || sellTax > 10) riskLevel = 'HIGH';
  else if (isMintable === true) riskLevel = 'MEDIUM';
  else if (buyTax > 5 || sellTax > 5) riskLevel = 'MEDIUM';

  return {
    is_honeypot: isHoneypot,
    buy_tax: buyTax,
    sell_tax: sellTax,
    is_open_source: isOpenSource,
    is_mintable: isMintable,
    owner_address: info.owner_address || null,
    creator_address: info.creator_address || null,
    holder_count: holderCount,
    lp_holder_count: lpHolderCount,
    total_supply: totalSupply,
    is_lp_locked: isLpLocked,
    risk_level: riskLevel,
    _raw: info,
  };
}

function checkEvmLpLocked(info) {
  if (info.lp_holders && Array.isArray(info.lp_holders)) {
    for (const h of info.lp_holders) {
      if (h.is_locked === 1 || h.is_locked === '1' || h.is_locked === true) return true;
      if (h.tag === 'burn' || h.tag === 'Burn') return true;
      if (h.address === '0x000000000000000000000000000000000000dead') return true;
    }
  }
  return null;
}

function parseBool(val) {
  if (val === '1' || val === 1 || val === true) return true;
  if (val === '0' || val === 0 || val === false) return false;
  return null;
}

function parsePercent(val) {
  if (val == null || val === '') return null;
  const n = parseFloat(val);
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n : n * 100;
}
