/**
 * 分层缓存管理器 —— 支持不同数据类型的差异化 TTL、stale-while-revalidate、自动清理
 *
 * 设计思路：
 *   - 热数据（trending/ranks）TTL 与定时更新周期对齐，避免无效请求
 *   - stale 窗口允许在后台刷新期间继续返回旧数据，避免请求阻塞
 *   - 定时清理避免内存无限增长
 */

const TIER_CONFIG = {
  trending:  { ttl: 5 * 60_000, stale: 3 * 60_000 },   // 趋势/热门池：5min + 3min stale
  ranking:   { ttl: 5 * 60_000, stale: 3 * 60_000 },   // 排行榜：5min + 3min stale
  detail:    { ttl: 3 * 60_000, stale: 2 * 60_000 },   // 代币详情：3min + 2min stale
  search:    { ttl: 2 * 60_000, stale: 2 * 60_000 },   // 搜索结果：2min + 2min stale
  kline:     { ttl: 60_000,     stale: 60_000 },        // K线：1min + 1min stale
  security:  { ttl: 10 * 60_000, stale: 5 * 60_000 },  // 安全报告：10min + 5min stale
  network:   { ttl: 30 * 60_000, stale: 30 * 60_000 },  // 网络列表：30min + 30min stale
  default:   { ttl: 3 * 60_000, stale: 2 * 60_000 },
};

const GC_INTERVAL = 5 * 60_000;

export class CacheManager {
  /** @type {Map<string, {value: any, ts: number, tier: string, refreshing?: boolean}>} */
  #store = new Map();
  #gcTimer = null;
  #stats = { hits: 0, staleHits: 0, misses: 0 };

  constructor() {
    this.#gcTimer = setInterval(() => this.#gc(), GC_INTERVAL);
    if (this.#gcTimer.unref) this.#gcTimer.unref();
  }

  /**
   * 获取缓存值
   * @param {string} key
   * @returns {{ value: any, fresh: boolean } | undefined}
   */
  get(key) {
    const entry = this.#store.get(key);
    if (!entry) {
      this.#stats.misses++;
      return undefined;
    }
    const age = Date.now() - entry.ts;
    const cfg = TIER_CONFIG[entry.tier] || TIER_CONFIG.default;

    if (age <= cfg.ttl) {
      this.#stats.hits++;
      return { value: entry.value, fresh: true };
    }
    if (age <= cfg.ttl + cfg.stale) {
      this.#stats.staleHits++;
      return { value: entry.value, fresh: false };
    }
    this.#store.delete(key);
    this.#stats.misses++;
    return undefined;
  }

  /**
   * 设置缓存
   * @param {string} key
   * @param {any} value
   * @param {string} [tier='default']
   */
  set(key, value, tier = 'default') {
    this.#store.set(key, { value, ts: Date.now(), tier });
  }

  /**
   * 标记 key 正在后台刷新（防止并发重复刷新）
   * @returns {boolean} true=成功获取锁; false=已有其他刷新在进行
   */
  markRefreshing(key) {
    const entry = this.#store.get(key);
    if (!entry) return true;
    if (entry.refreshing) return false;
    entry.refreshing = true;
    return true;
  }

  clearRefreshing(key) {
    const entry = this.#store.get(key);
    if (entry) entry.refreshing = false;
  }

  /** 缓存命中统计 */
  getStats() {
    return { ...this.#stats, size: this.#store.size };
  }

  #gc() {
    const now = Date.now();
    for (const [key, entry] of this.#store) {
      const cfg = TIER_CONFIG[entry.tier] || TIER_CONFIG.default;
      if (now - entry.ts > cfg.ttl + cfg.stale) {
        this.#store.delete(key);
      }
    }
  }

  destroy() {
    if (this.#gcTimer) clearInterval(this.#gcTimer);
    this.#store.clear();
  }
}

export const cache = new CacheManager();

/**
 * 带 stale-while-revalidate 的缓存包装器
 * 命中 fresh → 直接返回
 * 命中 stale → 返回旧值，后台异步刷新
 * 未命中   → 等待新值
 *
 * @param {string} key
 * @param {string} tier
 * @param {() => Promise<any>} fetcher
 */
export async function cachedFetch(key, tier, fetcher) {
  const hit = cache.get(key);
  if (hit?.fresh) return hit.value;

  if (hit && !hit.fresh) {
    if (cache.markRefreshing(key)) {
      fetcher()
        .then((v) => cache.set(key, v, tier))
        .catch(() => {})
        .finally(() => cache.clearRefreshing(key));
    }
    return hit.value;
  }

  const value = await fetcher();
  cache.set(key, value, tier);
  return value;
}
