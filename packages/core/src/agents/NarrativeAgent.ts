import { eventBus } from '../events/EventBus';
import { LLMService } from '../services/LLMService';
import { NarrativeSegment, Scene, GameAction } from '../types';

/**
 * 叙事代理配置
 */
export interface NarrativeAgentConfig {
  llmService: LLMService;
  style?: 'literary' | 'casual' | 'dramatic';
  language?: 'chinese' | 'english';
  maxSegmentLength?: number;
}

/**
 * 叙事代理
 * 负责将游戏事件转化为文学化的故事文本
 */
export class NarrativeAgent {
  private config: NarrativeAgentConfig;
  private currentScene: Scene | null = null;
  private narrativeHistory: NarrativeSegment[] = [];
  private segmentCounter = 0;

  constructor(config: NarrativeAgentConfig) {
    this.config = {
      style: 'literary',
      language: 'chinese',
      maxSegmentLength: 500,
      ...config,
    };

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器 - 事件驱动架构
   */
  private setupEventListeners(): void {
    console.log('📝 NarrativeAgent: 设置事件驱动架构监听器');

    // 监听场景加载事件
    eventBus.on('SCENE_LOADED', ({ sceneId, scene }) => {
      this.handleSceneLoaded(scene);
    });

    // 监听场景更新事件
    eventBus.on('SCENE_UPDATED', ({ sceneId, changes }) => {
      this.handleSceneUpdated(changes);
    });

    // 🚀 事件驱动架构：监听ACTION_EXECUTED事件，将结构化事件转换为文学文本
    eventBus.on('ACTION_EXECUTED', ({ action, result, worldState, timestamp }) => {
      console.log('📝 NarrativeAgent: 收到ACTION_EXECUTED事件', {
        actionType: action.type,
        timestamp: new Date(timestamp).toISOString()
      });
      this.handleActionExecuted(action, result, worldState);
    });

    // 🚫 移除PLAYER_CHOICE_MADE事件监听 - 现在由Director统一处理所有叙事内容生成
    // eventBus.on('PLAYER_CHOICE_MADE', ({ choicePointId, selectedOptionId, action }) => {
    //   this.handlePlayerChoice(choicePointId, selectedOptionId, action);
    // });
  }

  /**
   * 处理场景加载
   */
  private async handleSceneLoaded(scene: Scene): Promise<void> {
    console.log(`🔍 NarrativeAgent: 开始处理场景加载`, {
      sceneId: scene.id,
      sceneTitle: scene.title,
      currentHistoryLength: this.narrativeHistory.length
    });

    this.currentScene = scene;
    this.narrativeHistory = [];
    this.segmentCounter = 0;

    // 生成场景开场叙述
    console.log(`🔍 NarrativeAgent: 开始生成开场叙述`);
    const openingNarrative = await this.generateSceneOpening(scene);

    if (openingNarrative) {
      console.log(`✅ NarrativeAgent: 开场叙述生成成功`, {
        id: openingNarrative.id,
        type: openingNarrative.type,
        contentLength: openingNarrative.content.length,
        contentPreview: openingNarrative.content.substring(0, 100)
      });
      this.addNarrativeSegment(openingNarrative);
    } else {
      console.log(`❌ NarrativeAgent: 开场叙述生成失败`);
    }

    console.log(`🔍 NarrativeAgent: 场景加载处理完成`, {
      finalHistoryLength: this.narrativeHistory.length
    });
  }

  /**
   * 处理场景更新
   */
  private async handleSceneUpdated(changes: any): Promise<void> {
    if (!this.currentScene) return;

    // 根据场景变化生成叙述
    const narrative = await this.generateSceneUpdateNarrative(changes);
    if (narrative) {
      this.addNarrativeSegment(narrative);
    }
  }

  /**
   * 处理动作执行 - 事件驱动架构
   */
  private async handleActionExecuted(action: GameAction, result: any, worldState: any): Promise<void> {
    if (!this.currentScene) {
      console.log('📝 NarrativeAgent: 无当前场景，跳过动作叙述生成');
      return;
    }

    console.log('📝 NarrativeAgent: 开始为动作生成文学化叙述', {
      actionType: action.type,
      actionTarget: action.target,
      sceneId: this.currentScene.id
    });

    try {
      // 生成动作执行的叙述
      const narrative = await this.generateActionNarrative(action, result);

      if (narrative) {
        console.log('✅ NarrativeAgent: 叙述生成成功', {
          narrativeId: narrative.id,
          contentLength: narrative.content.length,
          contentPreview: narrative.content.substring(0, 50) + '...'
        });

        // 🚀 事件驱动架构：发布NARRATIVE_READY事件，而不是直接添加到历史
        eventBus.emit('NARRATIVE_READY', {
          segment: {
            id: narrative.id, // 🔧 修复：使用narrative的id
            type: narrative.type as 'narration' | 'dialogue' | 'introspection',
            content: narrative.content,
            character: narrative.character,
            timestamp: narrative.timestamp, // 🔧 修复：添加timestamp字段
            metadata: {
              narrativeId: narrative.id,
              actionType: action.type,
              timestamp: narrative.timestamp,
              source: 'NarrativeAgent'
            }
          },
          timestamp: Date.now()
        });

        console.log('✅ NarrativeAgent: 已发布NARRATIVE_READY事件');

        // 仍然添加到本地历史以供调试
        this.addNarrativeSegment(narrative);
      } else {
        console.log('❌ NarrativeAgent: 叙述生成失败');
      }
    } catch (error) {
      console.error('❌ NarrativeAgent: 处理动作执行失败:', error);
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
    if (!this.currentScene) return;

    // 生成玩家选择的叙述
    const narrative = await this.generateChoiceNarrative(action);
    if (narrative) {
      this.addNarrativeSegment(narrative);
    }
  }

  /**
   * 生成场景开场叙述
   */
  private async generateSceneOpening(scene: Scene): Promise<NarrativeSegment | null> {
    console.log(`🔍 NarrativeAgent: 构建开场提示词`, {
      sceneId: scene.id,
      sceneTitle: scene.title,
      maxSegmentLength: this.config.maxSegmentLength
    });

    const prompt = this.buildSceneOpeningPrompt(scene);

    console.log(`🔍 NarrativeAgent: 调用LLM服务`, {
      promptLength: prompt.length,
      llmServiceExists: !!this.config.llmService
    });

    try {
      const response = await this.config.llmService.generateResponse({
        prompt,
        context: { scene },
        maxTokens: this.config.maxSegmentLength,
        temperature: 0.8,
      });

      console.log(`✅ NarrativeAgent: LLM响应成功`, {
        responseContentLength: response.content.length,
        responsePreview: response.content.substring(0, 100)
      });

      return {
        id: `narrative_${++this.segmentCounter}`,
        type: 'description',
        content: response.content.trim(),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('❌ NarrativeAgent: 生成场景开场叙述失败:', error);
      return null;
    }
  }

  /**
   * 生成场景更新叙述
   */
  private async generateSceneUpdateNarrative(changes: any): Promise<NarrativeSegment | null> {
    const prompt = this.buildSceneUpdatePrompt(changes);

    try {
      const response = await this.config.llmService.generateResponse({
        prompt,
        context: { scene: this.currentScene, changes },
        maxTokens: this.config.maxSegmentLength,
        temperature: 0.7,
      });

      return {
        id: `narrative_${++this.segmentCounter}`,
        type: 'narration',
        content: response.content.trim(),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('生成场景更新叙述失败:', error);
      return null;
    }
  }

  /**
   * 生成动作叙述
   */
  private async generateActionNarrative(
    action: GameAction,
    result: any
  ): Promise<NarrativeSegment | null> {
    const prompt = this.buildActionNarrativePrompt(action, result);

    try {
      const response = await this.config.llmService.generateResponse({
        prompt,
        context: { scene: this.currentScene, action, result },
        maxTokens: this.config.maxSegmentLength,
        temperature: 0.7,
      });

      // 根据动作类型确定叙述类型
      const narrativeType = this.determineNarrativeType(action);

      return {
        id: `narrative_${++this.segmentCounter}`,
        type: narrativeType,
        content: response.content.trim(),
        character: action.target,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('生成动作叙述失败:', error);
      return null;
    }
  }

  /**
   * 生成选择叙述
   */
  private async generateChoiceNarrative(action: GameAction): Promise<NarrativeSegment | null> {
    const prompt = this.buildChoiceNarrativePrompt(action);

    try {
      const response = await this.config.llmService.generateResponse({
        prompt,
        context: { scene: this.currentScene, action },
        maxTokens: this.config.maxSegmentLength,
        temperature: 0.6,
      });

      return {
        id: `narrative_${++this.segmentCounter}`,
        type: 'internal_thought',
        content: response.content.trim(),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('生成选择叙述失败:', error);
      return null;
    }
  }

  /**
   * 构建场景开场提示词
   */
  private buildSceneOpeningPrompt(scene: Scene): string {
    const styleGuide = this.getStyleGuide();

    return `作为一位${styleGuide.description}，请为以下场景创作开场叙述：

场景标题：${scene.title}
场景描述：${scene.description}
场景目标：${scene.goal}
参与角色：${scene.characters.join(', ')}

写作要求：
${styleGuide.requirements.join('\n')}

请创作一段${this.config.maxSegmentLength}字以内的开场叙述，营造场景氛围，引入主要角色和环境。`;
  }

  /**
   * 构建场景更新提示词
   */
  private buildSceneUpdatePrompt(changes: any): string {
    const styleGuide = this.getStyleGuide();
    const recentNarrative = this.getRecentNarrative(3);

    return `基于以下场景变化，继续故事叙述：

场景变化：${JSON.stringify(changes, null, 2)}

最近的叙述内容：
${recentNarrative}

写作要求：
${styleGuide.requirements.join('\n')}

请创作一段${this.config.maxSegmentLength}字以内的叙述，自然地承接之前的内容，描述场景的变化和发展。`;
  }

  /**
   * 构建动作叙述提示词
   */
  private buildActionNarrativePrompt(action: GameAction, result: any): string {
    const styleGuide = this.getStyleGuide();
    const recentNarrative = this.getRecentNarrative(2);

    return `基于以下动作和结果，创作叙述：

动作类型：${action.type}
动作目标：${action.target || '无'}
动作参数：${JSON.stringify(action.parameters || {}, null, 2)}
执行结果：${JSON.stringify(result, null, 2)}

最近的叙述内容：
${recentNarrative}

写作要求：
${styleGuide.requirements.join('\n')}

请创作一段${this.config.maxSegmentLength}字以内的叙述，生动地描述这个动作的执行过程和结果。`;
  }

  /**
   * 构建选择叙述提示词
   */
  private buildChoiceNarrativePrompt(action: GameAction): string {
    const styleGuide = this.getStyleGuide();

    return `基于玩家的选择，创作主角的内心独白：

选择的动作：${action.type}
动作目标：${action.target || '无'}

写作要求：
${styleGuide.requirements.join('\n')}
- 以第一人称视角描写主角的内心活动
- 体现选择的重要性和主角的心理状态

请创作一段${this.config.maxSegmentLength}字以内的内心独白。`;
  }

  /**
   * 获取写作风格指南
   */
  private getStyleGuide(): { description: string; requirements: string[] } {
    const guides = {
      literary: {
        description: '文学作家',
        requirements: [
          '- 使用优美的文学语言和丰富的修辞手法',
          '- 注重环境描写和心理刻画',
          '- 营造浓厚的文学氛围',
          '- 语言典雅，富有诗意',
        ],
      },
      casual: {
        description: '轻松的故事讲述者',
        requirements: [
          '- 使用轻松自然的语言',
          '- 注重情节的流畅性',
          '- 适当加入幽默元素',
          '- 语言通俗易懂',
        ],
      },
      dramatic: {
        description: '戏剧性的叙述者',
        requirements: [
          '- 强调戏剧冲突和张力',
          '- 使用富有感染力的语言',
          '- 突出情感的起伏变化',
          '- 营造紧张刺激的氛围',
        ],
      },
    };

    return guides[this.config.style!] || guides.literary;
  }

  /**
   * 确定叙述类型
   */
  private determineNarrativeType(action: GameAction): NarrativeSegment['type'] {
    switch (action.type) {
      case 'TALK':
        return 'dialogue';
      case 'ATTACK':
      case 'MOVE':
      case 'SNEAK_PAST':
        return 'narration';
      default:
        return 'description';
    }
  }

  /**
   * 获取最近的叙述内容
   */
  private getRecentNarrative(count: number): string {
    const recent = this.narrativeHistory.slice(-count);
    return recent.map(segment => segment.content).join('\n\n');
  }

  /**
   * 添加叙述片段
   */
  private addNarrativeSegment(segment: NarrativeSegment): void {
    this.narrativeHistory.push(segment);

    // 发布叙述生成事件
    eventBus.emit('NARRATIVE_GENERATED', { segment });

    console.log(`生成叙述片段: ${segment.type} - ${segment.content.substring(0, 50)}...`);
  }

  /**
   * 获取完整的叙述历史
   */
  getNarrativeHistory(): NarrativeSegment[] {
    return [...this.narrativeHistory];
  }

  /**
   * 获取最新的叙述片段
   */
  getLatestNarrative(): NarrativeSegment | null {
    return this.narrativeHistory.length > 0
      ? this.narrativeHistory[this.narrativeHistory.length - 1]
      : null;
  }

  /**
   * 清空叙述历史
   */
  clearHistory(): void {
    this.narrativeHistory = [];
    this.segmentCounter = 0;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<NarrativeAgentConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
