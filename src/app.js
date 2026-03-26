/**
 * Express app 定义、中间件、路由挂载
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import pagesRouter from './routes/pages.js';
import { errorHandler } from './middleware/error-handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ── 中间件 ──

// CORS（内联，不加包）
app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// JSON body parser
app.use(express.json());

// 静态文件服务（favicon, 等 public 目录下的文件）
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
}));

// ── 路由 ──
app.use('/api', apiRouter);
app.use('/', pagesRouter);

// ── 全局错误处理 ──
app.use(errorHandler);

export default app;
