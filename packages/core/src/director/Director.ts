import { WorldState } from '../world/WorldState';
import { eventBus } from '../events/EventBus';
import { Scene, SceneState, GameAction, ChoicePoint } from '../types';
import {
  AgentCoreInterface,
  NarrativeLedger,
  DecisionRequest,
  ContentRequest,
  ContentType
} from '../interfaces/AgentCoreInterface';

/**
 * 导演模块 - 升级为编排器 (Orchestrator)
 *
 * 职责：
 * 1. 场景管理和游戏流程控制
 * 2. 维护叙事账本 (NarrativeLedger)
 * 3. 通过 AgentCore 接口协调 AI 决策和内容生成
 * 4. 保持与现有系统的向后兼容性
 */
export class Director {
  private worldState: WorldState;
  private currentScene: Scene | null = null;
  private sceneState: SceneState = SceneState.LOADING;
  private actionQueue: GameAction[] = [];
  private isProcessingAction = false;

  // 🔒 选择点状态锁机制
  private isWaitingForPlayerChoice: boolean = false;
  private currentChoicePointId: string | null = null;

  // 🔒 选择点去重机制：防止无限循环
  private triggeredChoicePoints: Set<string> = new Set();

  // 新增：AI 核心接口和叙事账本
  private agentCore: AgentCoreInterface;
  private narrativeLedger: NarrativeLedger;

  // 🎯 主时钟控制器 - 导演中心化架构
  private gameLoopTimer: ReturnType<typeof setInterval> | null = null;
  private isGameLoopRunning: boolean = false;
  private tickInterval: number = 2500; // 2.5秒间隔，可配置
  private cooldowns: Map<string, boolean> = new Map(); // AI代理冷却状态
  private cooldownDuration: number = 5000; // 5秒冷却期，可配置
  private availableAgents: string[] = []; // 可用的AI代理列表

  constructor(worldState: WorldState, agentCore: AgentCoreInterface) {
    this.worldState = worldState;
    this.agentCore = agentCore;
    this.narrativeLedger = this.initializeNarrativeLedger();
    this.setupEventListeners();

    // 🎯 初始化可用代理列表（这里可以从配置或AgentCore获取）
    this.availableAgents = ['hero', 'guard']; // 暂时硬编码，后续可从AgentCore获取

    console.log('🎭 Director 初始化完成，使用 AgentCore:', agentCore.getStatus?.() || 'Unknown');
    console.log('🎯 主时钟控制器已初始化，可用代理:', this.availableAgents);
  }

  /**
   * 初始化叙事账本
   */
  private initializeNarrativeLedger(): NarrativeLedger {
    return {
      playerCharacter: {
        morality_vector: { honesty: 0.5, violence: 0.0, compassion: 0.5 },
        methodology_preference: { stealth: 5, diplomacy: 5, force: 5 },
        personality_traits: []
      },
      characterRelationships: {
        guard: {
          affinity: 50,
          trust: 50,
          last_interaction_summary: '初次相遇'
        }
      },
      worldState: {
        current_scene_id: 'unknown',
        scene_flags: {},
        time_of_day: 'unknown',
        location: 'unknown'
      },
      recentEvents: [],
      // 🚀 新增：角色目标和性格初始化
      characterGoals: {
        guard: {
          currentGoal: 'ROUTINE_PATROL',
          goalPriority: 1,
          goalStartTime: Date.now(),
          goalContext: {},
          availableGoals: ['ROUTINE_PATROL', 'INVESTIGATE_DISTURBANCE', 'CONFRONT_INTRUDER', 'HEIGHTENED_PATROL']
        }
      },
      characterPersonalities: {
        guard: {
          traits: {
            cautious: 0.7,
            aggressive: 0.4,
            observant: 0.8,
            dutiful: 0.9
          },
          actionModifiers: {
            MOVE: 1.0,
            ATTACK: 0.6,
            HIDE: 0.3,
            TALK: 0.5,
            INVESTIGATE: 1.2
          },
          emotionalState: 'alert',
          stressLevel: 0.2
        }
      }
    };
  }

