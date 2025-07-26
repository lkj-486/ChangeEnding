import { configManager } from '@storyweaver/core';

/**
 * Mock模式配置
 */
export interface MockConfig {
  enabled: boolean;
  llm: {
    enableScenarioResponses: boolean;
    defaultDelay: number;
    enableLogging: boolean;
  };
  database: {
    useMockData: boolean;
    autoSeed: boolean;
  };
  api: {
    enableMockResponses: boolean;
    simulateErrors: boolean;
    errorRate: number; // 0-1之间，模拟错误的概率
  };
}

/**
 * 获取Mock配置
 */
export function getMockConfig(): MockConfig {
  const config = configManager.getConfig();
  
  return {
    enabled: config.isMockMode,
    llm: {
      enableScenarioResponses: config.llm.mock.enableScenarioResponses,
      defaultDelay: config.llm.mock.defaultDelay,
      enableLogging: config.llm.mock.enableLogging,
    },
    database: {
      useMockData: config.isMockMode,
      autoSeed: config.isDevelopment,
    },
    api: {
      enableMockResponses: config.isMockMode,
      simulateErrors: config.isDevelopment,
      errorRate: 0.05, // 5%的错误率用于测试
    },
  };
}

/**
 * Mock数据生成器
 */
export class MockDataGenerator {
  /**
   * 生成Mock游戏状态
   */
  static generateMockGameState(gameId: string, storyId: string) {
    return {
      id: gameId,
      storyId,
      userId: null,
      currentSceneId: 'escape-dungeon',
      sceneState: 'RUNNING',
      worldState: JSON.stringify({
        entities: [
          {
            id: 'hero',
            components: {
              Identity: { id: 'hero', displayName: '艾伦', description: '勇敢的冒险者' },
              Position: { x: 0, y: 0, z: 0 },
              IsInScene: { sceneId: 'escape-dungeon' }
            }
          }
        ],
        entityCounter: 1
      }),
      narrativeHistory: JSON.stringify([
        {
          id: 'narrative_1',
          type: 'description',
          content: '冰冷的石墙，生锈的铁栅栏，还有远处传来的滴水声。艾伦在这个阴暗的地牢中醒来，头脑中一片混乱。',
          timestamp: Date.now() - 10000
        }
      ]),
      choiceHistory: JSON.stringify([]),
      gameProgress: JSON.stringify({ currentStep: 1, totalSteps: 10 }),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastPlayedAt: new Date()
    };
  }

  /**
   * 生成Mock故事数据
   */
  static generateMockStory(storyId: string) {
    return {
      id: storyId,
      title: '逃出地牢',
      description: '一个关于勇气、智慧和选择的冒险故事。主角必须运用自己的能力逃出神秘的地牢。',
      author: 'StoryWeaver AI',
      version: '1.0.0',
      isActive: true,
      metadata: JSON.stringify({
        difficulty: 'medium',
        estimatedPlayTime: '15-30分钟',
        themes: ['冒险', '解谜', '选择'],
        tags: ['地牢', '逃脱', '互动']
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * 生成Mock选择点
   */
  static generateMockChoicePoint(choicePointId: string) {
    return {
      choicePointId,
      options: [
        {
          id: 'option_1',
          text: '直接攻击守卫',
          action: {
            type: 'ATTACK',
            target: 'guard',
            parameters: {
              reasoning: '正面对抗，快速解决威胁',
              expected_outcome: '击败守卫但可能受伤'
            }
          }
        },
        {
          id: 'option_2',
          text: '尝试悄悄绕过守卫',
          action: {
            type: 'SNEAK_PAST',
            target: 'guard',
            parameters: {
              reasoning: '避免冲突，保持隐蔽',
              expected_outcome: '安全通过但需要技巧'
            }
          }
        },
        {
          id: 'option_3',
          text: '尝试与守卫对话',
          action: {
            type: 'TALK',
            target: 'guard',
            parameters: {
              reasoning: '通过交流获取信息或说服',
              expected_outcome: '可能获得帮助或信息'
            }
          }
        }
      ],
      context: {
        description: '主角在移动时遭遇了守卫，必须决定如何应对这个关键时刻。',
        sceneId: 'escape-dungeon',
        characterId: 'hero'
      },
      timestamp: Date.now()
    };
  }

  /**
   * 生成Mock叙述片段
   */
  static generateMockNarrative(segmentId: string, type: string = 'narration') {
    const narratives = {
      narration: '艾伦小心翼翼地观察着周围的环境。石墙上的青苔散发着潮湿的气味，远处传来的脚步声让他保持着高度警觉。',
      dialogue: '"谁在那里？"守卫的声音在走廊中回响，艾伦屏住呼吸，紧贴着墙壁。',
      internal_thought: '我必须保持冷静，艾伦在心中告诉自己。每一个决定都可能决定我的命运。',
      description: '昏暗的走廊延伸向远方，墙壁上的火把投下摇曳的影子。空气中弥漫着古老和神秘的气息。'
    };

    return {
      id: segmentId,
      type,
      content: narratives[type as keyof typeof narratives] || narratives.narration,
      timestamp: Date.now()
    };
  }
}

/**
 * Mock API响应生成器
 */
export class MockAPIResponseGenerator {
  private static errorRate = 0.05;

  /**
   * 检查是否应该模拟错误
   */
  static shouldSimulateError(): boolean {
    const mockConfig = getMockConfig();
    return mockConfig.api.simulateErrors && Math.random() < mockConfig.api.errorRate;
  }

  /**
   * 生成成功响应
   */
  static generateSuccessResponse(data: any, message: string = '操作成功') {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 生成错误响应
   */
  static generateErrorResponse(error: string, code: string = 'MOCK_ERROR') {
    return {
      success: false,
      error: {
        type: 'MockError',
        code,
        message: error,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 模拟网络延迟
   */
  static async simulateDelay(min: number = 100, max: number = 500): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * 打印Mock模式信息
 */
export function printMockModeInfo(): void {
  const mockConfig = getMockConfig();
  
  if (!mockConfig.enabled) return;

  console.log('🎭 Mock Mode Enabled');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Features:');
  console.log(`   • LLM Responses: ${mockConfig.llm.enableScenarioResponses ? '✅ Scenario-aware' : '⚠️  Basic'}`);
  console.log(`   • Response Delay: ${mockConfig.llm.defaultDelay}ms`);
  console.log(`   • Database: ${mockConfig.database.useMockData ? '🎭 Mock Data' : '💾 Real Data'}`);
  console.log(`   • Error Simulation: ${mockConfig.api.simulateErrors ? `✅ ${(mockConfig.api.errorRate * 100).toFixed(1)}%` : '❌ Disabled'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
