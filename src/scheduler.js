/**
 * 后台调度器 — 定时更新榜单 + 预取叙事/推文
 * 从 server.js 原封不动提取
 */
import { supabase } from './supabase.js';
import { updatePumpRanking } from '../scripts/fetch-pump-ranking.js';
import { updateZhilabsRanking } from '../scripts/fetch-zhilabs-ranking.js';
import { getTokenNarrative, getTokenHotTweets, batchPrefetch } from './data-sources/sixfivefiveone.js';
import { getCachedNarrative, saveNarrativeCache, saveTweetsCache } from './narrative-cache.js';

const ENABLE_TWEET_PREFETCH = (process.env.ENABLE_TWEET_PREFETCH || 'false').toLowerCase() === 'true';

export const updateRunning = { pump: false, zhilabs: false };

/* ── 定时自动更新调度器 ── */
const AUTO_UPDATE_INTERVAL_MS = Math.max(
  60_000,
  parseInt(process.env.AUTO_UPDATE_INTERVAL_MIN || '5', 10) * 60_000,
);
export const scheduler = {
  enabled: true,
  intervalMs: AUTO_UPDATE_INTERVAL_MS,
  lastRun: null,
  lastResult: null,
  running: false,
  timer: null,
};

async function runScheduledUpdate() {
  if (scheduler.running) {
    console.log('[定时更新] 上一轮仍在执行，跳过');
    return;
  }
  scheduler.running = true;
  const started = Date.now();
  console.log('[定时更新] 开始自动更新 Pump + zhilabs 榜单...');
  const result = { pump: null, zhilabs: null, startedAt: new Date().toISOString() };
  try {
    if (!updateRunning.pump) {
      updateRunning.pump = true;
      try {
        const out = await updatePumpRanking();
        result.pump = { ok: true, count: Array.isArray(out) ? out.length : 0 };
        console.log('[定时更新] Pump 榜单更新完成，共', result.pump.count, '条');
      } catch (e) {
        result.pump = { ok: false, error: e?.message || String(e) };
        console.error('[定时更新] Pump 榜单更新失败:', e?.message);
      } finally {
        updateRunning.pump = false;
      }
    } else {
      result.pump = { ok: false, error: '手动更新进行中，跳过' };
    }
    if (!updateRunning.zhilabs) {
      updateRunning.zhilabs = true;
      try {
        const out = await updateZhilabsRanking();
        result.zhilabs = { ok: true, count: Array.isArray(out) ? out.length : 0 };
        console.log('[定时更新] zhilabs 精选更新完成，共', result.zhilabs.count, '条');
      } catch (e) {
        result.zhilabs = { ok: false, error: e?.message || String(e) };
        console.error('[定时更新] zhilabs 精选更新失败:', e?.message);
      } finally {
        updateRunning.zhilabs = false;
      }
    } else {
      result.zhilabs = { ok: false, error: '手动更新进行中，跳过' };
    }
  } finally {
    scheduler.running = false;
    scheduler.lastRun = new Date().toISOString();
    scheduler.lastResult = { ...result, durationMs: Date.now() - started };
    console.log('[定时更新] 完成，用时', Date.now() - started, 'ms');
  }

  // 后台预取叙事/推文（不阻塞下次更新周期）
  scheduleNarrativePrefetch().catch(e =>
    console.error('[预取] 叙事预取出错:', e?.message)
  );
}

async function scheduleNarrativePrefetch() {
  try {
    const [zhilabs, pump] = await Promise.all([
      supabase.from('zhilabs_ranking').select('token, symbol, name').limit(50),
      supabase.from('solana_pump_ranking').select('token, symbol, name').limit(20),
    ]);
    const seen = new Set();
    const tokens = [];
    for (const row of [...(zhilabs.data || []), ...(pump.data || [])]) {
      if (row.token && !seen.has(row.token)) {
        seen.add(row.token);
        tokens.push(row);
      }
    }
    if (tokens.length === 0) return;

    // 仅预取未缓存或已过期的代币
    const toFetch = [];
    for (const t of tokens) {
      const cached = await getCachedNarrative(t.token);
      if (!cached) toFetch.push(t);
    }

    if (toFetch.length === 0) {
      console.log('[预取] 所有代币叙事缓存均有效，跳过预取');
      return;
    }

    console.log(`[预取] 开始为 ${toFetch.length} 个代币预取叙事…`);
    const prefetchResult = await batchPrefetch(toFetch, {
      fetchTweets: ENABLE_TWEET_PREFETCH,
      concurrency: 2,
      delayMs: 3000,
    });
    console.log(`[预取] 完成：叙事 ${prefetchResult.narratives} 条，推文 ${prefetchResult.tweets} 条，错误 ${prefetchResult.errors}`);

    // 将预取结果保存到 Supabase
    for (const t of toFetch) {
      try {
        const narrative = await getTokenNarrative(t.symbol, t.name, { contractAddress: t.token });
        if (narrative && !narrative.error) {
          await saveNarrativeCache(t.token, t.symbol, t.name, narrative);
        }
        if (ENABLE_TWEET_PREFETCH) {
          const tweets = await getTokenHotTweets(t.symbol, {
            contractAddress: t.token,
            symbol: t.symbol,
            name: t.name,
          });
          if (tweets && !tweets.error) {
            await saveTweetsCache(t.token, t.symbol, t.name, tweets);
          }
        }
      } catch { /* 单个代币失败不影响整体 */ }
    }
  } catch (e) {
    console.error('[预取] 获取榜单代币失败:', e?.message);
  }
}

export function startScheduler() {
  if (scheduler.timer) clearInterval(scheduler.timer);
  scheduler.timer = setInterval(runScheduledUpdate, scheduler.intervalMs);
  console.log(`[定时更新] 已启动，每 ${scheduler.intervalMs / 60000} 分钟自动更新`);
  setTimeout(runScheduledUpdate, 3000);
}
