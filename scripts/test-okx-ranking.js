/**
 * 测试 OKX 榜单接口：验证配置正确且能收到数据
 * 用法：node scripts/test-okx-ranking.js 或 npm run test-okx-ranking
 */
import '../src/load-env.js';
import { okxOnchain } from '../src/data-sources/index.js';

async function main() {
  console.log('=== OKX 榜单功能测试 ===\n');

  if (!okxOnchain.isConfigured()) {
    console.error('❌ OKX API 未配置。请在 .env 中设置 OKX_API_KEY、OKX_SECRET_KEY、OKX_PASSPHRASE');
    process.exit(1);
  }
  console.log('✓ OKX API 已配置\n');

  // 1. Meme 涨幅榜 (sortType=1)
  console.log('1. 请求 Meme 涨幅榜 (sortType=1, 前 5 条)...');
  try {
    const memeByChange = await okxOnchain.getMemeRanking({
      chain: 'solana',
      sortType: 1,
      page: 1,
      pageSize: 5,
    });
    const list = Array.isArray(memeByChange) ? memeByChange : [];
    console.log(`   收到 ${list.length} 条`);
    if (list.length > 0) {
      const first = list[0];
      console.log('   首条:', {
        symbol: first.tokenSymbol,
        name: first.tokenName,
        price: first.price,
        change24H: first.change24H,
        marketCap: first.marketCap,
      });
    }
    console.log('');
  } catch (e) {
    console.error('   ❌ 失败:', e?.message || e);
    process.exit(1);
  }

  // 2. Meme 交易量榜 (sortType=2)
  console.log('2. 请求 Meme 交易量榜 (sortType=2, 前 3 条)...');
  try {
    const memeByVol = await okxOnchain.getMemeRanking({
      chain: 'solana',
      sortType: 2,
      page: 1,
      pageSize: 3,
    });
    const list = Array.isArray(memeByVol) ? memeByVol : [];
    console.log(`   收到 ${list.length} 条`);
    if (list.length > 0) {
      list.forEach((item, i) => {
        console.log(`   #${i + 1} ${item.tokenSymbol} volume24H=${item.volume24H}`);
      });
    }
    console.log('');
  } catch (e) {
    console.error('   ❌ 失败:', e?.message || e);
  }

  // 3. 代币通用榜单 (token-ranking)
  console.log('3. 请求代币榜单 (token-ranking, 前 3 条)...');
  try {
    const tokenList = await okxOnchain.getTokenRanking({
      chain: 'solana',
      sortType: 1,
      page: 1,
      pageSize: 3,
    });
    const list = Array.isArray(tokenList) ? tokenList : [];
    console.log(`   收到 ${list.length} 条`);
    if (list.length > 0) {
      list.forEach((item, i) => {
        console.log(`   #${i + 1} ${item.tokenSymbol} change=${item.change}`);
      });
    }
    console.log('');
  } catch (e) {
    console.error('   ❌ 失败:', e?.message || e);
  }

  console.log('=== OKX 榜单测试完成，数据可正常拉取 ===');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
