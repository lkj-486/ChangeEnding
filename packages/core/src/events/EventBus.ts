import mitt from 'mitt';
import { GameEvent } from '../types';

// 事件类型定义
export type Events = {
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
  ACTION_EXECUTED: { action: any; result: any };
  NARRATIVE_GENERATED: { segment: any };
  AI_ACTION_PROPOSED: { agentId: string; action: any };
  GAME_STATE_CHANGED: { state: any };
  CONSEQUENCES_APPLIED: { sceneId?: string; consequences: any };
  ERROR_OCCURRED: { error: Error; context?: any };
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
