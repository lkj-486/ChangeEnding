// 简单的测试服务器 - 升级版本支持数据库持久化
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = 3002;

// 初始化数据库客户端
const prisma = new PrismaClient();

// 创建HTTP服务器和Socket.IO
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 中间件
app.use(cors());
app.use(express.json());

// 测试路由
app.get('/api/stories', (req, res) => {
  console.log('收到 /api/stories 请求');
  const stories = [
    {
      id: 'escape-dungeon',
      title: '逃出地牢',
      description: '在阴暗的地牢中醒来，你必须想办法逃脱...',
      difficulty: 'medium',
      estimatedTime: '15-30分钟',
      characters: ['hero', 'guard'], // 添加前端期望的字段
      choicePointsCount: 3 // 添加前端期望的字段
    }
  ];

  // 返回前端期望的格式：{success: true, data: {stories: [...], total: N}, message: "..."}
  res.json({
    success: true,
    data: {
      stories: stories,
      total: stories.length
    },
    message: '故事列表获取成功'
  });
});

// 游戏状态存储（内存中，仅用于测试）
const games = new Map();

// 生成UUID的简单函数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 数据库持久化函数
async function saveGameStateToDatabase(gameState) {
  try {
    console.log(`💾 保存游戏状态到数据库: ${gameState.gameId}`);

    await prisma.gameState.upsert({
      where: { gameId: gameState.gameId },
      update: {
        currentSceneId: gameState.scene.id,
        sceneState: gameState.scene.state,
        narrativeLedger: gameState.narrativeLedger,
        worldStateJson: { scene: gameState.scene },
        narrativeHistory: gameState.narrative,
        choiceHistory: [],
        gameProgress: { step: 1, total: 10 },
        snapshotVersion: '1.0',
        isActive: true,
        lastPlayedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        gameId: gameState.gameId,
        storyId: gameState.storyId,
        userId: gameState.userId || null, // 允许null值
        currentSceneId: gameState.scene.id,
        sceneState: gameState.scene.state,
        narrativeLedger: gameState.narrativeLedger,
        worldStateJson: { scene: gameState.scene },
        narrativeHistory: gameState.narrative,
        choiceHistory: [],
        gameProgress: { step: 1, total: 10 },
        snapshotVersion: '1.0',
        isActive: true,
        lastPlayedAt: new Date()
      }
    });

    console.log(`✅ 游戏状态已保存到数据库: ${gameState.gameId}`);
  } catch (error) {
    console.error(`❌ 保存游戏状态到数据库失败: ${gameState.gameId}`, error);
    // 不抛出错误，保持向后兼容
  }
}

async function loadGameStateFromDatabase(gameId) {
  try {
    console.log(`📂 从数据库加载游戏状态: ${gameId}`);

    const dbGameState = await prisma.gameState.findUnique({
      where: { gameId },
      include: { story: true }
    });

    if (!dbGameState) {
      console.log(`⚠️ 数据库中未找到游戏状态: ${gameId}`);
      return null;
    }

    // 转换数据库格式到内存格式
    const gameState = {
      gameId: dbGameState.gameId,
      storyId: dbGameState.storyId,
      userId: dbGameState.userId,
      scene: {
        id: dbGameState.currentSceneId,
        title: dbGameState.story?.title || '未知故事',
        state: dbGameState.sceneState
      },
      narrativeLedger: dbGameState.narrativeLedger,
      narrative: dbGameState.narrativeHistory,
      isWaitingForChoice: false,
      currentChoice: null,
      createdAt: dbGameState.createdAt.toISOString(),
      updatedAt: dbGameState.updatedAt.toISOString()
    };

    console.log(`✅ 从数据库加载游戏状态成功: ${gameId}`);
    return gameState;
  } catch (error) {
    console.error(`❌ 从数据库加载游戏状态失败: ${gameId}`, error);
    return null;
  }
}

