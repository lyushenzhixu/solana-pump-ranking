/**
 * 入口：启动 Express app + 调度器
 * Railway 部署时通过 PORT 启动
 */
import './load-env.js';
import app from './app.js';
import { startScheduler } from './scheduler.js';
import { setupProcessHandlers } from './middleware/error-handler.js';
import { okxOnchain } from './data-sources/index.js';

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log('Server running on', HOST + ':' + PORT);

  const okxKey = !!process.env.OKX_API_KEY;
  const okxSecret = !!process.env.OKX_SECRET_KEY;
  const okxPass = !!process.env.OKX_PASSPHRASE;
  if (okxKey && okxSecret && okxPass) {
    console.log('[OKX] ✅ API 已配置（isConfigured=' + okxOnchain.isConfigured() + '）');
  } else {
    const missing = [];
    if (!okxKey) missing.push('OKX_API_KEY');
    if (!okxSecret) missing.push('OKX_SECRET_KEY');
    if (!okxPass) missing.push('OKX_PASSPHRASE');
    console.warn('[OKX] ⚠️  缺少环境变量: ' + missing.join(', ') + '（代币 Top10 持仓补充不可用）');
  }

  startScheduler();
});

// 优雅关闭
setupProcessHandlers(server);
