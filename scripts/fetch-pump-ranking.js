/**
 * 从 AVE 拉取：Solana、已成功发射、上线<10天、市值>100K 的 pump 代币，
 * 按 24h 交易量排序取前 20，写入 Supabase
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { pathToFileURL } from 'url';

const AVE_API_KEY = process.env.AVE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const TEN_DAYS_SEC = 10 * 24 * 3600;
// 要求市值 > 100K（当前 AVE 数据可能暂无，先用 10K 跑通流程，有数据后可改回 100_000）
const MIN_MARKET_CAP = 100_000;
// Top 10 持有人占比超过此阈值则从榜单中排除（Binance 数据）
const MAX_TOP10_HOLDERS_PERCENT = 30;
// 筛选前保留的候选数量，以便排除高集中度后仍能取满 20 条
const CANDIDATE_POOL_SIZE = 80;
// LP 规则：仅排除「明确未锁定」的；详情返回已 burn/锁定 或 未知（未返回）均允许入榜，避免 AVE 不返字段时整表为空
const EXCLUDE_LP_NOT_LOCKED_ONLY = true;

/** 解析 AVE 返回的 is_lp_not_locked（可能是 boolean 或字符串 "true"/"false"）
 * @returns true=LP 未锁定/未 burn（排除）, false=LP 已锁定或已 burn（通过）, null=未知 */
function parseLpNotLocked(t) {
  const v = t?.is_lp_not_locked;
  if (v === true || String(v).toLowerCase() === 'true' || v === 1 || v === '1') return true;
  if (v === false || String(v).toLowerCase() === 'false' || v === 0 || v === '0') return false;
  return null;
}

/** 从 AVE token 详情获取 LP 状态，回填到 t.is_lp_not_locked（布尔） */
async function fetchAveTokenLpStatus(tokenAddress) {
  const url = `https://data.ave-api.xyz/v2/tokens/${tokenAddress}-solana`;
  try {
    const res = await fetch(url, { headers: { 'X-API-KEY': AVE_API_KEY } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 1 || !json.data) return null;
    const d = json.data;
    const raw = d?.token && typeof d.token === 'object' ? { ...d, ...d.token } : d;
    const v = raw?.is_lp_not_locked;
    if (v === true || String(v).toLowerCase() === 'true' || v === 1 || v === '1') return true;
    if (v === false || String(v).toLowerCase() === 'false' || v === 0 || v === '0') return false;
    return null;
  } catch {
    return null;
  }
}

/** 从 Binance Web3 获取 Solana 代币的 Top 10 持有人占比（%），失败或缺失时返回 null */
async function fetchBinanceTop10Percent(contractAddress) {
  const url = new URL('https://web3.binance.com/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info');
  url.searchParams.set('chainId', 'CT_501');
  url.searchParams.set('contractAddress', contractAddress);
  try {
    const res = await fetch(url.toString(), { headers: { 'Accept-Encoding': 'identity' } });
    if (!res.ok) return null;
    const json = await res.json();
    const pct = json?.data?.top10HoldersPercentage ?? json?.data?.holdersTop10Percent;
    if (pct == null || pct === '') return null;
    const num = parseFloat(String(pct));
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

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
      // LP 未 burn/未锁定则不能入榜（支持 AVE 返回 boolean 或字符串）
      if (parseLpNotLocked(t) === true) return false;
      return true;
    })
    .sort((a, b) => {
      const va = parseFloat(a.tx_volume_u_24h) || 0;
      const vb = parseFloat(b.tx_volume_u_24h) || 0;
      return vb - va;
    })
    .slice(0, CANDIDATE_POOL_SIZE);
}

function toRow(t, index) {
  const lpNotLocked = parseLpNotLocked(t);
  const lpBurned = lpNotLocked === false ? true : (lpNotLocked === true ? false : null);
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
    holders_top10_percent: t._top10HoldersPercent ?? null,
    lp_burned: lpBurned,
    updated_at: new Date().toISOString(),
  };
}

export async function updatePumpRanking() {
  if (!AVE_API_KEY) throw new Error('缺少 AVE_API_KEY');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('缺少 Supabase 配置');

  console.log('正在从 AVE 拉取 pump 代币 (new + hot)...');
  const raw = await fetchAllPumpTokens();
  console.log('拉取到', raw.length, '条（去重后），筛选 Solana + 市值>100K + 上线<10天...');

  let list = filterAndSort(raw);
  // 对所有候选用 AVE token 详情校验 LP 状态；只排除「明确未锁定」的，未知的允许入榜（LP 列显示 —）
  console.log('正在对', list.length, '条用 AVE token 详情校验 LP 状态（仅排除明确未锁定）...');
  for (const t of list) {
    const lpNotLocked = await fetchAveTokenLpStatus(t.token);
    if (lpNotLocked === true) t.is_lp_not_locked = true;           // 未锁定 → 排除
    else if (lpNotLocked === false) t.is_lp_not_locked = false;   // 已 burn/锁定 → 入榜，LP 列显示「已burn/锁」
    else { t.is_lp_not_locked = undefined; }                       // 未知或接口失败 → 允许入榜，LP 列显示 —
    await new Promise((r) => setTimeout(r, 350));
  }
  list = list.filter((t) => !EXCLUDE_LP_NOT_LOCKED_ONLY || parseLpNotLocked(t) !== true);
  console.log('排除 LP 明确未锁定 后候选:', list.length, '条，正在用 Binance 校验 Top10 持有人占比（排除 >' + MAX_TOP10_HOLDERS_PERCENT + '%）...');

  for (const t of list) {
    const pct = await fetchBinanceTop10Percent(t.token);
    t._top10HoldersPercent = pct ?? null;
    if (pct != null && pct > MAX_TOP10_HOLDERS_PERCENT) t._excludeByTop10 = true;
    await new Promise((r) => setTimeout(r, 220));
  }
  list = list.filter((t) => !t._excludeByTop10).slice(0, 20);
  console.log('排除 Top10 占比 >' + MAX_TOP10_HOLDERS_PERCENT + '% 后取前 20:', list.length, '条');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const rows = list.map((t, i) => toRow(t, i));

  // 无论是否有新数据都先清空表，避免「更新 0 条」时仍显示旧数据
  const { error: delErr } = await supabase
    .from('solana_pump_ranking')
    .delete()
    .gte('id', 0);
  if (delErr) console.warn('清理旧行时警告:', delErr.message);

  if (rows.length === 0) {
    console.log('当前无符合条件的数据，表已清空。可放宽 MIN_MARKET_CAP 或 LP 规则再试。');
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

function isDirectRun() {
  const entry = process.argv?.[1];
  if (!entry) return false;
  const abs = path.resolve(entry);
  return import.meta.url === pathToFileURL(abs).href;
}

if (isDirectRun()) {
  updatePumpRanking()
    .then(() => console.log('完成'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
