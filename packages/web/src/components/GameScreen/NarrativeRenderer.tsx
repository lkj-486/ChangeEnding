/**
 * NarrativeRenderer - 叙事内容渲染组件
 * 负责渲染和管理故事文本流，支持所有ContentType
 * 
 * 功能特性：
 * - 支持NARRATION, DIALOGUE, INTROSPECTION, CHOICE_POINT等所有内容类型
 * - 渐进式内容显示动画
 * - 自动滚动到最新内容
 * - 优化的阅读体验
 */

import React, { useEffect, useRef } from 'react';
import { NarrativeItem } from '@/types/game';
import styles from './NarrativeRenderer.module.css';

interface NarrativeRendererProps {
  narrative: NarrativeItem[];
  isWaitingForChoice: boolean;
}

export const NarrativeRenderer: React.FC<NarrativeRendererProps> = ({
  narrative,
  isWaitingForChoice
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 🎯 简化的自动滚动 - 当有新内容时滚动到底部
  useEffect(() => {
    if (containerRef.current && narrative.length > 0) {
      const timer = setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 1000); // 延迟1秒，让CSS动画有时间完成

      return () => clearTimeout(timer);
    }
  }, [narrative.length]);

  const renderNarrativeItem = (item: NarrativeItem, index: number) => {
    const itemType = item.type || 'narration';
    const content = typeof item.content === 'string' ? item.content : '';

    return (
      <div
        key={item.id || index}
        className={`${styles.narrativeItem} ${styles[itemType]}`}
        style={{ animationDelay: `${index * 0.8}s` }}
        data-type={itemType}
      >
        {/* 内容类型指示器（可选） */}
        {itemType !== 'narration' && (
          <div className={styles.typeIndicator}>
            {getTypeLabel(itemType)}
          </div>
        )}

        {/* 主要内容 */}
        <div className={styles.content}>
          {content}
        </div>

        {/* 时间戳（调试用，可选） */}
        {process.env.NODE_ENV === 'development' && (
          <div className={styles.timestamp}>
            {new Date(item.timestamp || Date.now()).toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      dialogue: '对话',
      introspection: '内心独白',
      description: '环境描述',
      internal_thought: '思考',
      choice_point: '选择'
    };
    return labels[type] || type;
  };

  // 调试代码已移除

  return (
    <div
      ref={containerRef}
      className={styles.narrativeContainer}
      role="main"
      aria-label="故事内容"
    >
      {/* 故事标题区域（可选） */}
      <div className={styles.storyHeader}>
        <h1 className={styles.storyTitle}>地牢逃脱</h1>
        <div className={styles.progressIndicator}>
          第 {narrative.length} / {narrative.length} 段
        </div>
      </div>

      {/* 叙事内容区域 */}
      <div className={styles.narrativeContent}>
        {narrative.map((item, index) => renderNarrativeItem(item, index))}

        {/* 等待指示器 */}
        {isWaitingForChoice && narrative.length > 0 && (
          <div className={styles.waitingIndicator}>
            <div className={styles.waitingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className={styles.waitingText}>等待您的选择...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NarrativeRenderer;
