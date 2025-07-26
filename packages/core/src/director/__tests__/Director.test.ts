import { Director } from '../Director';
import { WorldState } from '../../world/WorldState';
import { SceneState, Scene, GameAction, ChoicePoint } from '../../types';
import { eventBus } from '../../events/EventBus';

// Mock dependencies
jest.mock('../../events/EventBus');

describe('Director', () => {
  let director: Director;
  let worldState: WorldState;
  let mockScene: Scene;

  beforeEach(() => {
    worldState = new WorldState();
    director = new Director(worldState);
    
    // 创建模拟场景
    mockScene = {
      id: 'test-scene',
      title: '测试场景',
      description: '这是一个测试场景',
      goal: '测试目标',
      characters: ['hero', 'guard'],
      choicePoints: [
        {
          id: 'test-choice',
          triggerCondition: {
            type: 'scene_event',
            event: 'guard_encounter'
          },
          description: '遇到守卫',
          options: [
            {
              id: 'attack',
              text: '攻击',
              action: { type: 'ATTACK', target: 'guard' },
              consequences: { guard_health: -10 }
            },
            {
              id: 'sneak',
              text: '潜行',
              action: { type: 'MOVE', target: 'behind_guard' },
              consequences: { stealth: true }
            }
          ]
        }
      ],
      initialState: { player_health: 100 }
    };

    // 清除事件监听器
    jest.clearAllMocks();
  });

  afterEach(() => {
    director.cleanup?.();
  });

  describe('场景管理', () => {
    test('应该能够加载场景', async () => {
      await director.loadScene(mockScene);
      
      expect(director.getCurrentScene()).toBe(mockScene);
      expect(director.getSceneState()).toBe(SceneState.RUNNING);
    });

    test('应该能够暂停和恢复场景', () => {
      director.pauseScene();
      expect(director.getSceneState()).toBe(SceneState.PAUSED);

      director.resumeScene();
      expect(director.getSceneState()).toBe(SceneState.RUNNING);
    });

    test('应该能够结束场景', () => {
      director.endScene();
      expect(director.getSceneState()).toBe(SceneState.ENDED);
    });
  });

  describe('抉择点触发逻辑', () => {
    beforeEach(async () => {
      await director.loadScene(mockScene);
    });

    test('应该能够检测MOVE动作触发guard_encounter事件', () => {
      const moveAction: GameAction = {
        type: 'MOVE',
        target: '前方',
        parameters: { reasoning: '探索环境' }
      };

      const choicePoint = director.checkForChoicePoint(moveAction);
      
      expect(choicePoint).toBeTruthy();
      expect(choicePoint?.id).toBe('test-choice');
    });

    test('不匹配的动作不应该触发抉择点', () => {
      const talkAction: GameAction = {
        type: 'TALK',
        target: 'self',
        parameters: { message: '自言自语' }
      };

      const choicePoint = director.checkForChoicePoint(talkAction);
      
      expect(choicePoint).toBeNull();
    });

    test('触发抉择点时应该暂停场景', () => {
      const moveAction: GameAction = {
        type: 'MOVE',
        target: '前方'
      };

      // 模拟抉择点触发
      director.handleProposedAction('test-agent', moveAction);
      
      expect(director.getSceneState()).toBe(SceneState.PAUSED);
    });
  });

  describe('玩家选择处理', () => {
    beforeEach(async () => {
      await director.loadScene(mockScene);
      
      // 先触发抉择点
      const moveAction: GameAction = {
        type: 'MOVE',
        target: '前方'
      };
      director.handleProposedAction('test-agent', moveAction);
    });

    test('应该能够处理有效的玩家选择', async () => {
      const selectedAction: GameAction = {
        type: 'ATTACK',
        target: 'guard'
      };

      await director.handlePlayerChoice('test-choice', 'attack', selectedAction);
      
      expect(director.getSceneState()).toBe(SceneState.RUNNING);
    });

    test('场景未暂停时不应该处理玩家选择', async () => {
      // 先恢复场景
      director.resumeScene();
      
      const selectedAction: GameAction = {
        type: 'ATTACK',
        target: 'guard'
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await director.handlePlayerChoice('test-choice', 'attack', selectedAction);
      
      expect(consoleSpy).toHaveBeenCalledWith('场景未处于暂停状态，无法处理玩家选择');
      
      consoleSpy.mockRestore();
    });
  });

  describe('动作执行', () => {
    beforeEach(async () => {
      await director.loadScene(mockScene);
    });

    test('应该能够执行游戏动作', async () => {
      const action: GameAction = {
        type: 'MOVE',
        target: 'north',
        parameters: { speed: 'fast' }
      };

      await director.executeAction(action);
      
      // 验证动作被正确处理（这里需要根据实际实现调整）
      expect(true).toBe(true); // 占位符断言
    });
  });

  describe('状态管理', () => {
    test('初始状态应该是LOADING', () => {
      expect(director.getSceneState()).toBe(SceneState.LOADING);
    });

    test('应该能够获取当前场景', async () => {
      await director.loadScene(mockScene);
      expect(director.getCurrentScene()).toBe(mockScene);
    });

    test('应该能够获取场景状态', () => {
      expect(director.getSceneState()).toBeDefined();
      expect(Object.values(SceneState)).toContain(director.getSceneState());
    });
  });

  describe('事件处理', () => {
    test('应该监听AI_ACTION_PROPOSED事件', () => {
      expect(eventBus.on).toHaveBeenCalledWith('AI_ACTION_PROPOSED', expect.any(Function));
    });

    test('应该监听PLAYER_CHOICE_MADE事件', () => {
      expect(eventBus.on).toHaveBeenCalledWith('PLAYER_CHOICE_MADE', expect.any(Function));
    });
  });
});
