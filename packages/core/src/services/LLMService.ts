import { LLMAdapter, LLMRequest, LLMResponse } from '../types';
import { MockLLMAdapter } from './adapters/MockLLMAdapter';
import { configManager } from '../config/ConfigManager';

/**
 * LLM服务配置
 */
export interface LLMServiceConfig {
  primaryAdapter: string;
  fallbackAdapters?: string[];
  retryAttempts?: number;
  timeout?: number;
}

/**
 * LLM服务管理器
 * 实现适配器模式，支持多个LLM提供商
 */
export class LLMService {
  private adapters: Map<string, LLMAdapter> = new Map();
  private config: LLMServiceConfig;

  constructor(config: LLMServiceConfig) {
    this.config = {
      retryAttempts: 3,
      timeout: 30000,
      ...config,
    };

    // 自动注册Mock适配器
    this.autoRegisterMockAdapter();
  }

  /**
   * 注册LLM适配器
   */
  registerAdapter(name: string, adapter: LLMAdapter): void {
    this.adapters.set(name, adapter);
  }

  /**
   * 获取适配器
   */
  getAdapter(name: string): LLMAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * 生成响应
   * 优先使用主适配器，失败时尝试备用适配器
   */
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const adaptersToTry = [
      this.config.primaryAdapter,
      ...(this.config.fallbackAdapters || []),
    ];

    let lastError: Error | null = null;

    for (const adapterName of adaptersToTry) {
      const adapter = this.adapters.get(adapterName);
      
      if (!adapter) {
        console.warn(`LLM适配器 '${adapterName}' 未找到`);
        continue;
      }

      if (!adapter.isAvailable()) {
        console.warn(`LLM适配器 '${adapterName}' 不可用`);
        continue;
      }

      try {
        const response = await this.executeWithRetry(adapter, request);
        console.log(`使用适配器 '${adapterName}' 成功生成响应`);
        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`适配器 '${adapterName}' 失败:`, error);
      }
    }

    throw new Error(
      `所有LLM适配器都失败了。最后错误: ${lastError?.message || '未知错误'}`
    );
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(
    adapter: LLMAdapter,
    request: LLMRequest
  ): Promise<LLMResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('请求超时')), this.config.timeout);
        });

        const responsePromise = adapter.generateResponse(request);
        
        return await Promise.race([responsePromise, timeoutPromise]);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts!) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 指数退避
          console.log(`第${attempt}次尝试失败，${delay}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('重试次数已用完');
  }

  /**
   * 检查服务可用性
   */
  async checkAvailability(): Promise<{
    available: string[];
    unavailable: string[];
  }> {
    const available: string[] = [];
    const unavailable: string[] = [];

    for (const [name, adapter] of this.adapters) {
      if (adapter.isAvailable()) {
        available.push(name);
      } else {
        unavailable.push(name);
      }
    }

    return { available, unavailable };
  }

  /**
   * 自动注册Mock适配器
   */
  private autoRegisterMockAdapter(): void {
    const mockConfig = configManager.getLLMConfig().mock;
    const mockAdapter = new MockLLMAdapter(mockConfig);
    this.registerAdapter('mock', mockAdapter);

    console.log('🤖 Mock LLM适配器已注册');
  }

  /**
   * 获取服务统计信息
   */
  getStats(): {
    totalAdapters: number;
    availableAdapters: number;
    primaryAdapter: string;
    fallbackAdapters: string[];
    isMockMode: boolean;
  } {
    const availableCount = Array.from(this.adapters.values())
      .filter(adapter => adapter.isAvailable()).length;

    return {
      totalAdapters: this.adapters.size,
      availableAdapters: availableCount,
      primaryAdapter: this.config.primaryAdapter,
      fallbackAdapters: this.config.fallbackAdapters || [],
      isMockMode: configManager.isMockMode(),
    };
  }
}
