import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  Director,
  WorldState,
  LLMService,
  AIAgent,
  NarrativeAgent,
  PlayerInterventionHandler,
  SceneLoader,
  eventBus,
  configManager
} from '@storyweaver/core';
import { printMockModeInfo } from '../config/mockConfig';

/**
 * 序列化对象，过滤循环引用和不必要的属性
 * 优化版本：提升深度限制，添加性能监控，优化循环引用检测
 */
function serializeForSocket(obj: any, maxDepth = 5): any {
  const startTime = Date.now();
  const seen = new WeakSet();

  // 扩展过滤属性列表，提升性能
  const filteredKeys = new Set([
    'world', 'engine', 'entity', 'emitter', '_events', 'constructor',
    'prototype', '__proto__', 'domain', '_eventsCount', '_maxListeners',
    'socket', 'req', 'res', 'connection', 'server', 'parent'
  ]);

  function serialize(value: any, depth = 0): any {
    if (depth > maxDepth) {
      return '[Max Depth Reached]';
    }

    // 快速类型检查
    if (value === null || value === undefined) {
      return value;
    }

    const valueType = typeof value;
    if (valueType !== 'object') {
      return value;
    }

    // 检查循环引用
    if (seen.has(value)) {
      return '[Circular Reference]';
    }

    seen.add(value);

    try {
      if (Array.isArray(value)) {
        return value.map(item => serialize(item, depth + 1));
      }

      // 处理特殊对象类型
      if (value instanceof Date) {
        return value.toISOString();
      }

      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }

      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        // 使用Set进行快速过滤
        if (filteredKeys.has(key)) {
          continue;
        }

        result[key] = serialize(val, depth + 1);
      }

      return result;
    } finally {
      seen.delete(value);
    }
  }

  const result = serialize(obj);
  const duration = Date.now() - startTime;

  // 性能监控：如果序列化时间超过50ms，记录警告
  if (duration > 50) {
    console.warn(`序列化性能警告: 耗时 ${duration}ms，超过50ms阈值`);
  }

  return result;
}

// 请求验证模式
const CreateGameSchema = z.object({
  storyId: z.string().min(1, '故事ID不能为空'),
  userId: z.string().optional(),
});

const MakeChoiceSchema = z.object({
  choicePointId: z.string().min(1, '选择点ID不能为空'),
  selectedOptionId: z.string().min(1, '选择选项ID不能为空'),
});

/**
 * 游戏控制器
 * 处理游戏相关的HTTP请求
 */
export class GameController {
  private gameInstances: Map<string, GameInstance> = new Map();
  private sceneLoader: SceneLoader;
  private llmService: LLMService;

  // 🚀 新增：存储每个游戏的最近叙事内容
  private static recentNarrativeStorage: Map<string, any[]> = new Map();

  constructor() {
    this.sceneLoader = new SceneLoader({
      scenesPath: '../../packages/core/data/scenes',
      charactersPath: '../../packages/core/data/characters',
    });

    // 初始化LLM服务
    const llmConfig = configManager.getLLMConfig();
    this.llmService = new LLMService({
      primaryAdapter: llmConfig.primaryAdapter,
      fallbackAdapters: llmConfig.fallbackAdapters,
    });

    // 根据配置注册适配器
    // 暂时只使用Mock模式进行调试
    console.log(`🎭 当前模式: ${configManager.isMockMode() ? 'Mock模式' : '生产模式'}`);

    // if (!configManager.isMockMode()) {
    //   // 生产模式：注册Google适配器
    //   const googleAdapter = new GoogleLLMAdapter({
    //     apiKey: llmConfig.google.apiKey,
    //     modelName: llmConfig.google.modelName,
    //     baseUrl: llmConfig.google.baseUrl,
    //   });
    //   this.llmService.registerAdapter('google', googleAdapter);
    // }

    // Mock适配器已在LLMService构造函数中自动注册

    // 打印Mock模式信息
    printMockModeInfo();
  }

