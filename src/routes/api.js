/**
 * 所有 /api/* 路由
 */
import { Router } from 'express';
import { supabase } from '../supabase.js';
import { cache } from '../middleware/cache-control.js';
import { getTokenDetail, getKline, getTokenSecurityDetail, fetchSmartMoneySignals, fetchSmartMoneyInflowRank, okxOnchain, cacheManager } from '../data-sources/index.js';
import { getCircuitBreakerStatus } from '../data-sources/geckoterminal.js';
import * as dexscreener from '../data-sources/dexscreener.js';
import { getTokenNarrative, getTokenHotTweets } from '../data-sources/sixfivefiveone.js';
import { refreshZhilabsNarratives } from '../../scripts/refresh-zhilabs-narratives.js';
import { updatePumpRanking } from '../../scripts/fetch-pump-ranking.js';
import { updateZhilabsRanking } from '../../scripts/fetch-zhilabs-ranking.js';
import { getCachedNarrative, saveNarrativeCache, getCachedTweets, saveTweetsCache } from '../narrative-cache.js';
import { scheduler, updateRunning } from '../scheduler.js';

const PORT = process.env.PORT || 3000;

const router = Router();

// ── GET /health ──
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    port: PORT,
    cache: cacheManager.getStats(),
    geckoTerminal: getCircuitBreakerStatus(),
  });
});

// ── GET /cache/stats ──
router.get('/cache/stats', cache(0), (_req, res) => {
  res.json({
    cache: cacheManager.getStats(),
    geckoTerminal: getCircuitBreakerStatus(),
  });
});

// ── GET /scheduler/status ──
router.get('/scheduler/status', cache(0), (_req, res) => {
  res.json({
    enabled: scheduler.enabled,
    intervalMs: scheduler.intervalMs,
    intervalMin: scheduler.intervalMs / 60000,
    running: scheduler.running,
    lastRun: scheduler.lastRun,
    lastResult: scheduler.lastResult,
  });
});

// ── POST /update?type=pump|zhilabs ──
router.post('/update', async (req, res) => {
  const type = (req.query.type || '').toLowerCase();
  if (type !== 'pump' && type !== 'zhilabs') {
    return res.status(400).json({ error: '参数 type 必须为 pump 或 zhilabs' });
  }
  if (updateRunning[type]) {
    return res.status(409).json({ error: '更新中，请稍后再试' });
  }
  updateRunning[type] = true;
  const started = Date.now();
  try {
    const out = type === 'pump' ? await updatePumpRanking() : await updateZhilabsRanking();
    const durationMs = Date.now() - started;
    const updated = Array.isArray(out) ? out.length : 0;
    res.json({ ok: true, type, updated, durationMs, at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  } finally {
    updateRunning[type] = false;
  }
});

// ── GET /ranking ──
router.get('/ranking', cache(120, 180), async (_req, res) => {
  const { data, error } = await supabase
    .from('solana_pump_ranking')
    .select('*')
    .order('tx_volume_u_24h', { ascending: false })
    .limit(20);
  if (error) throw error;
  res.json(data || []);
});

// ── GET /ranking/zhilabs ──
router.get('/ranking/zhilabs', cache(120, 180), async (_req, res) => {
  const { data, error } = await supabase
    .from('zhilabs_ranking')
    .select('*')
    .order('tx_volume_u_24h', { ascending: false });
  if (error) throw error;
  res.json(data || []);
});

// ── GET /smart-money-signals ──
router.get('/smart-money-signals', cache(60, 120), async (req, res) => {
  const page = parseInt(req.query.page || '1', 10) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize || '100', 10) || 100, 100);
  // 同时拉取 Solana + BSC 聪明钱信号，合并展示
  const [solData, bscData] = await Promise.all([
    fetchSmartMoneySignals({ page, pageSize, chainId: 'CT_501' }),
    fetchSmartMoneySignals({ page, pageSize, chainId: '56' }),
  ]);
  const solWithChain = (Array.isArray(solData) ? solData : []).map((d) => ({ ...d, chain: 'solana', sol: true, bsc: false }));
  const bscWithChain = (Array.isArray(bscData) ? bscData : []).map((d) => ({ ...d, chain: 'bsc', sol: false, bsc: true }));
  let data = [...solWithChain, ...bscWithChain];
  // 用 DexScreener 补充 logo 备用源
  if (data.length > 0) {
    const allAddrs = data.map((d) => d.contractAddress || d.contract_address).filter(Boolean);
    if (allAddrs.length > 0) {
      try {
        const pairs = await dexscreener.getTokenPairs(allAddrs);
        const logoByKey = new Map();
        const chainMap = { solana: 'solana', bsc: 'bsc' };
        for (const p of pairs || []) {
          const addr = (p.baseToken?.address || '').toLowerCase();
          const logo = p.info?.imageUrl || null;
          const dsChain = (p.chainId || '').toLowerCase();
          const chain = chainMap[dsChain] || dsChain || 'solana';
          const key = chain + ':' + addr;
          if (addr && logo && !logoByKey.has(key)) logoByKey.set(key, logo);
        }
        data = data.map((item) => {
          const addr = (item.contractAddress || item.contract_address || '').toLowerCase();
          const key = (item.chain || 'solana') + ':' + addr;
          return { ...item, logoUrlFallback: logoByKey.get(key) || null };
        });
      } catch (_) { /* 忽略 DexScreener 失败 */ }
    }
  }
  res.json(data);
});

