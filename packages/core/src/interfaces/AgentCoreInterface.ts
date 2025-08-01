/**
 * AgentCore 接口：Story Weaver 的 AI 抽象层
 *
 * 版本：2.0
 * 最后更新：2025-07-27
 *
 * 这个接口定义了游戏引擎与 AI 系统之间的标准契约。
 * 任何实现了这个接口的模块都可以"即插即用"地为游戏提供 AI 能力。
 *
 * 设计原则：
 * 1. 简单而强大：核心方法简洁，但足以支持复杂的叙事生成
 * 2. 状态驱动：所有决策都基于 NarrativeLedger 的当前状态
 * 3. 类型安全：使用 TypeScript 确保接口的正确使用
 * 4. 可扩展性：接口设计支持未来功能扩展
 * 5. 向后兼容：新版本保持与旧版本的兼容性
 *
 * 集成指南：
 * - 实现 AgentCoreInterface 的所有必需方法
 * - 确保 decideNextStep 和 generateContent 方法的异步处理
 * - 使用 NarrativeLedger 作为决策的唯一数据源
 * - 通过 getStatus 方法提供调试信息
 */

// 导入现有的ChoicePoint类型（避免重复定义）
import { ChoicePoint, GoalComponent, PersonalityComponent, ActionHistoryEntry } from '../types';

// 内容类型枚举，便于类型检查和扩展
export enum ContentType {
  NARRATION = 'narration',
  DIALOGUE = 'dialogue',
  INTROSPECTION = 'introspection',
  CHOICE_POINT = 'choice_point'
}

// 触发原因枚举，标准化触发事件
export enum TriggerReason {
  SCENE_ENTERED = 'scene_entered',
  PLAYER_CHOICE_MADE = 'player_choice_made',
  CHARACTER_INTERACTION = 'character_interaction',
  TIME_PROGRESSION = 'time_progression',
  WORLD_EVENT = 'world_event'
}

/**
 * 玩家角色画像接口
 * 记录玩家通过选择累积的角色特征
 */
export interface PlayerCharacter {
  /** 道德向量：量化玩家的道德倾向，范围 -1.0 到 1.0 */
  morality_vector: Record<string, number>; // 如 { honesty: 0.7, violence: -0.3, compassion: 0.5 }

  /** 行事风格偏好：量化玩家的行为模式，范围 0-10 */
  methodology_preference: Record<string, number>; // 如 { stealth: 8, diplomacy: 3, force: 2 }

  /** 性格特质：通过选择累积的性格标签 */
  personality_traits: string[]; // 如 ["坚忍", "愤世嫉俗", "富有同情心"]

  /** 角色发展阶段：用于追踪角色成长 */
  development_stage?: string; // 如 "初心者", "经验丰富", "大师级"
}

/**
 * 角色关系接口
 * 追踪与关键NPC的关系状态
 */
export interface CharacterRelationship {
  /** 好感度：0-100，表示NPC对玩家的喜爱程度 */
  affinity: number;

  /** 信任度：0-100，表示NPC对玩家的信任程度 */
  trust: number;

  /** 最后互动摘要：简要描述最近的互动内容 */
  last_interaction_summary: string;

  /** 关系类型：定义关系的性质 */
  relationship_type?: 'ally' | 'enemy' | 'neutral' | 'romantic' | 'mentor' | 'rival';

  /** 互动历史：记录重要的互动事件 */
  interaction_history?: Array<{
    event: string;
    impact: number; // -10 到 10，表示对关系的影响
    timestamp: number;
  }>;
}

/**
 * 世界状态接口
 * 记录游戏世界的当前状态
 */
export interface WorldState {
  /** 当前场景ID */
  current_scene_id: string;

  /** 场景标记：记录世界中的各种状态 */
  scene_flags: Record<string, boolean | string | number>;

  /** 时间信息 */
  time_of_day?: string;

  /** 位置信息 */
  location?: string;

  /** 天气状态 */
  weather?: string;

  /** 世界事件：影响全局的重要事件 */
  world_events?: Array<{
    event_id: string;
    description: string;
    active: boolean;
    timestamp: number;
  }>;
}

/**
 * 叙事事件接口
 * 记录重要的叙事事件
 */
export interface NarrativeEvent {
  /** 事件类型 */
  type: 'choice' | 'dialogue' | 'scene_change' | 'character_interaction' | 'world_event';

  /** 事件摘要 */
  summary: string;

  /** 时间戳 */
  timestamp: number;

  /** 事件影响：对后续叙事的潜在影响 */
  impact?: {
    scope: 'local' | 'scene' | 'global'; // 影响范围
    magnitude: number; // 影响强度 1-10
    tags: string[]; // 影响标签
  };
}

/**
 * 叙事账本：系统的核心数据结构
 *
 * 这是AI进行决策的唯一事实来源，包含了游戏世界的完整状态信息。
 * 所有AI决策都应该基于这个数据结构的内容。
 */
