// 核心引擎入口文件 - 升级版本
export * from './types';
export * from './world/WorldState';
export * from './events/EventBus';
export * from './director/Director';
export * from './agents/AIAgent';
export * from './agents/NarrativeAgent';
export * from './handlers/PlayerInterventionHandler';
export * from './services/LLMService';
export * from './services/adapters/MockLLMAdapter';
export * from './scenes/SceneLoader';
export * from './utils/ErrorHandler';
export * from './config/ConfigManager';
export * from './config/constants';

// 新增：AI 抽象层
export type {
  AgentCoreInterface,
  AgentStatus,
  AgentConfiguration,
  NarrativeLedger,
  DecisionRequest,
  DecisionResponse,
  ContentRequest,
  ContentResponse
} from './interfaces/AgentCoreInterface';
export {
  ContentType,
  TriggerReason,
  AgentError,
  AgentErrorType
} from './interfaces/AgentCoreInterface';
export * from './agents/StubAgentCore';