// ── GET /smart-money-inflow ──
router.get('/smart-money-inflow', cache(60, 120), async (req, res) => {
  const tagType = parseInt(req.query.tagType || '1', 10) || 1;
  const [solData, bscData] = await Promise.all([
    fetchSmartMoneyInflowRank({ chainId: 'CT_501', tagType }),
    fetchSmartMoneyInflowRank({ chainId: '56', tagType }),
  ]);
  const solWithChain = (Array.isArray(solData) ? solData : []).map((d) => ({ ...d, chain: 'solana' }));
  const bscWithChain = (Array.isArray(bscData) ? bscData : []).map((d) => ({ ...d, chain: 'bsc' }));
  const data = [...solWithChain, ...bscWithChain]
    .sort((a, b) => (b.inflow || 0) - (a.inflow || 0));
  res.json(data);
});

// ── GET /kb-signals ── KB 公开信号列表(供 KB tab + 榜单徽章)
router.get('/kb-signals', cache(60, 120), async (_req, res) => {
  const { data, error } = await supabase
    .from('kb_signals')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  res.json(data || []);
});

// ── GET /kb-signals/:ca ── 单 token KB 信号(供详情页卡片)
router.get('/kb-signals/:ca', cache(60, 120), async (req, res) => {
  const { data, error } = await supabase
    .from('kb_signals')
    .select('*')
    .eq('ca', req.params.ca)
    .maybeSingle();
  if (error) throw error;
  res.json(data || null);
});

// ── POST /ranking/zhilabs/refresh-narratives ──
router.post('/ranking/zhilabs/refresh-narratives', async (_req, res) => {
  const result = await refreshZhilabsNarratives();
  res.json({
    ok: true,
    updated: result.updated,
    errors: result.errors,
    tokens: result.tokens,
    at: new Date().toISOString(),
  });
});

// ── GET /token/:address/narrative ──
router.get('/token/:address/narrative', cache(1800), async (req, res) => {
  const address = req.params.address;

  // 1. 检查 Supabase 持久化缓存
  const cached = await getCachedNarrative(address);
  if (cached) return res.json(cached);

  // 2. 从数据库获取代币元数据
  let tokenInfo = null;
  try {
    const row = await supabase
      .from('zhilabs_ranking')
      .select('name, symbol')
      .eq('token', address)
      .maybeSingle();
    tokenInfo = row.data;
    if (!tokenInfo) {
      const pumpRow = await supabase
        .from('solana_pump_ranking')
        .select('name, symbol')
        .eq('token', address)
        .maybeSingle();
      tokenInfo = pumpRow.data;
    }
  } catch { /* fallback */ }

  const symbol = tokenInfo?.symbol || '';
  const name = tokenInfo?.name || '';

  // 3. 调用增强版叙事搜索（传入合约地址）
  const narrative = await getTokenNarrative(symbol, name, { contractAddress: address });

  // 4. 保存到 Supabase 持久化缓存
  saveNarrativeCache(address, symbol, name, narrative).catch(() => {});

  res.json(narrative);
});