// 创建新游戏 - 升级版本，集成数据库持久化
app.post('/api/game/new', async (req, res) => {
  console.log('🎮 收到 POST /api/game/new 请求', req.body);

  const { storyId, userId } = req.body;

  if (!storyId) {
    return res.status(400).json({
      success: false,
      error: 'storyId is required'
    });
  }

  const gameId = generateUUID();

  try {

    // 创建游戏状态 - 新架构兼容格式
    const gameState = {
      gameId,
      storyId,
      userId: userId || null,
      scene: {
        id: 'dungeon-start',
        title: '逃出地牢',
        state: 'RUNNING'
      },
      // 新增：叙事账本结构
      narrativeLedger: {
        playerCharacter: {
          morality_vector: { honesty: 0.5, violence: 0.0, compassion: 0.5 },
          methodology_preference: { stealth: 5, diplomacy: 5, force: 5 },
          personality_traits: []
        },
        characterRelationships: {
          guard: {
            affinity: 50,
            trust: 50,
            last_interaction_summary: '初次相遇'
          }
        },
        worldState: {
          current_scene_id: 'dungeon-start',
          scene_flags: {},
          time_of_day: 'evening',
          location: '逃出地牢'
        },
        recentEvents: []
      },
      // 保持向后兼容的叙事格式
      narrative: [
        {
          id: 'narrative_1',
          type: 'narration',
          content: '冰冷的石墙，生锈的铁栅栏，还有远处传来的滴水声。艾伦在这个阴暗的地牢中醒来，头脑中一片混乱。',
          timestamp: Date.now() + 1000, // 确保时间戳递增
          metadata: { style: 'atmospheric', mood: 'mysterious' }
        },
        {
          id: 'narrative_2',
          type: 'internal_thought',
          content: '我是怎么到这里的？头好痛...必须保持冷静，先观察一下周围的环境。',
          timestamp: Date.now() + 2000,
          metadata: { style: 'introspective', mood: 'confused' }
        },
        {
          id: 'narrative_3',
          type: 'description',
          content: '牢房很小，大约三米见方。墙壁是粗糙的石头，地面潮湿且布满青苔。唯一的光源来自走廊尽头微弱的火把。',
          timestamp: Date.now() + 3000,
          metadata: { style: 'descriptive', mood: 'observational' }
        },
        {
          id: 'narrative_4',
          type: 'narration',
          content: '突然，远处传来了脚步声。有人正朝这边走来，脚步声越来越近。艾伦屏住呼吸，紧贴着墙壁。',
          timestamp: Date.now() + 4000,
          metadata: { style: 'suspenseful', mood: 'tense' }
        }
      ],
      isWaitingForChoice: false,
      currentChoice: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 存储到内存（向后兼容）
    games.set(gameId, gameState);

    // 新增：保存到数据库
    await saveGameStateToDatabase(gameState);

    console.log(`✅ 游戏创建成功: ${gameId}`);

    res.json({
      success: true,
      data: {
        gameId,
        scene: gameState.scene,
        narrative: gameState.narrative,
        narrativeLedger: gameState.narrativeLedger // 新增：返回叙事账本
      }
    });

  } catch (error) {
    console.error('❌ 创建游戏失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create game'
    });
  }
});

// 获取游戏状态 - 支持数据库加载
app.get('/api/game/:gameId', async (req, res) => {
  console.log(`收到 GET /api/game/${req.params.gameId} 请求`);

  const { gameId } = req.params;

  try {
    // 首先尝试从内存获取
    let gameState = games.get(gameId);

    // 如果内存中没有，尝试从数据库加载
    if (!gameState) {
      console.log(`内存中未找到游戏状态，尝试从数据库加载: ${gameId}`);
      gameState = await loadGameStateFromDatabase(gameId);

      if (gameState) {
        // 加载到内存中
        games.set(gameId, gameState);
        console.log(`✅ 游戏状态已从数据库恢复到内存: ${gameId}`);
      }
    }

    if (!gameState) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    console.log(`✅ 返回游戏状态: ${gameId}`);

    res.json({
      success: true,
      data: gameState
    });

  } catch (error) {
    console.error(`❌ 获取游戏状态失败: ${gameId}`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game state'
    });
  }
});

