import express from 'express';
import { modelsRouter } from './routes/models.js';
import { apisRouter } from './routes/apis.js';
import { mockHandler } from './routes/mock.js';
import { ApiError } from './errors.js';

export function createApp(store) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // 简版 CORS：管理接口与 Mock 端点都允许跨域，方便前端直连
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/models', modelsRouter(store));
  app.use('/api/apis', apisRouter(store));

  // Mock 端点统一挂在 /mock 前缀下，与管理接口隔离
  app.use('/mock', mockHandler(store));

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '资源不存在' } });
  });

  // 统一错误出口：结构化错误响应
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: { code: 'BAD_JSON', message: '请求体不是合法的 JSON' },
      });
    }
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: '服务器内部错误' } });
  });

  return app;
}