// ── GET /token/:address/tweets ──
router.get('/token/:address/tweets', cache(3600), async (req, res) => {
  const address = req.params.address;

  // 1. 检查 Supabase 持久化缓存
  const cached = await getCachedTweets(address);
  if (cached) return res.json(cached);

  // 2. 从数据库获取代币元数据
  let tokenInfo = null;
  try {
    const row = await supabase
      .from('zhilabs_ranking')
      .select('name, symbol')
      .eq('token', address)
      .maybeSingle();
    tokenInfo = row.data;
    if (!tokenInfo) {
      const pumpRow = await supabase
        .from('solana_pump_ranking')
        .select('name, symbol')
        .eq('token', address)
        .maybeSingle();
      tokenInfo = pumpRow.data;
    }
  } catch { /* fallback */ }

  const symbol = tokenInfo?.symbol || '';
  const name = tokenInfo?.name || '';
  const keyword = symbol || name || address.slice(0, 8);

  // 3. 调用增强版推特搜索（传入合约地址 + 元数据）
  const tweets = await getTokenHotTweets(keyword, {
    contractAddress: address,
    symbol,
    name,
  });

  // 4. 保存到 Supabase 持久化缓存
  saveTweetsCache(address, symbol, name, tweets).catch(() => {});

  res.json(tweets);
});

// ── GET /token/:address ──
router.get('/token/:address', cache(60, 120), async (req, res) => {
  const address = req.params.address;
  const chain = req.query.chain || 'solana';
  const [detail, pumpRow, zhilabsRow, secDetail] = await Promise.all([
    getTokenDetail(address, chain),
    supabase.from('solana_pump_ranking').select('holders, holders_top10_percent').eq('token', address).maybeSingle().then(r => r.data).catch(() => null),
    supabase.from('zhilabs_ranking').select('holders').eq('token', address).maybeSingle().then(r => r.data).catch(() => null),
    getTokenSecurityDetail(address, chain).catch(() => null),
  ]);
  if (!detail) {
    return res.status(404).json({ error: '未找到该代币' });
  }
  const dbRow = pumpRow || zhilabsRow;
  if (detail.holders == null && dbRow?.holders != null) {
    detail.holders = dbRow.holders;
  }
  if (detail.holders == null && secDetail?.holderCount != null) {
    detail.holders = secDetail.holderCount;
  }
  // 优先使用数据库（Binance来源）的 top10 数据，保持与榜单一致
  let dbTop10 = pumpRow?.holders_top10_percent ?? null;
  let goplusTop10 = secDetail?.topHolderPercent ?? null;
  // GoPlus 的 topHolderPercent 是 0-1 比例，转换为百分比
  if (goplusTop10 != null && goplusTop10 < 1) goplusTop10 = goplusTop10 * 100;
  let okxTop10 = null;
  if (dbTop10 == null && okxOnchain.isConfigured()) {
    okxTop10 = await okxOnchain.getTop10HolderPercent(address, chain).catch(() => null);
  }
  const finalTop10 = dbTop10 ?? okxTop10 ?? goplusTop10;

  if (secDetail) {
    detail._security = {
      lpNotLocked: secDetail.lpNotLocked,
      isHoneypot: secDetail.isHoneypot,
      buyTax: secDetail.buyTax,
      sellTax: secDetail.sellTax,
      isMintable: secDetail.isMintable,
      isFreezable: secDetail.isFreezable,
      riskLevel: secDetail.riskLevel,
      topHolderPercent: finalTop10,
    };
  } else if (finalTop10 != null) {
    detail._security = { topHolderPercent: finalTop10 };
  }
  res.json(detail);
});

// ── GET /kline/:pairAddress ──
router.get('/kline/:pairAddress', cache(30, 60), async (req, res) => {
  const pairAddress = req.params.pairAddress;
  const chain = req.query.chain || 'solana';
  const interval = parseInt(req.query.interval || '15', 10);
  const size = parseInt(req.query.size || '96', 10);
  const data = await getKline(pairAddress, chain, interval, size);
  res.json(data);
});

export default router;
