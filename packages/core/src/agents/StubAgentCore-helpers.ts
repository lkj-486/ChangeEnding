/**
 * StubAgentCore 辅助方法 - 完整故事线版本
 *
 * 这个文件包含了 StubAgentCore 的辅助方法，
 * 用于支持增强的决策和内容生成逻辑。
 *
 * 包含完整的"地牢逃脱"故事线，展示所有系统功能。
 */

import { NarrativeLedger, ContentType, ContentResponse } from '../interfaces/AgentCoreInterface';
import { ChoicePoint } from '../types';

/**
 * 完整故事线：地牢逃脱
 *
 * 故事结构：
 * - 场景1：醒来 → 内心独白 → 遇到守卫 → 选择点
 * - 场景2：根据选择发展不同路径
 * - 场景3：最终结局，展示选择后果
 */

/**
 * 故事进度跟踪
 */
export interface StoryProgress {
  currentScene: number;
  playerPath: 'unknown' | 'aggressive' | 'diplomatic' | 'stealth';
  keyChoicesMade: string[];
  storyPhase: 'opening' | 'encounter' | 'choice_made' | 'development' | 'climax' | 'ending';
}

/**
 * 完整故事内容库
 */
export const COMPLETE_STORY_CONTENT = {
  // 场景1：开场
  scene1: {
    opening_narration: [
      '冰冷的石墙，生锈的铁栅栏，还有远处传来的滴水声。你在这个阴暗的地牢中醒来，头脑一片混沌。',
      '昏暗的火把光芒在潮湿的墙壁上投下摇曳的阴影。空气中弥漫着霉味和绝望的气息。',
      '你发现自己躺在冰冷的石板上，身上的衣服破烂不堪。记忆如同破碎的镜片，零散而模糊。'
    ],
    awakening_introspection: [
      '我是谁？为什么会在这里？脑海中的记忆片段如同迷雾般缥缈，让人无法抓住。',
      '恐惧和困惑在心中交织。这个地方充满了未知的危险，但我必须找到出路。',
      '冷静...我必须保持冷静。恐慌只会让情况变得更糟。我需要观察，需要思考。'
    ],
    environment_description: [
      '地牢的墙壁由粗糙的石块砌成，上面长满了绿色的苔藓。铁栅栏锈迹斑斑，但依然坚固。',
      '远处传来脚步声，沉重而有节奏。有人正在接近这里。',
      '微弱的光线从走廊尽头透过来，照亮了地面上的水渍和散落的稻草。'
    ]
  },

  // 场景2：遇到守卫
  scene2: {
    guard_appearance: [
      '一个身材魁梧的守卫出现在铁栅栏外，手中握着一把锈迹斑斑的钥匙。',
      '守卫的脸上带着冷漠的表情，但眼中闪烁着一丝好奇。他似乎在评估着你。',
      '沉重的脚步声停在了你的牢房前。守卫透过铁栅栏凝视着你，沉默不语。'
    ],
    guard_dialogue: {
      initial: [
        '醒了？我还以为你永远不会醒来了。',
        '你已经昏迷了三天。看起来比我想象的要坚强。',
        '终于醒了。我开始担心你会死在这里。'
      ],
      neutral: [
        '这里不是什么好地方，但至少你还活着。',
        '你想知道为什么在这里吗？还是说你已经记起来了？',
        '我见过很多像你这样的人。大多数都没有好下场。'
      ],
      suspicious: [
        '你的眼神...有些不对劲。你在计划什么？',
        '别想着耍什么花招。我见过太多聪明人的下场。',
        '你最好老实一点。这里的规矩很简单：服从或者死亡。'
      ],
      sympathetic: [
        '我知道这很难接受，但你必须面对现实。',
        '也许...也许我们可以找到某种解决方案。',
        '你看起来不像其他那些罪犯。也许你真的是无辜的。'
      ]
    }
  },

  // 场景3：选择后的发展
  scene3: {
    aggressive_path: {
      narration: [
        '你的攻击出乎守卫的意料。他踉跄后退，手中的钥匙掉在了地上。',
        '愤怒的火焰在你心中燃烧。这种被囚禁的屈辱让你无法忍受。',
        '守卫的眼中闪过惊讶，随即被愤怒所取代。战斗不可避免了。'
      ],
      guard_reaction: [
        '你这个疯子！我本来想帮你的！',
        '既然你选择了暴力，那就别怪我不客气！',
        '我就知道你不是什么好人！准备受死吧！'
      ],
      introspection: [
        '也许我太冲动了，但在这种地方，只有强者才能生存。',
        '我不能再被动地等待。如果要死，至少要死得有尊严。',
        '暴力也许不是最好的选择，但至少它是我能控制的。'
      ]
    },
    diplomatic_path: {
      narration: [
        '你选择了用言语而非拳头来解决问题。守卫的表情有所缓和。',
        '理智告诉你，这个守卫可能是你唯一的希望。',
        '你的话语中透露出真诚，这让守卫开始重新审视你。'
      ],
      guard_reaction: [
        '你...你说的有道理。也许我们可以谈谈。',
        '很少有人会在这种情况下保持理智。你很特别。',
        '我承认，你的话让我想起了一些事情。'
      ],
      introspection: [
        '也许理解和沟通比暴力更有力量。',
        '每个人都有自己的故事。即使是守卫，也可能有自己的苦衷。',
        '耐心和智慧往往比愤怒和冲动更能解决问题。'
      ]
    },
    stealth_path: {
      narration: [
        '你悄悄地观察着守卫的一举一动，寻找逃脱的机会。',
        '耐心是你最好的武器。你等待着最佳的时机。',
        '守卫似乎没有注意到你的小动作。机会就在眼前。'
      ],
      guard_reaction: [
        '嗯？你在做什么？',
        '我感觉有什么不对劲...',
        '你最好不要有什么奇怪的想法。'
      ],
      introspection: [
        '有时候，最好的行动就是不行动，直到时机成熟。',
        '观察和等待需要极大的自制力，但往往能带来最好的结果。',
        '在这个危险的世界里，谨慎可能是生存的关键。'
      ]
    }
  },

  // 场景4：结局
  scene4: {
    aggressive_ending: [
      '经过激烈的搏斗，你终于制服了守卫。但代价是沉重的——你身上多了几道伤口，而且现在整个监狱都知道你逃跑了。',
      '你拿到了钥匙，但也失去了唯一可能的盟友。前路充满了更大的危险。',
      '暴力为你赢得了自由，但也为你树立了敌人。这就是你选择的道路。'
    ],
    diplomatic_ending: [
      '通过耐心的交谈，你了解到守卫也有自己的困境。他最终决定帮助你逃脱。',
      '你们制定了一个周密的计划。虽然风险依然存在，但至少你不再孤单。',
      '理解和同情为你赢得了一个意想不到的盟友。这可能是你做过的最明智的选择。'
    ],
    stealth_ending: [
      '通过仔细的观察和耐心的等待，你找到了一个完美的逃脱机会。',
      '你悄无声息地离开了牢房，没有惊动任何人。但你也没有获得任何帮助。',
      '谨慎让你避免了冲突，但前路依然充满未知。你只能依靠自己。'
    ]
  }
};

