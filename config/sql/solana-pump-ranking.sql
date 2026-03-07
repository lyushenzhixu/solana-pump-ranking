-- 在 Supabase SQL Editor 中执行，创建 Solana pump 榜单表
create table if not exists solana_pump_ranking (
  id bigint generated always as identity primary key,
  token text not null,
  chain text not null default 'solana',
  name text,
  symbol text,
  market_cap numeric,
  tx_volume_u_24h numeric,
  current_price_usd numeric,
  price_change_24h text,
  holders int,
  holders_top10_percent numeric,
  lp_burned boolean,
  main_pair text,
  logo_url text,
  launch_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(token)
);

-- 允许匿名写入（按需调整 RLS）
alter table solana_pump_ranking enable row level security;
create policy "允许所有人读写" on solana_pump_ranking for all using (true) with check (true);
