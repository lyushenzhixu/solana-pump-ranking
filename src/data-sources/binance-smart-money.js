/**
 * Binance Web3 聪明钱信号 API
 * 公开接口，无需 API Key
 * 文档参考：binance-web3-trading-signal skill
 */
const BASE = 'https://web3.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/web/signal/smart-money';
const LOGO_BASE = 'https://bin.bnbstatic.com';

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
