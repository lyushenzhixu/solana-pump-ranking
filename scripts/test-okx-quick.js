/**
 * 快速测试 OKX API 连通性（单次 search 请求，几秒内完成）
 */
import '../src/load-env.js';
import { okxOnchain } from '../src/data-sources/index.js';

async function main() {
  console.log('=== OKX API 快速连通性测试 ===\n');
  if (!okxOnchain.isConfigured()) {
    console.error('❌ OKX 未配置');
    process.exit(1);
  }
  console.log('✓ 配置已加载，请求 searchTokens("SOL")...\n');
  try {
    const list = await okxOnchain.searchTokens('SOL', 'solana');
    const arr = Array.isArray(list) ? list : [];
    console.log(`✓ 成功收到 ${arr.length} 条代币`);
    if (arr.length > 0) {
      const t = arr[0];
      console.log('  首条:', t.tokenSymbol || t.symbol, t.tokenName || t.name);
    }
    console.log('\nOKX API 连通正常，榜单接口使用的同一套密钥，应能正常拉取数据。');
  } catch (e) {
    console.error('❌ 请求失败:', e?.message || e);
    if (e?.cause) console.error('   原因:', e.cause?.message || e.cause);
    if (e?.code) console.error('   代码:', e.code);
    process.exit(1);
  }
}

main();
