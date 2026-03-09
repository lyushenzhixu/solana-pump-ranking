/**
 * Binance Web3 聪明钱信号 & 流入排行 & 代币动态 API
 * 公开接口，无需 API Key
 * 文档参考：binance-web3-trading-signal skill / binance-web3-crypto-market-rank skill
 */
const BASE = 'https://web3.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/web/signal/smart-money';
const INFLOW_RANK_BASE = 'https://web3.binance.com/bapi/defi/v1/public/wallet-direct/tracker/wallet/token/inflow/rank/query';
const TOKEN_DYNAMIC_BASE = 'https://web3.binance.com/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info';
const LOGO_BASE = 'https://bin.bnbstatic.com';

/** Binance 链 ID 映射 */
const BINANCE_CHAIN_MAP = { solana: 'CT_501', bsc: '56', base: '8453' };

/**
 * 从 Binance Web3 获取代币动态信息（含 Top10 持有人占比）
 * 与 Pump 榜单使用的数据源一致，确保详情页与榜单数据对齐
 * @param {string} contractAddress 代币合约地址
 * @param {string} [chain='solana'] solana/bsc/base
 * @returns {Promise<{ top10HoldersPercentage: number|null, holders: number|null, insiderHoldingPercent: number|null }>}
 */
export async function fetchBinanceTokenDynamicInfo(contractAddress, chain = 'solana') {
  const chainId = BINANCE_CHAIN_MAP[chain] || 'CT_501';
  const url = new URL(TOKEN_DYNAMIC_BASE);
  url.searchParams.set('chainId', chainId);
  url.searchParams.set('contractAddress', contractAddress);
  try {
    const res = await fetch(url.toString(), { headers: { 'Accept-Encoding': 'identity' } });
    if (!res.ok) return { top10HoldersPercentage: null, holders: null, insiderHoldingPercent: null };
    const json = await res.json();
    const d = json?.data;
    if (!d) return { top10HoldersPercentage: null, holders: null, insiderHoldingPercent: null };
    const pct = d.top10HoldersPercentage ?? d.holdersTop10Percent;
    const top10 = pct != null && pct !== '' ? parseFloat(String(pct)) : null;
    const holders = d.holders != null ? parseInt(String(d.holders), 10) : null;
    const insider = d.insiderHoldingPercent != null ? parseFloat(String(d.insiderHoldingPercent)) : null;
    return {
      top10HoldersPercentage: Number.isFinite(top10) ? top10 : null,
      holders: Number.isInteger(holders) ? holders : null,
      insiderHoldingPercent: Number.isFinite(insider) ? insider : null,
    };
  } catch {
    return { top10HoldersPercentage: null, holders: null, insiderHoldingPercent: null };
  }
}

/**
 * 获取聪明钱买卖信号列表
 * @param {object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=100]
 * @param {string} [options.chainId='CT_501'] CT_501=Solana, 56=BSC
 * @param {string} [options.smartSignalType='']
 * @returns {Promise<Array>} 信号项数组，每项含完整 logoUrl
 */
export async function fetchSmartMoneySignals(options = {}) {
  const {
    page = 1,
    pageSize = 100,
    chainId = 'CT_501',
    smartSignalType = '',
  } = options;

  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'identity',
    },
    body: JSON.stringify({
      smartSignalType,
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 100, 100),
      chainId: String(chainId),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Binance Smart Money ${res.status}: ${text}`);
  }

  const json = await res.json();
  const list = Array.isArray(json?.data) ? json.data : [];

  return list.map((item) => {
    const out = { ...item };
    if (out.logoUrl && !/^https?:\/\//i.test(out.logoUrl)) {
      out.logoUrl = (out.logoUrl.startsWith('/') ? '' : '/') + out.logoUrl;
      out.logoUrl = LOGO_BASE + out.logoUrl;
    }
    return out;
  });
}

/**
 * 获取聪明钱流入排行榜
 * @param {object} [options]
 * @param {string} [options.chainId='CT_501'] CT_501=Solana, 56=BSC
 * @param {number} [options.tagType=1] 1=智能钱 2=KOL
 * @returns {Promise<Array>} 排行项数组，按 inflow 排序
 */
export async function fetchSmartMoneyInflowRank(options = {}) {
  const { chainId = 'CT_501', tagType = 1 } = options;

  const res = await fetch(INFLOW_RANK_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'identity',
      clienttype: 'web',
    },
    body: JSON.stringify({ chainId: String(chainId), tagType: Number(tagType) }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Binance Inflow Rank ${res.status}: ${text}`);
  }

  const json = await res.json();
  const list = Array.isArray(json?.data) ? json.data : [];

  return list.map((item) => {
    const out = { ...item };
    if (out.tokenIconUrl && !/^https?:\/\//i.test(out.tokenIconUrl)) {
      out.tokenIconUrl = (out.tokenIconUrl.startsWith('/') ? '' : '/') + out.tokenIconUrl;
      out.tokenIconUrl = LOGO_BASE + out.tokenIconUrl;
    }
    return out;
  });
}
