// 核心类型定义

// 基础实体和组件类型
export interface Entity {
  id: string;
}

export interface Component {
  name: string;
}

// ECS组件定义
export interface Position extends Component {
  name: 'Position';
  x: number;
  y: number;
  z?: number;
}

export interface Identity extends Component {
  name: 'Identity';
  id: string;
  displayName: string;
  description?: string;
}

export interface IsInScene extends Component {
  name: 'IsInScene';
  sceneId: string;
}

// 场景相关类型
export interface Scene {
  id: string;
  title: string;
  description: string;
  goal: string;
  characters: string[];
  choicePoints: ChoicePoint[];
  initialState: Record<string, any>;
}

export interface ChoicePoint {
  id: string;
  triggerCondition: string | {
    type: string;
    event?: string;
  };
  description: string;
  options: ChoiceOption[];
}

export interface ChoiceOption {
  id: string;
  text: string;
  action: GameAction;
  consequences?: Record<string, any>;
}

// 游戏动作类型
export interface GameAction {
  type: string;
  target?: string;
  parameters?: Record<string, any>;
}

// 角色相关类型
export interface Character {
  id: string;
  name: string;
  description: string;
  personality: string;
  goals: string[];
  relationships?: Record<string, string>;
}

// 事件类型
export interface GameEvent {
  type: string;
  payload: any;
  timestamp: number;
}

// 场景状态枚举
export enum SceneState {
  LOADING = 'LOADING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
}

// LLM服务相关类型
export interface LLMRequest {
  prompt: string;
  context?: Record<string, any>;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMAdapter {
  generateResponse(request: LLMRequest): Promise<LLMResponse>;
  isAvailable(): boolean;
}

// 叙事相关类型
export interface NarrativeSegment {
  id: string;
  type: 'dialogue' | 'narration' | 'internal_thought' | 'description';
  content: string;
  character?: string;
  timestamp: number;
}

// 玩家介入相关类型
export interface PlayerChoice {
  choicePointId: string;
  selectedOptionId: string;
  timestamp: number;
}

// API响应相关类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

export interface GameStateResponse {
  gameId: string;
  storyId: string;
  scene: {
    id: string;
    title: string;
    description: string;
  };
  narrative: NarrativeSegment[];
  currentChoice?: {
    choicePointId: string;
    options: ChoiceOption[];
    context: Record<string, any>;
  };
  isWaitingForChoice: boolean;
  sceneState: SceneState;
}

export interface StoryMetadata {
  id: string;
  title: string;
  description: string;
  author?: string;
  characterCount: number;
  choicePointCount: number;
  estimatedPlayTime?: string;
}

export interface StoriesResponse {
  stories: StoryMetadata[];
  total: number;
}

// WebSocket事件类型
export interface WebSocketEvent<T = any> {
  type: string;
  gameId: string;
  data: T;
  timestamp: number;
}

export interface ChoiceRequiredEvent {
  choicePointId: string;
  options: ChoiceOption[];
  context: Record<string, any>;
  timestamp: number;
}

export interface NarrativeUpdateEvent {
  segment: NarrativeSegment;
}

// 错误类型
export interface GameError extends Error {
  code: string;
  context?: Record<string, any>;
}

// 配置类型
export interface GameConfig {
  maxActionsPerScene: number;
  actionInterval: number;
  choiceTimeout: number;
  maxNarrativeHistory: number;
}
