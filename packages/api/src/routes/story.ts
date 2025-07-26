import { Router } from 'express';
import { StoryController } from '../controllers/StoryController';

const router = Router();
const storyController = new StoryController();

// 获取所有故事列表
router.get('/', async (req, res, next) => {
  try {
    await storyController.getAllStories(req, res);
  } catch (error) {
    next(error);
  }
});

// 获取特定故事详情
router.get('/:storyId', async (req, res, next) => {
  try {
    await storyController.getStoryById(req, res);
  } catch (error) {
    next(error);
  }
});

// 创建新故事（管理员功能）
router.post('/', async (req, res, next) => {
  try {
    await storyController.createStory(req, res);
  } catch (error) {
    next(error);
  }
});

// 更新故事（管理员功能）
router.put('/:storyId', async (req, res, next) => {
  try {
    await storyController.updateStory(req, res);
  } catch (error) {
    next(error);
  }
});

// 删除故事（管理员功能）
router.delete('/:storyId', async (req, res, next) => {
  try {
    await storyController.deleteStory(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
