-- 为 solana_pump_ranking 增加 LP 是否已 burn/锁定 字段（仅 LP 已 burn/锁定 的代币入榜）
-- 在 Supabase SQL Editor 中执行；若表已存在则仅新增列
alter table solana_pump_ranking
  add column if not exists lp_burned boolean;

comment on column solana_pump_ranking.lp_burned is 'LP 是否已 burn 或锁定（true=是，false=否，null=未知）';