/**
 * 生成对话内容
 */
export function generateDialogue(
  context: any, 
  ledger: NarrativeLedger, 
  variety: number,
  contentTemplates: any
): ContentResponse {
  const characterId = context.character_id || 'guard';
  const mood = context.mood || 'neutral';
  
  const characterTemplates = contentTemplates.dialogue[characterId] || contentTemplates.dialogue.guard;
  const moodTemplates = characterTemplates[mood] || characterTemplates.neutral;
  
  const selectedTemplate = moodTemplates[Math.floor(Math.random() * Math.min(moodTemplates.length, variety))];
  
  return {
    type: ContentType.DIALOGUE,
    content: selectedTemplate,
    metadata: {
      character_id: characterId,
      emotion: mood,
      style: 'conversational'
    }
  };
}

/**
 * 生成内心独白内容
 */
export function generateIntrospection(
  context: any, 
  ledger: NarrativeLedger, 
  variety: number,
  contentTemplates: any
): ContentResponse {
  const focus = context.focus || 'emotional';
  
  let templates: string[] = [];
  
  switch (focus) {
    case 'moral_reflection':
      templates = contentTemplates.introspection.moral_reflection;
      break;
    case 'emotional':
      templates = contentTemplates.introspection.emotional;
      break;
    case 'strategic':
      templates = contentTemplates.introspection.strategic;
      break;
    default:
      templates = contentTemplates.introspection.emotional;
  }

  const selectedTemplate = templates[Math.floor(Math.random() * Math.min(templates.length, variety))];
  
  return {
    type: ContentType.INTROSPECTION,
    content: selectedTemplate,
    metadata: {
      style: focus,
      emotion: context.mood || 'contemplative'
    }
  };
}