  /**
   * 设置事件监听器 - 事件驱动架构
   */
  private setupEventListeners(): void {
    console.log('🎭 Director: 设置事件驱动架构监听器');

    // === 核心事件驱动流程 ===

    // 1. 监听AI代理提出的动作（原始JSON）
    eventBus.on('AI_ACTION_PROPOSED', ({ agentId, action, timestamp }) => {
      console.log('🎭 Director: 收到AI_ACTION_PROPOSED事件', {
        agentId,
        actionType: action.type,
        timestamp: timestamp ? new Date(timestamp).toISOString() : 'invalid'
      });
      this.handleProposedAction(agentId, action);
    });

    // 2. 监听玩家选择
    eventBus.on('PLAYER_CHOICE_MADE', ({ choicePointId, selectedOptionId, action }) => {
      console.log('🎭 Director: 收到PLAYER_CHOICE_MADE事件', { choicePointId, selectedOptionId });
      this.handlePlayerChoice(choicePointId, selectedOptionId, action);
    });

    // === 向后兼容事件（保持现有功能） ===
    // 这些事件监听器保持不变，确保现有功能正常工作
  }

  /**
   * 加载场景
   */
  async loadScene(scene: Scene): Promise<void> {
    try {
      this.sceneState = SceneState.LOADING;
      this.currentScene = scene;

      // 🔄 场景切换，重置选择点锁
      this.triggeredChoicePoints.clear();
      console.log('🔄 场景切换，选择点锁已重置');

      // 清空世界状态
      this.worldState.clear();

      // 初始化场景状态
      await this.initializeSceneState(scene);

      // 创建场景中的角色
      this.createSceneCharacters(scene);

      this.sceneState = SceneState.RUNNING;

      // 更新叙事账本
      this.narrativeLedger.worldState.current_scene_id = scene.id;
      this.narrativeLedger.worldState.location = scene.title;
      this.addRecentEvent('scene_change', `进入场景: ${scene.title}`);

      // 发布场景加载完成事件（保持向后兼容）
      eventBus.emit('SCENE_LOADED', {
        sceneId: scene.id,
        scene: scene,
      });

      console.log(`✅ 场景 '${scene.title}' 加载完成`);

      // 新增：触发AI驱动的场景开场
      await this.triggerAIOrchestration('scene_entered');

      // 🎯 启动导演中心化游戏循环
      this.startGameLoop();
    } catch (error) {
      this.sceneState = SceneState.ENDED;
      // 🎯 错误时停止游戏循环
      this.stopGameLoop();
      eventBus.emit('ERROR_OCCURRED', {
        error: error as Error,
        context: { action: 'loadScene', sceneId: scene.id },
      });
      throw error;
    }
  }

  /**
   * 初始化场景状态
   */
  private async initializeSceneState(scene: Scene): Promise<void> {
    // 应用场景的初始状态
    if (scene.initialState) {
      // 这里可以根据初始状态设置世界状态
      // 例如设置角色位置、物品状态等
      Object.entries(scene.initialState).forEach(([key, value]) => {
        // 根据具体需求实现状态初始化逻辑
        console.log(`初始化状态: ${key} = ${JSON.stringify(value)}`);
      });
    }
  }

  /**
   * 创建场景中的角色
   */
  private createSceneCharacters(scene: Scene): void {
    scene.characters.forEach(characterId => {
      // 创建角色实体
      this.worldState.createCharacter(
        characterId,
        characterId, // 临时使用ID作为显示名称
        `场景 ${scene.id} 中的角色`,
        { x: 0, y: 0 },
        scene.id
      );
    });
  }

