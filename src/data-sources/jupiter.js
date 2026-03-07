/**
 * Jupiter Price API 客户端（仅支持 Solana）
 * 注意：v2 API 现在需要认证。本模块会尝试 v2，失败则返回空结果。
 * 实际价格数据主要由 DexScreener 和 GeckoTerminal 提供，Jupiter 作为补充。
 *
 * 文档: https://dev.jup.ag/docs/price-api/
 */
import { RateLimiter } from './rate-limiter.js';

const ENDPOINTS = [
  'https://api.jup.ag/price/v2',
  'https://public.jupiterapi.com/price/v2',
];

const limiter = new RateLimiter(50);

/**
 * 批量获取 Solana 代币价格（每次最多 100 个）
 * @param {string[]} mints 代币 mint 地址数组
 * @returns {Promise<Map<string, {price: number, mintSymbol?: string}>>}
 */
export async function getPrices(mints) {
  const result = new Map();
  const BATCH = 100;
  for (let i = 0; i < mints.length; i += BATCH) {
    const batch = mints.slice(i, i + BATCH);
    await limiter.acquire();

    for (const base of ENDPOINTS) {
      try {
        const url = `${base}?ids=${batch.join(',')}`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) continue;
        const json = await res.json();
        const data = json.data || {};
        for (const [mint, info] of Object.entries(data)) {
          if (info?.price != null) {
            result.set(mint, {
              price: parseFloat(info.price),
              mintSymbol: info.mintSymbol || null,
            });
          }
        }
        break;
      } catch {
        continue;
      }
    }
  }
  return result;
}

/**
 * 获取单个 Solana 代币价格
 * @returns {Promise<number|null>}
 */
export async function getPrice(mint) {
  const prices = await getPrices([mint]);
  return prices.get(mint)?.price ?? null;
}
