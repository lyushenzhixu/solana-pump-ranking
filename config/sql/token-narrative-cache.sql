-- Meme 代币叙事与推文持久化缓存
-- 用途：减少 OpenNews / OpenTwitter API 调用次数，降低成本
-- 缓存 TTL 由应用层控制（默认叙事 4h，推文 2h）
-- 执行顺序：直接执行即可，无外部依赖

-- 叙事总结缓存
create table if not exists token_narratives (
  token              text primary key,
  symbol             text,
  name               text,
  summary            text default '',
  articles           jsonb default '[]'::jsonb,
  sentiment          text default 'neutral',
  source_count       int default 0,
  twitter_narrative  jsonb default null,
  fetched_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 如果表已存在但缺少 twitter_narrative 列，则添加
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'token_narratives' and column_name = 'twitter_narrative'
  ) then
    alter table token_narratives add column twitter_narrative jsonb default null;
  end if;
end $$;

-- 热门推文缓存
create table if not exists token_tweets (
  token         text primary key,
  symbol        text,
  name          text,
  tweets        jsonb default '[]'::jsonb,
  tweet_count   int default 0,
  search_query  text default '',
  fetched_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_narratives_fetched on token_narratives(fetched_at);
create index if not exists idx_tweets_fetched on token_tweets(fetched_at);
