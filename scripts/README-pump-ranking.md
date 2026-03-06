# Solana Pump 榜单（AVE → Supabase）

## 一步：在 Supabase 建表

打开 [Supabase SQL Editor](https://app.supabase.com/project/rkzljtotquogikekxhcw/sql)，把 **`solana-pump-ranking.sql`** 里的 SQL 全部复制进去，点击 **Run** 执行一次。

## 二步：拉取并写入

在项目根目录执行：

```bash
npm run pump-ranking
```

脚本会从 AVE 拉取：**Solana、已成功发射、上线 < 10 天、市值 > 100K** 的 pump 代币，按 **24h 交易量** 排序取前 **20** 条，并写入 Supabase 表 `solana_pump_ranking`。

数据来源：`pump_in_new`、`pump_in_hot`、以及 AVE ranks 的 `solana` 主题，合并去重后筛选。