// 处理玩家选择 - 支持数据库持久化
app.post('/api/game/:gameId/choice', async (req, res) => {
  console.log(`收到 POST /api/game/${req.params.gameId}/choice 请求`, req.body);

  const { gameId } = req.params;
  const { choicePointId, selectedOptionId } = req.body;

  const gameState = games.get(gameId);

  if (!gameState) {
    return res.status(404).json({
      success: false,
      error: 'Game not found'
    });
  }

  try {
    // 更新叙事账本以反映玩家选择
    const narrativeLedger = gameState.narrativeLedger;

    // 添加选择事件到叙事账本
    const choiceEvent = {
      type: 'choice',
      summary: `选择了${selectedOptionId}`,
      timestamp: Date.now(),
      impact: {
        scope: 'local',
        magnitude: 5,
        tags: [selectedOptionId]
      }
    };

    narrativeLedger.recentEvents.push(choiceEvent);

    // 根据选择更新玩家特质和道德向量
    if (selectedOptionId === 'aggressive') {
      narrativeLedger.playerCharacter.morality_vector.violence =
        (narrativeLedger.playerCharacter.morality_vector.violence || 0) + 0.2;
      narrativeLedger.playerCharacter.personality_traits.push('冲动');

      // 影响守卫关系
      if (narrativeLedger.characterRelationships.guard) {
        narrativeLedger.characterRelationships.guard.trust -= 20;
        narrativeLedger.characterRelationships.guard.affinity -= 15;
        narrativeLedger.characterRelationships.guard.last_interaction_summary = '玩家选择了攻击';
      }
    } else if (selectedOptionId === 'diplomatic') {
      narrativeLedger.playerCharacter.morality_vector.compassion =
        (narrativeLedger.playerCharacter.morality_vector.compassion || 0) + 0.1;
      narrativeLedger.playerCharacter.personality_traits.push('外交');

      // 改善守卫关系
      if (narrativeLedger.characterRelationships.guard) {
        narrativeLedger.characterRelationships.guard.trust += 10;
        narrativeLedger.characterRelationships.guard.affinity += 5;
        narrativeLedger.characterRelationships.guard.last_interaction_summary = '玩家选择了对话';
      }
    } else if (selectedOptionId === 'stealth') {
      narrativeLedger.playerCharacter.methodology_preference.stealth =
        (narrativeLedger.playerCharacter.methodology_preference.stealth || 0) + 1;
      narrativeLedger.playerCharacter.personality_traits.push('谨慎');

      // 保持中性关系
      if (narrativeLedger.characterRelationships.guard) {
        narrativeLedger.characterRelationships.guard.last_interaction_summary = '玩家选择了潜行';
      }
    }

    // 使用Director生成后续内容
    const director = gameState.director;

    // 触发选择后的内容生成
    setTimeout(async () => {
      try {
        // 调用Director的AI编排方法
        await director.processGameTurn('player_choice_made');
      } catch (error) {
        console.error('选择后内容生成失败:', error);
      }
    }, 1000);

    gameState.isWaitingForChoice = false;
    gameState.currentChoice = null;
    gameState.updatedAt = new Date().toISOString();

    // 新增：保存状态到数据库
    await saveGameStateToDatabase(gameState);

    console.log(`✅ 选择处理完成: ${gameId}, 选项: ${selectedOptionId}`);

    res.json({
      success: true,
      data: {
        narrative: {
          id: `choice_${Date.now()}`,
          type: 'choice_result',
          content: `选择已处理：${selectedOptionId}`,
          timestamp: Date.now()
        },
        consequence: selectedOptionId,
        gameState: gameState
      }
    });

  } catch (error) {
    console.error(`❌ 选择处理失败: ${gameId}`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to process choice'
    });
  }
});

// 新增：保存游戏状态端点
app.post('/api/game/:gameId/save', async (req, res) => {
  console.log(`收到 POST /api/game/${req.params.gameId}/save 请求`);

  const { gameId } = req.params;

  try {
    const gameState = games.get(gameId);

    if (!gameState) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    await saveGameStateToDatabase(gameState);

    res.json({
      success: true,
      message: 'Game state saved successfully'
    });

  } catch (error) {
    console.error(`❌ 保存游戏状态失败: ${gameId}`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to save game state'
    });
  }
});

// 新增：获取用户游戏列表端点
app.get('/api/user/:userId/games', async (req, res) => {
  console.log(`收到 GET /api/user/${req.params.userId}/games 请求`);

  const { userId } = req.params;

  try {
    const gameStates = await prisma.gameState.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        story: true
      },
      orderBy: {
        lastPlayedAt: 'desc'
      }
    });

    const games = gameStates.map(gameState => ({
      gameId: gameState.gameId,
      storyId: gameState.storyId,
      storyTitle: gameState.story?.title || '未知故事',
      sceneState: gameState.sceneState,
      lastPlayedAt: gameState.lastPlayedAt,
      createdAt: gameState.createdAt
    }));

    res.json({
      success: true,
      data: games
    });

  } catch (error) {
    console.error(`❌ 获取用户游戏列表失败: ${userId}`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user games'
    });
  }
});