export interface NarrativeLedger {
  /** 玩家角色画像 */
  playerCharacter: PlayerCharacter;

  /** 角色关系网络 */
  characterRelationships: Record<string, CharacterRelationship>;

  /** 世界状态 */
  worldState: WorldState;

  /** 最近的重要事件（用于上下文推理） */
  recentEvents: NarrativeEvent[];

  /** 🚀 新增：角色目标和性格信息 */
  characterGoals?: Record<string, GoalComponent>;
  characterPersonalities?: Record<string, PersonalityComponent>;

  /** 账本版本：用于兼容性检查 */
  version?: string;

  /** 元数据：额外的上下文信息 */
  metadata?: {
    game_session_id: string;
    story_id: string;
    created_at: number;
    last_updated: number;
  };
}

/**
 * 决策请求上下文
 * 提供决策所需的额外上下文信息
 */
export interface DecisionContext {
  /** 触发原因：标准化的触发事件类型 */
  trigger_reason?: TriggerReason | string;

  /** 优先角色：如果有特定角色需要响应 */
  priority_character?: string;

  /** 时间约束：内容生成的时间限制（毫秒） */
  time_constraint?: number;

  /** 内容长度偏好：期望的内容长度 */
  length_preference?: 'short' | 'medium' | 'long';

  /** 情感基调：期望的情感氛围 */
  emotional_tone?: string;

  /** 自定义参数：允许扩展的参数 */
  custom_params?: Record<string, any>;
}

/**
 * 编排器决策请求
 * AI编排器用于决定下一步行动的请求结构
 */
export interface DecisionRequest {
  /** 完整的叙事账本 */
  ledger: NarrativeLedger;

  /** 当前可用的叙事动作类型 */
  availableActions: ContentType[];

  /** 决策上下文（可选） */
  context?: DecisionContext;

  /** 请求ID：用于追踪和调试 */
  request_id?: string;

  /** 请求时间戳 */
  timestamp?: number;
}

/**
 * 决策响应上下文
 * 传递给内容生成器的上下文信息
 */
export interface GenerationContext {
  /** 角色ID：对于对话类型内容 */
  character_id?: string;

  /** 情绪标签：内容的情感色彩 */
  mood?: string;

  /** 内容焦点：内容的重点方向 */
  focus?: string;

  /** 样式指导：内容的风格指导 */
  style_guide?: string;

  /** 长度要求：期望的内容长度 */
  target_length?: number;

  /** 个性化参数：基于玩家特征的个性化设置 */
  personalization?: {
    player_preferences?: string[];
    adaptation_level?: number; // 0-1，个性化程度
  };

  /** 扩展参数：允许未来扩展 */
  [key: string]: any;
}

/**
 * 编排器决策响应
 * AI编排器决策的结果
 */
export interface DecisionResponse {
  /** 下一步行动类型 */
  nextAction: ContentType;

  /** 传递给内容生成的上下文 */
  context: GenerationContext;

  /** 决策置信度：0-1，表示决策的确信程度 */
  confidence?: number;

  /** 决策理由：用于调试和分析 */
  reasoning?: string;

  /** 响应时间戳 */
  timestamp?: number;
}

/**
 * 内容生成请求
 * 用于生成具体叙事内容的请求结构
 */
export interface ContentRequest {
  /** 内容类型 */
  action: ContentType;

  /** 生成上下文 */
  context: GenerationContext;

  /** 完整的叙事账本 */
  ledger: NarrativeLedger;

  /** 请求ID：用于追踪 */
  request_id?: string;

  /** 请求时间戳 */
  timestamp?: number;
}

/**
 * 内容元数据
 * 生成内容的附加信息
 */
export interface ContentMetadata {
  /** 角色ID：对于对话，说话者的ID */
  character_id?: string;

  /** 情感标签：内容的情感色彩 */
  emotion?: string;

  /** 样式标签：内容的风格标识 */
  style?: string;

  /** 生成时间：内容生成耗时（毫秒） */
  generation_time?: number;

  /** 置信度：生成质量的置信度 0-1 */
  confidence?: number;

  /** 个性化标记：是否进行了个性化处理 */
  personalized?: boolean;

  /** 扩展元数据 */
  [key: string]: any;
}

/**
 * 生成的内容响应
 * AI生成内容的标准响应格式
 */
export interface ContentResponse {
  /** 内容类型 */
  type: ContentType;

  /** 生成的内容：文本内容或选择点对象 */
  content: string | ChoicePoint;

  /** 内容元数据 */
  metadata?: ContentMetadata;

  /** 响应时间戳 */
  timestamp?: number;

  /** 错误信息：如果生成失败 */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}



/**
 * AI系统状态信息
 * 用于监控和调试AI系统的运行状态
 */
export interface AgentStatus {
  /** AI系统名称 */
  name: string;

  /** 版本号 */
  version: string;

  /** 支持的功能列表 */
  capabilities: string[];

