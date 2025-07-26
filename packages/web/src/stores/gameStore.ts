import { create } from 'zustand';
import { apiClient } from '../services/api';

interface GameState {
  // 游戏状态
  gameId: string | null;
  storyId: string | null;
  isGameActive: boolean;
  isLoading: boolean;
  error: string | null;

  // 游戏数据
  currentScene: any;
  narrativeHistory: any[];
  currentChoice: any;
  isWaitingForChoice: boolean;

  // 动作
  startGame: (storyId: string, userId?: string) => Promise<void>;
  endGame: () => void;
  pauseGame: () => Promise<void>;
  resumeGame: () => Promise<void>;
  clearError: () => void;
  updateGameState: (state: Partial<GameState>) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // 初始状态
  gameId: null,
  storyId: null,
  isGameActive: false,
  isLoading: false,
  error: null,
  currentScene: null,
  narrativeHistory: [],
  currentChoice: null,
  isWaitingForChoice: false,

  // 开始游戏
  startGame: async (storyId: string, userId?: string) => {
    console.log("🔍 调试步骤2: startGame函数开始执行", { storyId, userId });
    set({ isLoading: true, error: null });

    try {
      // 调用API创建新游戏
      console.log("🔍 调试步骤2: 准备调用API创建游戏", { storyId });
      const response = await apiClient.createNewGame(storyId, userId);
      console.log("🔍 调试步骤2: API响应成功", { response });
      console.log("🔍 调试步骤2.1: 响应结构分析", {
        responseType: typeof response,
        responseKeys: Object.keys(response || {}),
        hasData: 'data' in (response || {}),
        dataContent: response?.data,
        dataKeys: response?.data ? Object.keys(response.data) : 'data不存在',
        fullResponse: response
      });

      // 根据响应结构分析，修复数据访问路径
      const gameData = response.data || response; // 兼容不同的响应结构
      const gameId = gameData.gameId || gameData.data?.gameId;
      const scene = gameData.scene || gameData.data?.scene;

      console.log("🔍 调试步骤3: 更新应用状态", {
        gameId,
        scene,
        gameData,
        originalResponse: response
      });

      if (!gameId) {
        throw new Error('无法从API响应中获取gameId');
      }

      set({
        gameId,
        storyId,
        isGameActive: true,
        isLoading: false,
        currentScene: scene,
        error: null,
      });
      console.log("🔍 调试步骤3: 状态更新完成，应触发界面切换");

    } catch (error) {
      console.error('🔍 调试步骤2: 开始游戏失败:', error);

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
      narrativeHistory: [],
      currentChoice: null,
      isWaitingForChoice: false,
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

  // 更新游戏状态
  updateGameState: (newState: Partial<GameState>) => {
    set(newState);
  },
}));
