/**
 * 叙事/推文 Supabase 持久化缓存层 — 从 server.js 原封不动提取
 */
import { supabase } from './supabase.js';

const NARRATIVE_CACHE_TTL_MS = parseInt(process.env.NARRATIVE_CACHE_TTL_HOURS || '4', 10) * 3600_000;
const TWEET_CACHE_TTL_MS = parseInt(process.env.TWEET_CACHE_TTL_HOURS || '2', 10) * 3600_000;

let narrativeCacheAvailable = null; // null = 未检测, true/false

export async function checkNarrativeCacheTable() {
  if (narrativeCacheAvailable !== null) return narrativeCacheAvailable;
  try {
    await supabase.from('token_narratives').select('token').limit(1);
    narrativeCacheAvailable = true;
    console.log('[缓存] token_narratives 表可用，启用持久化缓存');
  } catch {
    narrativeCacheAvailable = false;
    console.log('[缓存] token_narratives 表不存在，仅使用内存缓存（可执行 config/sql/token-narrative-cache.sql 创建）');
  }
  return narrativeCacheAvailable;
}

export async function getCachedNarrative(tokenAddr) {
  if (!(await checkNarrativeCacheTable())) return null;
  try {
    const { data } = await supabase
      .from('token_narratives')
      .select('*')
      .eq('token', tokenAddr)
      .maybeSingle();
    if (!data) return null;
    const age = Date.now() - new Date(data.fetched_at).getTime();
    if (age > NARRATIVE_CACHE_TTL_MS) return null;
    // 旧缓存不含链上叙事 → 视为过期，强制重新获取
    if (!data.twitter_narrative) return null;
    return {
      summary: data.summary || '',
      articles: data.articles || [],
      sentiment: data.sentiment || 'neutral',
      sourceCount: data.source_count || 0,
      twitterNarrative: data.twitter_narrative || null,
      updatedAt: data.fetched_at,
      cached: true,
    };
  } catch { return null; }
}

export async function saveNarrativeCache(tokenAddr, symbol, name, narrative) {
  if (!(await checkNarrativeCacheTable())) return;
  try {
    await supabase.from('token_narratives').upsert({
      token: tokenAddr,
      symbol: symbol || '',
      name: name || '',
      summary: narrative.summary || '',
      articles: narrative.articles || [],
      sentiment: narrative.sentiment || 'neutral',
      source_count: narrative.sourceCount || 0,
      twitter_narrative: narrative.twitterNarrative || null,
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'token' });
  } catch (e) {
    console.error('[缓存] 保存叙事缓存失败:', e?.message);
  }
}

export async function getCachedTweets(tokenAddr) {
  if (!(await checkNarrativeCacheTable())) return null;
  try {
    const { data } = await supabase
      .from('token_tweets')
      .select('*')
      .eq('token', tokenAddr)
      .maybeSingle();
    if (!data) return null;
    const age = Date.now() - new Date(data.fetched_at).getTime();
    if (age > TWEET_CACHE_TTL_MS) return null;
    return {
      tweets: data.tweets || [],
      searchQueries: [],
      updatedAt: data.fetched_at,
      cached: true,
    };
  } catch { return null; }
}

export async function saveTweetsCache(tokenAddr, symbol, name, tweetsResult) {
  if (!(await checkNarrativeCacheTable())) return;
  try {
    await supabase.from('token_tweets').upsert({
      token: tokenAddr,
      symbol: symbol || '',
      name: name || '',
      tweets: tweetsResult.tweets || [],
      tweet_count: (tweetsResult.tweets || []).length,
      search_query: (tweetsResult.searchQueries || []).join(' | '),
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'token' });
  } catch (e) {
    console.error('[缓存] 保存推文缓存失败:', e?.message);
  }
}
