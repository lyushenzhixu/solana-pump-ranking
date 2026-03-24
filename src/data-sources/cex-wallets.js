/**
 * 已知 Solana CEX 热钱包地址排除列表
 * 用于庄家聚类分析时过滤 CEX 提币导致的假阳性
 *
 * 来源：公开文档、区块浏览器标注
 * 注意：此列表不完整，distinctness 启发式（同一资金源 >100 钱包）作为兜底
 */

/** @type {Map<string, string>} address → label */
export const CEX_LABELS = new Map([
  // ─── Binance ─────────────────────────────────────────────
  ['5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', 'Binance Hot Wallet 1'],
  ['2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S', 'Binance Hot Wallet 2'],
  ['9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'Binance Hot Wallet 3'],

  // ─── OKX ─────────────────────────────────────────────────
  ['5VCwKtCXgCDuQosVkZqW5c5x3MFsrjCA4JRQ7G3TtF7r', 'OKX Hot Wallet 1'],
  ['CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq', 'OKX Hot Wallet 2'],

  // ─── Bybit ───────────────────────────────────────────────
  ['AC5RDfQFmDS1deWZos921JfqscXdByf6BKHs5ACWjtW2', 'Bybit Hot Wallet'],

  // ─── Coinbase ────────────────────────────────────────────
  ['GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE', 'Coinbase Hot Wallet 1'],
  ['H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS', 'Coinbase Prime'],

  // ─── Kraken ──────────────────────────────────────────────
  ['FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiWB5i', 'Kraken Hot Wallet'],

  // ─── Gate.io ─────────────────────────────────────────────
  ['u6PJ8DtQuPFnfmwHbGFULQ4u4EgjDiyYKjVEsynXq2w', 'Gate.io Hot Wallet'],

  // ─── KuCoin ──────────────────────────────────────────────
  ['BmFdpraQhkiDQE6SnfG5PVddMtRwTEDkbJG4NpaFEHkP', 'KuCoin Hot Wallet'],

  // ─── Raydium / Jupiter (DEX, not CEX, but high-volume intermediaries) ─
  ['5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', 'Raydium Authority V4'],
  ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', 'Jupiter Aggregator V6'],
]);

/** @type {Set<string>} */
export const CEX_HOT_WALLETS = new Set(CEX_LABELS.keys());

/**
 * 检查地址是否为已知 CEX 热钱包
 * @param {string} address Solana 钱包地址
 * @returns {boolean}
 */
export function isCexWallet(address) {
  return CEX_HOT_WALLETS.has(address);
}

/**
 * 获取 CEX 标签（如果有）
 * @param {string} address
 * @returns {string|null}
 */
export function getCexLabel(address) {
  return CEX_LABELS.get(address) || null;
}
