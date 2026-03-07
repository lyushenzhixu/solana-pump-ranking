/**
 * 调用 Binance 代币安全审计 API（一次性脚本）
 * 用法: node scripts/binance-token-audit.js <合约地址>
 *
 * 若仍出现 Connect Timeout，多为网络无法访问 web3.binance.com，可换网络或代理后重试。
 */
import crypto from 'crypto';
import https from 'https';

const contractAddress = process.argv[2] || 'ATFtqCyeCAps8dbA6eegfojkDmxmq7ofDh93vkcpuqjW';
const binanceChainId = 'CT_501'; // Solana

const body = JSON.stringify({
  binanceChainId,
  contractAddress,
  requestId: crypto.randomUUID(),
});

const req = https.request(
  {
    hostname: 'web3.binance.com',
    path: '/bapi/defi/v1/public/wallet-direct/security/token/audit',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'source': 'agent',
      'Accept-Encoding': 'identity',
      'Content-Length': Buffer.byteLength(body),
    },
    timeout: 60_000,
  },
  (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      const data = JSON.parse(Buffer.concat(chunks).toString());
      console.log(JSON.stringify(data, null, 2));
    });
  }
);

req.on('timeout', () => {
  req.destroy();
  console.error('请求超时（60s），请检查网络或代理后重试。');
  process.exit(1);
});

req.on('error', (err) => {
  console.error('请求失败:', err.message);
  process.exit(1);
});

req.write(body);
req.end();
