/**
 * StateDisplay - 状态显示组件
 * 负责显示游戏状态、连接状态和其他系统信息
 * 
 * 功能特性：
 * - 连接状态指示器
 * - 游戏进度显示
 * - 叙事账本状态（开发模式）
 * - 状态变化动画效果
 */

import React, { useEffect, useState } from 'react';
import { GamePhase } from '@/stores/gameStore';
import styles from './StateDisplay.module.css';

interface StateDisplayProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  gameState?: any;
  narrativeCount: number;
}

export const StateDisplay: React.FC<StateDisplayProps> = ({
  connectionStatus,
  gameState,
  narrativeCount
}) => {
  const [lastStatusChange, setLastStatusChange] = useState<Date>(new Date());
  const [showStatusFlash, setShowStatusFlash] = useState(false);

  // 状态变化动画
  useEffect(() => {
    setLastStatusChange(new Date());
    setShowStatusFlash(true);
    
    const timer = setTimeout(() => {
      setShowStatusFlash(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [connectionStatus]);

  // 获取状态显示文本和样式
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          text: '已连接',
          className: styles.connected,
          icon: '●'
        };
      case 'connecting':
        return {
          text: '连接中',
          className: styles.connecting,
          icon: '◐'
        };
      case 'disconnected':
        return {
          text: '已断开',
          className: styles.disconnected,
          icon: '○'
        };
      case 'error':
        return {
          text: '连接错误',
          className: styles.error,
          icon: '✕'
        };
      default:
        return {
          text: '未知',
          className: styles.unknown,
          icon: '?'
        };
    }
  };

  const statusInfo = getStatusInfo();

  // 🎯 获取游戏状态文本 - 基于gamePhase
  const getGameStatus = () => {
    if (!gameState) return '未知';

    // 🎯 基于gamePhase显示更准确的状态
    if (gameState.gamePhase === 'narrative') {
      return 'AI叙事中';
    } else if (gameState.gamePhase === 'decision') {
      return '等待选择';
    }

    // 兼容旧的状态判断逻辑
    if (gameState.isWaitingForChoice) return '等待选择';
    if (gameState.isProcessing) return '处理中';
    return '进行中';
  };

  // 🎯 获取游戏阶段图标
  const getGamePhaseIcon = () => {
    if (!gameState?.gamePhase) return '▶';

    switch (gameState.gamePhase) {
      case 'narrative':
        return '📖'; // AI叙事阶段
      case 'decision':
        return '🎯'; // 决策阶段
      default:
        return '▶';
    }
  };

  return (
    <div className={styles.stateDisplay}>
      
      {/* 连接状态指示器 */}
      <div className={styles.statusSection}>
        <h4 className={styles.sectionTitle}>系统状态</h4>
        
        <div className={styles.statusItem}>
          <div className={styles.statusLabel}>连接状态</div>
          <div 
            className={`${styles.statusValue} ${statusInfo.className} ${
              showStatusFlash ? styles.flash : ''
            }`}
          >
            <span className={styles.statusIcon}>{statusInfo.icon}</span>
            {statusInfo.text}
          </div>
        </div>

        <div className={styles.statusItem}>
          <div className={styles.statusLabel}>游戏状态</div>
          <div className={styles.statusValue}>
            <span className={styles.statusIcon}>{getGamePhaseIcon()}</span>
            {getGameStatus()}
          </div>
        </div>

        {/* 🎯 游戏阶段显示 */}
        {gameState?.gamePhase && (
          <div className={styles.statusItem}>
            <div className={styles.statusLabel}>当前阶段</div>
            <div className={styles.statusValue}>
              <span className={styles.statusIcon}>
                {gameState.gamePhase === 'narrative' ? '🤖' : '👤'}
              </span>
              {gameState.gamePhase === 'narrative' ? 'AI思考中' : '玩家决策'}
            </div>
          </div>
        )}
      </div>

      {/* 游戏进度 */}
      <div className={styles.progressSection}>
        <h4 className={styles.sectionTitle}>游戏进度</h4>
        
        <div className={styles.progressItem}>
          <div className={styles.progressLabel}>叙事段落</div>
          <div className={styles.progressValue}>
            共 {narrativeCount} 段叙述
          </div>
        </div>

        {/* 游戏ID（调试信息） */}
        {process.env.NODE_ENV === 'development' && gameState?.gameId && (
          <div className={styles.debugInfo}>
            <div className={styles.debugLabel}>游戏ID</div>
            <div className={styles.debugValue}>
              {gameState.gameId.substring(0, 8)}...
            </div>
          </div>
        )}
      </div>

      {/* 叙事账本状态（开发模式） */}
      {process.env.NODE_ENV === 'development' && gameState?.narrativeLedger && (
        <div className={styles.ledgerSection}>
          <h4 className={styles.sectionTitle}>叙事账本</h4>
          
          <div className={styles.ledgerItem}>
            <div className={styles.ledgerLabel}>玩家特质</div>
            <div className={styles.ledgerValue}>
              {gameState.narrativeLedger.playerCharacter?.personality_traits?.length || 0}
            </div>
          </div>

          <div className={styles.ledgerItem}>
            <div className={styles.ledgerLabel}>角色关系</div>
            <div className={styles.ledgerValue}>
              {Object.keys(gameState.narrativeLedger.characterRelationships || {}).length}
            </div>
          </div>

          <div className={styles.ledgerItem}>
            <div className={styles.ledgerLabel}>事件数量</div>
            <div className={styles.ledgerValue}>
              {gameState.narrativeLedger.recentEvents?.length || 0}
            </div>
          </div>
        </div>
      )}

      {/* 状态指示器（模拟目标设计） */}
      <div 
        className={`${styles.statusIndicator} ${
          showStatusFlash ? styles.indicatorFlash : ''
        }`}
      >
        {getGameStatus()}
      </div>

      {/* 最后更新时间 */}
      <div className={styles.lastUpdate}>
        <div className={styles.updateLabel}>最后更新</div>
        <div className={styles.updateTime}>
          {lastStatusChange.toLocaleTimeString()}
        </div>
      </div>

    </div>
  );
};

export default StateDisplay;
