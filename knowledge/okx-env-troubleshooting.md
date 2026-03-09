# OKX API 环境变量排查

当线上环境（如 zhizhilabs.com/ranking）显示「OKX API 未配置」时，说明服务端未检测到有效的 `OKX_API_KEY`、`OKX_SECRET_KEY`、`OKX_PASSPHRASE`。

## 诊断接口

部署后访问 `https://你的域名/api/okx/status`，返回示例：

- `{ "okxConfigured": true }` — 已正确配置
- `{ "okxConfigured": false }` — 未检测到有效配置

## 常见原因（Railway）

1. **变量名拼写**
   - 必须完全一致：`OKX_API_KEY`、`OKX_SECRET_KEY`、`OKX_PASSPHRASE`
   - 大小写、下划线不能错（如 `okx_api_key`、`OKX-API-KEY` 均无效）

2. **变量作用域**
   - 在 **Service 级别** 的 Variables 中配置
   - 若项目有多个 Service，需在运行 `src/server.js` 的那个 Service 中配置

3. **三个变量缺一不可**
   - 三个都必须有非空值，缺任意一个都会判定为未配置

4. **部署时机**
   - 修改环境变量后，Railway 通常会自动重新部署
   - 若无自动部署，可手动触发一次 Redeploy

5. **检查启动日志**
   - Railway 部署日志中会输出：
     - `[数据源] OKX OnchainOS API 已配置` — 说明已生效
     - `[数据源] OKX OnchainOS API 未配置（可选）` — 说明未检测到

## 相关文件

- 配置校验：`src/data-sources/okx-onchain.js`（读取 `process.env`）
- 环境加载：`src/load-env.js`（加载 `.env`，Railway 上通常用平台注入的 env）
- 部署说明：`docs/deploy/RAILWAY.md`
