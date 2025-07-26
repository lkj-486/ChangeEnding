/**
 * 环境变量键名常量
 * 统一管理所有环境变量的键名，避免硬编码和重复定义
 */

// 基础环境配置
export const ENV_KEYS = {
  // 环境设置
  NODE_ENV: 'NODE_ENV',
  MOCK_MODE: 'MOCK_MODE',
  
  // 服务器配置
  PORT: 'PORT',
  HOST: 'HOST',
  CORS_ORIGIN: 'CORS_ORIGIN',
  
  // 数据库配置
  DATABASE_URL: 'DATABASE_URL',
  
  // Google LLM配置
  GOOGLE_API_KEY: 'GOOGLE_API_KEY',
  GOOGLE_MODEL_NAME: 'GOOGLE_MODEL_NAME',
  GOOGLE_BASE_URL: 'GOOGLE_BASE_URL',
  
  // Mock LLM配置
  MOCK_ENABLE_SCENARIOS: 'MOCK_ENABLE_SCENARIOS',
  MOCK_DEFAULT_DELAY: 'MOCK_DEFAULT_DELAY',
  
  // 游戏配置
  MAX_ACTIONS_PER_SCENE: 'MAX_ACTIONS_PER_SCENE',
  ACTION_INTERVAL: 'ACTION_INTERVAL',
  CHOICE_TIMEOUT: 'CHOICE_TIMEOUT',
  MAX_NARRATIVE_HISTORY: 'MAX_NARRATIVE_HISTORY',
  
  // 日志配置
  LOG_LEVEL: 'LOG_LEVEL',
  
  // 前端配置 (Vite环境变量)
  VITE_API_BASE_URL: 'VITE_API_BASE_URL',
  VITE_WS_URL: 'VITE_WS_URL',
  VITE_MOCK_MODE: 'VITE_MOCK_MODE',
  
  // JWT配置
  JWT_SECRET: 'JWT_SECRET',
} as const;

// 默认值常量
export const DEFAULT_VALUES = {
  // 环境设置
  NODE_ENV: 'development',
  MOCK_MODE: 'false',
  
  // 服务器配置
  PORT: '3001',
  HOST: 'localhost',
  CORS_ORIGIN: 'http://localhost:3000',
  
  // 数据库配置
  DATABASE_URL: 'postgresql://storyweaver:storyweaver_password@localhost:5432/storyweaver_demo',
  
  // Google LLM配置
  GOOGLE_API_KEY: '',
  GOOGLE_MODEL_NAME: 'gemini-pro',
  GOOGLE_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
  
  // Mock LLM配置
  MOCK_ENABLE_SCENARIOS: 'true',
  MOCK_DEFAULT_DELAY: '1000',
  
  // 游戏配置
  MAX_ACTIONS_PER_SCENE: '10',
  ACTION_INTERVAL: '5000',
  CHOICE_TIMEOUT: '30000',
  MAX_NARRATIVE_HISTORY: '100',
  
  // 日志配置
  LOG_LEVEL: 'debug',
  
  // 前端配置
  VITE_API_BASE_URL: 'http://localhost:3001',
  VITE_WS_URL: 'ws://localhost:3001',
  VITE_MOCK_MODE: 'true',
  
  // JWT配置
  JWT_SECRET: 'dev_jwt_secret_key_change_in_production',
} as const;

// 环境类型
export type Environment = 'development' | 'production' | 'test';

// 日志级别
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 配置验证规则
export const VALIDATION_RULES = {
  // 端口范围
  PORT_MIN: 1,
  PORT_MAX: 65535,
  
  // 延迟范围 (毫秒)
  MIN_DELAY: 100,
  MAX_DELAY: 10000,
  
  // 游戏配置限制
  MIN_ACTIONS_PER_SCENE: 1,
  MAX_ACTIONS_PER_SCENE: 50,
  MIN_ACTION_INTERVAL: 1000,
  MAX_ACTION_INTERVAL: 60000,
  MIN_CHOICE_TIMEOUT: 5000,
  MAX_CHOICE_TIMEOUT: 300000,
  MIN_NARRATIVE_HISTORY: 10,
  MAX_NARRATIVE_HISTORY: 1000,
} as const;

// 支持的环境变量前缀
export const ENV_PREFIXES = {
  VITE: 'VITE_',
  REACT_APP: 'REACT_APP_',
  NEXT_PUBLIC: 'NEXT_PUBLIC_',
} as const;

// 必需的环境变量 (按环境分组)
export const REQUIRED_ENV_VARS = {
  development: [
    // 开发环境下，大部分变量都有默认值，只有数据库URL是必需的
    ENV_KEYS.DATABASE_URL,
  ],
  production: [
    // 生产环境下需要更多必需变量
    ENV_KEYS.DATABASE_URL,
    ENV_KEYS.GOOGLE_API_KEY,
    ENV_KEYS.JWT_SECRET,
    ENV_KEYS.CORS_ORIGIN,
  ],
  test: [
    // 测试环境的必需变量
    ENV_KEYS.DATABASE_URL,
  ],
} as const;

// 敏感环境变量 (不应在日志中显示)
export const SENSITIVE_ENV_VARS = [
  ENV_KEYS.GOOGLE_API_KEY,
  ENV_KEYS.JWT_SECRET,
  ENV_KEYS.DATABASE_URL, // 包含密码
] as const;

/**
 * 检查环境变量是否为敏感信息
 */
export function isSensitiveEnvVar(key: string): boolean {
  return SENSITIVE_ENV_VARS.includes(key as any);
}

/**
 * 获取环境变量的默认值
 */
export function getDefaultValue(key: string): string {
  return DEFAULT_VALUES[key as keyof typeof DEFAULT_VALUES] || '';
}

/**
 * 获取当前环境的必需环境变量列表
 */
export function getRequiredEnvVars(env: Environment): readonly string[] {
  return REQUIRED_ENV_VARS[env] || [];
}

/**
 * 屏蔽敏感信息用于日志输出
 */
export function maskSensitiveValue(key: string, value: string): string {
  if (!isSensitiveEnvVar(key)) {
    return value;
  }
  
  if (!value) {
    return '(empty)';
  }
  
  // 对于URL，只屏蔽密码部分
  if (key === ENV_KEYS.DATABASE_URL && value.includes('@')) {
    return value.replace(/\/\/.*@/, '//***@');
  }
  
  // 对于其他敏感信息，显示前几位和后几位
  if (value.length <= 8) {
    return '***';
  }
  
  const start = value.substring(0, 3);
  const end = value.substring(value.length - 3);
  return `${start}***${end}`;
}
