/**
 * Helius API 客户端
 * Solana 链上地址分析，用于庄家猎手钱包聚类
 * 文档: https://docs.helius.dev/
 *
 * 性能优化：
 *   - 速率限制 40 req/sec（Developer Plan: 50 RPC + 50 Enhanced/sec）
 *   - 429 指数退避重试（最多 3 次）
 *   - 断路器：连续 8 次失败后熔断 60s
 *   - API credit 计数器，追踪使用量
 *   - 自动代理支持（读取 HTTP_PROXY / HTTPS_PROXY 环境变量）
 *   - 404 "search period" 错误优雅处理（不触发重试和断路器）
 */
import { RateLimiter } from './rate-limiter.js';

const HELIUS_API_KEY = () => process.env.HELIUS_API_KEY;
const ENHANCED_BASE = () => `https://api.helius.xyz/v0`;
const RPC_BASE = () => `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY()}`;

const limiter = new RateLimiter(2400); // 2400/min = 40/sec (Developer Plan)

// ─── Credit 计数器 ───────────────────────────────────────────
let creditsUsed = 0;

// ─── 断路器 ──────────────────────────────────────────────────
const breaker = {
  failures: 0,
  threshold: 8,
  openUntil: 0,
  cooldown: 60_000,
};

function breakerCheck() {
  if (breaker.openUntil && Date.now() < breaker.openUntil) {
    throw new Error('Helius 断路器已打开，暂停请求');
  }
}

function breakerSuccess() {
  breaker.failures = 0;
  breaker.openUntil = 0;
}

function breakerFail() {
  breaker.failures++;
  if (breaker.failures >= breaker.threshold) {
    breaker.openUntil = Date.now() + breaker.cooldown;
    console.warn(`[Helius] 断路器打开，${breaker.cooldown / 1000}s 后恢复`);
  }
}

// ─── 带重试的 fetch ──────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;
const REQUEST_TIMEOUT_MS = 45_000;

async function heliusFetch(url, options = {}) {
  breakerCheck();
  await limiter.acquire();
  creditsUsed++;

  // 代理由调用方全局设置（undici.setGlobalDispatcher），此处无需处理
  const fetchOptions = {
    ...options,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);

      if (res.status === 429) {
        breakerFail();
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt);
          console.warn(`[Helius] 429 限流，${delay}ms 后重试 (${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, delay));
          await limiter.acquire();
          creditsUsed++;
          continue;
        }
        const body = await res.text().catch(() => '');
        throw new Error(`Helius 429: ${body}`);
      }

      // 404 通常是 "search period exceeded"，不需要重试，直接返回空
      if (res.status === 404) {
        breakerSuccess(); // 404 不是服务器故障，不计入断路器
        return [];
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Helius ${res.status}: ${body}`);
      }

      breakerSuccess();
      return res.json();
    } catch (e) {
      if (e.message?.includes('断路器')) throw e;
      if (attempt === MAX_RETRIES) {
        breakerFail();
        throw e;
      }
      const delay = RETRY_BASE_MS * Math.pow(2, attempt);
      console.warn(`[Helius] 请求失败，${delay}ms 后重试 (${attempt + 1}/${MAX_RETRIES}):`, e.message);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ─── Enhanced Transactions API ───────────────────────────────
/**
 * 获取地址的解析交易历史（Enhanced API）
 * 返回带 token transfers、SOL transfers 的结构化交易数据
 * @param {string} address 钱包地址
 * @param {object} [options] { limit?, before?, type? }
 */
export async function getEnhancedTransactions(address, options = {}) {
  const key = HELIUS_API_KEY();
  if (!key) throw new Error('HELIUS_API_KEY 未配置');

  const params = new URLSearchParams({ 'api-key': key });
  if (options.limit) params.set('limit', options.limit);
  if (options.before) params.set('before', options.before);
  if (options.type) params.set('type', options.type);

  const url = `${ENHANCED_BASE()}/addresses/${address}/transactions?${params}`;
  const data = await heliusFetch(url);
  return Array.isArray(data) ? data : [];
}

/**
 * 分页获取地址的全部交易（最多 maxPages 页）
 * @param {string} address 钱包地址
 * @param {object} [options] { type?, maxPages?, limit? }
 */
export async function getAllEnhancedTransactions(address, options = {}) {
  const maxPages = options.maxPages || 5;
  const limit = options.limit || 100;
  const allTxns = [];
  let before = undefined;

  for (let page = 0; page < maxPages; page++) {
    const txns = await getEnhancedTransactions(address, {
      limit,
      before,
      type: options.type,
    });
    if (!txns.length) break;
    allTxns.push(...txns);
    before = txns[txns.length - 1].signature;
    if (txns.length < limit) break;
  }

  return allTxns;
}

// ─── Solana RPC via Helius ───────────────────────────────────
/**
 * getSignaturesForAddress RPC 调用
 * @param {string} address 钱包地址
 * @param {object} [options] { limit?, before?, until? }
 */
export async function getSignaturesForAddress(address, options = {}) {
  const key = HELIUS_API_KEY();
  if (!key) throw new Error('HELIUS_API_KEY 未配置');

  const params = [address, {}];
  if (options.limit) params[1].limit = options.limit;
  if (options.before) params[1].before = options.before;
  if (options.until) params[1].until = options.until;

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getSignaturesForAddress',
    params,
  };

  const result = await heliusFetch(RPC_BASE(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return result?.result || [];
}

/**
 * getTransaction RPC 调用
 * @param {string} signature 交易签名
 */
export async function getTransaction(signature) {
  const key = HELIUS_API_KEY();
  if (!key) throw new Error('HELIUS_API_KEY 未配置');

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getTransaction',
    params: [signature, { maxSupportedTransactionVersion: 0 }],
  };

  const result = await heliusFetch(RPC_BASE(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return result?.result || null;
}

// ─── 工具函数 ────────────────────────────────────────────────
/**
 * 获取本次会话已使用的 API credits
 */
export function getApiCreditsUsed() {
  return creditsUsed;
}

/**
 * 重置 credit 计数器
 */
export function resetCreditsCounter() {
  creditsUsed = 0;
}

/**
 * 检查 HELIUS_API_KEY 是否已配置
 */
export function isConfigured() {
  return !!HELIUS_API_KEY();
}

/**
 * 获取断路器状态
 */
export function getCircuitBreakerStatus() {
  return {
    failures: breaker.failures,
    isOpen: breaker.openUntil > 0 && Date.now() < breaker.openUntil,
    openUntil: breaker.openUntil ? new Date(breaker.openUntil).toISOString() : null,
  };
}
