/**
 * 数据库服务：游戏状态持久化
 * 
 * 实现轻量级事件溯源：将游戏状态以JSON格式存储到数据库
 * 使用简单的状态快照方案，避免复杂的事件回放机制
 */

import { PrismaClient } from '@prisma/client';

// 游戏状态快照接口
export interface GameStateSnapshot {
  gameId: string;
  storyId: string;
  userId?: string;
  currentSceneId?: string;
  sceneState: string;
  narrativeLedger: any; // 完整的叙事账本
  worldStateJson: any; // 游戏世界状态
  narrativeHistory: any[]; // 叙事历史
  choiceHistory: any[]; // 选择历史
  gameProgress: any; // 游戏进度
  snapshotVersion: string;
  isActive: boolean;
}

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * 保存游戏状态快照
   */
  async saveGameState(snapshot: GameStateSnapshot): Promise<void> {
    try {
      console.log(`💾 保存游戏状态快照: ${snapshot.gameId}`);

      await this.prisma.gameState.upsert({
        where: { gameId: snapshot.gameId },
        update: {
          currentSceneId: snapshot.currentSceneId,
          sceneState: snapshot.sceneState,
          narrativeLedger: snapshot.narrativeLedger,
          worldStateJson: snapshot.worldStateJson,
          narrativeHistory: snapshot.narrativeHistory,
          choiceHistory: snapshot.choiceHistory,
          gameProgress: snapshot.gameProgress,
          snapshotVersion: snapshot.snapshotVersion,
          isActive: snapshot.isActive,
          lastPlayedAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          gameId: snapshot.gameId,
          storyId: snapshot.storyId,
          userId: snapshot.userId,
          currentSceneId: snapshot.currentSceneId,
          sceneState: snapshot.sceneState,
          narrativeLedger: snapshot.narrativeLedger,
          worldStateJson: snapshot.worldStateJson,
          narrativeHistory: snapshot.narrativeHistory,
          choiceHistory: snapshot.choiceHistory,
          gameProgress: snapshot.gameProgress,
          snapshotVersion: snapshot.snapshotVersion,
          isActive: snapshot.isActive,
          lastPlayedAt: new Date()
        }
      });

      console.log(`✅ 游戏状态保存成功: ${snapshot.gameId}`);
    } catch (error) {
      console.error(`❌ 保存游戏状态失败: ${snapshot.gameId}`, error);
      throw error;
    }
  }

  /**
   * 加载游戏状态快照
   */
  async loadGameState(gameId: string): Promise<GameStateSnapshot | null> {
    try {
      console.log(`📂 加载游戏状态: ${gameId}`);

      const gameState = await this.prisma.gameState.findUnique({
        where: { gameId },
        include: {
          story: true,
          user: true
        }
      });

      if (!gameState) {
        console.log(`⚠️ 游戏状态不存在: ${gameId}`);
        return null;
      }

      const snapshot: GameStateSnapshot = {
        gameId: gameState.gameId,
        storyId: gameState.storyId,
        userId: gameState.userId || undefined,
        currentSceneId: gameState.currentSceneId || undefined,
        sceneState: gameState.sceneState,
        narrativeLedger: gameState.narrativeLedger,
        worldStateJson: gameState.worldStateJson,
        narrativeHistory: gameState.narrativeHistory as any[],
        choiceHistory: gameState.choiceHistory as any[],
        gameProgress: gameState.gameProgress,
        snapshotVersion: gameState.snapshotVersion,
        isActive: gameState.isActive
      };

      console.log(`✅ 游戏状态加载成功: ${gameId}`);
      return snapshot;
    } catch (error) {
      console.error(`❌ 加载游戏状态失败: ${gameId}`, error);
      throw error;
    }
  }

  /**
   * 获取用户的活跃游戏列表
   */
  async getUserActiveGames(userId: string): Promise<GameStateSnapshot[]> {
    try {
      const gameStates = await this.prisma.gameState.findMany({
        where: {
          userId,
          isActive: true
        },
        include: {
          story: true
        },
        orderBy: {
          lastPlayedAt: 'desc'
        }
      });

      return gameStates.map((gameState: any) => ({
        gameId: gameState.gameId,
        storyId: gameState.storyId,
        userId: gameState.userId || undefined,
        currentSceneId: gameState.currentSceneId || undefined,
        sceneState: gameState.sceneState,
        narrativeLedger: gameState.narrativeLedger,
        worldStateJson: gameState.worldStateJson,
        narrativeHistory: gameState.narrativeHistory as any[],
        choiceHistory: gameState.choiceHistory as any[],
        gameProgress: gameState.gameProgress,
        snapshotVersion: gameState.snapshotVersion,
        isActive: gameState.isActive
      }));
    } catch (error) {
      console.error(`❌ 获取用户活跃游戏失败: ${userId}`, error);
      throw error;
    }
  }

  /**
   * 标记游戏为非活跃状态
   */
  async deactivateGame(gameId: string): Promise<void> {
    try {
      await this.prisma.gameState.update({
        where: { gameId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      console.log(`✅ 游戏已标记为非活跃: ${gameId}`);
    } catch (error) {
      console.error(`❌ 标记游戏非活跃失败: ${gameId}`, error);
      throw error;
    }
  }

  /**
   * 清理旧的游戏状态（可选的维护功能）
   */
  async cleanupOldGames(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.prisma.gameState.deleteMany({
        where: {
          isActive: false,
          updatedAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`🧹 清理了 ${result.count} 个旧游戏状态`);
      return result.count;
    } catch (error) {
      console.error('❌ 清理旧游戏状态失败:', error);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
