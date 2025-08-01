import { LLMAdapter, LLMRequest, LLMResponse } from '../../types';

/**
 * Mock LLM适配器配置
 */
export interface MockLLMConfig {
  enableScenarioResponses?: boolean;
  defaultDelay?: number;
  enableLogging?: boolean;
}

/**
 * 场景特定响应配置
 */
interface ScenarioResponse {
  sceneId: string;
  responses: {
    [key: string]: string; // 基于prompt类型的响应
  };
}

/**
 * Mock LLM适配器
 * 提供模拟的LLM响应，支持场景特定的预设响应
 */
export class MockLLMAdapter implements LLMAdapter {
  private config: MockLLMConfig;
  private defaultResponses: Map<string, string> = new Map();
  private sceneResponses: Map<string, ScenarioResponse> = new Map();

  constructor(config: MockLLMConfig = {}) {
    this.config = {
      enableScenarioResponses: true,
      defaultDelay: 1000,
      enableLogging: true,
      ...config,
    };

    this.initializeDefaultResponses();
    this.initializeScenarioResponses();
  }

  /**
   * 检查适配器是否可用
   */
  isAvailable(): boolean {
    return true; // Mock适配器始终可用
  }

  /**
   * 生成模拟响应
   */
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    if (this.config.enableLogging) {
      console.log('🤖 MockLLM收到请求:', {
        promptLength: request.prompt.length,
        hasContext: !!request.context,
        maxTokens: request.maxTokens,
      });
    }

    // 模拟网络延迟
    await this.simulateDelay();