/**
 * 生成选择点内容
 */
export function generateChoicePoint(
  context: any, 
  ledger: NarrativeLedger, 
  variety: number
): ContentResponse {
  const focus = context.focus || 'moral_dilemma';
  const difficulty = context.difficulty || 'medium';
  
  // 基于当前状态生成选择点
  const choicePoint: ChoicePoint = {
    id: `choice_${Date.now()}`,
    triggerCondition: 'player_decision',
    description: generateChoicePrompt(focus, ledger),
    options: generateChoiceOptions(focus, difficulty, variety)
  };

  return {
    type: ContentType.CHOICE_POINT,
    content: choicePoint,
    metadata: {
      style: focus,
      difficulty: difficulty
    }
  };
}

/**
 * 生成选择提示
 */
function generateChoicePrompt(focus: string, ledger: NarrativeLedger): string {
  const prompts = {
    moral_dilemma: [
      '前方出现了一个守卫，你需要决定如何行动：',
      '你听到了求救声，但继续前进可能更安全：',
      '发现了一个受伤的人，你的选择是：'
    ],
    tactical: [
      '你需要选择前进的路线：',
      '面对这个障碍，你的策略是：',
      '时间紧迫，你必须快速决定：'
    ],
    social: [
      '你遇到了一个陌生人，你的反应是：',
      '有人请求你的帮助，你会：',
      '你需要与某人交涉，你的方式是：'
    ]
  };

  const focusPrompts = prompts[focus as keyof typeof prompts] || prompts.moral_dilemma;
  return focusPrompts[Math.floor(Math.random() * focusPrompts.length)];
}

/**
 * 生成选择选项
 */
function generateChoiceOptions(focus: string, difficulty: string, variety: number) {
  const baseOptions = [
    {
      id: 'aggressive',
      text: '直接攻击守卫',
      action: { type: 'ATTACK', target: 'guard', parameters: {} },
      consequences: { result: 'combat_initiated' }
    },
    {
      id: 'stealth',
      text: '尝试悄悄绕过守卫',
      action: { type: 'MOVE', target: 'bypass', parameters: { stealth: true } },
      consequences: { result: 'stealth_attempt' }
    },
    {
      id: 'diplomatic',
      text: '尝试与守卫交谈',
      action: { type: 'DIALOGUE', target: 'guard', parameters: {} },
      consequences: { result: 'dialogue_initiated' }
    }
  ];

  if (difficulty === 'hard' && variety >= 4) {
    baseOptions.push({
      id: 'creative',
      text: '制造声响分散注意力',
      action: { type: 'DISTRACT', target: 'environment', parameters: {} },
      consequences: { result: 'distraction_created' }
    });
  }

  return baseOptions.slice(0, Math.min(baseOptions.length, variety));
}

/**
 * 分析道德影响
 */
export function analyzeMoralImpact(ledger: NarrativeLedger): number {
  const moralVector = ledger.playerCharacter.morality_vector;
  const recentChoices = ledger.recentEvents.filter(e => e.type === 'choice').slice(0, 3);
  
  // 计算最近选择的道德权重
  let totalImpact = 0;
  recentChoices.forEach(choice => {
    if (choice.summary.includes('攻击') || choice.summary.includes('暴力')) {
      totalImpact += Math.abs(moralVector.violence || 0);
    }
    if (choice.summary.includes('帮助') || choice.summary.includes('拯救')) {
      totalImpact += Math.abs(moralVector.compassion || 0);
    }
  });

  return Math.min(totalImpact / recentChoices.length || 0, 1);
}

/**
 * 确定场景情绪
 */
export function determineSceneMood(ledger: NarrativeLedger): string {
  const sceneId = ledger.worldState.current_scene_id;
  const recentEvents = ledger.recentEvents.slice(0, 2);
  
  if (sceneId.includes('dungeon') || sceneId.includes('dark')) {
    return 'ominous';
  }
  
  if (recentEvents.some(e => e.summary.includes('战斗') || e.summary.includes('攻击'))) {
    return 'tense';
  }
  
  return 'atmospheric';
}

