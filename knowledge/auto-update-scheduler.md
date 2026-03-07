# 定时自动更新调度器

本文档记录榜单定时自动更新的设计、配置与运维要点。

## 概览

服务启动后，后端调度器自动每隔 N 分钟（默认 5）依次执行 Pump 榜单和 zhilabs 精选的数据更新，结果写入 Supabase 对应表。前端榜单页顶部展示调度状态栏，实时显示下次更新倒计时和上次结果。

## 配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `AUTO_UPDATE_INTERVAL_MIN` | `5` | 自动更新间隔（分钟），最小 1 分钟 |

修改后需重启服务生效。

## 执行流程

```
服务启动
  └─ startScheduler()
       ├─ 3 秒后首次执行 runScheduledUpdate()
       └─ 每 intervalMs 毫秒重复执行
            ├─ 检查 scheduler.running → 仍在执行则跳过
            ├─ updatePumpRanking()（检查 updateRunning.pump 锁）
            └─ updateZhilabsRanking()（检查 updateRunning.zhilabs 锁）
```

- 两个榜单**依次**更新，非并行，避免外部 API 过载。
- 与手动更新共用 `updateRunning` 互斥锁：手动进行中 → 定时跳过该榜单；定时进行中 → 手动返回 409。

## API

### `GET /api/scheduler/status`

返回调度器状态 JSON：

| 字段 | 类型 | 说明 |
|------|------|------|
| `enabled` | boolean | 调度器是否启用 |
| `intervalMs` | number | 间隔毫秒数 |
| `intervalMin` | number | 间隔分钟数 |
| `running` | boolean | 当前是否正在执行更新 |
| `lastRun` | string \| null | 上次执行完成的 ISO 时间 |
| `lastResult` | object \| null | 上次执行结果（含 pump、zhilabs 各自的 ok/count/error + durationMs） |

## 前端状态栏

位于 `/ranking` 页面标题下方，包含：

- **圆点指示器**：绿色（空闲）/ 橙色脉冲动画（更新中）
- **间隔文本**：「每 X 分钟」
- **倒计时**：`MM:SS`，实时递减
- **上次结果摘要**：各榜单条数与耗时

前端每 15 秒轮询状态接口，倒计时每秒本地更新。

## 运维要点

- **更新耗时**：单次全量更新约 60–120 秒（取决于外部 API 响应速度），若间隔设置过短可能出现跳过。
- **日志前缀**：`[定时更新]`，可在日志中快速检索。
- **错误处理**：单个榜单更新失败不影响另一个；失败信息记录在 `scheduler.lastResult` 和日志中。
- **重启行为**：服务重启后调度器自动重新初始化，3 秒后触发首次更新。

## 相关文件

- 调度器实现：`src/server.js`（scheduler 对象 + runScheduledUpdate + startScheduler）
- Pump 更新逻辑：`scripts/fetch-pump-ranking.js`
- zhilabs 更新逻辑：`scripts/fetch-zhilabs-ranking.js`
- 环境变量示例：`.env.example`
