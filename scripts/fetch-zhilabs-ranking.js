/**
 * 从 zhilabs meme榜单精选/ca.md 读取 Solana meme 代币 CA，
 * 调用 AVE token 详情接口获取数据，按 24h 交易量排序后写入 zhilabs_ranking 表
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CA_FILE = path.join(__dirname, '..', 'zhilabs meme榜单精选', 'ca.md');

const AVE_API_KEY = process.env.AVE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const AVE_BASE = 'https://data.ave-api.xyz/v2';

function parseCaList(content) {
  return content
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'));
}

async function fetchTokenDetail(address) {
  const url = `${AVE_BASE}/tokens/${address}-solana`;
  const res = await fetch(url, {
    headers: { 'X-API-KEY': AVE_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`AVE token ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.status !== 1 || !json.data) {
    throw new Error(json.msg || 'AVE 返回异常');
  }
  const d = json.data;
  if (d && typeof d === 'object') {
    const flat = { ...d };
    if (d.token && typeof d.token === 'object' && !Array.isArray(d.token)) {
      Object.assign(flat, d.token);
    }
    for (const key of ['token_info', 'market', 'price_info', 'price', 'market_info']) {
      if (d[key] && typeof d[key] === 'object' && !Array.isArray(d[key])) {
        Object.assign(flat, d[key]);
      }
    }
    return flat;
  }
  return d;
}

/** 从对象中取第一个存在的数字，支持 AVE 多种返回键名 */
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

/** 从对象中取第一个存在的字符串（或可转字符串），用于 name/symbol */
function pickStr(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.length > 0 && v.length < 500) return v;
    if (typeof v === 'object' && typeof v.en === 'string') return v.en;
    if (typeof v === 'object' && typeof v.symbol === 'string') return v.symbol;
  }
  return null;
}

/** 兼容 AVE token 详情接口多种字段名，把能拿到的字段都拉全到统一结构（与 solana_pump_ranking 一致） */
function normalizeToken(t) {
  const tokenStr = typeof t.token === 'string' ? t.token : (t.address || '');
  return {
    ...t,
    token: tokenStr,
    name: pickStr(t, 'name', 'symbol', 'title') || (t.intro_en && typeof t.intro_en === 'string' ? t.intro_en.slice(0, 200) : null),
    symbol: pickStr(t, 'symbol', 'name'),
    market_cap: pickNum(t, 'market_cap', 'market_cap_usd', 'fdv', 'cap'),
    tx_volume_u_24h: pickNum(t, 'tx_volume_u_24h', 'volume_24h', 'tx_volume_24h', 'volume', 'tx_volume_u_24h'),
    current_price_usd: pickNum(t, 'current_price_usd', 'current_price', 'price', 'price_usd'),
    price_change_24h: (() => {
      const v = t.price_change_24h ?? t.price_change_1d ?? t.change_24h ?? t.change_1d;
      if (v === undefined || v === null) return null;
      if (typeof v === 'number' && !Number.isNaN(v)) return String(v);
      if (typeof v === 'string') return v;
      const n = parseFloat(v);
      return Number.isNaN(n) ? null : String(n);
    })(),
    holders: (() => {
      const n = pickNum(t, 'holders', 'holder_count', 'holders_count', 'holder_count');
      return n != null && Number.isInteger(n) ? n : (typeof t.holders === 'number' ? t.holders : null);
    })(),
  };
}

/** 与 fetch-pump-ranking.js 的 toRow 字段一致。requestAddr 为 ca.md 中的 CA，保证 token 列一定是地址字符串 */
function toRow(t, requestAddr) {
  const x = normalizeToken(t);
  const token = (requestAddr && typeof requestAddr === 'string') ? requestAddr.trim() : (x.token || '');
  const nameStr = typeof x.name === 'string' ? x.name : (x.name && typeof x.name === 'object' && typeof x.name.en === 'string' ? x.name.en : null);
  const symbolStr = typeof x.symbol === 'string' ? x.symbol : (x.symbol && typeof x.symbol === 'object' && typeof x.symbol.en === 'string' ? x.symbol.en : null);
  const marketCap = x.market_cap != null ? Number(x.market_cap) : null;
  const volume24h = x.tx_volume_u_24h != null ? Number(x.tx_volume_u_24h) : null;
  const priceUsd = x.current_price_usd != null ? Number(x.current_price_usd) : null;
  const holdersVal = x.holders != null ? (typeof x.holders === 'number' ? x.holders : parseInt(x.holders, 10)) : null;
  return {
    token,
    chain: x.chain || 'solana',
    name: nameStr || null,
    symbol: symbolStr || null,
    market_cap: Number.isFinite(marketCap) ? marketCap : null,
    tx_volume_u_24h: Number.isFinite(volume24h) ? volume24h : null,
    current_price_usd: Number.isFinite(priceUsd) ? priceUsd : null,
    price_change_24h: x.price_change_24h != null && x.price_change_24h !== '' ? String(x.price_change_24h) : null,
    holders: Number.isFinite(holdersVal) ? holdersVal : null,
    main_pair: typeof x.main_pair === 'string' ? x.main_pair : null,
    logo_url: typeof x.logo_url === 'string' ? x.logo_url : null,
    launch_at: x.launch_at ? new Date(Number(x.launch_at) * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  return updateZhilabsRanking();
}

export async function updateZhilabsRanking() {
  if (!AVE_API_KEY) throw new Error('缺少 AVE_API_KEY');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('缺少 Supabase 配置');

  if (!fs.existsSync(CA_FILE)) {
    throw new Error(`CA 文件不存在: ${CA_FILE}`);
  }
  const caContent = fs.readFileSync(CA_FILE, 'utf8');
  const addresses = parseCaList(caContent);
  if (addresses.length === 0) {
    throw new Error('ca.md 中无有效 CA');
  }

  console.log('正在从 AVE 拉取', addresses.length, '个代币详情...');
  const list = [];
  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    try {
      const t = await fetchTokenDetail(addr);
      list.push({ ...t, _requestAddr: addr });
      const sym = [t.symbol, t.token, addr].find((v) => typeof v === 'string');
      console.log(`  [${i + 1}/${addresses.length}] ${sym || addr}`);
    } catch (e) {
      console.warn(`  跳过 ${addr}:`, e.message);
    }
    if (i < addresses.length - 1) {
      await new Promise((r) => setTimeout(r, 600));
    }
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from('zhilabs_ranking')
    .upsert(rows, { onConflict: 'token' })
    .select();

  if (error) throw new Error('Supabase 写入失败: ' + error.message);
  console.log('已写入 zhilabs_ranking，共', data?.length ?? rows.length, '条');
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
