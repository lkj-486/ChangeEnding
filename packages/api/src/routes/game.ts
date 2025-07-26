import { Router } from 'express';
import { GameController } from '../controllers/GameController';

const router = Router();
const gameController = new GameController();

// 创建新游戏
router.post('/new', async (req, res, next) => {
  try {
    await gameController.createNewGame(req, res);
  } catch (error) {
    next(error);
  }
});

// 获取游戏状态
router.get('/:gameId', async (req, res, next) => {
  try {
    await gameController.getGameState(req, res);
  } catch (error) {
    next(error);
  }
});

// 提交玩家选择
router.post('/:gameId/choice', async (req, res, next) => {
  try {
    await gameController.makeChoice(req, res);
  } catch (error) {
    next(error);
  }
});

// 暂停游戏
router.post('/:gameId/pause', async (req, res, next) => {
  try {
    await gameController.pauseGame(req, res);
  } catch (error) {
    next(error);
  }
});

// 恢复游戏
router.post('/:gameId/resume', async (req, res, next) => {
  try {
    await gameController.resumeGame(req, res);
  } catch (error) {
    next(error);
  }
});

// 结束游戏
router.post('/:gameId/end', async (req, res, next) => {
  try {
    await gameController.endGame(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
