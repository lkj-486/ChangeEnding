import { WorldState } from '../world/WorldState';
import { eventBus } from '../events/EventBus';
import { Scene, SceneState, GameAction, ChoicePoint } from '../types';

/**
 * 导演模块
 * 负责场景管理、游戏流程控制和关键抉择点识别
 */
export class Director {
  private worldState: WorldState;
  private currentScene: Scene | null = null;
  private sceneState: SceneState = SceneState.LOADING;
  private actionQueue: GameAction[] = [];
  private isProcessingAction = false;

  constructor(worldState: WorldState) {
    this.worldState = worldState;
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听AI代理提出的动作
    eventBus.on('AI_ACTION_PROPOSED', ({ agentId, action }) => {
      this.handleProposedAction(agentId, action);
    });

    // 监听玩家选择
    eventBus.on('PLAYER_CHOICE_MADE', ({ choicePointId, selectedOptionId, action }) => {
      this.handlePlayerChoice(choicePointId, selectedOptionId, action);
    });
  }

  /**
   * 加载场景
   */
  async loadScene(scene: Scene): Promise<void> {
    try {
      this.sceneState = SceneState.LOADING;
      this.currentScene = scene;

      // 清空世界状态
      this.worldState.clear();

      // 初始化场景状态
      await this.initializeSceneState(scene);

      // 创建场景中的角色
      this.createSceneCharacters(scene);

      this.sceneState = SceneState.RUNNING;

      // 发布场景加载完成事件
      eventBus.emit('SCENE_LOADED', {
        sceneId: scene.id,
        scene: scene,
      });

      console.log(`场景 '${scene.title}' 加载完成`);
    } catch (error) {
      this.sceneState = SceneState.ENDED;
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

    // 检查是否触发抉择点
    console.log(`🎯 检查是否触发抉择点...`);
    const choicePoint = this.checkForChoicePoint(agentId, action);

    if (choicePoint) {
      console.log(`🎪 触发抉择点！`, {
        choicePointId: choicePoint.id,
        description: choicePoint.description,
        optionsCount: choicePoint.options.length
      });

      // 暂停场景，等待玩家选择
      this.sceneState = SceneState.PAUSED;
      console.log(`⏸️ 场景已暂停，等待玩家选择`);

      // 生成选择选项
      const options = choicePoint.options.map(option => ({
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
        },
      });

      console.log(`📢 已发布抉择点事件: ${choicePoint.description}`);
    } else {
      console.log(`➡️ 未触发抉择点，直接执行动作`);
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

      // 发布动作执行事件
      eventBus.emit('ACTION_EXECUTED', { action, result });

      // 更新场景状态
      eventBus.emit('SCENE_UPDATED', {
        sceneId: this.currentScene!.id,
        changes: { action, result },
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
   * 检查动作是否与场景目标相关
   */
  private isActionRelevant(action: GameAction): boolean {
    // 简单实现：所有动作都认为是相关的
    // 实际实现中可以根据场景目标和动作类型进行更复杂的判断
    return true;
  }

  /**
   * 检查是否触发抉择点
   */
  private checkForChoicePoint(agentId: string, action: GameAction): ChoicePoint | null {
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
          const eventMappings = {
            'guard_encounter': ['MOVE', 'EXPLORE', 'LOOK_AROUND', 'PATROL'], // 多种动作都可能触发遭遇
            'combat': ['ATTACK', 'FIGHT'],
            'stealth': ['SNEAK_PAST', 'HIDE'],
            'interaction': ['TALK', 'NEGOTIATE']
          };

          const targetEvent = choicePoint.triggerCondition.event;
          const triggeringActions = eventMappings[targetEvent] || [targetEvent];

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
  }
}