  /**
   * 创建新游戏
   */
  async createNewGame(req: Request, res: Response): Promise<void> {
    try {
      const { storyId, userId } = CreateGameSchema.parse(req.body);
      
      // 生成游戏ID
      const gameId = uuidv4();

      // 加载场景和角色
      const { scene, characters } = await this.sceneLoader.loadSceneWithCharacters(storyId);

      // 创建游戏实例
      const gameInstance = new GameInstance(gameId, scene, characters, this.llmService);
      
      // 设置WebSocket通信
      const io = req.app.get('io');
      gameInstance.setupWebSocket(io);

      // 存储游戏实例
      this.gameInstances.set(gameId, gameInstance);

      // 启动游戏
      await gameInstance.start();

      res.status(201).json({
        success: true,
        data: {
          gameId,
          storyId,
          scene: {
            id: scene.id,
            title: scene.title,
            description: scene.description,
          },
          status: 'created',
        },
        message: '游戏创建成功',
      });

    } catch (error) {
      console.error('创建游戏失败:', error);
      
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
          message: '创建游戏时发生错误',
        });
      }
    }
  }

  /**
   * 获取游戏状态
   */
  async getGameState(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      const gameInstance = this.gameInstances.get(gameId);
      if (!gameInstance) {
        res.status(404).json({
          success: false,
          error: 'NotFoundError',
          message: '游戏不存在',
        });
        return;
      }

      const gameState = gameInstance.getState();

      // 序列化游戏状态，过滤循环引用
      const serializedGameState = serializeForSocket(gameState);

      res.json({
        success: true,
        data: serializedGameState,
        message: '获取游戏状态成功',
      });

    } catch (error) {
      console.error('获取游戏状态失败:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '获取游戏状态时发生错误',
      });
    }
  }

  /**
   * 处理玩家选择
   */
  async makeChoice(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;
      const { choicePointId, selectedOptionId } = MakeChoiceSchema.parse(req.body);

      console.log(`收到玩家选择请求: gameId=${gameId}, choicePointId=${choicePointId}, selectedOptionId=${selectedOptionId}`);

      const gameInstance = this.gameInstances.get(gameId);
      if (!gameInstance) {
        res.status(404).json({
          success: false,
          error: 'NotFoundError',
          message: '游戏不存在',
        });
        return;
      }

      // 处理玩家选择并等待游戏状态更新完成
      const result = await gameInstance.makeChoice(choicePointId, selectedOptionId);

      if (result.success) {
        // 获取更新后的游戏状态
        const updatedGameState = gameInstance.getGameState();

        // 保存游戏状态到数据库
        await saveGameState(this, gameId, updatedGameState);

        console.log(`玩家选择处理成功: ${selectedOptionId}`);

        res.json({
          success: true,
          data: {
            message: result.message,
            gameState: updatedGameState,
          },
          message: '选择处理成功',
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'BadRequestError',
          message: result.message || '选择处理失败',
        });
      }

    } catch (error) {
      console.error('处理玩家选择失败:', error);

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
          message: '处理选择时发生错误',
        });
      }
    }
  }

  /**
   * 暂停游戏
   */
  async pauseGame(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      const gameInstance = this.gameInstances.get(gameId);
      if (!gameInstance) {
        res.status(404).json({
          success: false,
          error: 'NotFoundError',
          message: '游戏不存在',
        });
        return;
      }

      gameInstance.pause();

      res.json({
        success: true,
        message: '游戏已暂停',
      });

    } catch (error) {
      console.error('暂停游戏失败:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '暂停游戏时发生错误',
      });
    }
  }

  /**
   * 恢复游戏
   */
  async resumeGame(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      const gameInstance = this.gameInstances.get(gameId);
      if (!gameInstance) {
        res.status(404).json({
          success: false,
          error: 'NotFoundError',
          message: '游戏不存在',
        });
        return;
      }

      gameInstance.resume();

      res.json({
        success: true,
        message: '游戏已恢复',
      });

    } catch (error) {
      console.error('恢复游戏失败:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '恢复游戏时发生错误',
      });
    }
  }

  /**
   * 结束游戏
   */
  async endGame(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      const gameInstance = this.gameInstances.get(gameId);
      if (!gameInstance) {
        res.status(404).json({
          success: false,
          error: 'NotFoundError',
          message: '游戏不存在',
        });
        return;
      }

      gameInstance.end();
      this.gameInstances.delete(gameId);

      res.json({
        success: true,
        message: '游戏已结束',
      });

    } catch (error) {
      console.error('结束游戏失败:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '结束游戏时发生错误',
      });
    }
  }
}

/**
 * 游戏实例类
 * 管理单个游戏的完整生命周期
 */
