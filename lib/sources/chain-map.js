/**
 * 各 API 平台的链标识符映射
 * 内部统一使用 AVE 风格标识（solana / eth / bsc ...）
 */

const CHAINS = {
  solana:    { dexscreener: 'solana',    geckoterminal: 'solana',      goplus: 'solana',  jupiter: true  },
  eth:       { dexscreener: 'ethereum',  geckoterminal: 'eth',         goplus: '1',       jupiter: false },
  bsc:       { dexscreener: 'bsc',       geckoterminal: 'bsc',         goplus: '56',      jupiter: false },
  base:      { dexscreener: 'base',      geckoterminal: 'base',        goplus: '8453',    jupiter: false },
  arbitrum:  { dexscreener: 'arbitrum',  geckoterminal: 'arbitrum',    goplus: '42161',   jupiter: false },
  polygon:   { dexscreener: 'polygon',   geckoterminal: 'polygon_pos', goplus: '137',     jupiter: false },
  avalanche: { dexscreener: 'avalanche', geckoterminal: 'avax',        goplus: '43114',   jupiter: false },
  optimism:  { dexscreener: 'optimism',  geckoterminal: 'optimism',    goplus: '10',      jupiter: false },
  ton:       { dexscreener: 'ton',       geckoterminal: 'ton',         goplus: null,      jupiter: false },
};

export function toDexScreener(chain) {
  return CHAINS[chain]?.dexscreener ?? chain;
}

export function toGeckoTerminal(chain) {
  return CHAINS[chain]?.geckoterminal ?? chain;
}

export function toGoPlus(chain) {
  return CHAINS[chain]?.goplus ?? chain;
}

export function supportsJupiter(chain) {
  return CHAINS[chain]?.jupiter === true;
}

export function fromDexScreener(chainId) {
  for (const [key, val] of Object.entries(CHAINS)) {
    if (val.dexscreener === chainId) return key;
  }
  return chainId;
}

export function fromGeckoTerminal(networkId) {
  for (const [key, val] of Object.entries(CHAINS)) {
    if (val.geckoterminal === networkId) return key;
  }
  return networkId;
}

export const SUPPORTED_CHAINS = Object.keys(CHAINS);
