/**
 * 使用 AVE Cloud API 对代币做合约风险/安全审计
 * 用法: node scripts/ave-token-audit.js <合约地址> [链]
 * 示例: node scripts/ave-token-audit.js ATFtqCyeCAps8dbA6eegfojkDmxmq7ofDh93vkcpuqjW solana
 */
import 'dotenv/config';
import https from 'https';

const address = process.argv[2];
const chain = process.argv[3] || 'solana';

if (!address) {
  console.error('用法: node scripts/ave-token-audit.js <合约地址> [链]');
  process.exit(1);
}

const apiKey = process.env.AVE_API_KEY;
if (!apiKey) {
  console.error('请设置环境变量 AVE_API_KEY（或在 .env 中配置）');
  process.exit(1);
}

const tokenId = `${address}-${chain}`;
const path = `/v2/contracts/${tokenId}`;

const req = https.request(
  {
    hostname: 'data.ave-api.xyz',
    path,
    method: 'GET',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  },
  (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      try {
        const data = JSON.parse(raw);
        console.log(JSON.stringify(data, null, 2));
      } catch {
        console.error('响应非 JSON:', raw.slice(0, 500));
        process.exit(1);
      }
    });
  }
);

req.on('timeout', () => {
  req.destroy();
  console.error('请求超时');
  process.exit(1);
});

req.on('error', (err) => {
  console.error('请求失败:', err.message);
  process.exit(1);
});

req.end();
