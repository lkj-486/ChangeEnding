import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { configManager, errorHandler } from '@storyweaver/core';

const app = express();

// 打印配置信息
configManager.printConfig();

// 安全中间件
app.use(helmet());

// CORS配置
const serverConfig = configManager.getServerConfig();
app.use(cors({
  origin: serverConfig.corsOrigin,
  credentials: true
}));

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API路由
app.use('/api', routes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'storyweaver-api',
    version: '1.0.0'
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '欢迎使用故事编织者API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      stories: '/api/stories',
      game: '/api/game'
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `路径 ${req.originalUrl} 不存在`,
    timestamp: new Date().toISOString()
  });
});

// 全局错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 使用统一错误处理器
  const storyError = errorHandler.handle(err, {
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
  });

  // 返回错误响应
  const includeStack = configManager.isDevelopment();
  const errorResponse = errorHandler.createErrorResponse(storyError, includeStack);

  res.status(storyError.statusCode).json(errorResponse);
});

export default app;
