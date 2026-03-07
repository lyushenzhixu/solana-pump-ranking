/**
 * 自研数据源集成测试
 * 验证 DexScreener / GeckoTerminal / Jupiter / GoPlus 各 API 正常工作
 * 用法: node scripts/test-data-source.js
 */
import * as dataSource from '../src/data-sources/index.js';
import * as dexscreener from '../src/data-sources/dexscreener.js';
import * as geckoterminal from '../src/data-sources/geckoterminal.js';
import * as jupiter from '../src/data-sources/jupiter.js';
import * as goplus from '../src/data-sources/goplus.js';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const KNOWN_TOKEN = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}`); failed++; }
}

async function testDexScreener() {
  console.log('\n=== DexScreener ===');
  try {
    const pairs = await dexscreener.search('SOL');
    assert(pairs.length > 0, `search('SOL'): ${pairs.length} 个交易对`);
    assert(pairs[0].chainId, 'pair 有 chainId');
    assert(pairs[0].priceUsd, 'pair 有 priceUsd');

    const normalized = dexscreener.normalizePair(pairs[0]);
    assert(normalized.token && normalized.chain, 'normalizePair 格式正确');

    const boosts = await dexscreener.getLatestBoosts();
    assert(Array.isArray(boosts), `getLatestBoosts: ${boosts.length} 条`);
  } catch (e) {
    console.log(`  ❌ 错误: ${e.message}`); failed++;
  }
}

async function testGeckoTerminal() {
  console.log('\n=== GeckoTerminal ===');
  try {
    const trending = await geckoterminal.getTrendingPools('solana', 1);
    assert(trending.length > 0, `getTrendingPools: ${trending.length} 个`);
    if (trending[0]) {
      assert(trending[0].token, 'trending pool 有 token');
      assert(trending[0].chain, 'trending pool 有 chain');
      assert(trending[0].tx_volume_u_24h != null, 'trending pool 有 volume');
    }

    const newPools = await geckoterminal.getNewPools('solana', 1);
    assert(newPools.length > 0, `getNewPools: ${newPools.length} 个`);

    const networks = await geckoterminal.getNetworks();
    assert(networks.length > 0, `getNetworks: ${networks.length} 条链`);
  } catch (e) {
    console.log(`  ❌ 错误: ${e.message}`); failed++;
  }
}

async function testJupiter() {
  console.log('\n=== Jupiter ===');
  try {
    const prices = await jupiter.getPrices([SOL_MINT]);
    if (prices.size > 0) {
      assert(prices.get(SOL_MINT)?.price > 0, `SOL 价格: $${prices.get(SOL_MINT)?.price}`);
    } else {
      console.log('  ⚠️ Jupiter v2 需要认证，价格由 DexScreener + GeckoTerminal 提供');
    }
  } catch (e) {
    console.log(`  ⚠️ Jupiter 不可用: ${e.message}`);
  }
}

async function testGoPlus() {
  console.log('\n=== GoPlus (Solana) ===');
  try {
    const secMap = await goplus.getTokenSecurity('solana', [KNOWN_TOKEN]);
    assert(secMap instanceof Map, 'getTokenSecurity 返回 Map');
    const info = secMap.get(KNOWN_TOKEN.toLowerCase());
    if (info) {
      assert(info.risk_level, `JUP 风险等级: ${info.risk_level}`);
      assert(info.holder_count > 0, `持币地址: ${info.holder_count}`);
    } else {
      console.log('  ⚠️ GoPlus 未返回安全数据');
    }
  } catch (e) {
    console.log(`  ❌ 错误: ${e.message}`); failed++;
  }
}

async function testUnified() {
  console.log('\n=== 统一数据源 ===');
  try {
    const detail = await dataSource.getTokenDetail(KNOWN_TOKEN, 'solana');
    assert(detail != null, 'getTokenDetail 返回数据');
    if (detail) {
      assert(detail.symbol === 'JUP', `symbol: ${detail.symbol}`);
      assert(detail.current_price_usd > 0, `price: $${detail.current_price_usd}`);
      assert(detail.market_cap > 0, `market_cap: $${(detail.market_cap / 1e6).toFixed(1)}M`);
    }

    const tokens = await dataSource.searchTokens('BONK', 'solana', 5);
    assert(tokens.length > 0, `searchTokens('BONK'): ${tokens.length} 个`);

    const hot = await dataSource.getPlatformTokens('pump_in_hot', 10);
    assert(hot.length > 0, `getPlatformTokens: ${hot.length} 个`);
  } catch (e) {
    console.log(`  ❌ 错误: ${e.message}`); failed++;
  }
}

async function main() {
  console.log('自研数据源集成测试');
  console.log('========================');

  await testDexScreener();
  await testGeckoTerminal();
  await testJupiter();
  await testGoPlus();
  await testUnified();

  console.log('\n========================');
  console.log(`结果: ${passed} 通过, ${failed} 失败`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error('测试异常:', e); process.exit(1); });
