/**
 * 从自研数据源（DexScreener + GeckoTerminal + GoPlus）拉取：
 * Solana、已成功发射、上线<10天、市值>100K 的代币，
 * 按 24h 交易量排序取前 20，写入 Supabase
 *
 * 替代原 AVE 数据源，无需 AVE_API_KEY，无请求限制/收费
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { pathToFileURL } from 'url';
import * as dataSource from '../src/data-sources/index.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const TEN_DAYS_SEC = 10 * 24 * 3600;
const MIN_MARKET_CAP = 100_000;
const MAX_TOP10_HOLDERS_PERCENT = 30;
const CANDIDATE_POOL_SIZE = 80;
const EXCLUDE_NO_LOGO = true;

/**
 * 从 Binance Web3 获取 Solana 代币的市场动态数据
 * 返回 { top10Percent, holders, insiderPercent } 或 null
 */
async function fetchBinanceTokenInfo(contractAddress) {
  const url = new URL('https://web3.binance.com/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info');
  url.searchParams.set('chainId', 'CT_501');
  url.searchParams.set('contractAddress', contractAddress);
  try {
    const res = await fetch(url.toString(), { headers: { 'Accept-Encoding': 'identity' } });
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.data;
    if (!d) return null;

    const top10 = parseFloat(String(d.top10HoldersPercentage ?? ''));
    const holders = parseInt(d.holders);
    const insiderPct = parseFloat(String(d.insiderHoldingPercent ?? ''));

    return {
      top10Percent: Number.isFinite(top10) ? top10 : null,
      holders: Number.isFinite(holders) ? holders : null,
      insiderPercent: Number.isFinite(insiderPct) ? insiderPct : null,
    };
  } catch {
    return null;
  }
}

/**
 * 从自研数据源并行拉取 hot + new + ranked Solana 代币，去重
 */
async function fetchAllTokens() {
  console.log('  → 并行拉取 hot / new / ranked ...');
  const [hotList, newList, ranksList] = await Promise.all([
    dataSource.getPlatformTokens('pump_in_hot', 200),
    dataSource.getPlatformTokens('pump_in_new', 200),
    dataSource.getRanks('solana'),
  ]);
  console.log(`    hot: ${hotList.length}, new: ${newList.length}, ranked: ${ranksList.length}`);

  const byToken = new Map();
  for (const t of [...hotList, ...newList, ...ranksList]) {
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
      const launched = Number(t.launch_at ?? 0);
      if (launched > 0 && launched < cutoff) return false;
      if (EXCLUDE_NO_LOGO && !t.logo_url) return false;
      return true;
    })
    .sort((a, b) => {
      const va = parseFloat(a.tx_volume_u_24h) || 0;
      const vb = parseFloat(b.tx_volume_u_24h) || 0;
      return vb - va;
    })
    .slice(0, CANDIDATE_POOL_SIZE);
}

function toRow(t) {
  const lpNotLocked = t._securityDetail?.lpNotLocked;
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
    holders: t.holders ?? t._securityDetail?.holderCount ?? null,
    main_pair: t.main_pair ?? null,
    logo_url: t.logo_url ?? null,
    launch_at: t.launch_at ? new Date(Number(t.launch_at) * 1000).toISOString() : null,
    holders_top10_percent: t._top10HoldersPercent ?? null,
    lp_burned: lpBurned,
    updated_at: new Date().toISOString(),
  };
}

export async function updatePumpRanking() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('缺少 Supabase 配置');

  console.log('正在从自研数据源拉取 Solana 代币 (new + hot + ranked)...');
  const raw = await fetchAllTokens();
  console.log('拉取到', raw.length, '条（去重后），筛选 Solana + 市值>100K + 上线<10天 + 有图片...');

  let list = filterAndSort(raw);
  console.log('初筛后:', list.length, '条候选');

  console.log('正在批量查询 GoPlus 安全数据 (LP 状态 + 蜜罐检测)...');
  const addresses = list.map((t) => t.token);
  const securityMap = await dataSource.batchGetTokenSecurity('solana', addresses);

  for (const t of list) {
    const sec = securityMap.get(t.token.toLowerCase());
    if (sec) {
      t._securityDetail = {
        lpNotLocked: sec.is_lp_locked === true ? false : (sec.is_lp_locked === false ? true : null),
        insiderRate: null,
        holderCount: sec.holder_count,
        riskLevel: sec.risk_level,
        isHoneypot: sec.is_honeypot,
      };
    } else {
      t._securityDetail = { lpNotLocked: null, insiderRate: null, holderCount: null };
    }
  }

  const preHoneypotCount = list.length;
  list = list.filter((t) => {
    if (t._securityDetail?.isHoneypot === true) return false;
    if (t._securityDetail?.riskLevel === 'CRITICAL') return false;
    return true;
  });
  console.log(
    '排除蜜罐/高风险后:', list.length, '条（排除', preHoneypotCount - list.length, '条）',
  );

  console.log('正在用 Binance 校验 Top10 占比 + 持币地址数 + insider 占比...');
  for (const t of list) {
    const info = await fetchBinanceTokenInfo(t.token);
    if (info) {
      t._top10HoldersPercent = info.top10Percent;
      if (info.holders != null && (t.holders == null || t.holders === 0)) {
        t.holders = info.holders;
      }
      t._insiderPercent = info.insiderPercent;
      if (info.top10Percent != null && info.top10Percent > MAX_TOP10_HOLDERS_PERCENT) {
        t._excludeByTop10 = true;
      }
    } else {
      t._top10HoldersPercent = null;
    }
    await new Promise((r) => setTimeout(r, 220));
  }
  list = list.filter((t) => !t._excludeByTop10).slice(0, 20);
  console.log('排除 Top10 占比 >' + MAX_TOP10_HOLDERS_PERCENT + '% 后取前 20:', list.length, '条');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const rows = list.map((t) => toRow(t));

  const { error: delErr } = await supabase
    .from('solana_pump_ranking')
    .delete()
    .gte('id', 0);
  if (delErr) console.warn('清理旧行时警告:', delErr.message);

  if (rows.length === 0) {
    console.log('当前无符合条件的数据，表已清空。可放宽 MIN_MARKET_CAP 规则再试。');
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