/**
 * 个性化内容处理
 */
export function personalizeContent(content: string, ledger: NarrativeLedger): string {
  const traits = ledger.playerCharacter.personality_traits;
  
  // 基于玩家特质调整内容风格
  if (traits.includes('谨慎')) {
    content = content.replace('快速', '小心翼翼地');
  }
  
  if (traits.includes('勇敢')) {
    content = content.replace('担心', '决心');
  }
  
  return content;
}

/**
 * 判断是否个性化
 */
export function isPersonalized(ledger: NarrativeLedger): boolean {
  return ledger.playerCharacter.personality_traits.length > 0 ||
         Object.keys(ledger.playerCharacter.morality_vector).length > 2;
}

/**
 * 寻找活跃角色
 */
export function findActiveCharacter(ledger: NarrativeLedger): string | null {
  const relationships = ledger.characterRelationships;
  
  // 寻找最近互动过的角色
  for (const [characterId, relationship] of Object.entries(relationships)) {
    if (relationship.last_interaction_summary && 
        relationship.affinity > 30 && 
        relationship.trust > 20) {
      return characterId;
    }
  }
  
  return null;
}

/**
 * 确定角色情绪
 */
export function determineCharacterMood(ledger: NarrativeLedger, characterId: string): string {
  const relationship = ledger.characterRelationships[characterId];
  
  if (!relationship) return 'neutral';
  
  if (relationship.trust < 30) return 'suspicious';
  if (relationship.affinity < 20) return 'hostile';
  if (relationship.affinity > 70) return 'friendly';
  
  return 'neutral';
}

/**
 * 获取对话风格
 */
export function getDialogueStyle(relationship: any): string {
  if (!relationship) return 'formal';
  
  if (relationship.relationship_type === 'ally') return 'friendly';
  if (relationship.relationship_type === 'enemy') return 'hostile';
  if (relationship.relationship_type === 'romantic') return 'intimate';
  
  return 'neutral';
}

/**
 * 判断是否应该触发选择
 * 🚨 修复：基于叙事进展和事件逻辑判断，而非简单的时间限制
 */
export function shouldTriggerChoice(ledger: NarrativeLedger): boolean {
  const recentEvents = ledger.recentEvents.slice(0, 8);
  const lastChoice = recentEvents.find(e => e.type === 'choice');

  // 如果没有最近的选择，且有基本的叙事内容，就可以触发选择
  if (!lastChoice) {
    // 🚨 修复：降低触发条件，开局有1个叙事事件就可以触发选择
    const narrativeEvents = recentEvents.filter(e => e.type === 'dialogue' || e.type === 'scene_change');
    return narrativeEvents.length >= 1; // 至少1个叙事事件后就触发选择
  }

  // 如果有最近的选择，检查是否有足够的新内容
  const timeSinceLastChoice = Date.now() - lastChoice.timestamp;
  const newEventsAfterChoice = recentEvents.filter(e => e.timestamp > lastChoice.timestamp);

  // 需要满足两个条件：1) 有足够的新内容 2) 时间间隔合理
  return newEventsAfterChoice.length >= 3 && timeSinceLastChoice > 60000; // 1分钟 + 3个新事件
}

/**
 * 确定选择焦点
 */
export function determineChoiceFocus(ledger: NarrativeLedger): string {
  const moralVector = ledger.playerCharacter.morality_vector;
  
  if (Math.abs(moralVector.violence || 0) > 0.5) return 'moral_dilemma';
  if (Math.abs(moralVector.honesty || 0) > 0.5) return 'social';
  
  return 'tactical';
}

/**
 * 确定选择难度
 */
export function determineChoiceDifficulty(ledger: NarrativeLedger): string {
  const traits = ledger.playerCharacter.personality_traits;
  const relationships = Object.keys(ledger.characterRelationships).length;

  if (traits.length > 3 && relationships > 2) return 'hard';
  if (traits.length > 1 || relationships > 1) return 'medium';

  return 'easy';
}

/**
 * 获取故事进度
 */
