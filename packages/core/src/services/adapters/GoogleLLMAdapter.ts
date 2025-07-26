import { LLMAdapter, LLMRequest, LLMResponse } from '../../types';

/**
 * Google LLM适配器配置
 */
export interface GoogleLLMConfig {
  apiKey: string;
  modelName?: string;
  baseUrl?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
}

/**
 * Google Gemini LLM适配器
 * 实现与Google Gemini API的集成
 */
export class GoogleLLMAdapter implements LLMAdapter {
  private config: GoogleLLMConfig;
  private isConfigured: boolean = false;

  constructor(config: GoogleLLMConfig) {
    this.config = {
      modelName: 'gemini-pro',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      defaultMaxTokens: 2048,
      defaultTemperature: 0.7,
      ...config,
    };

    this.isConfigured = !!config.apiKey;
  }

  /**
   * 检查适配器是否可用
   */
  isAvailable(): boolean {
    return this.isConfigured && !!this.config.apiKey;
  }

  /**
   * 生成响应
   */
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error('Google LLM适配器未正确配置');
    }

    try {
      const response = await this.callGeminiAPI(request);
      return this.parseResponse(response);
    } catch (error) {
      console.error('Google LLM API调用失败:', error);
      throw new Error(`Google LLM API错误: ${(error as Error).message}`);
    }
  }

  /**
   * 调用Gemini API
   */
  private async callGeminiAPI(request: LLMRequest): Promise<any> {
    const url = `${this.config.baseUrl}/models/${this.config.modelName}:generateContent?key=${this.config.apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: this.buildPrompt(request),
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: request.maxTokens || this.config.defaultMaxTokens,
        temperature: request.temperature || this.config.defaultTemperature,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `HTTP ${response.status}: ${errorData.error?.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * 构建提示词
   */
  private buildPrompt(request: LLMRequest): string {
    let prompt = request.prompt;

    // 如果有上下文信息，添加到提示词中
    if (request.context) {
      const contextStr = Object.entries(request.context)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join('\n');
      
      prompt = `上下文信息:\n${contextStr}\n\n${prompt}`;
    }

    return prompt;
  }

  /**
   * 解析API响应
   */
  private parseResponse(apiResponse: any): LLMResponse {
    if (!apiResponse.candidates || apiResponse.candidates.length === 0) {
      throw new Error('API响应中没有生成的内容');
    }

    const candidate = apiResponse.candidates[0];
    
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('API响应格式无效');
    }

    const content = candidate.content.parts[0].text;
    
    // 提取使用统计信息（如果可用）
    const usage = apiResponse.usageMetadata ? {
      promptTokens: apiResponse.usageMetadata.promptTokenCount || 0,
      completionTokens: apiResponse.usageMetadata.candidatesTokenCount || 0,
      totalTokens: apiResponse.usageMetadata.totalTokenCount || 0,
    } : undefined;

    return {
      content: content.trim(),
      usage,
    };
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        prompt: '请回复"连接测试成功"',
        maxTokens: 50,
        temperature: 0.1,
      };

      const response = await this.generateResponse(testRequest);
      return response.content.includes('连接测试成功') || response.content.includes('成功');
    } catch (error) {
      console.error('Google LLM连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取模型信息
   */
  getModelInfo(): {
    provider: string;
    model: string;
    maxTokens: number;
    supportedFeatures: string[];
  } {
    return {
      provider: 'Google',
      model: this.config.modelName || 'gemini-pro',
      maxTokens: this.config.defaultMaxTokens || 2048,
      supportedFeatures: ['text-generation', 'context-aware', 'chinese-support'],
    };
  }
}
