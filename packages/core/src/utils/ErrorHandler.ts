/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_SERVER = 'INTERNAL_SERVER',
  LLM_SERVICE = 'LLM_SERVICE',
  SCENE_LOADING = 'SCENE_LOADING',
  GAME_STATE = 'GAME_STATE',
  NETWORK = 'NETWORK',
}

/**
 * 自定义错误基类
 */
export class StoryWeaverError extends Error {
  public readonly type: ErrorType;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, any>;
  public readonly timestamp: number;

  constructor(
    type: ErrorType,
    message: string,
    code: string,
    statusCode: number = 500,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'StoryWeaverError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = Date.now();

    // 确保堆栈跟踪正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StoryWeaverError);
    }
  }

  /**
   * 转换为JSON格式
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * 获取用户友好的错误信息
   */
  getUserMessage(): string {
    switch (this.type) {
      case ErrorType.VALIDATION:
        return '输入数据验证失败，请检查您的输入';
      case ErrorType.NOT_FOUND:
        return '请求的资源不存在';
      case ErrorType.UNAUTHORIZED:
        return '您没有权限执行此操作';
      case ErrorType.LLM_SERVICE:
        return 'AI服务暂时不可用，请稍后重试';
      case ErrorType.SCENE_LOADING:
        return '场景加载失败，请重新尝试';
      case ErrorType.GAME_STATE:
        return '游戏状态异常，请重新开始游戏';
      case ErrorType.NETWORK:
        return '网络连接失败，请检查网络设置';
      default:
        return '系统发生未知错误，请联系技术支持';
    }
  }
}

/**
 * 验证错误
 */
export class ValidationError extends StoryWeaverError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorType.VALIDATION, message, 'VALIDATION_FAILED', 400, context);
    this.name = 'ValidationError';
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends StoryWeaverError {
  constructor(resource: string, id?: string, context?: Record<string, any>) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(ErrorType.NOT_FOUND, message, 'RESOURCE_NOT_FOUND', 404, { resource, id, ...context });
    this.name = 'NotFoundError';
  }
}

/**
 * LLM服务错误
 */
export class LLMServiceError extends StoryWeaverError {
  constructor(message: string, provider?: string, context?: Record<string, any>) {
    super(ErrorType.LLM_SERVICE, message, 'LLM_SERVICE_ERROR', 503, { provider, ...context });
    this.name = 'LLMServiceError';
  }
}

/**
 * 场景加载错误
 */
export class SceneLoadingError extends StoryWeaverError {
  constructor(sceneId: string, reason: string, context?: Record<string, any>) {
    super(
      ErrorType.SCENE_LOADING,
      `Failed to load scene '${sceneId}': ${reason}`,
      'SCENE_LOADING_FAILED',
      500,
      { sceneId, reason, ...context }
    );
    this.name = 'SceneLoadingError';
  }
}

/**
 * 游戏状态错误
 */
export class GameStateError extends StoryWeaverError {
  constructor(message: string, gameId?: string, context?: Record<string, any>) {
    super(ErrorType.GAME_STATE, message, 'GAME_STATE_ERROR', 500, { gameId, ...context });
    this.name = 'GameStateError';
  }
}

/**
 * 统一错误处理器
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: StoryWeaverError) => void> = [];

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 处理错误
   */
  handle(error: Error | StoryWeaverError, context?: Record<string, any>): StoryWeaverError {
    let storyError: StoryWeaverError;

    if (error instanceof StoryWeaverError) {
      storyError = error;
    } else {
      // 将普通错误转换为StoryWeaverError
      storyError = new StoryWeaverError(
        ErrorType.INTERNAL_SERVER,
        error.message,
        'UNKNOWN_ERROR',
        500,
        { originalError: error.name, ...context }
      );
      storyError.stack = error.stack;
    }

    // 记录错误
    this.logError(storyError);

    // 通知错误监听器
    this.notifyListeners(storyError);

    return storyError;
  }

  /**
   * 添加错误监听器
   */
  addErrorListener(listener: (error: StoryWeaverError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * 移除错误监听器
   */
  removeErrorListener(listener: (error: StoryWeaverError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 记录错误
   */
  private logError(error: StoryWeaverError): void {
    const logLevel = this.getLogLevel(error.type);
    const logMessage = this.formatErrorLog(error);

    switch (logLevel) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  /**
   * 获取日志级别
   */
  private getLogLevel(errorType: ErrorType): string {
    switch (errorType) {
      case ErrorType.VALIDATION:
      case ErrorType.NOT_FOUND:
        return 'warn';
      case ErrorType.UNAUTHORIZED:
        return 'info';
      case ErrorType.LLM_SERVICE:
      case ErrorType.SCENE_LOADING:
      case ErrorType.GAME_STATE:
      case ErrorType.INTERNAL_SERVER:
        return 'error';
      default:
        return 'error';
    }
  }

  /**
   * 格式化错误日志
   */
  private formatErrorLog(error: StoryWeaverError): string {
    const timestamp = new Date(error.timestamp).toISOString();
    const contextStr = error.context ? JSON.stringify(error.context, null, 2) : '';
    
    return `
🚨 StoryWeaver Error [${timestamp}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type: ${error.type}
Code: ${error.code}
Message: ${error.message}
Status: ${error.statusCode}
${contextStr ? `Context: ${contextStr}` : ''}
${error.stack ? `Stack Trace:\n${error.stack}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  /**
   * 通知错误监听器
   */
  private notifyListeners(error: StoryWeaverError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * 创建错误响应对象
   */
  createErrorResponse(error: StoryWeaverError, includeStack: boolean = false): Record<string, any> {
    const response: Record<string, any> = {
      success: false,
      error: {
        type: error.type,
        code: error.code,
        message: error.message,
        userMessage: error.getUserMessage(),
        timestamp: error.timestamp,
      },
    };

    if (error.context) {
      response.error.context = error.context;
    }

    if (includeStack && error.stack) {
      response.error.stack = error.stack;
    }

    return response;
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance();
