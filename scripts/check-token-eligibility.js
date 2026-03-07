/**
 * 单次校验：某代币是否满足 Pump 榜单入榜条件（与 fetch-pump-ranking 规则一致）
 * 用法: node scripts/check-token-eligibility.js <token_address>
 *
 * 使用自研数据源（DexScreener + GeckoTerminal + GoPlus），无需 AVE_API_KEY
 */
import 'dotenv/config';
import * as dataSource from '../src/data-sources/index.js';

const MIN_MARKET_CAP = 100_000;
const MAX_TOP10_HOLDERS_PERCENT = 30;
const TEN_DAYS_SEC = 10 * 24 * 3600;

const token = process.argv[2] || '6iA73gWCKkLWKbVr8rgibV57MMRxzsaqS9cWpgKBpump';

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

async function main() {
  console.log('校验代币:', token);
  console.log('');

  let detail = null;
  let security = null;
  let top10 = null;

  try {
    console.log('查询代币详情 (DexScreener + GeckoTerminal)...');
    detail = await dataSource.getTokenDetail(token, 'solana');
  } catch (e) {
    console.log('代币详情请求异常:', e.message);
  }

  try {
    console.log('查询安全信息 (GoPlus)...');
    security = await dataSource.getTokenSecurityDetail(token, 'solana');
  } catch (e) {
    console.log('GoPlus 请求异常:', e.message);
  }

  try {
    console.log('查询 Top10 持有人 (Binance)...');
    top10 = await fetchBinanceTop10(token);
  } catch (e) {
    console.log('Binance 请求异常:', e.message);
  }

  if (!detail) {
    console.log('数据源未返回该代币数据，无法校验。');
    return;
  }

  const chain = detail.chain || '';
  const marketCap = parseFloat(detail.market_cap) || 0;
  const launchAt = Number(detail.launch_at ?? 0);
  const now = Math.floor(Date.now() / 1000);
  const within10Days = launchAt <= 0 || launchAt >= now - TEN_DAYS_SEC;
  const lpNotLocked = security?.lpNotLocked;

  console.log('');
  console.log('--- 代币数据 ---');
  console.log('chain:', chain);
  console.log('name:', detail.name ?? '—');
  console.log('symbol:', detail.symbol ?? '—');
  console.log('market_cap:', marketCap, marketCap >= MIN_MARKET_CAP ? '✓ ≥100K' : '✗ <100K');
  console.log('launch_at:', launchAt || '未知', within10Days ? '✓ 上线<10天' : '✗ 上线≥10天');
  console.log('current_price_usd:', detail.current_price_usd ?? '—');
  console.log('tx_volume_u_24h:', detail.tx_volume_u_24h ?? '—');
  console.log('logo:', detail.logo_url ? '有' : '无');
  console.log('');
  console.log('--- 安全数据 (GoPlus) ---');
  console.log('LP 状态:', lpNotLocked === true ? '未锁定' : lpNotLocked === false ? '已burn/锁' : '未知');
  console.log('蜜罐:', security?.isHoneypot === true ? '是 ✗' : security?.isHoneypot === false ? '否 ✓' : '未知');
  console.log('风险等级:', security?.riskLevel ?? '—');
  console.log('持币地址数:', security?.holderCount ?? '—');
  console.log('');
  console.log('--- Binance 数据 ---');
  console.log('Top10 持有人占比(%):', top10 != null ? top10 : '—', top10 != null && top10 > MAX_TOP10_HOLDERS_PERCENT ? '✗ >30%' : top10 != null ? '✓ ≤30%' : '—');
  console.log('');

  const okChain = chain === 'solana';
  const okCap = !isNaN(marketCap) && marketCap >= MIN_MARKET_CAP;
  const okLaunch = within10Days;
  const okLp = lpNotLocked !== true;
  const okTop10 = top10 == null || top10 <= MAX_TOP10_HOLDERS_PERCENT;
  const okHoneypot = security?.isHoneypot !== true;

  console.log('--- 入榜规则校验 ---');
  console.log('1. Solana 链:', okChain ? '✓' : '✗');
  console.log('2. 市值 ≥ 100K:', okCap ? '✓' : '✗');
  console.log('3. 上线 < 10 天:', okLaunch ? '✓' : '✗');
  console.log('4. LP 非「明确未锁定」:', okLp ? '✓' : '✗');
  console.log('5. 非蜜罐:', okHoneypot ? '✓' : '✗');
  console.log('6. Top10 占比 ≤ 30%:', okTop10 ? '✓' : '✗');
  console.log('');
  const pass = okChain && okCap && okLaunch && okLp && okTop10 && okHoneypot;
  console.log('结论:', pass ? '能入榜（若在候选池且按交易量排进前 20）' : '不能入榜');
  if (!pass) {
    if (!okChain) console.log('原因: 非 Solana');
    if (!okCap) console.log('原因: 市值不足 100K');
    if (!okLaunch) console.log('原因: 上线已满或超过 10 天');
    if (!okLp) console.log('原因: LP 明确未锁定');
    if (!okHoneypot) console.log('原因: GoPlus 检测为蜜罐');
    if (!okTop10) console.log('原因: Top10 持有人占比超过 30%');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