  /** 运行状态 */
  status: 'ready' | 'busy' | 'error' | 'offline';

  /** 性能统计 */
  performance?: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    average_response_time: number; // 毫秒
    last_request_time?: number;
  };

  /** 配置信息 */
  configuration?: {
    model_name?: string;
    max_tokens?: number;
    temperature?: number;
    [key: string]: any;
  };

  /** 健康检查信息 */
  health?: {
    last_check: number;
    is_healthy: boolean;
    issues?: string[];
  };
}

/**
 * AI系统配置接口
 * 用于配置AI系统的行为参数
 */
export interface AgentConfiguration {
  /** 调试模式 */
  debug?: boolean;

  /** 性能监控 */
  enable_monitoring?: boolean;

  /** 超时设置（毫秒） */
  timeout?: number;

  /** 重试次数 */
  max_retries?: number;

  /** 缓存设置 */
  cache_enabled?: boolean;

  /** 个性化设置 */
  personalization?: {
    enabled: boolean;
    adaptation_rate: number; // 0-1
  };

  /** 自定义配置 */
  custom?: Record<string, any>;
}

/**
 * AgentCore 主接口 v2.0
 *
 * 这是游戏引擎与 AI 系统通信的唯一契约。
 * 实现者可以是简单的规则引擎，也可以是复杂的 LLM 系统。
 *
 * 实现要求：
 * 1. 所有方法都必须是异步的，返回 Promise
 * 2. 必须处理错误情况并提供有意义的错误信息
 * 3. 应该支持并发请求处理
 * 4. 建议实现请求缓存以提高性能
 * 5. 必须保证线程安全
 *
 * 性能要求：
 * - decideNextStep: 应在 500ms 内响应
 * - generateContent: 应在 2000ms 内响应
 * - getStatus: 应在 100ms 内响应
 */
export interface AgentCoreInterface {
  /**
   * 编排器决策：基于当前状态决定下一步应该生成什么类型的内容
   *
   * 这是AI系统的"大脑"，负责分析当前游戏状态并决定最合适的下一步行动。
   * 决策应该考虑玩家的历史行为、当前情境、角色关系等多个因素。
   *
   * @param request 包含叙事账本和可用动作的请求
   * @returns Promise<DecisionResponse> 下一步行动的指令
   * @throws {Error} 当决策失败时抛出错误
   */
  decideNextStep(request: DecisionRequest): Promise<DecisionResponse>;

  /**
   * 内容生成：根据决策结果生成具体的叙事内容
   *
   * 这是AI系统的"创作者"，负责生成高质量、个性化的叙事内容。
   * 生成的内容应该与玩家的选择历史、角色特征、当前情境高度相关。
   *
   * @param request 包含动作类型、上下文和叙事账本的请求
   * @returns Promise<ContentResponse> 生成的内容
   * @throws {Error} 当内容生成失败时抛出错误
   */
  generateContent(request: ContentRequest): Promise<ContentResponse>;

  /**
   * 获取AI系统状态：用于监控、调试和健康检查
   *
   * 这个方法应该快速返回AI系统的当前状态，包括性能指标、配置信息等。
   * 游戏引擎可以使用这些信息来监控AI系统的健康状况。
   *
   * @returns AgentStatus AI系统的详细状态信息
   */
  getStatus(): AgentStatus;

  /**
   * 可选：配置AI系统参数
   *
   * 允许在运行时调整AI系统的行为参数，如调试模式、超时设置等。
   *
   * @param config 新的配置参数
   * @returns Promise<boolean> 配置是否成功应用
   */
  configure?(config: AgentConfiguration): Promise<boolean>;

  /**
   * 可选：预热AI系统
   *
   * 在游戏开始前预加载模型、缓存等，以减少首次请求的延迟。
   *
   * @returns Promise<void> 预热完成的Promise
   */
  warmup?(): Promise<void>;

  /**
   * 可选：清理资源
   *
   * 释放AI系统占用的资源，如关闭连接、清理缓存等。
   *
   * @returns Promise<void> 清理完成的Promise
   */
  cleanup?(): Promise<void>;
}

/**
 * 工厂函数类型：用于创建 AgentCore 实例
 *
 * @param config 可选的配置参数
 * @returns AgentCoreInterface 实例
 */
export type AgentCoreFactory = (config?: AgentConfiguration) => AgentCoreInterface;

/**
 * 错误类型定义
 * 标准化AI系统可能抛出的错误类型
 */
export enum AgentErrorType {
  DECISION_FAILED = 'DECISION_FAILED',
  CONTENT_GENERATION_FAILED = 'CONTENT_GENERATION_FAILED',
  TIMEOUT = 'TIMEOUT',
  INVALID_REQUEST = 'INVALID_REQUEST',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

/**
 * AI系统错误类
 * 标准化的错误处理
 */
export class AgentError extends Error {
  constructor(
    public type: AgentErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AgentError';
  }
}
