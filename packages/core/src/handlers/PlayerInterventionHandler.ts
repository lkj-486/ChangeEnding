import { eventBus } from '../events/EventBus';
import { PlayerChoice, ChoicePoint, ChoiceOption } from '../types';

/**
 * 玩家介入处理器配置
 */
export interface PlayerInterventionConfig {
  choiceTimeout?: number; // 选择超时时间（毫秒）
  defaultChoice?: string; // 超时时的默认选择
  enableAutoChoice?: boolean; // 是否启用自动选择
}

/**
 * 选择状态
 */
interface ChoiceState {
  choicePointId: string;
  options: ChoiceOption[];
  context: any;
  timestamp: number;
  timeoutId?: NodeJS.Timeout;
}

/**
 * 玩家介入处理器
 * 负责处理玩家在关键抉择点的介入和选择
 */
export class PlayerInterventionHandler {
  private config: PlayerInterventionConfig;
  private currentChoice: ChoiceState | null = null;
  private choiceHistory: PlayerChoice[] = [];
  private isWaitingForChoice = false;

  // 外部接口回调
  private onChoiceRequired?: (choicePoint: ChoiceState) => void;
  private onChoiceCompleted?: (choice: PlayerChoice) => void;

  constructor(config: PlayerInterventionConfig = {}) {
    this.config = {
      choiceTimeout: 300000, // 🚨 设置5分钟超时，防止游戏卡死但给用户充足时间
      defaultChoice: '', // 默认选择第一个选项
      enableAutoChoice: false,
      ...config,
    };

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听抉择点触发事件
    eventBus.on('CHOICE_POINT_RAISED', ({ choicePointId, options, context }) => {
      this.handleChoicePointRaised(choicePointId, options, context);
    });
  }

  /**
   * 处理抉择点触发
   */
  private handleChoicePointRaised(
    choicePointId: string,
    options: ChoiceOption[],
    context: any
  ): void {
    console.log(`🎪 PlayerInterventionHandler收到抉择点事件`, {
      choicePointId,
      optionsCount: options.length,
      isWaitingForChoice: this.isWaitingForChoice,
      hasOnChoiceRequiredCallback: !!this.onChoiceRequired
    });

    if (this.isWaitingForChoice) {
      console.warn('⚠️ 已有待处理的选择，忽略新的抉择点');
      return;
    }

    console.log(`🎯 处理抉择点: ${choicePointId}`);
    console.log(`📋 选择选项:`, options.map(opt => ({ id: opt.id, text: opt.text })));

    // 创建选择状态
    this.currentChoice = {
      choicePointId,
      options,
      context,
      timestamp: Date.now(),
    };

    this.isWaitingForChoice = true;
    console.log(`⏳ 设置等待选择状态`);

    // 🚨 设置合理的超时处理：5分钟后自动选择，防止游戏卡死
    if (this.config.choiceTimeout! > 0) {
      this.currentChoice.timeoutId = setTimeout(() => {
        this.handleChoiceTimeout();
      }, this.config.choiceTimeout);
      console.log(`⏰ 设置选择超时: ${Math.round(this.config.choiceTimeout! / 1000)}秒 (${Math.round(this.config.choiceTimeout! / 60000)}分钟)`);
    } else {
      console.log(`🔒 [PlayerInterventionHandler] 超时机制已禁用，等待用户手动确认选择`);
    }

    // 通知外部系统需要玩家选择
    if (this.onChoiceRequired) {
      console.log(`📢 调用外部选择需求回调`);
      this.onChoiceRequired(this.currentChoice);
    } else {
      console.warn(`⚠️ 没有设置选择需求回调函数`);
    }

    console.log(`✅ 等待玩家选择，选项数量: ${options.length}`);
  }

  /**
   * 处理玩家选择
   */
  makeChoice(selectedOptionId: string): boolean {
    if (!this.isWaitingForChoice || !this.currentChoice) {
      console.warn('当前没有待处理的选择');
      return false;
    }

    // 验证选择是否有效
    const selectedOption = this.currentChoice.options.find(
      option => option.id === selectedOptionId
    );

    if (!selectedOption) {
      console.error(`无效的选择ID: ${selectedOptionId}`);
      return false;
    }

    // 清除超时定时器
    if (this.currentChoice.timeoutId) {
      clearTimeout(this.currentChoice.timeoutId);
    }

    // 创建玩家选择记录
    const playerChoice: PlayerChoice = {
      choicePointId: this.currentChoice.choicePointId,
      selectedOptionId,
      timestamp: Date.now(),
    };

    // 记录选择历史
    this.choiceHistory.push(playerChoice);

    console.log(`玩家选择: ${selectedOptionId} - ${selectedOption.text}`);

    // 发布玩家选择事件
    eventBus.emit('PLAYER_CHOICE_MADE', {
      choicePointId: this.currentChoice.choicePointId,
      selectedOptionId,
      action: selectedOption.action,
    });

    // 通知外部系统选择完成
    if (this.onChoiceCompleted) {
      this.onChoiceCompleted(playerChoice);
    }

    // 重置状态
    this.resetChoiceState();

    return true;
  }