export function getStoryProgress(ledger: NarrativeLedger): StoryProgress {
  const recentEvents = ledger.recentEvents || [];
  const choicesMade = recentEvents.filter(e => e.type === 'choice').map(e => e.summary);

  // 根据事件数量和选择判断故事阶段
  let storyPhase: StoryProgress['storyPhase'] = 'opening';
  let playerPath: StoryProgress['playerPath'] = 'unknown';
  let currentScene = 1;

  if (recentEvents.length === 0) {
    storyPhase = 'opening';
  } else if (recentEvents.length <= 3) {
    storyPhase = 'encounter';
  } else if (choicesMade.length > 0) {
    storyPhase = 'choice_made';
    currentScene = 2;

    // 判断玩家路径
    const lastChoice = choicesMade[choicesMade.length - 1];
    if (lastChoice.includes('aggressive') || lastChoice.includes('攻击')) {
      playerPath = 'aggressive';
    } else if (lastChoice.includes('diplomatic') || lastChoice.includes('说服')) {
      playerPath = 'diplomatic';
    } else if (lastChoice.includes('stealth') || lastChoice.includes('潜行')) {
      playerPath = 'stealth';
    }
  }

  if (recentEvents.length > 6) {
    storyPhase = 'development';
    currentScene = 3;
  }

  if (recentEvents.length > 10) {
    storyPhase = 'ending';
    currentScene = 4;
  }

  return {
    currentScene,
    playerPath,
    keyChoicesMade: choicesMade,
    storyPhase
  };
}

/**
 * 生成基于故事进度的叙述内容
 */
export function generateStoryNarration(
  context: any,
  ledger: NarrativeLedger,
  variety: number
): ContentResponse {
  const progress = getStoryProgress(ledger);
  const focus = context.focus || 'progression';

  console.log('🔍 [StubAgentCore-helpers] generateStoryNarration 开始', {
    storyPhase: progress.storyPhase,
    focus,
    recentEventsCount: ledger.recentEvents.length,
    variety
  });

  let templates: string[] = [];

  // 根据故事进度选择内容
  switch (progress.storyPhase) {
    case 'opening':
      templates = COMPLETE_STORY_CONTENT.scene1.opening_narration;
      console.log('📖 [StubAgentCore-helpers] 选择开场叙述模板', {
        templatesCount: templates.length,
        firstTemplate: templates[0]?.substring(0, 50) + '...'
      });
      break;
    case 'encounter':
      if (focus === 'environment_description') {
        templates = COMPLETE_STORY_CONTENT.scene1.environment_description;
      } else {
        templates = COMPLETE_STORY_CONTENT.scene2.guard_appearance;
      }
      break;
    case 'choice_made':
    case 'development':
      if (progress.playerPath !== 'unknown') {
        const pathKey = `${progress.playerPath}_path` as keyof typeof COMPLETE_STORY_CONTENT.scene3;
        const pathContent = COMPLETE_STORY_CONTENT.scene3[pathKey];
        if (pathContent) {
          templates = pathContent.narration;
        } else {
          templates = COMPLETE_STORY_CONTENT.scene1.opening_narration;
        }
      } else {
        templates = COMPLETE_STORY_CONTENT.scene1.opening_narration;
      }
      break;
    case 'ending':
      const endingKey = `${progress.playerPath}_ending` as keyof typeof COMPLETE_STORY_CONTENT.scene4;
      templates = COMPLETE_STORY_CONTENT.scene4[endingKey] || COMPLETE_STORY_CONTENT.scene4.diplomatic_ending;
      break;
    default:
      templates = COMPLETE_STORY_CONTENT.scene1.opening_narration;
  }

  // 基于variety选择内容
  const selectedTemplate = templates[Math.floor(Math.random() * Math.min(templates.length, variety))];

  console.log('🎲 [StubAgentCore-helpers] 选择叙述模板', {
    templatesCount: templates.length,
    selectedTemplate: selectedTemplate?.substring(0, 100) + '...',
    variety
  });

  // 个性化处理
  let content = selectedTemplate;
  if (context.personalization?.adaptation_level > 0.5) {
    content = personalizeContent(content, ledger);
  }

  const result = {
    type: ContentType.NARRATION,
    content,
    metadata: {
      style: focus,
      emotion: context.mood || 'atmospheric',
      personalized: context.personalization?.adaptation_level > 0.5,
      story_phase: progress.storyPhase,
      current_scene: progress.currentScene
    }
  };

  console.log('✅ [StubAgentCore-helpers] 叙述内容生成完成', {
    type: result.type,
    contentLength: result.content?.length,
    contentPreview: result.content?.substring(0, 100) + '...',
    metadata: result.metadata
  });

  return result;
}

