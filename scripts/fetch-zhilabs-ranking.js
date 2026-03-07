/**
 * 从 zhilabs meme榜单精选/ca.md 读取 Solana meme 代币 CA，
 * 调用自研数据源（DexScreener + GeckoTerminal + Jupiter）获取数据，
 * 按 24h 交易量排序后写入 zhilabs_ranking 表
 *
 * 替代原 AVE 数据源，无需 AVE_API_KEY，无请求限制/收费
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import * as dataSource from '../src/data-sources/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CA_FILE = path.join(__dirname, '..', 'zhilabs meme榜单精选', 'ca.md');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

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
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('缺少 Supabase 配置');

  if (!fs.existsSync(CA_FILE)) {
    throw new Error(`CA 文件不存在: ${CA_FILE}`);
  }
  const caContent = fs.readFileSync(CA_FILE, 'utf8');
  const addresses = parseCaList(caContent);
  if (addresses.length === 0) {
    throw new Error('ca.md 中无有效 CA');
  }

  console.log('正在从自研数据源拉取', addresses.length, '个代币详情 (DexScreener + GeckoTerminal + Jupiter)...');
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
