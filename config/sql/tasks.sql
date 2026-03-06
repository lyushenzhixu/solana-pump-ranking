-- 在 Supabase 控制台执行：SQL Editor -> 粘贴 -> Run
-- 建一个简单的 tasks 表，供 examples 使用

create table if not exists tasks (
  id bigint generated always as identity primary key,
  title text,
  done boolean default false,
  created_at timestamptz default now()
);

-- 可选：开 RLS 时允许匿名读写的策略（按需启用）
-- alter table tasks enable row level security;
-- create policy "允许所有人" on tasks for all using (true) with check (true);
