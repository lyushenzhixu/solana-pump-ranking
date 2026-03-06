/**
 * 从 AVE 拉取：Solana、已成功发射、上线<10天、市值>100K 的 pump 代币，
 * 按 24h 交易量排序取前 20，写入 Supabase
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const AVE_API_KEY = process.env.AVE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const TEN_DAYS_SEC = 10 * 24 * 3600;
// 要求市值 > 100K（当前 AVE 数据可能暂无，先用 10K 跑通流程，有数据后可改回 100_000）
const MIN_MARKET_CAP = 100_000;

async function fetchAvePumpTokens(tag, limit = 200) {
  const url = new URL('https://data.ave-api.xyz/v2/tokens/platform');
  url.searchParams.set('tag', tag);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('orderby', 'tx_volume_u_24h');

  const res = await fetch(url.toString(), {
    headers: { 'X-API-KEY': AVE_API_KEY },
  });
  if (!res.ok) throw new Error(`AVE API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.status !== 1 || !Array.isArray(json.data)) throw new Error(json.msg || 'AVE 返回异常');
  return json.data;
}

async function fetchAveRanks(topic) {
  const url = `https://data.ave-api.xyz/v2/ranks?topic=${encodeURIComponent(topic)}`;
  const res = await fetch(url, { headers: { 'X-API-KEY': AVE_API_KEY } });
  if (!res.ok) throw new Error(`AVE ranks ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.status !== 1 || !Array.isArray(json.data)) return [];
  return json.data;
}

/** 拉取 new + hot + solana ranks，去重（按 token 留一条），顺序请求避免限流 */
async function fetchAllPumpTokens() {
  const newList = await fetchAvePumpTokens('pump_in_new', 200);
  await new Promise((r) => setTimeout(r, 1100));
  const hotList = await fetchAvePumpTokens('pump_in_hot', 200);
  await new Promise((r) => setTimeout(r, 1100));
  const ranksList = await fetchAveRanks('solana');
  const byToken = new Map();
  for (const t of [...newList, ...hotList, ...ranksList]) {
    if (t.chain !== 'solana') continue;
    const key = `${t.token}-${t.chain}`;
    if (!byToken.has(key)) byToken.set(key, t);
  }
  return [...byToken.values()];
}

function filterAndSort(tokens) {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - TEN_DAYS_SEC;

  return tokens
    .filter((t) => {
      if (t.chain !== 'solana') return false;
      const cap = parseFloat(t.market_cap);
      if (isNaN(cap) || cap < MIN_MARKET_CAP) return false;
      const launched = Number(t.launch_at ?? t.created_at ?? 0);
      if (launched < cutoff) return false; // 上线超过 10 天
      return true;
    })
    .sort((a, b) => {
      const va = parseFloat(a.tx_volume_u_24h) || 0;
      const vb = parseFloat(b.tx_volume_u_24h) || 0;
      return vb - va;
    })
    .slice(0, 20);
}

function toRow(t, index) {
  return {
    token: t.token,
    chain: t.chain || 'solana',
    name: t.name ?? null,
    symbol: t.symbol ?? null,
    market_cap: parseFloat(t.market_cap) || null,
    tx_volume_u_24h: parseFloat(t.tx_volume_u_24h) || null,
    current_price_usd: parseFloat(t.current_price_usd) || null,
    price_change_24h: t.price_change_24h ?? null,
    holders: t.holders ?? null,
    main_pair: t.main_pair ?? null,
    logo_url: t.logo_url ?? null,
    launch_at: t.launch_at ? new Date(Number(t.launch_at) * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  if (!AVE_API_KEY) throw new Error('缺少 AVE_API_KEY');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('缺少 Supabase 配置');

  console.log('正在从 AVE 拉取 pump 代币 (new + hot)...');
  const raw = await fetchAllPumpTokens();
  console.log('拉取到', raw.length, '条（去重后），筛选 Solana + 市值>100K + 上线<10天...');

  const list = filterAndSort(raw);
  console.log('符合条件并按交易量排序取前 20:', list.length, '条');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const rows = list.map((t, i) => toRow(t, i));
  if (rows.length === 0) {
    console.log('当前无符合条件的数据，未写入。可把 MIN_MARKET_CAP 改为 10000 再试。');
    return [];
  }
  const { data, error } = await supabase
    .from('solana_pump_ranking')
    .upsert(rows, { onConflict: 'token' })
    .select();

  if (error) throw new Error('Supabase 写入失败: ' + error.message);
  console.log('已写入 Supabase，共', data?.length ?? rows.length, '条');
  return data;
}

main().then((d) => console.log('完成')).catch((e) => { console.error(e); process.exit(1); });
