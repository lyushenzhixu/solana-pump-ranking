# Supabase 示例

## 先建表（可选）

在 [Supabase SQL Editor](https://app.supabase.com/project/rkzljtotquogikekxhcw/sql) 里执行 `建表.sql` 中的 SQL，会创建 `tasks` 表。

## 运行示例

```bash
# 查询
npm run example:query

# 新增一条
npm run example:insert

# 更新 / 删除（需改文件里的 id）
npm run example:update

# 完整演示：插入 → 查询 → 更新 → 删除
npm run example:demo
```

## 文件说明

| 文件 | 说明 |
|------|------|
| `01-查询.js` | select、条件、排序、limit |
| `02-新增.js` | insert + select 返回新行 |
| `03-更新与删除.js` | update、delete |
| `04-完整演示.js` | 一条龙增删改查 |
| `建表.sql` | 在控制台执行，创建 tasks 表 |

把你代码里的表名 `tasks` 换成自己的表即可复用。
