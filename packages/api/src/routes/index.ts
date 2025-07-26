import { Router } from 'express';
import gameRoutes from './game';
import storyRoutes from './story';

const router = Router();

// 游戏相关路由
router.use('/game', gameRoutes);

// 故事相关路由
router.use('/stories', storyRoutes);

// API信息端点
router.get('/', (req, res) => {
  res.json({
    message: '故事编织者API v1.0.0',
    endpoints: {
      game: {
        new: 'POST /api/game/new',
        get: 'GET /api/game/:gameId',
        choice: 'POST /api/game/:gameId/choice'
      },
      stories: {
        list: 'GET /api/stories',
        get: 'GET /api/stories/:storyId'
      }
    },
    websocket: {
      url: process.env.VITE_WS_URL || 'ws://localhost:3001',
      events: [
        'join-game',
        'leave-game',
        'narrative-update',
        'choice-required'
      ]
    }
  });
});

export default router;
