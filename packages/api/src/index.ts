import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';

// 加载环境变量
dotenv.config();

const PORT = process.env.PORT || 3001;

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
