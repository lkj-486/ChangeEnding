/**
 * GameScreen - 主游戏界面组件
 * 负责双栏布局容器和整体游戏界面管理
 * 
 * 严格按照目标设计实现：
 * - 70%故事区域 + 30%交互面板的双栏布局
 * - 响应式设计：桌面优先，移动端自适应
 * - 完整的CSS变量系统支持
 */

import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { NarrativeRenderer } from './NarrativeRenderer';
import { ChoiceManager } from './ChoiceManager';
import { StateDisplay } from './StateDisplay';
import styles from './GameScreen.module.css';

interface GameScreenProps {
  gameId: string;
}

export const GameScreen: React.FC<GameScreenProps> = ({ gameId }) => {
  // 🎯 从gameStore获取所有游戏状态 - 唯一事实来源
  const {
    gamePhase,
    narrativeSegments,
    currentChoicePoint,
    error,
    isLoading
  } = useGameStore();

  // 🎯 使用WebSocket进行通信 - 纯通信服务
  const {
    isConnected,
    connectionStatus
  } = useWebSocket(gameId);

  // 🎯 组件初始化状态
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 组件初始化动画
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 调试日志已移除

  return (
    <div className={`${styles.gameScreen} ${isInitialized ? styles.initialized : ''}`}>
      {/* 主容器 */}
      <div className={styles.container}>
        
        {/* 故事区域 - 70%宽度 */}
        <div className={styles.storyArea}>
          <div className={styles.storyPanel}>
            <NarrativeRenderer
              narrative={narrativeSegments}
              isWaitingForChoice={gamePhase === 'decision'}
            />
          </div>
        </div>

        {/* 交互面板 - 30%宽度 */}
        <div className={styles.interactionPanel}>
          <div className={styles.interactionContent}>
            
            {/* 选择管理器 */}
            <ChoiceManager gameId={gameId} />

            {/* 状态显示器 */}
            <StateDisplay
              connectionStatus={error ? 'error' : isLoading ? 'connecting' : isConnected ? 'connected' : 'disconnected'}
              gameState={{ gameId, error, isLoading, gamePhase }}
              narrativeCount={narrativeSegments.length}
            />

          </div>
        </div>

      </div>

      {/* 背景装饰元素（可选） */}
      <div className={styles.backgroundDecoration} aria-hidden="true" />
    </div>
  );
};

export default GameScreen;
