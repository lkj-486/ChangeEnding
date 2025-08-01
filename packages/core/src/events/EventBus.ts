import mitt from 'mitt';
import { GameEvent } from '../types';

// 事件类型定义 - 事件驱动架构标准事件
export type Events = {
  // === 原有事件（保持向后兼容） ===
  SCENE_LOADED: { sceneId: string; scene: any };
  SCENE_UPDATED: { sceneId: string; changes: any };
  CHOICE_POINT_RAISED: {
    choicePointId: string;
    options: any[];
    context: any
  };
  PLAYER_CHOICE_MADE: {
    choicePointId: string;
    selectedOptionId: string;
    action: any
  };
  GAME_STATE_CHANGED: { state: any };
  CONSEQUENCES_APPLIED: { sceneId?: string; consequences: any };
  ERROR_OCCURRED: { error: Error; context?: any };

  // === 新的事件驱动架构事件 ===

  // 🎯 导演中心化架构：Director 请求 AI 代理行动（增强版）
  REQUEST_AI_ACTION: {
    agentId: string;
    timestamp: number;
    context: {
      sceneId?: string;
      sceneState?: any;
    };
    // 🚀 新增：叙事账本载荷
    narrativeLedger?: any; // NarrativeLedger类型，避免循环依赖
  };

  // AI 计划阶段：AI 代理生成行动计划（原始JSON）
  AI_ACTION_PROPOSED: {
    agentId: string;
    action: any; // 原始JSON行动计划
    timestamp: number;
  };

  // 执行阶段：Director 执行行动并更新世界状态（增强版）
  ACTION_EXECUTED: {
    action: any;
    result: any;
    worldState: any; // 更新后的世界状态
    timestamp: number;
    // 🚀 新增：角色上下文信息
    characterContext?: {
      agentId: string;
      currentGoal?: string;
      emotionalState?: string;
      personalityTraits?: Record<string, number>;
    };
  };

  // 叙事阶段：NarrativeAgent 生成干净的文学文本
  NARRATIVE_READY: {
    segment: {
      id: string; // 🔧 添加id字段以支持前端状态管理
      type: 'narration' | 'dialogue' | 'introspection';
      content: string; // 仅包含干净的中文文学文本
      character?: string; // 对话时的角色ID
      timestamp: number; // 🔧 添加timestamp字段
      metadata?: any;
    };
    timestamp: number;
  };

  // 已废弃：直接叙事生成事件（由NARRATIVE_READY替代）
  NARRATIVE_GENERATED: { segment: any };

  // 🚀 新增：AI目标状态变更事件
  AI_GOAL_CHANGED: {
    agentId: string;
    previousGoal?: string;
    newGoal: string;
    goalPriority: number;
    timestamp: number;
    context?: Record<string, any>;
  };
}

/**
 * 全局事件总线
 * 使用mitt库实现轻量级的事件发布订阅系统
 */
export class EventBus {
  private emitter: any;
  private eventHistory: GameEvent[] = [];
  private maxHistorySize = 1000;

  constructor() {
    this.emitter = mitt();
  }

  /**
   * 发布事件
   */
  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    // 记录事件历史
    this.recordEvent(type as string, payload);
    
    // 发布事件
    this.emitter.emit(type, payload);
  }

  /**
   * 订阅事件
   */
  on<K extends keyof Events>(
    type: K,
    handler: (payload: Events[K]) => void
  ): void {
    this.emitter.on(type, handler);
  }

  /**
   * 取消订阅
   */
  off<K extends keyof Events>(
    type: K,
    handler?: (payload: Events[K]) => void
  ): void {
    this.emitter.off(type, handler);
  }

  /**
   * 一次性订阅
   */
  once<K extends keyof Events>(
    type: K,
    handler: (payload: Events[K]) => void
  ): void {
    const wrappedHandler = (payload: Events[K]) => {
      handler(payload);
      this.off(type, wrappedHandler);
    };
    this.on(type, wrappedHandler);
  }

  /**
   * 清除所有事件监听器
   */
  clear(): void {
    this.emitter.all.clear();
  }

  /**
   * 获取事件历史
   */
  getEventHistory(limit?: number): GameEvent[] {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  /**
   * 清除事件历史
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * 记录事件到历史
   */
  private recordEvent(type: string, payload: any): void {
    const event: GameEvent = {
      type,
      payload,
      timestamp: Date.now(),
    };

    this.eventHistory.push(event);

    // 限制历史记录大小
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }
}

// 全局事件总线实例
export const eventBus = new EventBus();
