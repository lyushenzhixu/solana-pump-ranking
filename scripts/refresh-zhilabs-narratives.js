/**
 * 强制刷新 zhilabs 精选榜单内所有代币的叙事缓存（忽略现有缓存，重新拉取并写入 token_narratives）
 * 可独立运行：npm run zhilabs-refresh-narratives
 * 或由服务端 POST /api/ranking/zhilabs/refresh-narratives 触发
 */
import 'dotenv/config';
import { supabase } from '../src/supabase.js';
import { getTokenNarrative } from '../src/data-sources/sixfivefiveone.js';

const CONCURRENCY = 2;
const DELAY_MS = 3000;

async function saveNarrativeCache(tokenAddr, symbol, name, narrative) {
  // 只要有 summary 或 twitterNarrative 就写入（含链上叙事或带 error 的降级结果）
  if (!narrative || (!narrative.summary && !narrative.twitterNarrative)) return;
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
}

export async function refreshZhilabsNarratives() {
  const { data: rows } = await supabase
    .from('zhilabs_ranking')
    .select('token, symbol, name')
    .not('token', 'is', null);
  const tokens = (rows || []).map((r) => ({
    token: r.token,
    symbol: r.symbol || '',
    name: r.name || '',
  })).filter((t) => t.token);
  if (tokens.length === 0) return { updated: 0, errors: 0, tokens: 0 };
  let updated = 0;
  let errors = 0;
  for (let i = 0; i < tokens.length; i += CONCURRENCY) {
    const batch = tokens.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (t) => {
        try {
          const narrative = await getTokenNarrative(t.symbol, t.name, { contractAddress: t.token });
          if (narrative && (narrative.summary || narrative.twitterNarrative)) {
            await saveNarrativeCache(t.token, t.symbol, t.name, narrative);
            updated++;
          }
        } catch (e) {
          errors++;
          console.warn('[zhilabs 叙事刷新]', t.symbol || t.token, e?.message);
        }
      })
    );
    if (i + CONCURRENCY < tokens.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  return { updated, errors, tokens: tokens.length };
}

import path from 'path';
import { pathToFileURL } from 'url';

function isDirectRun() {
  const entry = process.argv?.[1];
  if (!entry) return false;
  const abs = path.resolve(entry);
  return import.meta.url === pathToFileURL(abs).href;
}

if (isDirectRun()) {
  console.log('正在刷新 zhilabs 精选榜单内代币的叙事缓存…');
  refreshZhilabsNarratives()
    .then((result) => console.log('完成：成功', result.updated, '条，失败', result.errors, '条（共', result.tokens, '个代币）'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