class GameInstance {
  private gameId: string;
  private scene: any;
  private characters: Map<string, any>;
  private worldState: WorldState;
  private director: Director;
  private aiAgents: Map<string, AIAgent> = new Map();
  private narrativeAgent: NarrativeAgent;
  private playerHandler: PlayerInterventionHandler;
  private io: any;

  constructor(gameId: string, scene: any, characters: Map<string, any>, llmService: LLMService) {
    this.gameId = gameId;
    this.scene = scene;
    this.characters = characters;

    // 初始化核心组件
    this.worldState = new WorldState();
    // 🔧 创建StubAgentCore实例来修复Director构造函数
    const { StubAgentCore } = require('@storyweaver/core');
    const stubAgentCore = new StubAgentCore();
    this.director = new Director(this.worldState, stubAgentCore);
    this.narrativeAgent = new NarrativeAgent({ llmService });
    this.playerHandler = new PlayerInterventionHandler();

    // 创建AI代理
    this.createAIAgents(llmService);
  }

  private createAIAgents(llmService: LLMService): void {
    console.log(`🤖 开始创建AI代理`, {
      charactersCount: this.characters.size,
      characterIds: Array.from(this.characters.keys())
    });

    this.characters.forEach((character, characterId) => {
      console.log(`🎭 创建AI代理: ${characterId}`, {
        characterName: character.name,
        characterId
      });

      const aiAgent = new AIAgent({
        id: characterId,
        character,
        llmService,
        actionInterval: 5000, // 5秒间隔
        maxActionsPerScene: 10, // 最多10个动作
      });

      this.aiAgents.set(characterId, aiAgent);
      console.log(`✅ AI代理 ${characterId} 创建成功`);
    });

    console.log(`🎯 AI代理创建完成，总数: ${this.aiAgents.size}`);
  }

  setupWebSocket(io: any): void {
    this.io = io;

    // 设置玩家介入处理器的回调
    this.playerHandler.setOnChoiceRequired((choiceState) => {
      // 序列化选择状态，过滤循环引用
      const serializedChoiceState = serializeForSocket(choiceState);

      console.log(`发送选择点事件: ${choiceState.choicePointId}`);

      this.io.to(`game-${this.gameId}`).emit('choice-required', {
        gameId: this.gameId,
        choicePoint: serializedChoiceState,
      });
    });

    // 🚀 事件驱动架构：监听NARRATIVE_READY事件（仅包含干净的文学文本）
    (eventBus as any).on('NARRATIVE_READY', (payload: any) => {
      const { segment, timestamp } = payload;
      console.log('📡 [GameController] 收到NARRATIVE_READY事件', {
        type: segment.type,
        contentLength: segment.content.length,
        contentPreview: segment.content.substring(0, 50) + '...',
        timestamp: new Date(timestamp).toISOString()
      });

      // 构建叙事数据
      const narrativeData = {
        gameId: this.gameId,
        segment: {
          id: segment.metadata?.narrativeId || `narrative_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`, // 🔧 修复：确保包含id字段
          type: segment.type,
          content: segment.content, // 保证是干净的中文文学文本
          character: segment.character,
          timestamp: timestamp, // 🔧 修复：添加timestamp字段
          metadata: segment.metadata
        },
        timestamp: timestamp
      };

      // 🚀 存储叙事内容以供后续客户端获取
      GameControllerStatic.storeNarrativeForGame(this.gameId, narrativeData);

      // 直接发送干净的文学文本，无需任何过滤
      this.io.to(`game-${this.gameId}`).emit('narrative-update', narrativeData);

      console.log('✅ [GameController] 已发送干净的叙事内容到前端');
    });

    // 🔧 修复：移除重复的NARRATIVE_GENERATED事件监听器
    // 现在只使用NARRATIVE_READY事件，避免重复发送叙事内容
    // eventBus.on('NARRATIVE_GENERATED', ({ segment }) => {
    //   console.log('📡 [GameController] 收到旧版NARRATIVE_GENERATED事件（向后兼容）');
    //   // 已移除以避免重复发送
    // });

    // 监听选择后果应用事件
    eventBus.on('CONSEQUENCES_APPLIED', ({ sceneId, consequences }) => {
      if (this.scene.id === sceneId) {
        const updatedGameState = this.getGameState();
        const serializedState = serializeForSocket(updatedGameState);

        console.log(`发送游戏状态变化事件: CONSEQUENCES_APPLIED`);

        this.io.to(`game-${this.gameId}`).emit('game-state-changed', {
          gameId: this.gameId,
          state: serializedState,
          reason: 'CONSEQUENCES_APPLIED',
          timestamp: Date.now()
        });
      }
    });

    // 监听场景更新事件
    eventBus.on('SCENE_UPDATED', ({ sceneId, changes }) => {
      if (this.scene.id === sceneId) {
        const updatedGameState = this.getGameState();
        const serializedState = serializeForSocket(updatedGameState);

        console.log(`发送游戏状态变化事件: SCENE_UPDATED`);

        this.io.to(`game-${this.gameId}`).emit('game-state-changed', {
          gameId: this.gameId,
          state: serializedState,
          reason: 'SCENE_UPDATED',
          changes: serializeForSocket(changes),
          timestamp: Date.now()
        });
      }
    });
  }

