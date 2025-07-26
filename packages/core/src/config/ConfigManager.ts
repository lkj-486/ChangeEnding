import { ENV_KEYS, DEFAULT_VALUES, Environment, LogLevel, getDefaultValue, maskSensitiveValue } from './constants';

/**
 * 应用配置接口
 */
export interface AppConfig {
  // 环境配置
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isMockMode: boolean;

  // LLM配置
  llm: {
    primaryAdapter: string;
    fallbackAdapters: string[];
    mockMode: boolean;
    google: {
      apiKey: string;
      modelName: string;
      baseUrl: string;
    };
    mock: {
      enableScenarioResponses: boolean;
      defaultDelay: number;
      enableLogging: boolean;
    };
  };

  // 服务器配置
  server: {
    port: number;
    host: string;
    corsOrigin: string;
  };

  // 数据库配置
  database: {
    url: string;
    enableLogging: boolean;
  };

  // 游戏配置
  game: {
    maxActionsPerScene: number;
    actionInterval: number;
    choiceTimeout: number;
    maxNarrativeHistory: number;
  };

  // 日志配置
  logging: {
    level: LogLevel;
    enableConsole: boolean;
    enableFile: boolean;
  };
}

/**
 * 配置管理器
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 获取完整配置
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * 获取特定配置项
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * 检查是否为开发模式
   */
  isDevelopment(): boolean {
    return this.config.isDevelopment;
  }

  /**
   * 检查是否为Mock模式
   */
  isMockMode(): boolean {
    return this.config.isMockMode;
  }

  /**
   * 获取LLM配置
   */
  getLLMConfig() {
    return this.config.llm;
  }

  /**
   * 获取服务器配置
   */
  getServerConfig() {
    return this.config.server;
  }

  /**
   * 获取数据库配置
   */
  getDatabaseConfig() {
    return this.config.database;
  }

  /**
   * 获取游戏配置
   */
  getGameConfig() {
    return this.config.game;
  }

  /**
   * 更新配置（运行时）
   */
  updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * 加载配置
   */
  private loadConfig(): AppConfig {
    const env = this.getEnvironment();
    const isDevelopment = env === 'development';
    const isProduction = env === 'production';

    // 在开发环境下默认启用Mock模式
    const isMockMode = isDevelopment || this.getEnvVar(ENV_KEYS.MOCK_MODE) === 'true';

    return {
      environment: env,
      isDevelopment,
      isProduction,
      isMockMode,

      llm: {
        primaryAdapter: isMockMode ? 'mock' : 'google',
        fallbackAdapters: isMockMode ? [] : ['mock'],
        mockMode: isMockMode,
        google: {
          apiKey: this.getEnvVar(ENV_KEYS.GOOGLE_API_KEY),
          modelName: this.getEnvVar(ENV_KEYS.GOOGLE_MODEL_NAME),
          baseUrl: this.getEnvVar(ENV_KEYS.GOOGLE_BASE_URL),
        },
        mock: {
          enableScenarioResponses: this.getEnvVar(ENV_KEYS.MOCK_ENABLE_SCENARIOS) === 'true',
          defaultDelay: parseInt(this.getEnvVar(ENV_KEYS.MOCK_DEFAULT_DELAY), 10),
          enableLogging: isDevelopment,
        },
      },

      server: {
        port: parseInt(this.getEnvVar(ENV_KEYS.PORT), 10),
        host: this.getEnvVar(ENV_KEYS.HOST),
        corsOrigin: this.getEnvVar(ENV_KEYS.CORS_ORIGIN),
      },

      database: {
        url: this.getEnvVar(ENV_KEYS.DATABASE_URL),
        enableLogging: isDevelopment,
      },

      game: {
        maxActionsPerScene: parseInt(this.getEnvVar(ENV_KEYS.MAX_ACTIONS_PER_SCENE), 10),
        actionInterval: parseInt(this.getEnvVar(ENV_KEYS.ACTION_INTERVAL), 10),
        choiceTimeout: parseInt(this.getEnvVar(ENV_KEYS.CHOICE_TIMEOUT), 10),
        maxNarrativeHistory: parseInt(this.getEnvVar(ENV_KEYS.MAX_NARRATIVE_HISTORY), 10),
      },

      logging: {
        level: (this.getEnvVar(ENV_KEYS.LOG_LEVEL, isDevelopment ? 'debug' : 'info')) as LogLevel,
        enableConsole: true,
        enableFile: isProduction,
      },
    };
  }

  /**
   * 获取环境变量
   */
  private getEnvVar(key: string, defaultValue?: string): string {
    const fallbackValue = defaultValue || getDefaultValue(key);

    // 在Node.js环境中使用process.env
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || fallbackValue;
    }

    // 在浏览器环境中使用import.meta.env（Vite）
    // 注意：这部分代码在Node.js环境中不会执行
    try {
      // @ts-ignore - import.meta在Node.js中不可用，但在Vite中可用
      if (typeof window !== 'undefined' && import.meta && import.meta.env) {
        // @ts-ignore
        return import.meta.env[`VITE_${key}`] || fallbackValue;
      }
    } catch {
      // 忽略错误，继续使用默认值
    }

    return fallbackValue;
  }

  /**
   * 获取当前环境
   */
  private getEnvironment(): Environment {
    const nodeEnv = this.getEnvVar(ENV_KEYS.NODE_ENV);

    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'test') return 'test';
    return 'development';
  }

  /**
   * 验证配置
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证LLM配置
    if (!this.config.isMockMode && !this.config.llm.google.apiKey) {
      errors.push('Google API Key is required when not in mock mode');
    }

    // 验证服务器配置
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push('Server port must be between 1 and 65535');
    }

    // 验证数据库配置
    if (!this.config.database.url) {
      errors.push('Database URL is required');
    }

    // 验证游戏配置
    if (this.config.game.maxActionsPerScene < 1) {
      errors.push('Max actions per scene must be at least 1');
    }

    if (this.config.game.actionInterval < 1000) {
      errors.push('Action interval must be at least 1000ms');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 打印配置信息（开发模式）
   */
  printConfig(): void {
    if (!this.config.isDevelopment) return;

    console.log('🔧 StoryWeaver Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Environment: ${this.config.environment}`);
    console.log(`Mock Mode: ${this.config.isMockMode ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`LLM Primary: ${this.config.llm.primaryAdapter}`);
    console.log(`Server: ${this.config.server.host}:${this.config.server.port}`);
    console.log(`Database: ${this.config.database.url.replace(/\/\/.*@/, '//***@')}`); // 隐藏密码
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 验证配置
    const validation = this.validateConfig();
    if (!validation.isValid) {
      console.warn('⚠️  Configuration Issues:');
      validation.errors.forEach(error => console.warn(`   - ${error}`));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance();
