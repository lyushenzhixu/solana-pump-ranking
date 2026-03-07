/**
 * 代币合约安全审计（使用自研数据源 GoPlus Security API）
 * 用法: node scripts/token-audit.js <合约地址> [链]
 * 示例: node scripts/token-audit.js ATFtqCyeCAps8dbA6eegfojkDmxmq7ofDh93vkcpuqjW solana
 *
 * 无需 AVE_API_KEY，使用免费的 GoPlus Security API
 */
import 'dotenv/config';
import * as dataSource from '../src/data-sources/index.js';

const address = process.argv[2];
const chain = process.argv[3] || 'solana';

if (!address) {
  console.error('用法: node scripts/token-audit.js <合约地址> [链]');
  process.exit(1);
}

async function main() {
  console.log(`审计代币: ${address} (${chain})`);
  console.log('');

  const risk = await dataSource.getContractRisk(address, chain);
  if (!risk) {
    console.error('GoPlus 未返回数据，请检查地址和链是否正确');
    process.exit(1);
  }

  console.log('=== 安全报告 ===');
  console.log('风险等级:', risk.risk_level || '未知');
  console.log('');
  console.log('--- 核心指标 ---');
  console.log('蜜罐 (Honeypot):', risk.is_honeypot === true ? '⚠️ 是' : risk.is_honeypot === false ? '✅ 否' : '未知');
  console.log('买入税 (Buy Tax):', risk.buy_tax != null ? risk.buy_tax + '%' : '—');
  console.log('卖出税 (Sell Tax):', risk.sell_tax != null ? risk.sell_tax + '%' : '—');
  console.log('开源合约:', risk.is_open_source === true ? '✅ 是' : risk.is_open_source === false ? '⚠️ 否' : '—');
  console.log('可增发 (Mintable):', risk.is_mintable === true ? '⚠️ 是' : risk.is_mintable === false ? '✅ 否' : '—');
  if (risk.is_freezable != null) {
    console.log('可冻结 (Freezable):', risk.is_freezable === true ? '⚠️ 是' : '✅ 否');
  }
  if (risk.is_closable != null) {
    console.log('可关闭 (Closable):', risk.is_closable === true ? '⚠️ 是' : '✅ 否');
  }
  console.log('');
  console.log('--- 持有信息 ---');
  console.log('持币地址数:', risk.holder_count ?? '未知');
  console.log('LP 持有地址数:', risk.lp_holder_count ?? '未知');
  console.log('LP 已锁定:', risk.is_lp_locked === true ? '✅ 是' : risk.is_lp_locked === false ? '⚠️ 否' : '未知');
  console.log('总供给量:', risk.total_supply ?? '未知');
  console.log('');
  if (risk.trusted_token != null) {
    console.log('可信代币:', risk.trusted_token ? '✅ 是' : '否');
  }
  if (risk.top_holder_percent != null) {
    console.log('Top10 持有人占比:', (risk.top_holder_percent * 100).toFixed(1) + '%');
  }
  console.log('');
  console.log('--- 地址 ---');
  console.log('Owner:', risk.owner_address || '—');
  console.log('Creator:', risk.creator_address || '—');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
