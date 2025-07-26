import { eventBus } from '../events/EventBus';
import { LLMService } from '../services/LLMService';
import { Character, GameAction, Scene } from '../types';

/**
 * AI代理配置
 */
export interface AIAgentConfig {
  id: string;
  character: Character;
  llmService: LLMService;
  actionInterval?: number; // 动作间隔时间（毫秒）
  maxActionsPerScene?: number; // 每个场景最大动作数
}

/**
 * 通用AI角色代理
 * 接收导演指令，基于角色设定和场景目标规划动作
 */
export class AIAgent {
  private config: AIAgentConfig;
  private currentScene: Scene | null = null;
  private sceneGoal: string = '';
  private actionCount = 0;
  private isActive = false;
  private actionTimer: NodeJS.Timeout | null = null;

  constructor(config: AIAgentConfig) {
    this.config = {
      actionInterval: 5000, // 默认5秒间隔
      maxActionsPerScene: 10, // 默认每场景最多10个动作
      ...config,
    };

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听场景加载事件
    eventBus.on('SCENE_LOADED', ({ sceneId, scene }) => {
      this.handleSceneLoaded(scene);
    });

    // 监听场景更新事件
    eventBus.on('SCENE_UPDATED', ({ sceneId, changes }) => {
      this.handleSceneUpdated(changes);
    });

    // 监听动作执行结果
    eventBus.on('ACTION_EXECUTED', ({ action, result }) => {
      this.handleActionExecuted(action, result);
    });
  }

  /**
   * 处理场景加载
   */
  private handleSceneLoaded(scene: Scene): void {
    console.log(`🤖 AI代理 ${this.config.id} 收到场景加载事件`, {
      sceneId: scene.id,
      sceneTitle: scene.title,
      sceneCharacters: scene.characters,
      agentId: this.config.id
    });

    // 检查这个代理是否参与当前场景
    if (!scene.characters.includes(this.config.id)) {
      console.log(`⚠️ AI代理 ${this.config.id} 不参与场景 ${scene.id}，跳过激活`);
      return;
    }

    this.currentScene = scene;
    this.sceneGoal = scene.goal;
    this.actionCount = 0;
    // 注意：不在这里设置isActive，因为activate()方法会单独调用

    console.log(`✅ AI代理 ${this.config.id} 成功加入场景: ${scene.title}`);
    console.log(`🎯 场景目标: ${this.sceneGoal}`);
    console.log(`🔄 当前激活状态: ${this.isActive}`);

    // 如果已经激活，开始规划动作
    if (this.isActive) {
      console.log(`🚀 AI代理 ${this.config.id} 已激活，开始规划动作...`);
      this.startActionPlanning();
    } else {
      console.log(`⏳ AI代理 ${this.config.id} 未激活，等待激活信号`);
    }
  }

  /**
   * 处理场景更新
   */
  private handleSceneUpdated(changes: any): void {
    if (!this.isActive) return;

    // 根据场景变化调整策略
    this.analyzeSceneChanges(changes);
  }

  /**
   * 处理动作执行结果
   */
  private handleActionExecuted(action: GameAction, result: any): void {
    // 如果是自己的动作，分析结果
    if (this.isActive) {
      this.analyzeActionResult(action, result);
    }
  }

  /**
   * 开始动作规划
   */
  private startActionPlanning(): void {
    console.log(`⏰ AI代理 ${this.config.id} 开始动作规划`, {
      actionInterval: this.config.actionInterval,
      maxActionsPerScene: this.config.maxActionsPerScene,
      isActive: this.isActive
    });

    if (this.actionTimer) {
      clearInterval(this.actionTimer);
    }

    this.actionTimer = setInterval(() => {
      this.planNextAction();
    }, this.config.actionInterval);

    // 立即规划第一个动作
    console.log(`🎬 AI代理 ${this.config.id} 立即规划第一个动作`);
    this.planNextAction();
  }

  /**
   * 规划下一个动作
   */
  private async planNextAction(): Promise<void> {
    console.log(`🤔 AI代理 ${this.config.id} 开始规划动作`, {
      isActive: this.isActive,
      hasCurrentScene: !!this.currentScene,
      actionCount: this.actionCount,
      maxActions: this.config.maxActionsPerScene
    });

    if (!this.isActive || !this.currentScene) {
      console.log(`⚠️ AI代理 ${this.config.id} 无法规划动作：未激活或无场景`);
      return;
    }

    // 检查是否达到最大动作数
    if (this.actionCount >= this.config.maxActionsPerScene!) {
      console.log(`🛑 AI代理 ${this.config.id} 已达到最大动作数，停止规划`);
      this.stopActionPlanning();
      return;
    }

    try {
      console.log(`🧠 AI代理 ${this.config.id} 开始生成动作...`);
      const action = await this.generateAction();

      if (action) {
        this.actionCount++;

        console.log(`✅ AI代理 ${this.config.id} 生成动作成功`, {
          actionType: action.type,
          actionTarget: action.target,
          actionCount: this.actionCount
        });

        // 发布动作提议事件
        eventBus.emit('AI_ACTION_PROPOSED', {
          agentId: this.config.id,
          action,
        });

        console.log(`📢 AI代理 ${this.config.id} 发布动作提议事件: ${action.type}`);
      } else {
        console.log(`❌ AI代理 ${this.config.id} 动作生成失败：返回null`);
      }
    } catch (error) {
      console.error(`💥 AI代理 ${this.config.id} 动作规划失败:`, error);

      eventBus.emit('ERROR_OCCURRED', {
        error: error as Error,
        context: { agentId: this.config.id, action: 'planNextAction' },
      });
    }
  }

