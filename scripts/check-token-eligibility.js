/**
 * 单次校验：某代币是否满足 Pump 榜单入榜条件（与 fetch-pump-ranking 规则一致）
 * 用法: node scripts/check-token-eligibility.js <token_address>
 */
import 'dotenv/config';

const AVE_API_KEY = process.env.AVE_API_KEY;
const MIN_MARKET_CAP = 100_000;
const MAX_TOP10_HOLDERS_PERCENT = 30;
const TEN_DAYS_SEC = 10 * 24 * 3600;

const token = process.argv[2] || '6iA73gWCKkLWKbVr8rgibV57MMRxzsaqS9cWpgKBpump';

async function fetchAveTokenDetail(address) {
  const url = `https://data.ave-api.xyz/v2/tokens/${address}-solana`;
  const res = await fetch(url, { headers: { 'X-API-KEY': AVE_API_KEY } });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.status !== 1 || !json.data) return null;
  const d = json.data;
  return d?.token && typeof d.token === 'object' ? { ...d, ...d.token } : d;
}

async function fetchBinanceTop10(address) {
  const url = new URL('https://web3.binance.com/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info');
  url.searchParams.set('chainId', 'CT_501');
  url.searchParams.set('contractAddress', address);
  const res = await fetch(url.toString(), { headers: { 'Accept-Encoding': 'identity' } });
  if (!res.ok) return null;
  const json = await res.json();
  const pct = json?.data?.top10HoldersPercentage ?? json?.data?.holdersTop10Percent;
  if (pct == null || pct === '') return null;
  const num = parseFloat(String(pct));
  return Number.isFinite(num) ? num : null;
}

function parseLpNotLocked(v) {
  if (v === true || String(v).toLowerCase() === 'true' || v === 1 || v === '1') return true;
  if (v === false || String(v).toLowerCase() === 'false' || v === 0 || v === '0') return false;
  return null;
}

async function main() {
  console.log('校验代币:', token);
  console.log('');

  let ave = null;
  let top10 = null;
  try {
    ave = await fetchAveTokenDetail(token);
  } catch (e) {
    console.log('AVE 请求异常:', e.message);
  }
  try {
    top10 = await fetchBinanceTop10(token);
  } catch (e) {
    console.log('Binance 请求异常:', e.message);
  }

  if (!ave) {
    console.log('AVE 未返回该代币或请求失败 → 不会出现在 AVE 的 pump_in_new / pump_in_hot / ranks 候选里，无法入榜。');
    return;
  }

  const chain = ave.chain || '';
  const marketCap = parseFloat(ave.market_cap) || 0;
  const launchAt = Number(ave.launch_at ?? ave.created_at ?? 0);
  const now = Math.floor(Date.now() / 1000);
  const within10Days = launchAt >= now - TEN_DAYS_SEC;
  const lpRaw = ave.is_lp_not_locked;
  const lp = parseLpNotLocked(lpRaw);

  console.log('--- AVE 数据 ---');
  console.log('chain:', chain);
  console.log('name:', ave.name ?? '—');
  console.log('symbol:', ave.symbol ?? '—');
  console.log('market_cap:', marketCap, marketCap >= MIN_MARKET_CAP ? '✓ ≥100K' : '✗ <100K');
  console.log('launch_at:', launchAt, within10Days ? '✓ 上线<10天' : '✗ 上线≥10天');
  console.log('is_lp_not_locked (raw):', lpRaw, '→ 解析:', lp === true ? '未锁定' : lp === false ? '已burn/锁' : '未知');
  console.log('');
  console.log('--- Binance 数据 ---');
  console.log('Top10 持有人占比(%):', top10 != null ? top10 : '—', top10 != null && top10 > MAX_TOP10_HOLDERS_PERCENT ? '✗ >30%' : top10 != null ? '✓ ≤30%' : '—');
  console.log('');

  const okChain = chain === 'solana';
  const okCap = !isNaN(marketCap) && marketCap >= MIN_MARKET_CAP;
  const okLaunch = within10Days;
  const okLp = lp !== true;
  const okTop10 = top10 == null || top10 <= MAX_TOP10_HOLDERS_PERCENT;

  console.log('--- 入榜规则校验（与 fetch-pump-ranking 一致）---');
  console.log('1. Solana 链:', okChain ? '✓' : '✗');
  console.log('2. 市值 ≥ 100K:', okCap ? '✓' : '✗');
  console.log('3. 上线 < 10 天:', okLaunch ? '✓' : '✗');
  console.log('4. LP 非「明确未锁定」:', okLp ? '✓' : '✗');
  console.log('5. Top10 占比 ≤ 30%:', okTop10 ? '✓' : '✗');
  console.log('');
  const pass = okChain && okCap && okLaunch && okLp && okTop10;
  console.log('结论:', pass ? '能入榜（若在 AVE 候选池且按交易量排进前 20）' : '不能入榜');
  if (!pass) {
    if (!okChain) console.log('原因: 非 Solana');
    if (!okCap) console.log('原因: 市值不足 100K');
    if (!okLaunch) console.log('原因: 上线已满或超过 10 天');
    if (!okLp) console.log('原因: LP 明确未锁定，被规则排除');
    if (!okTop10) console.log('原因: Top10 持有人占比超过 30%');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