// 新增：删除游戏端点
app.delete('/api/game/:gameId', async (req, res) => {
  console.log(`收到 DELETE /api/game/${req.params.gameId} 请求`);

  const { gameId } = req.params;

  try {
    // 从内存中删除
    games.delete(gameId);

    // 从数据库中标记为非活跃
    await prisma.gameState.update({
      where: { gameId },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Game deleted successfully'
    });

  } catch (error) {
    console.error(`❌ 删除游戏失败: ${gameId}`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete game'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket连接处理
io.on('connection', (socket) => {
  console.log(`🔌 客户端连接: ${socket.id}`);

  // 加入游戏房间
  socket.on('join-game', (gameId) => {
    socket.join(`game-${gameId}`);
    console.log(`🏠 客户端 ${socket.id} 加入游戏 ${gameId}`);

    // 首先推送叙事内容
    setTimeout(() => {
      pushNarrativeContent(gameId);
    }, 1000);

    // 然后触发选择点（延迟10秒，确保所有叙事内容都推送完毕）
    setTimeout(() => {
      triggerChoicePoint(gameId);
    }, 10000);
  });

  // 离开游戏房间
  socket.on('leave-game', (gameId) => {
    socket.leave(`game-${gameId}`);
    console.log(`🚪 客户端 ${socket.id} 离开游戏 ${gameId}`);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`❌ 客户端断开连接: ${socket.id}`);
  });
});

// 推送叙事内容的函数
function pushNarrativeContent(gameId) {
  const gameState = games.get(gameId);
  if (!gameState) {
    console.log(`⚠️ 游戏状态不存在: ${gameId}`);
    return;
  }

  console.log(`📖 为游戏 ${gameId} 推送叙事内容`);

  // 逐段推送叙事内容
  const narrative = gameState.narrative;
  if (!narrative || narrative.length === 0) {
    console.log(`⚠️ 游戏 ${gameId} 没有叙事内容`);
    return;
  }

  // 模拟渐进式推送，每段间隔2秒
  narrative.forEach((segment, index) => {
    setTimeout(() => {
      console.log(`📢 推送叙事段落 ${index + 1}/${narrative.length} 到游戏 ${gameId}`, {
        segmentId: segment.id,
        type: segment.type,
        contentLength: segment.content?.length || 0
      });

      io.to(`game-${gameId}`).emit('narrative-update', {
        gameId,
        segment
      });
    }, index * 2000); // 每段间隔2秒
  });
}

// 触发选择点的函数
function triggerChoicePoint(gameId) {
  const gameState = games.get(gameId);
  if (!gameState) return;

  console.log(`🎯 为游戏 ${gameId} 触发选择点`);

  // 创建选择点
  const choicePoint = {
    choicePointId: 'guard_encounter_choice',
    options: [
      {
        id: 'attack',
        text: '直接攻击守卫',
        action: { type: 'ATTACK', target: 'guard' }
      },
      {
        id: 'sneak',
        text: '尝试悄悄绕过守卫',
        action: { type: 'SNEAK_PAST', target: 'guard' }
      },
      {
        id: 'distract',
        text: '制造声响分散注意力',
        action: { type: 'DISTRACT', target: 'guard' }
      }
    ],
    context: {
      scene: gameState.scene,
      agentId: 'guard'
    },
    timestamp: Date.now()
  };

  // 更新游戏状态
  gameState.isWaitingForChoice = true;
  gameState.currentChoice = choicePoint;
  gameState.updatedAt = new Date().toISOString();

  // 发送选择点事件到前端
  io.to(`game-${gameId}`).emit('choice-required', {
    gameId,
    choicePoint
  });

  console.log(`📢 已发送选择点事件到游戏 ${gameId}`);
}

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 测试服务器启动成功`);
  console.log(`📡 HTTP服务器运行在: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket服务器运行在: ws://localhost:${PORT}`);
  console.log(`💾 数据库持久化已启用`);
  console.log(`🔗 测试链接: http://localhost:${PORT}/api/stories`);
});

// 优雅关闭处理
process.on('SIGINT', async () => {
  console.log('\n🛑 收到关闭信号，正在优雅关闭服务器...');

  try {
    // 关闭数据库连接
    await prisma.$disconnect();
    console.log('✅ 数据库连接已关闭');

    // 关闭服务器
    server.close(() => {
      console.log('✅ 服务器已关闭');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ 关闭过程中出现错误:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 收到终止信号，正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});
