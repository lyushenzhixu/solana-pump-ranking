/**
 * 从 zhilabs meme榜单精选/ca.md 读取 Solana meme 代币 CA，
 * 调用自研数据源（DexScreener + GeckoTerminal + Jupiter）获取数据，
 * 按 24h 交易量排序后写入 zhilabs_ranking 表
 *
 * 替代原 AVE 数据源，无需 AVE_API_KEY，无请求限制/收费
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import * as dataSource from '../src/data-sources/index.js';
import { supabase } from '../src/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CA_FILE = path.join(__dirname, '..', 'zhilabs meme榜单精选', 'ca.md');

async function fetchBinanceHolders(contractAddress) {
  const url = new URL('https://web3.binance.com/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info');
  url.searchParams.set('chainId', 'CT_501');
  url.searchParams.set('contractAddress', contractAddress);
  try {
    const res = await fetch(url.toString(), { headers: { 'Accept-Encoding': 'identity' } });
    if (!res.ok) return null;
    const json = await res.json();
    const holders = parseInt(json?.data?.holders);
    return Number.isFinite(holders) ? holders : null;
  } catch {
    return null;
  }
}

function parseCaList(content) {
  return content
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'));
}

function pickNum(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') {
      const n = parseFloat(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function toRow(t, requestAddr) {
  const token = (requestAddr && typeof requestAddr === 'string') ? requestAddr.trim() : (t.token || '');
  const nameStr = typeof t.name === 'string' ? t.name : null;
  const symbolStr = typeof t.symbol === 'string' ? t.symbol : null;
  const marketCap = pickNum(t, 'market_cap');
  const volume24h = pickNum(t, 'tx_volume_u_24h');
  const priceUsd = pickNum(t, 'current_price_usd');
  const holdersVal = t.holders != null ? (typeof t.holders === 'number' ? t.holders : parseInt(t.holders, 10)) : null;
  const priceChange = t.price_change_24h != null && t.price_change_24h !== '' ? String(t.price_change_24h) : null;

  return {
    token,
    chain: t.chain || 'solana',
    name: nameStr || null,
    symbol: symbolStr || null,
    market_cap: Number.isFinite(marketCap) ? marketCap : null,
    tx_volume_u_24h: Number.isFinite(volume24h) ? volume24h : null,
    current_price_usd: Number.isFinite(priceUsd) ? priceUsd : null,
    price_change_24h: priceChange,
    holders: Number.isFinite(holdersVal) ? holdersVal : null,
    main_pair: typeof t.main_pair === 'string' ? t.main_pair : null,
    logo_url: typeof t.logo_url === 'string' ? t.logo_url : null,
    launch_at: t.launch_at ? new Date(Number(t.launch_at) * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  return updateZhilabsRanking();
}

export async function updateZhilabsRanking() {

  if (!fs.existsSync(CA_FILE)) {
    throw new Error(`CA 文件不存在: ${CA_FILE}`);
  }
  const caContent = fs.readFileSync(CA_FILE, 'utf8');
  const addresses = parseCaList(caContent);
  if (addresses.length === 0) {
    throw new Error('ca.md 中无有效 CA');
  }

  console.log('正在从自研数据源拉取', addresses.length, '个代币详情 (DexScreener + GeckoTerminal)...');
  const list = [];
  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    try {
      const t = await dataSource.getTokenDetail(addr, 'solana');
      if (t) {
        list.push({ ...t, _requestAddr: addr });
        const sym = t.symbol || t.name || addr;
        console.log(`  [${i + 1}/${addresses.length}] ${sym}`);
      } else {
        console.warn(`  [${i + 1}/${addresses.length}] 跳过 ${addr}: 未找到数据`);
      }
    } catch (e) {
      console.warn(`  [${i + 1}/${addresses.length}] 跳过 ${addr}:`, e.message);
    }
  }

  console.log('正在查询持币地址数 (GoPlus + Binance)...');
  const validAddrs = list.map((t) => t._requestAddr || t.token).filter(Boolean);
  if (validAddrs.length > 0) {
    const secMap = await dataSource.batchGetTokenSecurity('solana', validAddrs);
    for (const t of list) {
      const addr = (t._requestAddr || t.token || '').toLowerCase();
      const sec = secMap.get(addr);
      if (sec?.holder_count && t.holders == null) {
        t.holders = sec.holder_count;
      }
    }
  }

  for (const t of list) {
    if (t.holders != null && t.holders > 0) continue;
    const addr = t._requestAddr || t.token;
    if (!addr) continue;
    try {
      const info = await fetchBinanceHolders(addr);
      if (info != null) t.holders = info;
    } catch { /* 忽略 */ }
    await new Promise((r) => setTimeout(r, 250));
  }

  const sorted = [...list].sort((a, b) => {
    const va = parseFloat(a.tx_volume_u_24h) || 0;
    const vb = parseFloat(b.tx_volume_u_24h) || 0;
    return vb - va;
  });

  const rows = [];
  const seenToken = new Set();
  for (const t of sorted) {
    const row = toRow(t, t._requestAddr);
    const key = row.token || '';
    if (!key || seenToken.has(key)) continue;
    seenToken.add(key);
    rows.push(row);
  }
  if (rows.length === 0) {
    console.log('无有效数据，未写入。');
    return [];
  }

  const { data, error } = await supabase
    .from('zhilabs_ranking')
    .upsert(rows, { onConflict: 'token' })
    .select();

  if (error) throw new Error('Supabase 写入失败: ' + error.message);
  console.log('已写入 zhilabs_ranking，共', data?.length ?? rows.length, '条');

  // 剪除不在 ca.md 名单里的旧行 —— 让表精确镜像 ca.md。
  // upsert 只增改不删,换币后旧/死币会永久残留并被反复刷新累积
  // (2026-06-20 实操踩坑:换成 8 币后旧 10 个未删,被一次刷新 upsert 回来变 18 行)。
  // 按 ca.md 意图集 addresses 剪(不是本轮成功取数的 rows),避免某币临时取数失败被误删。
  try {
    const keep = addresses.filter(Boolean);
    if (keep.length > 0) {
      const { error: pruneErr, count } = await supabase
        .from('zhilabs_ranking')
        .delete({ count: 'exact' })
        .not('token', 'in', '(' + keep.join(',') + ')');
      if (pruneErr) console.warn('剪除旧行失败(忽略):', pruneErr.message);
      else if (count) console.log('已剪除', count, '个不在 ca.md 的旧行');
    }
  } catch (e) {
    console.warn('剪除旧行异常(忽略):', e.message);
  }

  return data;
}

function isDirectRun() {
  const entry = process.argv?.[1];
  if (!entry) return false;
  const abs = path.resolve(entry);
  return import.meta.url === pathToFileURL(abs).href;
}

if (isDirectRun()) {
  main()
    .then(() => console.log('完成'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
