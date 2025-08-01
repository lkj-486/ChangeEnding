/**
 * ChoiceManager - 选择管理组件
 * 负责渲染和管理玩家选择选项
 * 
 * 功能特性：
 * - 延迟显示选择选项（模拟目标设计的动画效果）
 * - 支持键盘导航（1、2、3数字键）
 * - 选择确认和提交机制
 * - 与现有WebSocket和API完全兼容
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import styles from './ChoiceManager.module.css';

interface ChoiceManagerProps {
  gameId: string;
}

export const ChoiceManager: React.FC<ChoiceManagerProps> = ({ gameId }) => {
  // 🎯 从gameStore获取状态 - 单一事实来源
  const { gamePhase, currentChoicePoint, submitChoice } = useGameStore();

  // 🎯 最小化本地状态 - 只保留必要的UI状态
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚨 移除所有复杂的状态管理逻辑 - 采用单一事实来源原则

  // 🎯 简化的键盘导航支持
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gamePhase !== 'decision' || !currentChoicePoint) return;

    const key = event.key;
    const optionIndex = parseInt(key) - 1;

    if (optionIndex >= 0 && optionIndex < currentChoicePoint.options.length) {
      const option = currentChoicePoint.options[optionIndex];
      setSelectedOptionId(option.id);
      event.preventDefault();
    }

    // Enter键确认选择
    if (key === 'Enter' && selectedOptionId) {
      handleSubmitChoice();
      event.preventDefault();
    }
  }, [gamePhase, currentChoicePoint, selectedOptionId]);

  // 🎯 添加键盘事件监听器
  useEffect(() => {
    if (gamePhase === 'decision' && currentChoicePoint) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [gamePhase, currentChoicePoint, handleKeyPress]);

  // 🎯 提交选择 - 使用gameStore的submitChoice方法
  const handleSubmitChoice = useCallback(async () => {
    if (!selectedOptionId || !currentChoicePoint || isSubmitting || gamePhase !== 'decision') return;

    setIsSubmitting(true);

    try {
      console.log('🎯 [ChoiceManager] 提交选择', {
        choicePointId: currentChoicePoint.choicePointId,
        selectedOptionId,
        gameId,
        gamePhase
      });

      // 🎯 使用gameStore的统一选择提交方法
      await submitChoice(selectedOptionId);

      console.log('✅ [ChoiceManager] 选择提交成功，等待状态更新...');

    } catch (error) {
      console.error('❌ [ChoiceManager] 选择提交失败:', error);
      // 可以在这里添加错误提示UI
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedOptionId, currentChoicePoint, gameId, gamePhase, isSubmitting, submitChoice]);

  // 选择选项点击处理
  const handleOptionClick = (optionId: string) => {
    if (isSubmitting) return;
    setSelectedOptionId(optionId);
  };

  // 🔍 调试日志：组件状态检查
  console.log('🔍 [ChoiceManager] 组件渲染检查', {
    gamePhase,
    hasChoicePoint: !!currentChoicePoint,
    choicePointId: currentChoicePoint?.choicePointId,
    optionsCount: currentChoicePoint?.options?.length || 0,
    shouldShowChoices: gamePhase === 'decision' && !!currentChoicePoint
  });

  // 🚨 单一事实来源：完全依赖gamePhase状态
  if (gamePhase !== 'decision' || !currentChoicePoint) {
    console.log('🔄 [ChoiceManager] 显示等待状态', { gamePhase, hasChoicePoint: !!currentChoicePoint });
    return (
      <div className={styles.choiceManager}>
        <div className={styles.waitingState}>
          <div className={styles.waitingIcon}>
            <div className={styles.spinner}></div>
          </div>
          <h3 className={styles.waitingTitle}>故事进行中</h3>
          <p className={styles.waitingDescription}>
            AI正在推动故事发展，请耐心等待关键选择时刻...
          </p>
        </div>
      </div>
    );
  }

  console.log('✅ [ChoiceManager] 显示选择选项', {
    choicePointId: currentChoicePoint.choicePointId,
    optionsCount: currentChoicePoint.options.length
  });

  return (
    <div className={styles.choiceManager}>
      {/* 选择标题 */}
      <div className={styles.choiceHeader}>
        <h3 className={styles.choiceTitle}>⚡ 关键抉择时刻</h3>
        <p className={styles.choicePrompt}>请选择您的行动方案：</p>
      </div>

      {/* 选择选项 - 简单条件渲染 */}
      <div className={styles.choiceOptions}>
          {currentChoicePoint.options.map((option, index) => (
            <button
              key={option.id}
              className={`${styles.choiceButton} ${
                selectedOptionId === option.id ? styles.selected : ''
              }`}
              onClick={() => handleOptionClick(option.id)}
              disabled={isSubmitting}
              aria-pressed={selectedOptionId === option.id}
            >
              <div className={styles.optionNumber}>{index + 1}</div>
              <div className={styles.optionContent}>
                <div 
                  className={styles.optionText}
                  dangerouslySetInnerHTML={{ __html: option.text }}
                />
                {option.description && (
                  <div className={styles.optionDescription}>
                    {option.description}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

      {/* 确认按钮 */}
      <div className={styles.confirmSection}>
          <button
            className={`${styles.confirmButton} ${
              selectedOptionId ? styles.enabled : styles.disabled
            }`}
            onClick={handleSubmitChoice}
            disabled={!selectedOptionId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className={styles.submitSpinner}></div>
                提交中...
              </>
            ) : (
              '确认选择'
            )}
          </button>

          <div className={styles.choiceHint}>
            💡 您的选择将影响故事的发展方向
          </div>

          {/* 键盘提示 */}
          <div className={styles.keyboardHint}>
            使用数字键 1-{currentChoicePoint.options.length} 快速选择，Enter 确认
          </div>
        </div>
    </div>
  );
};

export default ChoiceManager;