  /**
   * 处理AI代理提出的动作
   */
  private async handleProposedAction(agentId: string, action: GameAction): Promise<void> {
    console.log(`🎭 Director收到动作提议`, {
      agentId,
      actionType: action.type,
      actionTarget: action.target,
      sceneState: this.sceneState,
      sceneId: this.currentScene?.id
    });

    if (this.sceneState !== SceneState.RUNNING) {
      console.warn(`⚠️ 场景状态为 ${this.sceneState}，忽略动作: ${action.type}`);
      return;
    }

    // 验证动作是否与场景目标相关
    console.log(`🔍 验证动作相关性...`);
    if (!this.isActionRelevant(action)) {
      console.warn(`❌ 动作 ${action.type} 与场景目标不相关，已忽略`);
      return;
    }
    console.log(`✅ 动作相关性验证通过`);

    // 🚀 实现稳定的叙事-选择序列：先检查是否会触发选择点
    console.log(`🎯 检查是否触发抉择点...`);
    const choicePoint = this.checkForChoicePoint(agentId, action);

    if (choicePoint && !this.triggeredChoicePoints.has(choicePoint.id)) {
      // 🔒 立即加锁，防止再次触发
      this.triggeredChoicePoints.add(choicePoint.id);
      console.log(`🔒 选择点 ${choicePoint.id} 已加锁，防止重复触发`);

      console.log(`🎪 发现新抉择点！开始两阶段流程`, {
        choicePointId: choicePoint.id,
        description: choicePoint.description,
        optionsCount: choicePoint.options.length
      });

      // 🎬 阶段1：先生成叙事内容作为铺垫
      console.log(`📖 阶段1：生成叙事铺垫...`);
      const narrativeStartTime = Date.now();
      await this.generateNarrativeForAction(action, { success: true, description: '动作执行成功' });
      const narrativeEndTime = Date.now();
      console.log(`✅ 阶段1：叙事内容生成完成`, {
        duration: narrativeEndTime - narrativeStartTime,
        timestamp: new Date().toISOString()
      });

      // 🎯 阶段2：延迟后触发选择点，确保叙事内容先显示
      console.log(`⏰ 阶段2：准备延迟触发选择点...`);
      setTimeout(() => {
        console.log(`🎪 阶段2：延迟时间到，开始触发选择点`);
        this.triggerDelayedChoicePoint(choicePoint, agentId, action);
      }, 2000); // 2秒延迟，确保前端有充分时间渲染叙事内容

    } else if (choicePoint && this.triggeredChoicePoints.has(choicePoint.id)) {
      console.log(`🔒 选择点 ${choicePoint.id} 已触发过，直接执行动作`);
      // 正常执行动作，但不触发选择点
      await this.executeAction(action);

    } else {
      console.log(`➡️ 未找到抉择点，直接执行动作`);
      // 直接执行动作
      await this.executeAction(action);
    }
  }

  /**
   * 处理玩家选择
   */
  private async handlePlayerChoice(
    choicePointId: string,
    selectedOptionId: string,
    action: GameAction
  ): Promise<void> {
    if (this.sceneState !== SceneState.PAUSED) {
      console.warn('场景未处于暂停状态，无法处理玩家选择');
      return;
    }

    console.log(`玩家选择: ${selectedOptionId}`);

    // 恢复场景运行状态
    this.sceneState = SceneState.RUNNING;

    // 执行玩家选择的动作
    await this.executeAction(action);

    // 应用选择的后果
    const choicePoint = this.currentScene?.choicePoints.find(cp => cp.id === choicePointId);
    const selectedOption = choicePoint?.options.find(opt => opt.id === selectedOptionId);

    if (selectedOption?.consequences) {
      this.applyConsequences(selectedOption.consequences);
    }

    // 🔓 解锁选择点状态锁
    this.unlockChoicePoint();
  }

  /**
   * 执行动作
   */
  private async executeAction(action: GameAction): Promise<void> {
    if (this.isProcessingAction) {
      this.actionQueue.push(action);
      return;
    }

    this.isProcessingAction = true;

    try {
      console.log(`执行动作: ${action.type}`);

      // 根据动作类型执行相应逻辑
      const result = await this.processAction(action);

      // 🎨 生成文学化叙述内容（而不是直接发布原始动作JSON）
      await this.generateNarrativeForAction(action, result);

      // 发布动作执行事件（事件驱动架构 - 包含完整状态信息）
      eventBus.emit('ACTION_EXECUTED', {
        action,
        result,
        worldState: JSON.parse(this.worldState.serialize()), // 获取当前世界状态
        timestamp: Date.now()
      });

      // 更新场景状态（不包含原始动作JSON）
      eventBus.emit('SCENE_UPDATED', {
        sceneId: this.currentScene!.id,
        changes: { actionType: action.type, result },
      });

      // 检查场景是否完成
      this.checkSceneCompletion();

    } catch (error) {
      eventBus.emit('ERROR_OCCURRED', {
        error: error as Error,
        context: { action: 'executeAction', gameAction: action },
      });
    } finally {
      this.isProcessingAction = false;

      // 处理队列中的下一个动作
      if (this.actionQueue.length > 0) {
        const nextAction = this.actionQueue.shift()!;
        await this.executeAction(nextAction);
      }
    }
  }

  /**
   * 处理具体动作逻辑
   */
  private async processAction(action: GameAction): Promise<any> {
    switch (action.type) {
      case 'MOVE':
        return this.handleMoveAction(action);
      case 'ATTACK':
        return this.handleAttackAction(action);
      case 'TALK':
        return this.handleTalkAction(action);
      case 'SNEAK_PAST':
        return this.handleSneakAction(action);
      default:
        console.warn(`未知动作类型: ${action.type}`);
        return { success: false, message: '未知动作' };
    }
  }