  async start(): Promise<void> {
    console.log(`🎮 开始启动游戏 ${this.gameId}`);

    // 加载场景
    console.log(`🎬 加载场景: ${this.scene.title}`);
    await this.director.loadScene(this.scene);

    // 🔧 修复：主动触发初始叙事生成
    console.log('🚀 主动触发初始叙事生成');
    try {
      await this.director.processGameTurn('scene_entered');
      console.log('✅ 初始AI编排触发完成');
    } catch (error) {
      console.error('❌ 初始AI编排触发失败:', error);
    }

    // 等待叙事代理生成开场叙述
    console.log(`📝 等待叙事代理生成开场叙述...`);
    await this.waitForInitialNarrative();

    // 激活AI代理
    console.log(`🤖 激活AI代理`, {
      aiAgentsCount: this.aiAgents.size,
      aiAgentIds: Array.from(this.aiAgents.keys())
    });

    this.aiAgents.forEach((agent, agentId) => {
      console.log(`🚀 激活AI代理: ${agentId}`);
      agent.activate();
      console.log(`✅ AI代理 ${agentId} 已激活`);
    });

    // 等待AI代理开始工作
    console.log(`⏳ 等待AI代理开始工作...`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒

    console.log(`✅ 游戏 ${this.gameId} 启动完成`);
    console.log(`📊 当前叙事历史长度: ${this.narrativeAgent.getNarrativeHistory().length}`);
    console.log(`🎮 AI代理状态:`, Array.from(this.aiAgents.entries()).map(([id, agent]) => ({
      id,
      status: agent.getStatus()
    })));

    // 强制触发第一个AI动作（如果没有自动触发）
    console.log(`🎯 强制触发AI代理动作...`);
    this.triggerInitialAIAction();
  }

  /**
   * 等待初始叙事生成
   */
  private async waitForInitialNarrative(): Promise<void> {
    const maxWaitTime = 10000; // 最多等待10秒
    const checkInterval = 100; // 每100ms检查一次
    let waitedTime = 0;

    while (waitedTime < maxWaitTime) {
      const narrativeHistory = this.narrativeAgent.getNarrativeHistory();

      if (narrativeHistory.length > 0) {
        console.log(`✅ 叙事代理已生成 ${narrativeHistory.length} 个叙事片段`);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitedTime += checkInterval;
    }

    console.warn(`⚠️ 等待叙事生成超时，继续启动游戏`);
  }

  /**
   * 强制触发初始AI动作
   */
  private triggerInitialAIAction(): void {
    // 找到guard角色并强制其执行一个动作
    const guardAgent = this.aiAgents.get('guard');
    if (guardAgent) {
      console.log(`🎭 强制触发guard代理动作`);

      // 模拟一个MOVE动作来触发guard_encounter
      const mockAction = {
        type: 'MOVE',
        target: '牢房区域',
        parameters: {
          reasoning: '巡逻检查牢房',
          expected_outcome: '发现异常情况'
        }
      };

      console.log(`📢 发布强制动作事件`, mockAction);

      // 直接通过事件总线发布动作
      eventBus.emit('AI_ACTION_PROPOSED', {
        agentId: 'guard',
        action: mockAction,
        timestamp: Date.now()
      });
    } else {
      console.warn(`⚠️ 未找到guard代理`);
    }
  }

  async makeChoice(choicePointId: string, selectedOptionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // 验证选择点ID是否匹配
      const currentChoice = this.playerHandler.getCurrentChoice();
      if (!currentChoice || currentChoice.choicePointId !== choicePointId) {
        resolve({
          success: false,
          message: `选择点ID不匹配。当前选择点: ${currentChoice?.choicePointId || 'none'}, 请求选择点: ${choicePointId}`,
        });
        return;
      }

      // 设置选择完成回调，等待游戏状态更新
      const originalCallback = this.playerHandler.getOnChoiceCompleted();

      this.playerHandler.setOnChoiceCompleted((playerChoice) => {
        // 恢复原始回调
        if (originalCallback) {
          this.playerHandler.setOnChoiceCompleted(originalCallback);
        }

        console.log(`选择处理完成: ${playerChoice.selectedOptionId}`);

        // 🚨 关键修复：解锁Director的选择点状态
        this.director.unlockChoicePoint();
        console.log(`🔓 [GameInstance] 已解锁Director选择点状态`);

        // 发送choice-completed事件到前端
        if (this.io) {
          this.io.to(`game-${this.gameId}`).emit('choice-completed', {
            gameId: this.gameId,
            choicePointId: playerChoice.choicePointId,
            selectedOptionId: playerChoice.selectedOptionId,
            timestamp: Date.now()
          });
          console.log(`发送choice-completed事件: ${playerChoice.choicePointId}`);
        }

        // 等待一小段时间确保所有事件处理完成
        setTimeout(() => {
          resolve({
            success: true,
            message: '选择成功',
            playerChoice,
          });
        }, 100);
      });

      // 执行选择
      const success = this.playerHandler.makeChoice(selectedOptionId);

      if (!success) {
        // 恢复原始回调
        if (originalCallback) {
          this.playerHandler.setOnChoiceCompleted(originalCallback);
        }
        resolve({
          success: false,
          message: '选择失败',
        });
      }
    });
  }

