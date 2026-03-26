/**
 * 全局 Express 错误处理中间件 + 进程级异常捕获
 */

/** Express 4-arg 错误中间件 */
export function errorHandler(err, _req, res, _next) {
  console.error('[未捕获错误]', err?.stack || err);
  if (res.headersSent) return;
  res.status(500).json({ error: err?.message || 'Internal Server Error' });
}

/** 进程级异常 / 优雅关闭 */
export function setupProcessHandlers(server) {
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
    process.exit(1);
  });

  function gracefulShutdown(signal) {
    console.log(`\n[${signal}] 正在优雅关闭...`);
    server.close(() => {
      console.log('[关闭] HTTP 服务已停止');
      process.exit(0);
    });
    // 10 秒超时强制退出
    setTimeout(() => {
      console.error('[关闭] 超时，强制退出');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
