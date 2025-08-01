import { create } from 'zustand';
import { apiClient } from '../services/api';
import { NarrativeItem, ChoicePoint as GameChoicePoint } from '../types/game';

// 🎯 游戏阶段枚举
export type GamePhase = 'narrative' | 'decision';

// 🎯 使用统一的类型定义
export type NarrativeSegment = NarrativeItem;
export type ChoicePoint = GameChoicePoint;

interface GameState {
  // 🎯 核心游戏状态
  gameId: string | null;
  storyId: string | null;
  isGameActive: boolean;
  isLoading: boolean;
  error: string | null;

  // 🎯 游戏阶段管理 - 唯一事实来源
  gamePhase: GamePhase;
  narrativeSegments: NarrativeSegment[];
  currentChoicePoint: ChoicePoint | null;

  // 🎯 场景状态
  currentScene: any;

  // 🎯 核心动作
  startGame: (storyId: string, userId?: string) => Promise<void>;
  endGame: () => void;
  pauseGame: () => Promise<void>;
  resumeGame: () => Promise<void>;
  clearError: () => void;

  // 🎯 状态管理原子操作 - 由WebSocket调用
  addNarrativeSegment: (segment: NarrativeSegment) => void;
  setChoicePoint: (choicePoint: ChoicePoint | null) => void;
  setGamePhase: (phase: GamePhase) => void;

  // 🎯 选择处理
  submitChoice: (optionId: string) => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  // 🎯 初始状态
  gameId: null,
  storyId: null,
  isGameActive: false,
  isLoading: false,
  error: null,

  // 🎯 游戏阶段管理
  gamePhase: 'narrative' as GamePhase,
  narrativeSegments: [],
  currentChoicePoint: null,

  // 🎯 场景状态
  currentScene: null,

  // 开始游戏
  startGame: async (storyId: string, userId?: string) => {
    const currentState = get();

    // 🚨 防止重复调用：如果游戏已经激活且是同一个故事，直接返回
    if (currentState.isGameActive && currentState.storyId === storyId && currentState.gameId) {
      console.log('⚠️ [gameStore] 游戏已激活，跳过重复的startGame调用', {
        currentGameId: currentState.gameId,
        currentStoryId: currentState.storyId,
        narrativeCount: currentState.narrativeSegments.length
      });
      return;
    }

    console.log("🔍 [gameStore] startGame函数开始执行", {
      storyId,
      userId,
      currentGameActive: currentState.isGameActive,
      currentNarrativeCount: currentState.narrativeSegments.length
    });

    set({ isLoading: true, error: null });

    try {
      // 调用API创建新游戏
      console.log("🔍 [gameStore] 准备调用API创建游戏", { storyId });
      const response = await apiClient.createNewGame(storyId, userId);
      console.log("🔍 [gameStore] API响应成功", { response });

      // 根据响应结构分析，修复数据访问路径
      const gameData = response.data || response; // 兼容不同的响应结构
      const gameId = gameData.gameId || gameData.data?.gameId;
      const scene = gameData.scene || gameData.data?.scene;

      if (!gameId) {
        throw new Error('无法从API响应中获取gameId');
      }

      // 🔧 修复：只在真正开始新游戏时重置叙事状态
      const isNewGame = currentState.gameId !== gameId;

      console.log('🔍 [gameStore] startGame状态检查', {
        currentGameId: currentState.gameId,
        newGameId: gameId,
        isNewGame,
        currentNarrativeCount: currentState.narrativeSegments.length,
        willResetNarrative: isNewGame
      });

      // 🚨 重要：只有在真正的新游戏时才重置状态
      if (isNewGame) {
        console.log('🆕 [gameStore] 开始新游戏，重置所有状态');
        set({
          gameId,
          storyId,
          isGameActive: true,
          isLoading: false,
          currentScene: scene,
          error: null,
          gamePhase: 'narrative' as GamePhase,
          narrativeSegments: [],
          currentChoicePoint: null,
        });
      } else {
        console.log('🔄 [gameStore] 继续现有游戏，保留叙事内容');
        set({
          gameId,
          storyId,
          isGameActive: true,
          isLoading: false,
          currentScene: scene,
          error: null,
          // 🚨 关键：不重置 gamePhase, narrativeSegments, currentChoicePoint
        });
      }

    } catch (error) {
      console.error('🔍 [gameStore] 开始游戏失败:', error);

      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '开始游戏失败',
      });