  pause(): void {
    this.director.pauseScene();
    this.aiAgents.forEach(agent => agent.deactivate());
  }

  resume(): void {
    this.director.resumeScene();
    this.aiAgents.forEach(agent => agent.activate());
  }

  end(): void {
    this.director.endScene();
    this.aiAgents.forEach(agent => agent.deactivate());
  }

  getState(): any {
    return {
      gameId: this.gameId,
      scene: {
        id: this.scene.id,
        title: this.scene.title,
        state: this.director.getSceneState(),
      },
      narrative: this.narrativeAgent.getNarrativeHistory(),
      currentChoice: this.playerHandler.getCurrentChoice(),
      isWaitingForChoice: this.playerHandler.isWaitingForPlayerChoice(),
    };
  }

  /**
   * 获取游戏状态（别名方法）
   */
  getGameState(): any {
    return this.getState();
  }
}

// 🚀 新增：GameController的静态方法
export class GameControllerStatic {
  private static recentNarrativeStorage: Map<string, any[]> = new Map();

  // 获取游戏的最近叙事内容
  static getRecentNarrativeForGame(gameId: string): any[] {
    return GameControllerStatic.recentNarrativeStorage.get(gameId) || [];
  }

  // 存储游戏的叙事内容
  static storeNarrativeForGame(gameId: string, narrativeData: any): void {
    if (!GameControllerStatic.recentNarrativeStorage.has(gameId)) {
      GameControllerStatic.recentNarrativeStorage.set(gameId, []);
    }

    const narratives = GameControllerStatic.recentNarrativeStorage.get(gameId)!;
    narratives.push(narrativeData);

    // 只保留最近的10条叙事内容
    if (narratives.length > 10) {
      narratives.shift();
    }

    console.log(`📚 存储叙事内容 ${gameId}:`, {
      totalCount: narratives.length,
      latestContent: narrativeData.segment?.content?.substring(0, 50) + '...'
    });
  }
}

/**
 * 保存游戏状态到数据库
 * 注意：当前版本暂时禁用数据库保存，专注于WebSocket实时更新
 */
async function saveGameState(_gameController: GameController, gameId: string, _gameState: any): Promise<void> {
  try {
    // TODO: 实现数据库保存逻辑
    // 当前版本专注于WebSocket实时更新，数据库保存功能将在后续版本实现
    console.log(`游戏状态更新: ${gameId} (数据库保存已禁用)`);
  } catch (error) {
    console.error(`保存游戏状态失败: ${gameId}`, error);
    // 不抛出错误，避免影响游戏流程
  }
}
