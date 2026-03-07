# AGENTS.md

## Cursor Cloud specific instructions

### 概述

zhilabs 是一个 Solana meme 代币排行榜 Web 应用，使用 Node.js（ES Modules）+ Supabase + AVE API。详见 `README.md` 中的项目结构和常用命令。

### 启动服务

- 启动 Web 服务器：`npm start`（监听 `PORT` 环境变量，默认 3000）
- 健康检查：`GET /health` 返回 `{"ok":true}`

### 环境变量

- 服务器启动**必需**：`SUPABASE_URL`、`SUPABASE_ANON_KEY`。缺失时 `@supabase/supabase-js` 的 `createClient()` 会直接抛错，服务器无法启动。
- 数据拉取脚本还需要 `AVE_API_KEY`。
- 从 `.env.example` 复制为 `.env`，或通过 Cursor Secrets 注入环境变量。

### 注意事项

- 项目无 ESLint / Prettier / TypeScript / 测试框架配置。`npm test` 仅做基本 import 校验（也依赖 Supabase 凭证）。
- `src/server.js` 使用原生 `node:http`，无 Express。代码中 HTML 页面内联在 JS 变量中。
- Node.js >= 18（需要原生 `fetch`）。当前环境已有 v22。