  /**
   * 处理移动动作
   */
  private handleMoveAction(action: GameAction): any {
    // 实现移动逻辑
    return { success: true, message: `移动到 ${action.target}` };
  }

  /**
   * 处理攻击动作
   */
  private handleAttackAction(action: GameAction): any {
    // 实现攻击逻辑
    return { success: true, message: `攻击 ${action.target}` };
  }

  /**
   * 处理对话动作
   */
  private handleTalkAction(action: GameAction): any {
    // 实现对话逻辑
    return { success: true, message: `与 ${action.target} 对话` };
  }

  /**
   * 处理潜行动作
   */
  private handleSneakAction(action: GameAction): any {
    // 实现潜行逻辑
    return { success: true, message: `潜行绕过 ${action.target}` };
  }

  /**
   * 🎨 为动作生成文学化叙述内容 - 事件驱动架构
   */
  private async generateNarrativeForAction(action: GameAction, result: any): Promise<void> {
    try {
      console.log(`🎨 [Director] 事件驱动：为动作生成文学化叙述`, {
        actionType: action.type,
        actionTarget: action.target
      });

      // 🔄 使用降级方案：生成简单的文学化描述
      const fallbackContent = this.generateFallbackNarrative(action, result);

      // 🚀 事件驱动：发布NARRATIVE_READY事件，而不是直接调用其他模块
      eventBus.emit('NARRATIVE_READY', {
        segment: {
          id: `director_narrative_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`, // 🔧 修复：确保包含id字段
          type: 'narration',
          content: fallbackContent.content,
          character: action.target, // 🔧 修复：添加character字段
          timestamp: Date.now(), // 🔧 修复：添加timestamp字段
          metadata: {
            ...fallbackContent.metadata,
            source: 'Director',
            actionType: action.type
          }
        },
        timestamp: Date.now()
      });

      console.log('✅ [Director] 已发布NARRATIVE_READY事件');

    } catch (error) {
      console.error('❌ [Director] 生成文学化叙述失败:', error);
    }
  }