      throw error;
    }
  },

  // 结束游戏
  endGame: () => {
    const { gameId } = get();
    
    if (gameId) {
      // 异步调用API结束游戏，但不等待结果
      apiClient.endGame(gameId).catch(error => {
        console.error('结束游戏API调用失败:', error);
      });
    }

    set({
      gameId: null,
      storyId: null,
      isGameActive: false,
      currentScene: null,
      // 🎯 重置游戏阶段状态
      gamePhase: 'narrative',
      narrativeSegments: [],
      currentChoicePoint: null,
      error: null,
    });
  },

  // 暂停游戏
  pauseGame: async () => {
    const { gameId } = get();
    if (!gameId) return;

    try {
      await apiClient.pauseGame(gameId);
    } catch (error) {
      console.error('暂停游戏失败:', error);
      set({ error: error instanceof Error ? error.message : '暂停游戏失败' });
    }
  },

  // 恢复游戏
  resumeGame: async () => {
    const { gameId } = get();
    if (!gameId) return;

    try {
      await apiClient.resumeGame(gameId);
    } catch (error) {
      console.error('恢复游戏失败:', error);
      set({ error: error instanceof Error ? error.message : '恢复游戏失败' });
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },

  // 🎯 状态管理原子操作 - 由WebSocket调用
  addNarrativeSegment: (segment: NarrativeSegment) => {
    set((state: GameState) => {
      // 检查是否已存在相同ID的段落
      const exists = state.narrativeSegments.some((s: NarrativeSegment) => s.id === segment.id);
      if (exists) {
        console.log('⚠️ [gameStore] 叙述段落已存在，跳过', { segmentId: segment.id });
        return state;
      }

      console.log('✅ [gameStore] 添加新叙述段落', {
        segmentId: segment.id,
        type: segment.type,
        contentLength: typeof segment.content === 'string' ? segment.content.length : JSON.stringify(segment.content).length,
        previousCount: state.narrativeSegments.length,
        currentGameId: state.gameId,
        gamePhase: state.gamePhase
      });

      const newSegments = [...state.narrativeSegments, segment];

      console.log('🔍 [gameStore] 叙述段落状态更新', {
        beforeCount: state.narrativeSegments.length,
        afterCount: newSegments.length,
        allSegmentIds: newSegments.map(s => s.id)
      });

      // 🚨 单一事实来源：gamePhase完全由choicePoint的存在性决定
      // 如果存在choicePoint，保持decision状态；否则设置为narrative
      const gamePhase = state.currentChoicePoint ? 'decision' : 'narrative';

      return {
        ...state,
        narrativeSegments: newSegments, // 移除排序，保持接收顺序
        gamePhase: gamePhase as GamePhase
      };
    });
  },

  setChoicePoint: (choicePoint: ChoicePoint | null) => {
    console.log('🎯 [gameStore] setChoicePoint被调用', {
      hasChoicePoint: !!choicePoint,
      choicePointId: choicePoint?.choicePointId,
      optionsCount: choicePoint?.options?.length || 0
    });

    set((state: GameState) => {
      const newGamePhase = (choicePoint ? 'decision' : 'narrative') as GamePhase;

      console.log('🔄 [gameStore] 状态更新', {
        oldGamePhase: state.gamePhase,
        newGamePhase,
        oldChoicePoint: state.currentChoicePoint?.choicePointId,
        newChoicePoint: choicePoint?.choicePointId
      });

      // 🚨 单一事实来源：gamePhase完全由choicePoint的存在性决定
      return {
        ...state,
        currentChoicePoint: choicePoint,
        gamePhase: newGamePhase
      };
    });

    console.log('✅ [gameStore] setChoicePoint完成');
  },

  setGamePhase: (phase: GamePhase) => {
    set((state: GameState) => {
      console.log('🎮 [gameStore] 设置游戏阶段', { from: state.gamePhase, to: phase });
      return { ...state, gamePhase: phase };
    });
  },

  // 🎯 选择处理
  submitChoice: async (optionId: string) => {
    const { gameId, currentChoicePoint } = get();

    if (!gameId || !currentChoicePoint) {
      console.warn('⚠️ [gameStore] 无法提交选择：缺少gameId或currentChoicePoint');
      return;
    }

    try {
      await apiClient.makeChoice(
        gameId,
        currentChoicePoint.choicePointId,
        optionId
      );

      // 选择提交后，等待WebSocket推送新状态
      // 不在这里直接清理状态，保持"先提交，后清理"原则

    } catch (error) {
      console.error('🚨 [gameStore] 选择提交失败:', error);
      set({ error: error instanceof Error ? error.message : '选择提交失败' });
      throw error;
    }
  },
}));
