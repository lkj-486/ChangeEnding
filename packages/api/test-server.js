// 简单的测试服务器
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = 3001;

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
  res.json({
    success: true,
    stories: [
      {
        id: 'escape-dungeon',
        title: '逃出地牢',
        description: '在阴暗的地牢中醒来，你必须想办法逃脱...',
        difficulty: 'medium',
        estimatedTime: '15-30分钟',
        characters: ['hero', 'guard'], // 添加前端期望的字段
        choicePointsCount: 3 // 添加前端期望的字段
      }
    ]
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

// 创建新游戏
app.post('/api/game/new', (req, res) => {
  console.log('收到 POST /api/game/new 请求', req.body);

  const { storyId, userId } = req.body;

  if (!storyId) {
    return res.status(400).json({
      success: false,
      error: 'storyId is required'
    });
  }

  const gameId = generateUUID();

  // 创建游戏状态
  const gameState = {
    gameId,
    storyId,
    userId: userId || null,
    scene: {
      id: 'dungeon-start',
      title: '逃出地牢',
      state: 'RUNNING'
    },
    narrative: [
      {
        id: 'narrative_1',
        type: 'description',
        content: '冰冷的石墙，生锈的铁栅栏，还有远处传来的滴水声。艾伦在这个阴暗的地牢中醒来，头脑中一片混乱。他必须想办法逃出这里，但首先需要了解周围的环境和可能的威胁。',
        timestamp: Date.now()
      }
    ],
    isWaitingForChoice: false,
    currentChoice: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 存储游戏状态
  games.set(gameId, gameState);

  console.log(`✅ 游戏创建成功: ${gameId}`);

  res.json({
    success: true,
    data: {
      gameId,
      scene: gameState.scene,
      narrative: gameState.narrative
    }
  });
});

// 获取游戏状态
app.get('/api/game/:gameId', (req, res) => {
  console.log(`收到 GET /api/game/${req.params.gameId} 请求`);

  const { gameId } = req.params;
  const gameState = games.get(gameId);

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
});

// 处理玩家选择
app.post('/api/game/:gameId/choice', (req, res) => {
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

  // 模拟选择处理
  const choiceResults = {
    'attack': {
      narrative: '你决定直接攻击守卫。守卫被你的突然袭击吓了一跳，但很快反应过来，拔出了武器。战斗开始了！',
      consequence: 'combat_initiated'
    },
    'sneak': {
      narrative: '你小心翼翼地贴着墙壁移动，试图绕过守卫。幸运的是，守卫似乎在打瞌睡，你成功地潜行过去了。',
      consequence: 'stealth_success'
    },
    'distract': {
      narrative: '你捡起一块小石头，朝远处扔去。石头撞击墙壁的声音吸引了守卫的注意，他走向声音来源，给你创造了逃脱的机会。',
      consequence: 'distraction_success'
    }
  };

  const result = choiceResults[selectedOptionId] || choiceResults['attack'];

  // 添加新的叙事片段
  const newNarrative = {
    id: `narrative_${gameState.narrative.length + 1}`,
    type: 'description',
    content: result.narrative,
    timestamp: Date.now()
  };

  gameState.narrative.push(newNarrative);
  gameState.isWaitingForChoice = false;
  gameState.currentChoice = null;
  gameState.updatedAt = new Date().toISOString();

  console.log(`✅ 选择处理完成: ${gameId}, 选项: ${selectedOptionId}`);

  res.json({
    success: true,
    data: {
      narrative: newNarrative,
      consequence: result.consequence,
      gameState: gameState
    }
  });
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

    // 模拟AI代理触发选择点（延迟5秒）
    setTimeout(() => {
      triggerChoicePoint(gameId);
    }, 5000);
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
  console.log(`🔗 测试链接: http://localhost:${PORT}/api/stories`);
});