  /**
   * 🔄 降级方案：生成简单的文学化描述
   */
  private generateFallbackNarrative(action: GameAction, _result: any): any {
    let content = '';

    switch (action.type) {
      case 'MOVE':
        // 🎭 为guard的MOVE动作生成更丰富的叙事内容
        if (action.target?.includes('牢房') || action.target?.includes('区域')) {
          content = `沉重的脚步声在走廊中回响。一个身材魁梧的守卫出现在铁栅栏外，他的钥匙串在腰间叮当作响。守卫停下脚步，透过铁栅栏凝视着牢房内部，似乎在检查什么。火把的光芒在他的盔甲上闪烁，投下长长的阴影。`;
        } else {
          content = `艾伦小心翼翼地移动到${action.target}，观察着周围的环境。`;
        }
        break;
      case 'ATTACK':
        content = `艾伦决定对${action.target}发起攻击。`;
        break;
      case 'TALK':
        content = `艾伦尝试与${action.target}进行对话。`;
        break;
      case 'SNEAK_PAST':
        content = `艾伦悄悄地尝试绕过${action.target}。`;
        break;
      default:
        content = `艾伦执行了一个${action.type}动作。`;
    }

    return {
      type: 'narration',
      content: content,
      metadata: {
        source: 'fallback',
        actionType: action.type,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 检查动作是否与场景目标相关
   */
  private isActionRelevant(_action: GameAction): boolean {
    // 简单实现：所有动作都认为是相关的
    // 实际实现中可以根据场景目标和动作类型进行更复杂的判断
    return true;
  }

  /**
   * 🎯 延迟触发选择点（两阶段流程的第二阶段）
   */
  private triggerDelayedChoicePoint(choicePoint: any, agentId: string, action: any): void {
    console.log(`🎪 阶段2：触发延迟选择点`, {
      choicePointId: choicePoint.id,
      agentId,
      actionType: action.type,
      timestamp: new Date().toISOString(),
      delayCompleted: true
    });

    // 🔒 触发选择点时上锁
    this.isWaitingForPlayerChoice = true;
    this.currentChoicePointId = choicePoint.id;
    console.log(`🔒 [Director] 触发选择点 ${choicePoint.id} 并上锁，等待玩家响应`);

    // 暂停场景，等待玩家选择
    this.sceneState = SceneState.PAUSED;
    console.log(`⏸️ 场景已暂停，等待玩家选择`);

    // 生成选择选项
    const options = choicePoint.options.map((option: any) => ({
      id: option.id,
      text: option.text,
      action: option.action,
    }));

    console.log(`📋 生成选择选项`, options);

    // 发布抉择点事件
    eventBus.emit('CHOICE_POINT_RAISED', {
      choicePointId: choicePoint.id,
      options,
      context: {
        agentId,
        originalAction: action,
        scene: this.currentScene,
        source: 'delayed_trigger', // 标记来源为延迟触发
        timestamp: Date.now()
      },
    });

    console.log(`📢 已发布延迟抉择点事件`, {
      choicePointId: choicePoint.id,
      description: choicePoint.description,
      timestamp: new Date().toISOString(),
      source: 'delayed_trigger'
    });
  }

  /**
   * 检查是否触发抉择点
   */
  private checkForChoicePoint(agentId: string, action: GameAction): ChoicePoint | null {
    // 🔒 检查选择点状态锁
    if (this.isWaitingForPlayerChoice) {
      console.log(`🔒 [Director] 已在等待玩家选择 ${this.currentChoicePointId}，忽略重复触发`);
      return null;
    }

    if (!this.currentScene) {
      console.log(`❌ 无当前场景，无法检查抉择点`);
      return null;
    }

    console.log(`🔍 检查抉择点`, {
      sceneId: this.currentScene.id,
      choicePointsCount: this.currentScene.choicePoints?.length || 0,
      agentId,
      actionType: action.type
    });

    if (!this.currentScene.choicePoints || this.currentScene.choicePoints.length === 0) {
      console.log(`⚠️ 场景中没有定义抉择点`);
      return null;
    }

    // 检查当前动作是否匹配任何抉择点的触发条件
    const matchedChoicePoint = this.currentScene.choicePoints.find(choicePoint => {
      console.log(`🎯 检查抉择点: ${choicePoint.id}`, {
        triggerCondition: choicePoint.triggerCondition,
        actionType: action.type,
        agentId
      });

      if (typeof choicePoint.triggerCondition === 'string') {
        const matches = choicePoint.triggerCondition.includes(action.type);
        console.log(`📝 字符串匹配结果: ${matches}`);
        return matches;
      } else if (typeof choicePoint.triggerCondition === 'object') {
        // 处理对象形式的触发条件
        if (choicePoint.triggerCondition.type === 'scene_event') {
          // 扩展动作到事件的映射逻辑
          const eventMappings: Record<string, string[]> = {
            'guard_encounter': ['MOVE', 'EXPLORE', 'LOOK_AROUND', 'PATROL'], // 多种动作都可能触发遭遇
            'combat': ['ATTACK', 'FIGHT'],
            'stealth': ['SNEAK_PAST', 'HIDE'],
            'interaction': ['TALK', 'NEGOTIATE']
          };

          const targetEvent = choicePoint.triggerCondition?.event;
          const triggeringActions = targetEvent ? (eventMappings[targetEvent] || [targetEvent]) : [];

          const matches = triggeringActions.includes(action.type);
          console.log(`🎪 事件映射检查`, {
            targetEvent,
            triggeringActions,
            actionType: action.type,
            matches
          });

          if (matches) {
            console.log(`✅ 动作 ${action.type} 触发事件 ${targetEvent}`);
            return true;
          }
        }
      }
      return false;
    });

    if (matchedChoicePoint) {
      console.log(`🎉 找到匹配的抉择点: ${matchedChoicePoint.id}`);
    } else {
      console.log(`❌ 没有找到匹配的抉择点`);
    }

    return matchedChoicePoint || null;
  }

  /**
   * 应用选择后果
   */
  private applyConsequences(consequences: Record<string, any>): void {
    Object.entries(consequences).forEach(([outcomeType, outcomeData]) => {
      console.log(`应用后果: ${outcomeType} = ${JSON.stringify(outcomeData)}`);

      // 根据后果类型应用不同的逻辑
      switch (outcomeType) {
        case 'success':
        case 'failure':
          // 处理成功/失败后果
          if (outcomeData.narrative) {
            // 触发叙事更新事件
            eventBus.emit('SCENE_UPDATED', {
              sceneId: this.currentScene?.id || '',
              changes: {
                updateType: 'consequence',
                narrative: outcomeData.narrative,
              },
            });
          }

          if (outcomeData.outcome) {
            // 记录结果状态
            console.log(`选择结果: ${outcomeData.outcome}`);
          }
          break;

        default:
          console.log(`未知后果类型: ${outcomeType}`);
      }
    });

    // 发布后果应用完成事件
    eventBus.emit('CONSEQUENCES_APPLIED', {
      sceneId: this.currentScene?.id || '',
      consequences,
    });
  }

  /**
   * 检查场景是否完成
   */
  private checkSceneCompletion(): void {
    // 简单实现：检查是否达成场景目标
    // 实际实现中需要根据具体的完成条件进行判断
    
    // 这里可以添加场景完成的逻辑
    // 如果场景完成，设置状态为ENDED并发布相应事件
  }

  /**
   * 获取当前场景
   */
  getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /**
   * 获取场景状态
   */
  getSceneState(): SceneState {
    return this.sceneState;
  }

  /**
   * 🔓 解锁选择点状态锁
   * 供GameController在处理完玩家选择后调用
   */
  public unlockChoicePoint(): void {
    this.isWaitingForPlayerChoice = false;
    this.currentChoicePointId = null;
    this.lastWaitingLogTime = 0; // 🚨 重置等待日志时间
    console.log(`🔓 [Director] 选择点已解锁，AI恢复正常工作`);
  }

  /**
   * 暂停场景
   */
  pauseScene(): void {
    if (this.sceneState === SceneState.RUNNING) {
      this.sceneState = SceneState.PAUSED;
    }
  }

  /**
   * 恢复场景
   */
  resumeScene(): void {
    if (this.sceneState === SceneState.PAUSED) {
      this.sceneState = SceneState.RUNNING;
    }
  }

  /**
   * 结束场景
   */
  endScene(): void {
    this.sceneState = SceneState.ENDED;
    this.currentScene = null;

    // 🔄 场景结束，重置选择点锁
    this.triggeredChoicePoints.clear();
    console.log('🔄 场景结束，选择点锁已重置');

    // 🎯 停止导演中心化游戏循环
    this.stopGameLoop();
  }

  /**
   * 公共方法：触发AI编排
   */
  async processGameTurn(triggerReason: string = 'manual_trigger'): Promise<void> {
    return this.triggerAIOrchestration(triggerReason);
  }

  /**
   * 新增：AI驱动的编排循环
   */
  private async triggerAIOrchestration(triggerReason: string): Promise<void> {
    if (this.sceneState !== SceneState.RUNNING) {
      console.log(`⚠️ 场景未运行，跳过AI编排`);
      return;
    }

    try {
      console.log(`🎭 触发AI编排，原因: ${triggerReason}`);

      // 1. 请求AI决策下一步行动
      const decisionRequest: DecisionRequest = {
        ledger: this.narrativeLedger,
        availableActions: [ContentType.NARRATION, ContentType.DIALOGUE, ContentType.INTROSPECTION, ContentType.CHOICE_POINT],
        context: {
          trigger_reason: triggerReason
        }
      };

      const decision = await this.agentCore.decideNextStep(decisionRequest);
      console.log(`🎯 AI决策结果:`, decision);

      // 2. 根据决策生成内容
      const contentRequest: ContentRequest = {
        action: decision.nextAction,
        context: decision.context,
        ledger: this.narrativeLedger
      };

      const content = await this.agentCore.generateContent(contentRequest);
      console.log(`📝 AI生成内容:`, content);

      // 3. 发布内容到前端
      this.publishContent(content);

      // 🎯 注释：自动触发逻辑已移至两阶段流程中，此处不再需要

    } catch (error) {
      console.error('❌ AI编排失败:', error);
      // 降级到传统逻辑（保持向后兼容）
      console.log('🔄 降级到传统逻辑');
    }
  }

  /**
   * 发布内容到前端
   */
  private publishContent(content: any): void {
    console.log('📢 [Director] 发布内容事件:', {
      type: content.type,
      contentPreview: typeof content.content === 'string' ?
        content.content.substring(0, 50) + '...' : 'N/A',
      contentLength: typeof content.content === 'string' ? content.content.length : 'N/A',
      hasMetadata: !!content.metadata,
      timestamp: new Date().toISOString()
    });

    // 根据内容类型发布不同的事件
    switch (content.type) {
      case 'narration':
        const narrativeSegment = {
          id: `narrative_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          type: 'narration' as const,
          content: content.content,
          timestamp: Date.now(),
          metadata: content.metadata
        };

        console.log('🚀 [Director] 准备发布NARRATIVE_READY事件', {
          segmentId: narrativeSegment.id,
          contentLength: narrativeSegment.content?.length,
          contentPreview: narrativeSegment.content?.substring(0, 100) + '...',
          metadata: narrativeSegment.metadata
        });

        eventBus.emit('NARRATIVE_READY', {
          segment: narrativeSegment,
          timestamp: Date.now()
        });

        console.log('✅ [Director] NARRATIVE_READY事件已发布到事件总线 (narration)');
        break;

      case 'dialogue':
        eventBus.emit('NARRATIVE_GENERATED', {
          segment: {
            type: 'dialogue',
            content: content.content,
            character: content.metadata?.character_id,
            metadata: content.metadata
          }
        });
        break;

      case 'introspection':
        eventBus.emit('NARRATIVE_GENERATED', {
          segment: {
            type: 'introspection',
            content: content.content,
            metadata: content.metadata
          }
        });
        break;

      case 'choice_point':
        // 🚨 修复竞态条件：AI编排系统的选择点也需要延迟发布
        console.log('⏰ [Director] AI编排选择点延迟发布，确保时序正确');
        setTimeout(() => {
          console.log('🎪 [Director] AI编排选择点延迟发布执行');
          eventBus.emit('CHOICE_POINT_RAISED', {
            choicePointId: content.content.id,
            options: content.content.options,
            context: {
              prompt: content.content.prompt,
              metadata: content.metadata,
              source: 'ai_orchestration' // 标记来源
            }
          });
          console.log('✅ [Director] AI编排选择点事件已延迟发布');
        }, 2000); // 2秒延迟，确保叙事内容先显示
        break;

      default:
        console.warn('未知的内容类型:', content.type);
    }
  }

  /**
   * 添加最近事件到叙事账本
   */
  private addRecentEvent(type: 'choice' | 'dialogue' | 'scene_change', summary: string): void {
    this.narrativeLedger.recentEvents.unshift({
      type,
      summary,
      timestamp: Date.now()
    });

    // 只保留最近的10个事件
    if (this.narrativeLedger.recentEvents.length > 10) {
      this.narrativeLedger.recentEvents = this.narrativeLedger.recentEvents.slice(0, 10);
    }
  }

  /**
   * 获取当前叙事账本（用于调试）
   */
  getNarrativeLedger(): NarrativeLedger {
    return { ...this.narrativeLedger };
  }

  /**
   * 🔍 获取已触发的选择点列表（用于调试）
   */
  getTriggeredChoicePoints(): string[] {
    return Array.from(this.triggeredChoicePoints);
  }

  // ========================================
  // 🎯 主时钟控制器方法 - 导演中心化架构
  // ========================================

  /**
   * 启动游戏主循环
   */
  startGameLoop(): void {
    if (this.isGameLoopRunning) {
      console.log('🎯 [Director] 游戏循环已在运行，跳过启动');
      return;
    }

    console.log('🎯 [Director] 启动游戏主循环', {
      tickInterval: this.tickInterval,
      cooldownDuration: this.cooldownDuration,
      availableAgents: this.availableAgents
    });

    this.isGameLoopRunning = true;
    this.gameLoopTimer = setInterval(() => {
      this.tick();
    }, this.tickInterval);
  }

  /**
   * 停止游戏主循环
   */
  stopGameLoop(): void {
    if (!this.isGameLoopRunning) {
      console.log('🎯 [Director] 游戏循环未运行，跳过停止');
      return;
    }

    console.log('🎯 [Director] 停止游戏主循环');

    if (this.gameLoopTimer) {
      clearInterval(this.gameLoopTimer);
      this.gameLoopTimer = null;
    }

    this.isGameLoopRunning = false;
  }

  // 🚨 添加静默等待机制，避免重复日志
  private lastWaitingLogTime: number = 0;
  private readonly WAITING_LOG_INTERVAL = 30000; // 30秒打印一次等待日志

  /**
   * 游戏主时钟 - 每个tick检查并调度AI代理
   */
  private tick(): void {
    // 检查游戏状态是否允许AI行动
    if (!this.canAIAct()) {
      // 🚨 静默等待：只在特定间隔打印日志，避免刷屏
      const now = Date.now();
      if (this.isWaitingForPlayerChoice && now - this.lastWaitingLogTime > this.WAITING_LOG_INTERVAL) {
        console.log('🔒 [Director] 静默等待用户选择中...', {
          waitingFor: this.currentChoicePointId,
          waitingTime: Math.round((now - this.lastWaitingLogTime) / 1000) + 's'
        });
        this.lastWaitingLogTime = now;
      }
      return;
    }

    // 获取可以行动的代理（非冷却状态）
    const availableForAction = this.getAvailableAgentsForAction();

    if (availableForAction.length === 0) {
      console.log('🎯 [Director] Tick: 所有代理都在冷却中');
      return;
    }

    // 选择一个代理进行行动（可以是随机选择或基于优先级）
    const selectedAgent = this.selectAgentForAction(availableForAction);

    if (selectedAgent) {
      console.log('🎯 [Director] Tick: 请求代理行动', {
        agentId: selectedAgent,
        sceneState: this.sceneState,
        isWaitingForChoice: this.isWaitingForPlayerChoice
      });

      // 🚀 发布增强的行动请求事件（包含叙事账本）
      eventBus.emit('REQUEST_AI_ACTION', {
        agentId: selectedAgent,
        timestamp: Date.now(),
        context: {
          sceneId: this.currentScene?.id,
          sceneState: this.sceneState
        },
        // 🚀 新增：传递完整的叙事账本作为上下文
        narrativeLedger: { ...this.narrativeLedger }
      });

      // 设置代理冷却
      this.setCooldown(selectedAgent);
    }
  }

  /**
   * 检查是否可以进行AI行动
   */
  private canAIAct(): boolean {
    // 游戏必须在运行状态
    if (this.sceneState !== SceneState.RUNNING) {
      return false;
    }

    // 不能在等待玩家选择时行动
    if (this.isWaitingForPlayerChoice) {
      return false;
    }

    // 不能在处理动作时行动
    if (this.isProcessingAction) {
      return false;
    }

    return true;
  }

  /**
   * 获取可以行动的代理列表（非冷却状态）
   */
  private getAvailableAgentsForAction(): string[] {
    return this.availableAgents.filter(agentId => !this.cooldowns.get(agentId));
  }

  /**
   * 选择一个代理进行行动
   * 当前实现：随机选择，未来可以基于优先级或策略
   */
  private selectAgentForAction(availableAgents: string[]): string | null {
    if (availableAgents.length === 0) {
      return null;
    }

    // 简单的随机选择
    const randomIndex = Math.floor(Math.random() * availableAgents.length);
    return availableAgents[randomIndex];
  }

  /**
   * 设置代理冷却
   */
  private setCooldown(agentId: string): void {
    console.log('🧊 [Director] 设置代理冷却', { agentId, duration: this.cooldownDuration });

    this.cooldowns.set(agentId, true);

    setTimeout(() => {
      this.cooldowns.set(agentId, false);
      console.log('🔥 [Director] 代理冷却结束', { agentId });
    }, this.cooldownDuration);
  }

  /**
   * 配置主时钟参数
   */
  configureGameLoop(tickInterval?: number, cooldownDuration?: number): void {
    if (tickInterval !== undefined) {
      this.tickInterval = tickInterval;
      console.log('🎯 [Director] 更新tick间隔:', tickInterval);
    }

    if (cooldownDuration !== undefined) {
      this.cooldownDuration = cooldownDuration;
      console.log('🧊 [Director] 更新冷却时间:', cooldownDuration);
    }

    // 如果游戏循环正在运行，重启以应用新配置
    if (this.isGameLoopRunning) {
      console.log('🔄 [Director] 重启游戏循环以应用新配置');
      this.stopGameLoop();
      this.startGameLoop();
    }
  }

  /**
   * 获取游戏循环状态（用于调试）
   */
  getGameLoopStatus(): {
    isRunning: boolean;
    tickInterval: number;
    cooldownDuration: number;
    availableAgents: string[];
    cooldowns: Record<string, boolean>;
  } {
    const cooldownsObj: Record<string, boolean> = {};
    this.cooldowns.forEach((value, key) => {
      cooldownsObj[key] = value;
    });

    return {
      isRunning: this.isGameLoopRunning,
      tickInterval: this.tickInterval,
      cooldownDuration: this.cooldownDuration,
      availableAgents: [...this.availableAgents],
      cooldowns: cooldownsObj
    };
  }
}