    try {
      let content: string;

      // 检查是否有场景特定响应
      if (this.config.enableScenarioResponses && this.hasSceneContext(request.prompt)) {
        content = this.getSceneSpecificResponse(request);
      } else {
        content = this.getDefaultResponse(request);
      }

      const response: LLMResponse = {
        content: content.trim(),
        usage: {
          promptTokens: Math.floor(request.prompt.length / 4), // 粗略估算
          completionTokens: Math.floor(content.length / 4),
          totalTokens: Math.floor((request.prompt.length + content.length) / 4),
        },
      };

      if (this.config.enableLogging) {
        console.log('🤖 MockLLM生成响应:', {
          contentLength: content.length,
          usage: response.usage,
        });
      }

      return response;
    } catch (error) {
      console.error('MockLLM生成响应失败:', error);
      throw new Error(`Mock LLM错误: ${(error as Error).message}`);
    }
  }

  /**
   * 初始化默认响应
   */
  private initializeDefaultResponses(): void {
    // 🔧 修复：AI动作生成响应 - 使用动态生成而不是固定响应
    // 这个默认响应现在只是占位符，实际会在generateResponse中动态生成
    this.defaultResponses.set('action', JSON.stringify({
      type: 'EXPLORE',
      target: '周围环境',
      parameters: {
        reasoning: '探索周围环境，寻找线索',
        expected_outcome: '发现新的信息或物品'
      }
    }));

    // 叙事生成响应
    this.defaultResponses.set('narrative', 
      '微弱的光线透过铁栅栏洒进这间阴暗的牢房。石墙上布满了岁月的痕迹，空气中弥漫着潮湿和霉味。主角缓缓睁开眼睛，意识逐渐清醒，开始审视这个陌生而危险的环境。'
    );

    // 场景开场响应
    this.defaultResponses.set('scene_opening',
      '故事在一个神秘的地方展开。周围的环境充满了未知和挑战，主角必须运用智慧和勇气来面对即将到来的考验。每一个选择都可能改变故事的走向。'
    );

    // 选择叙述响应
    this.defaultResponses.set('choice_narrative',
      '在这个关键时刻，主角的内心充满了矛盾。不同的选择意味着不同的风险和机遇。经过深思熟虑，一个决定在心中逐渐清晰起来。'
    );
  }

  /**
   * 初始化场景特定响应（预留扩展）
   */
  private initializeScenarioResponses(): void {
    // 逃出地牢场景的特定响应
    this.sceneResponses.set('escape-dungeon', {
      sceneId: 'escape-dungeon',
      responses: {
        scene_opening: '冰冷的石墙，生锈的铁栅栏，还有远处传来的滴水声。艾伦在这个阴暗的地牢中醒来，头脑中一片混乱。他必须想办法逃出这里，但首先需要了解周围的环境和可能的威胁。',
        action_move: JSON.stringify({
          type: 'MOVE',
          target: '牢房角落',
          parameters: {
            reasoning: '检查牢房的每个角落，寻找可能的逃脱工具或线索',
            expected_outcome: '发现隐藏的物品或了解牢房结构'
          }
        }),
        narrative_stealth: '艾伦小心翼翼地贴着墙壁移动，每一步都尽量避免发出声音。他的心跳声在寂静的地牢中显得格外清晰，但多年的冒险经历让他知道如何在危险中保持冷静。',
      }
    });
  }

  /**
   * 检查请求是否包含场景上下文
   */
  private hasSceneContext(prompt: string): boolean {
    // 检查prompt中是否包含场景ID或特定关键词
    const sceneKeywords = ['escape-dungeon', 'sceneId', '地牢', '守卫', '艾伦'];
    return sceneKeywords.some(keyword => prompt.toLowerCase().includes(keyword.toLowerCase()));
  }

  /**
   * 🔧 生成随机动作，解决AI代理无限循环问题
   */
  private generateRandomAction(): string {
    const actionTypes = [
      'MOVE', 'EXPLORE', 'LOOK_AROUND', 'SEARCH', 'LISTEN',
      'HIDE', 'WAIT', 'INTERACT', 'SNEAK_PAST', 'DISTRACT'
    ];

    const targets = [
      '牢房角落', '铁栅栏', '石墙', '地面', '走廊',
      '门口', '阴影处', '远处', '周围环境', '可疑区域'
    ];

    const reasonings = [
      '寻找逃脱的线索', '检查是否有隐藏物品', '观察周围环境',
      '倾听是否有脚步声', '寻找薄弱点', '避免被发现',
      '等待合适时机', '探索新区域', '分析当前情况', '制定逃脱计划'
    ];

    const outcomes = [
      '发现有用信息', '找到隐藏物品', '了解环境布局',
      '获得战术优势', '避免危险', '找到逃脱路线',
      '制定更好策略', '发现守卫弱点', '获得时间优势', '找到关键线索'
    ];

    // 使用时间戳确保真正的随机性
    const timestamp = Date.now();
    const actionIndex = timestamp % actionTypes.length;
    const targetIndex = (timestamp + 1) % targets.length;
    const reasoningIndex = (timestamp + 2) % reasonings.length;
    const outcomeIndex = (timestamp + 3) % outcomes.length;

    return JSON.stringify({
      type: actionTypes[actionIndex],
      target: targets[targetIndex],
      parameters: {
        reasoning: reasonings[reasoningIndex],
        expected_outcome: outcomes[outcomeIndex]
      }
    });
  }

  /**
   * 获取场景特定响应
   */
  private getSceneSpecificResponse(request: LLMRequest): string {
    const prompt = request.prompt.toLowerCase();
    
    // 检测场景ID
    let sceneId = 'escape-dungeon'; // 默认场景
    if (prompt.includes('escape-dungeon')) {
      sceneId = 'escape-dungeon';
    }

    const scenario = this.sceneResponses.get(sceneId);
    if (!scenario) {
      return this.getDefaultResponse(request);
    }

    // 根据prompt内容类型选择响应
    if (prompt.includes('开场') || prompt.includes('opening')) {
      return scenario.responses.scene_opening || this.defaultResponses.get('scene_opening')!;
    }
    
    if (prompt.includes('动作') || prompt.includes('action')) {
      // 🔧 修复：动态生成多样化的动作，而不是总是返回相同的MOVE
      return this.generateRandomAction();
    }
    
    if (prompt.includes('潜行') || prompt.includes('stealth')) {
      return scenario.responses.narrative_stealth || this.defaultResponses.get('narrative')!;
    }

    // 默认返回场景开场
    return scenario.responses.scene_opening || this.getDefaultResponse(request);
  }

  /**
   * 获取默认响应
   */
  private getDefaultResponse(request: LLMRequest): string {
    const prompt = request.prompt.toLowerCase();

    // 根据prompt内容判断响应类型
    if (prompt.includes('json') || prompt.includes('action') || prompt.includes('动作')) {
      // 🔧 修复：在默认响应中也使用随机动作生成
      return this.generateRandomAction();
    }
    
    if (prompt.includes('叙述') || prompt.includes('narrative') || prompt.includes('故事')) {
      return this.defaultResponses.get('narrative')!;
    }
    
    if (prompt.includes('开场') || prompt.includes('opening')) {
      return this.defaultResponses.get('scene_opening')!;
    }
    
    if (prompt.includes('选择') || prompt.includes('choice')) {
      return this.defaultResponses.get('choice_narrative')!;
    }

    // 默认叙事响应
    return this.defaultResponses.get('narrative')!;
  }

  /**
   * 模拟网络延迟
   */
  private async simulateDelay(): Promise<void> {
    const delay = this.config.defaultDelay! + Math.random() * 500; // 添加随机延迟
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 添加自定义场景响应（运行时扩展）
   */
  addScenarioResponse(sceneId: string, responseType: string, content: string): void {
    let scenario = this.sceneResponses.get(sceneId);
    if (!scenario) {
      scenario = { sceneId, responses: {} };
      this.sceneResponses.set(sceneId, scenario);
    }
    scenario.responses[responseType] = content;
    
    if (this.config.enableLogging) {
      console.log(`🤖 添加场景响应: ${sceneId}.${responseType}`);
    }
  }

  /**
   * 获取适配器信息
   */
  getModelInfo(): {
    provider: string;
    model: string;
    maxTokens: number;
    supportedFeatures: string[];
  } {
    return {
      provider: 'Mock',
      model: 'mock-llm-v1',
      maxTokens: 4096,
      supportedFeatures: [
        'text-generation',
        'scenario-responses',
        'chinese-support',
        'json-output',
        'development-mode'
      ],
    };
  }
}
