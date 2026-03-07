-- 为 solana_pump_ranking 增加 top10 持有人占比字段（用于筛选与展示）
-- 在 Supabase SQL Editor 中执行；若表已存在则仅新增列
alter table solana_pump_ranking
  add column if not exists holders_top10_percent numeric;

comment on column solana_pump_ranking.holders_top10_percent is 'Top 10 持有人持仓占比（%），超过 30 的代币不入榜';
