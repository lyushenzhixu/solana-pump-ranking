-- 重建 zhilabs_ranking 表（先删后建，解决 token/name/symbol 数据错乱）
-- 在 Supabase SQL Editor 中执行本文件后，再运行: npm run zhilabs-ranking

drop table if exists public.zhilabs_ranking;

create table public.zhilabs_ranking (
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
  main_pair text,
  logo_url text,
  launch_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(token)
);

alter table zhilabs_ranking enable row level security;
create policy "允许所有人读写" on zhilabs_ranking for all using (true) with check (true);