  /**
   * 处理选择超时
   * 🚨 5分钟后自动选择第一个选项，防止游戏永久卡死
   */
  private handleChoiceTimeout(): void {
    if (!this.currentChoice) return;

    console.warn('⏰ [PlayerInterventionHandler] 选择超时，自动选择第一个选项防止游戏卡死');
    console.warn('💡 建议用户在选择出现后及时确认选择');

    let defaultOptionId = this.config.defaultChoice;

    // 如果没有指定默认选择，使用第一个选项
    if (!defaultOptionId && this.currentChoice.options.length > 0) {
      defaultOptionId = this.currentChoice.options[0].id;
    }

    if (defaultOptionId) {
      console.log(`🤖 自动选择: ${defaultOptionId}`);
      this.makeChoice(defaultOptionId);
    } else {
      console.error('无法确定默认选择，强制结束选择状态');
      this.resetChoiceState();
    }
  }

  /**
   * 重置选择状态
   */
  private resetChoiceState(): void {
    if (this.currentChoice?.timeoutId) {
      clearTimeout(this.currentChoice.timeoutId);
    }

    this.currentChoice = null;
    this.isWaitingForChoice = false;
  }

  /**
   * 获取当前选择状态
   */
  getCurrentChoice(): ChoiceState | null {
    return this.currentChoice ? { ...this.currentChoice } : null;
  }

  /**
   * 检查是否正在等待选择
   */
  isWaitingForPlayerChoice(): boolean {
    return this.isWaitingForChoice;
  }

  /**
   * 获取选择历史
   */
  getChoiceHistory(): PlayerChoice[] {
    return [...this.choiceHistory];
  }

  /**
   * 获取最近的选择
   */
  getLastChoice(): PlayerChoice | null {
    return this.choiceHistory.length > 0
      ? this.choiceHistory[this.choiceHistory.length - 1]
      : null;
  }

  /**
   * 清空选择历史
   */
  clearHistory(): void {
    this.choiceHistory = [];
  }

  /**
   * 取消当前选择
   */
  cancelCurrentChoice(): boolean {
    if (!this.isWaitingForChoice) {
      return false;
    }

    console.log('取消当前选择');
    this.resetChoiceState();
    return true;
  }

  /**
   * 设置选择需求回调
   */
  setOnChoiceRequired(callback: (choicePoint: ChoiceState) => void): void {
    this.onChoiceRequired = callback;
  }

  /**
   * 设置选择完成回调
   */
  setOnChoiceCompleted(callback: (choice: PlayerChoice) => void): void {
    this.onChoiceCompleted = callback;
  }

  /**
   * 获取当前选择完成回调
   */
  getOnChoiceCompleted(): ((choice: PlayerChoice) => void) | undefined {
    return this.onChoiceCompleted;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PlayerInterventionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalChoices: number;
    averageResponseTime: number;
    timeoutCount: number;
    isCurrentlyWaiting: boolean;
  } {
    const totalChoices = this.choiceHistory.length;
    
    // 计算平均响应时间（简化实现）
    const averageResponseTime = totalChoices > 0 ? 5000 : 0; // 占位值
    
    // 计算超时次数（简化实现）
    const timeoutCount = 0; // 占位值

    return {
      totalChoices,
      averageResponseTime,
      timeoutCount,
      isCurrentlyWaiting: this.isWaitingForChoice,
    };
  }

  /**
   * 获取可用选项的格式化文本
   */
  getFormattedOptions(): string[] {
    if (!this.currentChoice) {
      return [];
    }

    return this.currentChoice.options.map((option, index) => 
      `${index + 1}. ${option.text}`
    );
  }

  /**
   * 通过索引进行选择（便于命令行界面）
   */
  makeChoiceByIndex(index: number): boolean {
    if (!this.currentChoice || index < 0 || index >= this.currentChoice.options.length) {
      return false;
    }

    const selectedOption = this.currentChoice.options[index];
    return this.makeChoice(selectedOption.id);
  }
}
