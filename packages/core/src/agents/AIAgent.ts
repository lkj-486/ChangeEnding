import { eventBus } from '../events/EventBus';
import { LLMService } from '../services/LLMService';
import { Character, GameAction, Scene, ActionHistoryEntry, GoalComponent, PersonalityComponent } from '../types';
import { NarrativeLedger } from '../interfaces/AgentCoreInterface';

// 🎯 配置常量
const ACTION_HISTORY_WINDOW = 5; // 动作历史窗口大小

/**
 * AI代理配置
 */
export interface AIAgentConfig {
  id: string;
  character: Character;
  llmService: LLMService;
  actionInterval?: number; // 动作间隔时间（毫秒）
  maxActionsPerScene?: number; // 每个场景最大动作数
  getSceneState?: () => string; // 获取场景状态的回调函数
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

  // 🎯 导演中心化架构：移除自主循环，改为被动响应
  // 移除: private actionTimer: NodeJS.Timeout | null = null;
  // 移除: private isCoolingDown: boolean = false;

  // 🚀 增强的动作历史和目标系统
  private lastActionType: string | null = null;
  private lastActionTime: number = 0;
  private actionHistory: ActionHistoryEntry[] = [];

  // 🎯 目标导向决策系统
  private currentGoal: string = 'ROUTINE_PATROL';
  private goalComponent: GoalComponent | null = null;
  private personalityComponent: PersonalityComponent | null = null;
  private narrativeLedger: NarrativeLedger | null = null;

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
    // 🚀 导演中心化架构：监听Director的增强行动请求（包含叙事账本）
    eventBus.on('REQUEST_AI_ACTION', ({ agentId, timestamp, context, narrativeLedger }) => {
      // 只响应针对当前代理的请求
      if (agentId === this.config.id) {
        console.log(`🎯 [AIAgent] ${this.config.id} 收到增强行动请求`, {
          timestamp: new Date(timestamp).toISOString(),
          context,
          hasNarrativeLedger: !!narrativeLedger
        });
        this.handleActionRequest(context, narrativeLedger);
      }
    });

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

