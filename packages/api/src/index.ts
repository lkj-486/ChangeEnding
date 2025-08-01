import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';

// 加载环境变量
dotenv.config();

const PORT = process.env.PORT || 3002;

// 创建HTTP服务器
const server = createServer(app);

// 创建Socket.IO服务器
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.VITE_API_BASE_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log(`客户端连接: ${socket.id}`);

  // 加入游戏房间
  socket.on('join-game', (gameId: string) => {
    socket.join(`game-${gameId}`);
    console.log(`客户端 ${socket.id} 加入游戏 ${gameId}`);

    // 🚀 修复：为新加入的客户端重新发送最近的叙事内容
    // 延迟1秒确保客户端完全准备好接收事件
    setTimeout(() => {
      console.log(`🔄 为客户端 ${socket.id} 重新发送叙事内容`);

      // 从全局存储中获取该游戏的最近叙事内容并发送给新客户端
      const { GameControllerStatic } = require('./controllers/GameController');
      const recentNarrative = GameControllerStatic.getRecentNarrativeForGame(gameId);
      if (recentNarrative && recentNarrative.length > 0) {
        console.log(`📚 找到 ${recentNarrative.length} 条历史叙事内容，准备重新发送`);
        recentNarrative.forEach((narrativeData: any, index: number) => {
          // 延迟发送，确保顺序
          setTimeout(() => {
            socket.emit('narrative-update', narrativeData);
            console.log(`📡 重新发送叙事内容 ${index + 1}/${recentNarrative.length} 给客户端 ${socket.id}:`, narrativeData.segment.content.substring(0, 50) + '...');
          }, index * 200); // 每条内容间隔200ms
        });
      } else {
        console.log(`📭 游戏 ${gameId} 暂无历史叙事内容`);
      }
    }, 1000);
  });

  // 离开游戏房间
  socket.on('leave-game', (gameId: string) => {
    socket.leave(`game-${gameId}`);
    console.log(`客户端 ${socket.id} 离开游戏 ${gameId}`);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`客户端断开连接: ${socket.id}`);
  });
});

// 将Socket.IO实例附加到app上，供路由使用
app.set('io', io);

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 故事编织者API服务器启动成功`);
  console.log(`📡 HTTP服务器运行在: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket服务器运行在: ws://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
}).on('error', (err) => {
  console.error('❌ 服务器启动失败:', err);
  process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 全局异常处理
process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获的异常:', err);
  console.error('Stack trace:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});
