# Solana Pump 榜单 + Supabase

Supabase 连接示例与 Solana Pump 代币榜单（AVE 拉取 → Supabase 存储 → Railway 展示）。

## 项目结构

```
├── config/           # 配置与 SQL
│   ├── sql/          # Supabase 建表脚本
│   │   ├── solana-pump-ranking.sql   # 榜单表
│   │   └── tasks.sql                # 示例用 tasks 表
│   └── README.md
├── src/              # 源代码
│   ├── index.js      # Supabase 客户端（供 examples 等引用）
│   └── server.js     # 榜单 Web 服务（API + 页面）
├── scripts/          # 脚本
│   ├── fetch-pump-ranking.js   # 从 AVE 拉取榜单并写入 Supabase
│   └── README-pump-ranking.md
├── examples/         # Supabase 增删改查示例
├── docs/             # 文档
│   ├── RAILWAY.md
│   └── PUSH-TO-GITHUB.md
├── .env.example      # 环境变量示例（复制为 .env 并填写）
├── package.json
└── README.md
```

## 快速开始

1. 复制 `.env.example` 为 `.env`，填入 `SUPABASE_URL`、`SUPABASE_ANON_KEY`（及可选 `AVE_API_KEY`）。
2. 在 Supabase SQL Editor 执行 `config/sql/solana-pump-ranking.sql` 建表。
3. 本地跑榜单拉取：`npm run pump-ranking`
4. 本地启动 Web：`npm start`，访问 http://localhost:3000
5. 部署到 Railway：见 `docs/RAILWAY.md`

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm start` | 启动榜单 Web 服务 |
| `npm run pump-ranking` | 从 AVE 拉取榜单并写入 Supabase |
| `npm run example:query` | 运行查询示例 |
| `npm run example:demo` | 运行完整增删改查示例 |