  /**
   * 生成动作
   */
  private async generateAction(): Promise<GameAction | null> {
    const prompt = this.buildActionPrompt();
    
    try {
      const response = await this.config.llmService.generateResponse({
        prompt,
        context: {
          character: this.config.character,
          scene: this.currentScene,
          actionCount: this.actionCount,
        },
        maxTokens: 200,
        temperature: 0.8,
      });

      return this.parseActionFromResponse(response.content);
    } catch (error) {
      console.error('LLM动作生成失败:', error);
      return null;
    }
  }

  /**
   * 构建动作提示词
   */
  private buildActionPrompt(): string {
    const character = this.config.character;
    const scene = this.currentScene!;

    return `你是角色"${character.name}"，性格特点：${character.personality}

当前场景：${scene.title}
场景描述：${scene.description}
场景目标：${scene.goal}

你的角色目标：${character.goals.join(', ')}

请根据以上信息，规划一个具体的动作来推进剧情发展。动作应该：
1. 符合角色性格和目标
2. 有助于达成场景目标
3. 推动故事情节发展

请以JSON格式回复，包含以下字段：
{
  "type": "动作类型（如MOVE, ATTACK, TALK, SNEAK_PAST等）",
  "target": "动作目标（可选）",
  "parameters": {
    "reasoning": "选择这个动作的原因",
    "expected_outcome": "期望的结果"
  }
}

只回复JSON，不要其他内容。`;
  }

  /**
   * 从LLM响应中解析动作
   */
  private parseActionFromResponse(response: string): GameAction | null {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('LLM响应中未找到JSON格式的动作');
        return null;
      }

      const actionData = JSON.parse(jsonMatch[0]);
      
      // 验证必要字段
      if (!actionData.type) {
        console.warn('动作缺少type字段');
        return null;
      }

      return {
        type: actionData.type,
        target: actionData.target,
        parameters: actionData.parameters || {},
      };
    } catch (error) {
      console.error('解析LLM动作响应失败:', error);
      return null;
    }
  }

  /**
   * 分析场景变化
   */
  private analyzeSceneChanges(changes: any): void {
    // 根据场景变化调整AI策略
    // 这里可以实现更复杂的适应性逻辑
    console.log(`AI代理 ${this.config.id} 分析场景变化:`, changes);
  }

  /**
   * 分析动作结果
   */
  private analyzeActionResult(action: GameAction, result: any): void {
    // 分析动作执行结果，用于后续决策
    console.log(`AI代理 ${this.config.id} 分析动作结果:`, { action, result });
  }

  /**
   * 停止动作规划
   */
  private stopActionPlanning(): void {
    if (this.actionTimer) {
      clearInterval(this.actionTimer);
      this.actionTimer = null;
    }
    this.isActive = false;
  }

  /**
   * 激活代理
   */
  activate(): void {
    console.log(`🚀 激活AI代理 ${this.config.id}`, {
      wasActive: this.isActive,
      hasCurrentScene: !!this.currentScene,
      sceneId: this.currentScene?.id
    });

    this.isActive = true;

    if (this.currentScene) {
      console.log(`🎬 AI代理 ${this.config.id} 有当前场景，开始动作规划`);
      this.startActionPlanning();
    } else {
      console.log(`⚠️ AI代理 ${this.config.id} 没有当前场景，等待场景加载`);
    }
  }

  /**
   * 停用代理
   */
  deactivate(): void {
    this.stopActionPlanning();
  }

  /**
   * 获取代理状态
   */
  getStatus(): {
    id: string;
    isActive: boolean;
    currentScene: string | null;
    actionCount: number;
    character: Character;
  } {
    return {
      id: this.config.id,
      isActive: this.isActive,
      currentScene: this.currentScene?.id || null,
      actionCount: this.actionCount,
      character: this.config.character,
    };
  }

  /**
   * 更新角色信息
   */
  updateCharacter(character: Partial<Character>): void {
    this.config.character = { ...this.config.character, ...character };
  }

  /**
   * 重置代理状态
   */
  reset(): void {
    this.stopActionPlanning();
    this.currentScene = null;
    this.sceneGoal = '';
    this.actionCount = 0;
    this.isActive = false;
  }
}
