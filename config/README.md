# 配置文件

- **sql/** — Supabase 建表 SQL，在 [Supabase SQL Editor](https://app.supabase.com) 中执行。
  - `solana-pump-ranking.sql` — Solana Pump 榜单表（pump 拉取脚本写入）
  - `zhilabs-ranking.sql` — zhilabs 精选榜单表（zhilabs 拉取脚本写入）
  - `zhilabs-ranking-recreate.sql` — 重建该表（先 drop 再 create，数据错乱时用）
  - `tasks.sql` — 示例用 tasks 表

根目录的 `.env.example` 为环境变量示例，复制为 `.env` 后填入密钥。