    // 🎯 导演中心化架构：不再自主启动动作规划，等待Director调度
    if (this.isActive) {
      console.log(`🚀 AI代理 ${this.config.id} 已激活，等待Director调度`);
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
   * 🚀 导演中心化架构：处理Director的增强行动请求（包含叙事账本）
   */
  private async handleActionRequest(context: any, narrativeLedger?: NarrativeLedger): Promise<void> {
    // 检查代理是否处于活跃状态且有当前场景
    if (!this.isActive || !this.currentScene) {
      console.log(`⚠️ [AIAgent] ${this.config.id} 无法响应行动请求`, {
        isActive: this.isActive,
        hasCurrentScene: !!this.currentScene
      });
      return;
    }

    // 检查是否达到最大动作数限制
    if (this.actionCount >= this.config.maxActionsPerScene!) {
      console.log(`⚠️ [AIAgent] ${this.config.id} 已达到最大动作数限制`, {
        actionCount: this.actionCount,
        maxActions: this.config.maxActionsPerScene
      });
      return;
    }

    console.log(`🎯 [AIAgent] ${this.config.id} 开始智能决策响应`, {
      actionCount: this.actionCount,
      maxActions: this.config.maxActionsPerScene,
      sceneId: this.currentScene.id,
      hasNarrativeLedger: !!narrativeLedger
    });

    // 🚀 步骤1：更新叙事上下文
    if (narrativeLedger) {
      this.narrativeLedger = narrativeLedger;
      this.updateCharacterComponents(narrativeLedger);
      console.log(`📊 [AIAgent] ${this.config.id} 叙事上下文已更新`, {
        currentGoal: this.currentGoal,
        recentEventsCount: narrativeLedger.recentEvents.length
      });
    }

    // 🚀 步骤2：基于上下文的智能决策
    await this.planNextAction();
  }

  /**
   * 🚀 更新角色组件（从叙事账本中提取目标和性格信息）
   */
  private updateCharacterComponents(narrativeLedger: NarrativeLedger): void {
    const agentId = this.config.id;

    // 更新目标组件
    if (narrativeLedger.characterGoals?.[agentId]) {
      this.goalComponent = narrativeLedger.characterGoals[agentId];
      this.currentGoal = this.goalComponent.currentGoal;
    }

    // 更新性格组件
    if (narrativeLedger.characterPersonalities?.[agentId]) {
      this.personalityComponent = narrativeLedger.characterPersonalities[agentId];
    }

    console.log(`🎭 [AIAgent] ${agentId} 角色组件已更新`, {
      currentGoal: this.currentGoal,
      emotionalState: this.personalityComponent?.emotionalState,
      stressLevel: this.personalityComponent?.stressLevel
    });
  }

  /**
   * 🚀 规划下一个动作（智能决策版本）
   */
  private async planNextAction(): Promise<void> {
    console.log(`🧠 [AIAgent] ${this.config.id} 开始智能决策规划`, {
      isActive: this.isActive,
      hasCurrentScene: !!this.currentScene,
      actionCount: this.actionCount,
      maxActions: this.config.maxActionsPerScene,
      currentGoal: this.currentGoal
    });

    if (!this.isActive || !this.currentScene) {
      console.log(`⚠️ [AIAgent] ${this.config.id} 无法规划动作：未激活或无场景`);
      return;
    }

    // 🚀 关键修复点：添加场景状态检查
    if (this.config.getSceneState) {
      const currentSceneState = this.config.getSceneState();

      if (currentSceneState === 'PAUSED') {
        console.log(`⏸️ AI代理 ${this.config.id} 检测到场景已暂停，跳过动作规划`);
        // 场景暂停时，只进行状态检查，不执行动作生成
        return;
      }
    }

    // 🎯 导演中心化架构：冷却由Director管理，此处不再检查

    // 🕒 检查动作间隔（防止过于频繁的动作）
    const now = Date.now();
    if (now - this.lastActionTime < 10000) { // 10秒最小间隔
      console.log(`⏰ AI代理 ${this.config.id} 动作间隔过短，等待冷却`);
      return;
    }

    // 检查是否达到最大动作数
    if (this.actionCount >= this.config.maxActionsPerScene!) {
      console.log(`🛑 AI代理 ${this.config.id} 已达到最大动作数，停止规划`);
      // 🎯 导演中心化架构：不需要停止规划，Director会控制调度
      this.isActive = false;
      return;
    }

    try {
      console.log(`🧠 [AIAgent] ${this.config.id} 开始智能决策...`);

      // 🚀 步骤1：基于叙事上下文确定当前目标
      this.determineCurrentGoal();

      // 🚀 步骤2：检查动作多样性
      if (!this.checkActionDiversity()) {
        console.log(`🔄 [AIAgent] ${this.config.id} 动作多样性检查失败，跳过此轮`);
        return;
      }

      // 🚀 步骤3：基于目标生成动作
      let action: GameAction | null = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        // 🚀 基于目标生成动作
        action = await this.generateActionForGoal(this.currentGoal);

        if (!action) {
          console.log(`⚠️ [AIAgent] ${this.config.id} 目标导向动作生成失败，尝试 ${attempts + 1}/${maxAttempts}`);
          attempts++;
          continue;
        }

        // 🔄 最终检查动作多样性
        if (this.shouldAvoidAction(action.type)) {
          console.log(`🔄 [AIAgent] ${this.config.id} 避免重复动作: ${action.type}，重新生成 (${attempts + 1}/${maxAttempts})`);
          attempts++;
          continue;
        }

        // 找到了合适的动作
        break;
      }

      if (action && attempts < maxAttempts) {
        this.actionCount++;

        console.log(`✅ AI代理 ${this.config.id} 生成动作成功`, {
          actionType: action.type,
          actionTarget: action.target,
          actionCount: this.actionCount
        });

        // 🚀 事件驱动架构：发布动作提议事件（包含timestamp）
        eventBus.emit('AI_ACTION_PROPOSED', {
          agentId: this.config.id,
          action,
          timestamp: Date.now()
        });

        console.log(`📢 [AIAgent] 事件驱动：发布AI_ACTION_PROPOSED事件`, {
          agentId: this.config.id,
          actionType: action.type,
          timestamp: new Date().toISOString()
        });

        // 🎯 导演中心化架构：冷却由Director管理，此处不再启动冷却
        // 只记录动作历史用于避免重复
        this.recordActionHistory(action.type);
      } else {
        // 🚫 所有尝试都失败了
        console.log(`🚫 AI代理 ${this.config.id} 无法生成有效动作，已尝试 ${maxAttempts} 次`);
        if (action) {
          console.log(`最后一次生成的动作类型: ${action.type}，但被重复检测拒绝`);
        } else {
          console.log(`❌ AI代理 ${this.config.id} 动作生成失败：返回null`);
        }
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

    // 🔧 添加动作历史信息以避免重复
    const recentActions = this.actionHistory.slice(-3);
    const actionHistoryText = recentActions.length > 0
      ? `\n最近的动作历史：${recentActions.map(a => a.type).join(', ')}\n请避免重复这些动作类型。`
      : '';

    // 🔧 提供更多动作类型选项
    const actionTypes = [
      'MOVE', 'ATTACK', 'TALK', 'SNEAK_PAST', 'EXPLORE', 'LOOK_AROUND',
      'INTERACT', 'WAIT', 'HIDE', 'DISTRACT', 'SEARCH', 'LISTEN'
    ];

    return `你是角色"${character.name}"，性格特点：${character.personality}

当前场景：${scene.title}
场景描述：${scene.description}
场景目标：${scene.goal}

你的角色目标：${character.goals.join(', ')}
${actionHistoryText}

可选动作类型：${actionTypes.join(', ')}

请根据以上信息，规划一个具体的动作来推进剧情发展。动作应该：
1. 符合角色性格和目标
2. 有助于达成场景目标
3. 推动故事情节发展
4. 与最近的动作不同，增加多样性

请以JSON格式回复，包含以下字段：
{
  "type": "动作类型（从上述可选类型中选择）",
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

  // 🎯 导演中心化架构：移除stopActionPlanning方法
  // 不再需要自主停止规划，由Director统一控制

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

    // 🎯 导演中心化架构：不再自主启动动作规划，等待Director调度
    if (this.currentScene) {
      console.log(`🎬 AI代理 ${this.config.id} 有当前场景，等待Director调度`);
    } else {
      console.log(`⚠️ AI代理 ${this.config.id} 没有当前场景，等待场景加载`);
    }
  }

  /**
   * 停用代理
   */
  deactivate(): void {
    // 🎯 导演中心化架构：只需要设置状态，不需要停止定时器
    this.isActive = false;
    console.log(`🛑 AI代理 ${this.config.id} 已停用`);
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
   * 🎯 导演中心化架构：记录动作历史（用于避免重复）
   */
  private recordActionHistory(actionType: string): void {
    this.lastActionType = actionType;
    this.lastActionTime = Date.now();

    // 记录动作历史
    this.actionHistory.push({
      type: actionType,
      timestamp: this.lastActionTime
    });

    // 保持历史记录在合理范围内
    if (this.actionHistory.length > 10) {
      this.actionHistory.shift();
    }

    console.log(`📝 AI代理 ${this.config.id} 记录动作历史: ${actionType}`);
  }

  /**
   * 🔄 检查是否应该避免某个动作（防止重复）
   */
  private shouldAvoidAction(actionType: string): boolean {
    // 检查最近3个动作中是否有相同类型
    const recentActions = this.actionHistory.slice(-3);
    const sameTypeCount = recentActions.filter(action => action.type === actionType).length;

    if (sameTypeCount >= 2) {
      console.log(`🔄 AI代理 ${this.config.id} 避免重复动作: ${actionType}`);
      return true;
    }

    return false;
  }

  /**
   * 🚀 基于叙事上下文确定当前目标
   */
  private determineCurrentGoal(): void {
    if (!this.narrativeLedger) {
      console.log(`⚠️ [AIAgent] ${this.config.id} 无叙事账本，使用默认目标`);
      return;
    }

    const recentEvents = this.narrativeLedger.recentEvents.slice(0, 3);
    const characterState = this.narrativeLedger.characterRelationships[this.config.id];
    let newGoal = this.currentGoal;

    // 🎯 目标优先级系统：威胁应对 → 异响调查 → 常规巡逻
    if (this.hasRecentEvent(recentEvents, 'suspicious_noise')) {
      newGoal = 'INVESTIGATE_DISTURBANCE';
    } else if (this.hasRecentEvent(recentEvents, 'player_spotted')) {
      newGoal = 'CONFRONT_INTRUDER';
    } else if (characterState && characterState.trust < 30) {
      newGoal = 'HEIGHTENED_PATROL';
    } else {
      newGoal = 'ROUTINE_PATROL';
    }

    // 🚨 事件频率控制：仅当新目标与当前目标不同时才发布事件
    if (newGoal !== this.currentGoal) {
      const previousGoal = this.currentGoal;
      this.currentGoal = newGoal;

      console.log(`🎯 [AIAgent] ${this.config.id} 目标变更`, {
        from: previousGoal,
        to: newGoal,
        reason: this.getGoalChangeReason(recentEvents, characterState)
      });

      // 发布目标变更事件
      eventBus.emit('AI_GOAL_CHANGED', {
        agentId: this.config.id,
        previousGoal,
        newGoal,
        goalPriority: this.getGoalPriority(newGoal),
        timestamp: Date.now(),
        context: { recentEvents: recentEvents.length }
      });
    }
  }

  /**
   * 🚀 检查动作多样性（避免重复动作）
   */
  private checkActionDiversity(): boolean {
    // 检查最近的动作历史
    const recentActions = this.actionHistory.slice(0, ACTION_HISTORY_WINDOW);

    if (recentActions.length < 2) {
      return true; // 历史不足，允许执行
    }

    // 检查是否有过多的相同类型动作
    const actionTypeCounts: Record<string, number> = {};
    recentActions.forEach(entry => {
      actionTypeCounts[entry.actionType] = (actionTypeCounts[entry.actionType] || 0) + 1;
    });

    // 如果任何动作类型超过2次，拒绝执行
    for (const [actionType, count] of Object.entries(actionTypeCounts)) {
      if (count >= 2) {
        console.log(`🔄 [AIAgent] ${this.config.id} 动作多样性检查失败`, {
          actionType,
          count,
          recentActionsCount: recentActions.length
        });
        return false;
      }
    }

    return true;
  }

  /**
   * 🚀 基于目标生成具体动作
   */
  private async generateActionForGoal(goal: string): Promise<GameAction | null> {
    console.log(`🎯 [AIAgent] ${this.config.id} 基于目标生成动作`, { goal });

    let baseAction: GameAction;

    switch (goal) {
      case 'INVESTIGATE_DISTURBANCE':
        baseAction = {
          type: 'INVESTIGATE',
          target: '可疑区域',
          description: '仔细调查异常声响的来源'
        };
        break;

      case 'CONFRONT_INTRUDER':
        baseAction = {
          type: 'MOVE',
          target: '入侵者位置',
          description: '迅速移动到入侵者位置进行对峙'
        };
        break;

      case 'HEIGHTENED_PATROL':
        baseAction = {
          type: 'MOVE',
          target: '关键区域',
          description: '加强对重要区域的巡逻'
        };
        break;

      case 'ROUTINE_PATROL':
      default:
        baseAction = {
          type: 'MOVE',
          target: '牢房区域',
          description: '进行常规的巡逻检查'
        };
        break;
    }

    // 🎭 应用性格修正
    const modifiedAction = this.applyPersonalityModifiers(baseAction);

    // 记录到动作历史
    this.addToActionHistory(modifiedAction);

    return modifiedAction;
  }

  /**
   * 🎭 应用性格修正到动作
   */
  private applyPersonalityModifiers(action: GameAction): GameAction {
    if (!this.personalityComponent) {
      return action;
    }

    const modifier = this.personalityComponent.actionModifiers[action.type] || 1.0;

    // 根据修正值调整动作描述
    if (modifier > 1.2) {
      action.description = `谨慎地${action.description}`;
    } else if (modifier < 0.8) {
      action.description = `迅速${action.description}`;
    }

    return action;
  }

  /**
   * 🚀 辅助方法：检查最近事件
   */
  private hasRecentEvent(events: any[], eventType: string): boolean {
    return events.some(event => event.type === eventType || event.summary?.includes(eventType));
  }

  /**
   * 🚀 辅助方法：获取目标变更原因
   */
  private getGoalChangeReason(events: any[], characterState: any): string {
    if (this.hasRecentEvent(events, 'suspicious_noise')) return '检测到可疑声响';
    if (this.hasRecentEvent(events, 'player_spotted')) return '发现入侵者';
    if (characterState && characterState.trust < 30) return '信任度过低';
    return '常规巡逻';
  }

  /**
   * 🚀 辅助方法：获取目标优先级
   */
  private getGoalPriority(goal: string): number {
    const priorities: Record<string, number> = {
      'CONFRONT_INTRUDER': 10,
      'INVESTIGATE_DISTURBANCE': 8,
      'HEIGHTENED_PATROL': 5,
      'ROUTINE_PATROL': 1
    };
    return priorities[goal] || 1;
  }

  /**
   * 🚀 添加到动作历史
   */
  private addToActionHistory(action: GameAction): void {
    const entry: ActionHistoryEntry = {
      actionType: action.type,
      timestamp: Date.now(),
      target: action.target,
      success: true,
      context: { goal: this.currentGoal }
    };

    this.actionHistory.unshift(entry);

    // 保持窗口大小
    if (this.actionHistory.length > ACTION_HISTORY_WINDOW) {
      this.actionHistory = this.actionHistory.slice(0, ACTION_HISTORY_WINDOW);
    }

    console.log(`📝 [AIAgent] ${this.config.id} 动作历史已更新`, {
      actionType: action.type,
      historyLength: this.actionHistory.length
    });
  }

  /**
   * 重置代理状态
   */
  reset(): void {
    // 🎯 导演中心化架构：只需要重置状态，不需要停止定时器
    this.currentScene = null;
    this.sceneGoal = '';
    this.actionCount = 0;
    this.isActive = false;
    this.lastActionType = null;
    this.lastActionTime = 0;
    this.actionHistory = [];

    // 🚀 重置智能决策状态
    this.currentGoal = 'ROUTINE_PATROL';
    this.goalComponent = null;
    this.personalityComponent = null;
    this.narrativeLedger = null;

    console.log(`🔄 [AIAgent] ${this.config.id} 智能决策状态已重置`);
  }
}
