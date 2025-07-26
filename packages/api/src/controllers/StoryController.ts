import { Request, Response } from 'express';
import { z } from 'zod';
import { SceneLoader } from '@storyweaver/core';

// 请求验证模式
const CreateStorySchema = z.object({
  id: z.string().min(1, '故事ID不能为空'),
  title: z.string().min(1, '故事标题不能为空'),
  description: z.string().min(1, '故事描述不能为空'),
  author: z.string().optional(),
  version: z.string().default('1.0.0'),
  metadata: z.record(z.any()).optional(),
});

const UpdateStorySchema = CreateStorySchema.partial();

/**
 * 故事控制器
 * 处理故事相关的HTTP请求
 */
export class StoryController {
  private sceneLoader: SceneLoader;

  constructor() {
    this.sceneLoader = new SceneLoader({
      scenesPath: '../../packages/core/data/scenes',
      charactersPath: '../../packages/core/data/characters',
    });
  }

  /**
   * 获取所有故事列表
   */
  async getAllStories(req: Request, res: Response): Promise<void> {
    try {
      // 获取可用的场景列表
      const availableScenes = await this.sceneLoader.getAvailableScenes();
      
      // 加载每个场景的基本信息
      const stories = await Promise.all(
        availableScenes.map(async (sceneId) => {
          try {
            const scene = await this.sceneLoader.loadScene(sceneId);
            return {
              id: scene.id,
              title: scene.title,
              description: scene.description,
              characters: scene.characters,
              choicePointsCount: scene.choicePoints.length,
              isActive: true,
            };
          } catch (error) {
            console.warn(`加载场景 ${sceneId} 失败:`, error);
            return null;
          }
        })
      );

      // 过滤掉加载失败的场景
      const validStories = stories.filter(story => story !== null);

      res.json({
        success: true,
        data: {
          stories: validStories,
          total: validStories.length,
        },
        message: '获取故事列表成功',
      });

    } catch (error) {
      console.error('获取故事列表失败:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '获取故事列表时发生错误',
      });
    }
  }

  /**
   * 获取特定故事详情
   */
  async getStoryById(req: Request, res: Response): Promise<void> {
    try {
      const { storyId } = req.params;

      // 加载场景和角色
      const { scene, characters } = await this.sceneLoader.loadSceneWithCharacters(storyId);

      // 转换角色Map为对象
      const charactersObj = Object.fromEntries(characters);

      res.json({
        success: true,
        data: {
          scene,
          characters: charactersObj,
        },
        message: '获取故事详情成功',
      });

    } catch (error) {
      console.error(`获取故事 ${req.params.storyId} 详情失败:`, error);
      
      if (error instanceof Error && error.message.includes('无法加载')) {
        res.status(404).json({
          success: false,
          error: 'NotFoundError',
          message: '故事不存在',
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'InternalServerError',
          message: '获取故事详情时发生错误',
        });
      }
    }
  }

  /**
   * 创建新故事
   */
  async createStory(req: Request, res: Response): Promise<void> {
    try {
      const storyData = CreateStorySchema.parse(req.body);

      // 检查故事是否已存在
      const availableScenes = await this.sceneLoader.getAvailableScenes();
      if (availableScenes.includes(storyData.id)) {
        res.status(409).json({
          success: false,
          error: 'ConflictError',
          message: '故事ID已存在',
        });
        return;
      }

      // 创建基本的场景结构
      const scene = {
        id: storyData.id,
        title: storyData.title,
        description: storyData.description,
        goal: '完成故事目标', // 默认目标
        characters: [], // 空角色列表
        choicePoints: [], // 空选择点列表
        initialState: {}, // 空初始状态
      };

      // 保存场景
      await this.sceneLoader.saveScene(scene);

      res.status(201).json({
        success: true,
        data: {
          id: storyData.id,
          title: storyData.title,
          description: storyData.description,
        },
        message: '故事创建成功',
      });

    } catch (error) {
      console.error('创建故事失败:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: '请求数据验证失败',
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'InternalServerError',
          message: '创建故事时发生错误',
        });
      }
    }
  }

  /**
   * 更新故事
   */
  async updateStory(req: Request, res: Response): Promise<void> {
    try {
      const { storyId } = req.params;
      const updateData = UpdateStorySchema.parse(req.body);

      // 检查故事是否存在
      let existingScene;
      try {
        existingScene = await this.sceneLoader.loadScene(storyId);
      } catch (error) {
        res.status(404).json({
          success: false,
          error: 'NotFoundError',
          message: '故事不存在',
        });
        return;
      }

      // 更新场景数据
      const updatedScene = {
        ...existingScene,
        ...updateData,
      };

      // 保存更新后的场景
      await this.sceneLoader.saveScene(updatedScene);

      res.json({
        success: true,
        data: {
          id: updatedScene.id,
          title: updatedScene.title,
          description: updatedScene.description,
        },
        message: '故事更新成功',
      });

    } catch (error) {
      console.error(`更新故事 ${req.params.storyId} 失败:`, error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: '请求数据验证失败',
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'InternalServerError',
          message: '更新故事时发生错误',
        });
      }
    }
  }

  /**
   * 删除故事
   */
  async deleteStory(req: Request, res: Response): Promise<void> {
    try {
      const { storyId } = req.params;

      // 检查故事是否存在
      try {
        await this.sceneLoader.loadScene(storyId);
      } catch (error) {
        res.status(404).json({
          success: false,
          error: 'NotFoundError',
          message: '故事不存在',
        });
        return;
      }

      // 注意：这里只是示例，实际实现中需要真正的文件删除逻辑
      // 由于SceneLoader没有提供删除方法，这里只返回成功响应
      
      res.json({
        success: true,
        message: '故事删除成功',
      });

    } catch (error) {
      console.error(`删除故事 ${req.params.storyId} 失败:`, error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '删除故事时发生错误',
      });
    }
  }

  /**
   * 获取故事统计信息
   */
  async getStoryStats(req: Request, res: Response): Promise<void> {
    try {
      const availableScenes = await this.sceneLoader.getAvailableScenes();
      const availableCharacters = await this.sceneLoader.getAvailableCharacters();
      const cacheStats = this.sceneLoader.getCacheStats();

      res.json({
        success: true,
        data: {
          totalStories: availableScenes.length,
          totalCharacters: availableCharacters.length,
          cache: cacheStats,
        },
        message: '获取统计信息成功',
      });

    } catch (error) {
      console.error('获取故事统计信息失败:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '获取统计信息时发生错误',
      });
    }
  }
}
