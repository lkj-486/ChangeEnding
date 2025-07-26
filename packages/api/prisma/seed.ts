import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始数据库种子数据初始化...');

  // 清理现有数据
  await prisma.gameSession.deleteMany();
  await prisma.gameState.deleteMany();
  await prisma.story.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemLog.deleteMany();

  console.log('🗑️  清理现有数据完成');

  // 创建测试用户
  const testUser = await prisma.user.create({
    data: {
      email: 'test@storyweaver.demo',
      username: 'demo_user',
    },
  });

  console.log('👤 创建测试用户:', testUser.username);

  // 创建故事数据
  const stories = [
    {
      id: 'escape-dungeon',
      title: '逃出地牢',
      description: '主角被关在一个阴暗的地牢中，必须想办法逃脱。地牢里有一个守卫在巡逻，还有一些可能有用的物品散落在角落。这是一个考验智慧、勇气和选择的冒险故事。',
      author: 'StoryWeaver Team',
      version: '1.0.0',
      isActive: true,
      metadata: {
        difficulty: 'medium',
        estimatedPlayTime: '15-30分钟',
        themes: ['冒险', '解谜', '选择', '逃脱'],
        tags: ['地牢', '守卫', '互动', '策略'],
        characters: ['hero', 'guard'],
        scenes: ['dungeon_cell', 'corridor', 'exit'],
        choicePoints: 2,
        language: 'zh-CN'
      },
    },
    {
      id: 'forest-adventure',
      title: '森林奇遇',
      description: '在一个神秘的森林中，主角遇到了各种奇异的生物和挑战。每一个选择都将影响故事的发展方向。',
      author: 'StoryWeaver Team',
      version: '1.0.0',
      isActive: true,
      metadata: {
        difficulty: 'easy',
        estimatedPlayTime: '10-20分钟',
        themes: ['奇幻', '自然', '友谊'],
        tags: ['森林', '魔法', '动物'],
        characters: ['hero', 'forest_spirit', 'wise_owl'],
        scenes: ['forest_entrance', 'magical_clearing', 'ancient_tree'],
        choicePoints: 3,
        language: 'zh-CN'
      },
    },
    {
      id: 'space-station',
      title: '太空站危机',
      description: '在遥远的太空站上，系统出现了故障。主角必须在有限的时间内解决问题，拯救整个太空站的人员。',
      author: 'StoryWeaver Team',
      version: '1.0.0',
      isActive: false, // 暂未开放
      metadata: {
        difficulty: 'hard',
        estimatedPlayTime: '30-45分钟',
        themes: ['科幻', '紧急', '技术'],
        tags: ['太空', '危机', '科技'],
        characters: ['hero', 'ai_assistant', 'captain'],
        scenes: ['control_room', 'engine_bay', 'escape_pods'],
        choicePoints: 4,
        language: 'zh-CN'
      },
    },
  ];

  for (const storyData of stories) {
    const story = await prisma.story.create({
      data: storyData,
    });
    console.log(`📚 创建故事: ${story.title} (${story.id})`);
  }

  // 创建示例游戏状态
  const sampleGameState = await prisma.gameState.create({
    data: {
      storyId: 'escape-dungeon',
      userId: testUser.id,
      currentSceneId: 'escape-dungeon',
      sceneState: 'RUNNING',
      worldState: {
        entities: [
          {
            id: 'hero',
            components: {
              Identity: { id: 'hero', displayName: '艾伦', description: '勇敢的冒险者' },
              Position: { x: 0, y: 0, z: 0 },
              IsInScene: { sceneId: 'escape-dungeon' }
            }
          },
          {
            id: 'guard',
            components: {
              Identity: { id: 'guard', displayName: '马库斯', description: '地牢守卫' },
              Position: { x: 5, y: 3, z: 0 },
              IsInScene: { sceneId: 'escape-dungeon' }
            }
          }
        ],
        entityCounter: 2
      },
      narrativeHistory: [
        {
          id: 'narrative_1',
          type: 'description',
          content: '冰冷的石墙，生锈的铁栅栏，还有远处传来的滴水声。艾伦在这个阴暗的地牢中醒来，头脑中一片混乱。他必须想办法逃出这里，但首先需要了解周围的环境和可能的威胁。',
          timestamp: Date.now() - 30000
        },
        {
          id: 'narrative_2',
          type: 'narration',
          content: '艾伦缓缓站起身来，感受着身体的每一处酸痛。他的记忆有些模糊，但求生的本能告诉他必须保持警觉。远处传来的脚步声提醒他，这里并不安全。',
          timestamp: Date.now() - 20000
        }
      ],
      choiceHistory: [],
      gameProgress: {
        currentStep: 1,
        totalSteps: 10,
        completedActions: ['wake_up', 'observe_environment'],
        availableActions: ['move', 'search', 'listen'],
        storyBranch: 'main'
      },
      lastPlayedAt: new Date(),
    },
  });

  console.log(`🎮 创建示例游戏状态: ${sampleGameState.id}`);

  // 创建系统日志示例
  const systemLogs = [
    {
      level: 'INFO',
      message: '系统启动完成',
      context: {
        version: '1.0.0',
        environment: 'development',
        timestamp: new Date().toISOString()
      }
    },
    {
      level: 'INFO',
      message: '数据库种子数据初始化完成',
      context: {
        stories: stories.length,
        users: 1,
        gameStates: 1
      }
    }
  ];

  for (const logData of systemLogs) {
    await prisma.systemLog.create({
      data: logData,
    });
  }

  console.log(`📝 创建系统日志: ${systemLogs.length} 条记录`);

  console.log('✅ 数据库种子数据初始化完成!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 初始化统计:');
  console.log(`   • 用户: 1`);
  console.log(`   • 故事: ${stories.length}`);
  console.log(`   • 游戏状态: 1`);
  console.log(`   • 系统日志: ${systemLogs.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ 数据库种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
