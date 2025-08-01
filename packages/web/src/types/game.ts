/**
 * 游戏相关类型定义
 * 与后端数据结构保持完全兼容
 */

// 叙事内容项目
export interface NarrativeItem {
  id: string;
  type: 'dialogue' | 'narration' | 'introspection' | 'description' | 'internal_thought' | 'choice_point';
  content: string | object;
  character?: string;
  timestamp: number;
  metadata?: {
    style?: string;
    emotion?: string;
    personalized?: boolean;
    story_phase?: string;
    current_scene?: number;
    [key: string]: any;
  };
}

// 选择选项
export interface ChoiceOption {
  id: string;
  text: string;
  description?: string;
  action?: string;
  metadata?: {
    difficulty?: string;
    consequences?: string[];
    [key: string]: any;
  };
}

// 选择点
export interface ChoicePoint {
  choicePointId: string;
  options: ChoiceOption[];
  context?: {
    prompt?: string;
    timeLimit?: number;
    defaultChoice?: string;
    [key: string]: any;
  };
  metadata?: {
    importance?: 'low' | 'medium' | 'high';
    category?: string;
    [key: string]: any;
  };
}

// 玩家角色状态
export interface PlayerCharacter {
  personality_traits: string[];
  morality_vector: {
    honesty: number;
    violence: number;
    compassion: number;
    [key: string]: number;
  };
  methodology_preference: {
    stealth: number;
    diplomacy: number;
    aggression: number;
    [key: string]: number;
  };
}

// 角色关系
export interface CharacterRelationship {
  trust: number;
  affinity: number;
  last_interaction_summary: string;
  relationship_history?: string[];
  [key: string]: any;
}

// 世界状态
export interface WorldState {
  current_key_node_id?: string;
  scene_flags: Record<string, boolean | string | number>;
  global_flags: Record<string, boolean | string | number>;
  [key: string]: any;
}

// 事件记录
export interface EventRecord {
  type: string;
  summary: string;
  timestamp: number;
  impact: {
    scope: 'local' | 'global';
    magnitude: number;
    tags: string[];
  };
  [key: string]: any;
}

// 叙事账本
export interface NarrativeLedger {
  playerCharacter: PlayerCharacter;
  characterRelationships: Record<string, CharacterRelationship>;
  worldState: WorldState;
  recentEvents: EventRecord[];
  [key: string]: any;
}

// 游戏状态
export interface GameState {
  gameId: string;
  storyId: string;
  userId?: string;
  narrative: NarrativeItem[];
  narrativeLedger: NarrativeLedger;
  currentChoice?: ChoicePoint;
  isWaitingForChoice: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdated: string;
  [key: string]: any;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// WebSocket事件类型
export interface WebSocketEvent {
  type: string;
  gameId: string;
  data: any;
  timestamp: number;
}

// 选择提交数据
export interface ChoiceSubmission {
  choicePointId: string;
  selectedOptionId: string;
  timestamp?: number;
}

// 故事进度
export interface StoryProgress {
  currentScene: number;
  playerPath: 'unknown' | 'aggressive' | 'diplomatic' | 'stealth';
  keyChoicesMade: string[];
  storyPhase: 'opening' | 'encounter' | 'choice_made' | 'development' | 'ending';
}
