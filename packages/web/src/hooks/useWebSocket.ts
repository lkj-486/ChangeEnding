import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

interface NarrativeSegment {
  id: string;
  type: 'dialogue' | 'narration' | 'internal_thought' | 'description';
  content: string;
  character?: string;
  timestamp: number;
}

interface ChoicePoint {
  choicePointId: string;
  options: any[];
  context: any;
  timestamp: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  narrativeUpdates: NarrativeSegment[];
  currentChoicePoint: ChoicePoint | null;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  reconnectAttempts: number;
  reconnect: () => void;
}

export const useWebSocket = (gameId: string): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [narrativeUpdates, setNarrativeUpdates] = useState<NarrativeSegment[]>([]);
  const [currentChoicePoint, setCurrentChoicePoint] = useState<ChoicePoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1秒

  // 指数退避重连函数 - 修复依赖问题
  const scheduleReconnect = useCallback(() => {
    setReconnectAttempts(currentAttempts => {
      if (currentAttempts >= maxReconnectAttempts) {
        setError('连接失败次数过多，请刷新页面重试');
        setConnectionStatus('disconnected');
        return currentAttempts;
      }

      const delay = Math.min(baseReconnectDelay * Math.pow(2, currentAttempts), 30000);
      console.log(`🔄 计划重连，延迟: ${delay}ms, 尝试次数: ${currentAttempts + 1}`);
      setConnectionStatus('reconnecting');

      reconnectTimeoutRef.current = setTimeout(() => {
        connectSocket();
      }, delay);

      return currentAttempts + 1;
    });
  }, []);

  // 连接Socket函数 - 修复循环依赖
  const connectSocket = useCallback(() => {
    console.log('🔄 开始连接WebSocket', {
      gameId,
      currentStatus: connectionStatus,
      hasExistingSocket: !!socketRef.current
    });

    // 清理现有连接
    if (socketRef.current) {
      console.log('🧹 清理现有WebSocket连接');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnectionStatus('connecting');

    // 创建WebSocket连接
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      autoConnect: true,
    });

    socketRef.current = socket;

    // 连接成功
    socket.on('connect', () => {
      console.log('✅ WebSocket连接成功', {
        gameId,
        socketId: socket.id,
        transport: socket.io.engine.transport.name
      });

      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      setReconnectAttempts(0); // 重置重连计数

      // 清除重连定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // 加入游戏房间
      console.log('🏠 加入游戏房间', { gameId });
      socket.emit('join-game', gameId);
    });

    // 连接失败
    socket.on('connect_error', (err) => {
      console.error('WebSocket连接失败:', err);
      setIsConnected(false);
      setError('WebSocket连接失败');

      // 自动重连
      scheduleReconnect();
    });

    // 断开连接
    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      setConnectionStatus('disconnected');

      // 根据断开原因决定是否重连
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
        scheduleReconnect();
      }
    });

    // 监听叙述更新
    socket.on('narrative-update', (data: { gameId: string; segment: NarrativeSegment }) => {
      if (data.gameId === gameId) {
        setNarrativeUpdates(prev => {
          // 检查是否已存在相同ID的叙述
          const exists = prev.some(item => item.id === data.segment.id);
          if (exists) {
            return prev;
          }
          return [...prev, data.segment];
        });
      }
    });

    // 监听选择点 - 增强调试
    socket.on('choice-required', (data: { gameId: string; choicePoint: ChoicePoint }) => {
      console.log('🎯 收到choice-required事件', {
        eventGameId: data.gameId,
        currentGameId: gameId,
        isMatch: data.gameId === gameId,
        choicePoint: data.choicePoint,
        optionsCount: data.choicePoint?.options?.length || 0
      });

      if (data.gameId === gameId) {
        console.log('✅ 设置currentChoicePoint', data.choicePoint);
        setCurrentChoicePoint(data.choicePoint);
      } else {
        console.log('⚠️ GameId不匹配，忽略choice-required事件');
      }
    });

    // 监听选择完成（清除当前选择点）
    socket.on('choice-completed', (data: { gameId: string; choicePointId: string; selectedOptionId: string; timestamp: number }) => {
      if (data.gameId === gameId) {
        console.log(`收到choice-completed事件: ${data.choicePointId}`);
        setCurrentChoicePoint(null);
      }
    });

    // 监听游戏状态变化
    socket.on('game-state-changed', (data: { gameId: string; state: any; reason: string; timestamp: number }) => {
      if (data.gameId === gameId) {
        console.log(`收到game-state-changed事件: ${data.reason}`);
        // 触发React Query缓存更新
        // 这里可以通过事件或回调通知StoryDisplay组件更新
      }
    });

    // 监听错误
    socket.on('error', (err: any) => {
      console.error('WebSocket错误:', err);
      setError(err.message || '未知WebSocket错误');
    });

    // 监听网络状态变化
    const handleOnline = () => {
      if (!isConnected && socketRef.current) {
        console.log('网络恢复，尝试重连WebSocket');
        socketRef.current.connect();
      }
    };

    const handleOffline = () => {
      setConnectionStatus('disconnected');
      setError('网络连接已断开');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 清理函数
    return () => {
      // 清理网络事件监听
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      // 清理重连定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socket) {
        socket.emit('leave-game', gameId);
        socket.disconnect();
      }
    };
  }, [gameId, scheduleReconnect]); // 移除isConnected依赖

  // 手动重连函数
  const manualReconnect = useCallback(() => {
    setReconnectAttempts(0);
    setError(null);
    connectSocket();
  }, [connectSocket]);

  // 🚀 初始化WebSocket连接 - 修复循环问题
  useEffect(() => {
    console.log('🔗 初始化WebSocket连接', { gameId });

    // 重置状态
    setIsConnected(false);
    setConnectionStatus('connecting');
    setError(null);
    setReconnectAttempts(0);
    setNarrativeUpdates([]);
    setCurrentChoicePoint(null);

    connectSocket();

    return () => {
      console.log('🔌 清理WebSocket连接', { gameId });
      if (socketRef.current) {
        socketRef.current.emit('leave-game', gameId);
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // 清理重连定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [gameId]); // 🔧 移除connectSocket依赖，避免循环

  return {
    isConnected,
    narrativeUpdates,
    currentChoicePoint,
    error,
    connectionStatus,
    reconnectAttempts,
    reconnect: manualReconnect,
  };
};