/**
 * 生成基于故事进度的对话内容
 */
export function generateStoryDialogue(
  context: any,
  ledger: NarrativeLedger,
  variety: number
): ContentResponse {
  const progress = getStoryProgress(ledger);
  const characterId = context.character_id || 'guard';
  const mood = context.mood || 'neutral';

  let templates: string[] = [];

  // 根据故事进度和角色关系选择对话
  if (characterId === 'guard') {
    const guardRelation = ledger.characterRelationships.guard;
    const relationshipMood = guardRelation ?
      (guardRelation.trust > 60 ? 'sympathetic' :
       guardRelation.trust < 30 ? 'suspicious' : 'neutral') : 'neutral';

    switch (progress.storyPhase) {
      case 'encounter':
        templates = COMPLETE_STORY_CONTENT.scene2.guard_dialogue.initial;
        break;
      case 'choice_made':
      case 'development':
        if (progress.playerPath !== 'unknown') {
          const pathKey = `${progress.playerPath}_path` as keyof typeof COMPLETE_STORY_CONTENT.scene3;
          const pathContent = COMPLETE_STORY_CONTENT.scene3[pathKey];
          if (pathContent && pathContent.guard_reaction) {
            templates = pathContent.guard_reaction;
          } else {
            templates = COMPLETE_STORY_CONTENT.scene2.guard_dialogue[relationshipMood] ||
                       COMPLETE_STORY_CONTENT.scene2.guard_dialogue.neutral;
          }
        } else {
          templates = COMPLETE_STORY_CONTENT.scene2.guard_dialogue[relationshipMood] ||
                     COMPLETE_STORY_CONTENT.scene2.guard_dialogue.neutral;
        }
        break;
      default:
        templates = COMPLETE_STORY_CONTENT.scene2.guard_dialogue[relationshipMood] ||
                   COMPLETE_STORY_CONTENT.scene2.guard_dialogue.neutral;
    }
  } else {
    // 其他角色的默认对话
    templates = ['我不知道该说什么...', '这里发生了什么？', '你看起来需要帮助。'];
  }

  const selectedTemplate = templates[Math.floor(Math.random() * Math.min(templates.length, variety))];

  return {
    type: ContentType.DIALOGUE,
    content: selectedTemplate,
    metadata: {
      character_id: characterId,
      emotion: mood,
      style: 'conversational',
      story_phase: progress.storyPhase,
      relationship_influenced: true
    }
  };
}

/**
 * 生成基于故事进度的内心独白
 */
export function generateStoryIntrospection(
  context: any,
  ledger: NarrativeLedger,
  variety: number
): ContentResponse {
  const progress = getStoryProgress(ledger);
  const focus = context.focus || 'emotional';

  let templates: string[] = [];

  // 根据故事进度选择内心独白
  switch (progress.storyPhase) {
    case 'opening':
      templates = COMPLETE_STORY_CONTENT.scene1.awakening_introspection;
      break;
    case 'choice_made':
    case 'development':
      if (progress.playerPath !== 'unknown') {
        const pathKey = `${progress.playerPath}_path` as keyof typeof COMPLETE_STORY_CONTENT.scene3;
        const pathContent = COMPLETE_STORY_CONTENT.scene3[pathKey];
        if (pathContent && pathContent.introspection) {
          templates = pathContent.introspection;
        } else {
          templates = COMPLETE_STORY_CONTENT.scene1.awakening_introspection;
        }
      } else {
        templates = COMPLETE_STORY_CONTENT.scene1.awakening_introspection;
      }
      break;
    default:
      templates = COMPLETE_STORY_CONTENT.scene1.awakening_introspection;
  }

  const selectedTemplate = templates[Math.floor(Math.random() * Math.min(templates.length, variety))];

  return {
    type: ContentType.INTROSPECTION,
    content: selectedTemplate,
    metadata: {
      style: focus,
      emotion: context.mood || 'contemplative',
      story_phase: progress.storyPhase,
      reflects_choice: progress.playerPath !== 'unknown'
    }
  };
}
