import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore, NarrativeSegment, ChoicePoint } from '@/stores/gameStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';

// 🎯 简化的WebSocket返回接口 - 只包含连接相关信息
interface UseWebSocketReturn {
  isConnected: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  reconnectAttempts: number;
  reconnect: () => void;
}

export const useWebSocket = (gameId: string): UseWebSocketReturn => {
  // 🎯 只保留连接相关的本地状态
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // 🎯 获取gameStore的状态更新方法
  const { addNarrativeSegment, setChoicePoint } = useGameStore();

  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1秒

  // 🔧 作用域隔离模式：手动重连函数（简化版）
  const manualReconnect = useCallback(() => {
    setReconnectAttempts(0);
    setError(null);
    setConnectionStatus('connecting');
    // 触发useEffect重新执行
    setIsConnected(false);
  }, []);

  // 🚀 作用域隔离模式：WebSocket连接管理
  useEffect(() => {
    // 🔧 作用域隔离：每次useEffect执行都创建独立的socket实例
    if (!gameId) {
      console.log('⚠️ gameId为空，跳过WebSocket连接');
      return;
    }

    console.log('🔗 作用域隔离模式：初始化WebSocket连接', { gameId });

    // 🔧 作用域内的局部socket实例，避免跨作用域引用冲突
    let localSocket: Socket | null = null;
    let localReconnectTimeout: number | null = null;
    let isCleanedUp = false; // 防止清理后的异步操作

    // 🔧 作用域内的重连函数
    const scheduleReconnect = (attempts: number) => {
      if (isCleanedUp || attempts >= maxReconnectAttempts) {
        if (!isCleanedUp) {
          setError('连接失败次数过多，请刷新页面重试');
          setConnectionStatus('disconnected');
        }
        return;
      }

      const delay = Math.min(baseReconnectDelay * Math.pow(2, attempts), 30000);
      console.log(`🔄 计划重连，延迟: ${delay}ms, 尝试次数: ${attempts + 1}`);
      
      if (!isCleanedUp) {
        setConnectionStatus('reconnecting');
        setReconnectAttempts(attempts + 1);
      }

      localReconnectTimeout = setTimeout(() => {
        if (!isCleanedUp) {
          createConnection();
        }
      }, delay);
    };

    // 🔧 作用域内的连接创建函数
    const createConnection = () => {
      if (isCleanedUp) return;

      console.log('🔄 创建WebSocket连接', { gameId });
      setConnectionStatus('connecting');

      // 🔧 作用域内创建socket实例
      localSocket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        autoConnect: true,
      });

      // 🔧 连接成功事件
      localSocket.on('connect', () => {
        if (isCleanedUp) return;
        
        console.log('✅ WebSocket连接成功', {
          gameId,
          socketId: localSocket?.id,
          transport: localSocket?.io.engine.transport.name
        });

        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        setReconnectAttempts(0);

        // 清除重连定时器
        if (localReconnectTimeout) {
          clearTimeout(localReconnectTimeout);
          localReconnectTimeout = null;
        }

        // 加入游戏房间
        console.log('🏠 加入游戏房间', { gameId });
        localSocket?.emit('join-game', gameId);
      });

      // 🔧 连接失败事件
      localSocket.on('connect_error', (err) => {
        if (isCleanedUp) return;
        
        console.error('WebSocket连接失败:', err);
        setIsConnected(false);
        setError('WebSocket连接失败');

        // 自动重连
        scheduleReconnect(reconnectAttempts);
      });

      // 🔧 断开连接事件
      localSocket.on('disconnect', (reason) => {
        if (isCleanedUp) return;
        
        console.log('WebSocket连接断开:', reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');

        // 根据断开原因决定是否重连
        if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
          scheduleReconnect(reconnectAttempts);
        }
      });

      // 🚀 监听叙述更新 - 增强数据验证和错误处理
      localSocket.on('narrative-update', (data: { gameId: string; segment: NarrativeSegment }) => {
        console.log('📡 [useWebSocket] 收到narrative-update事件', {
          eventGameId: data.gameId,
          currentGameId: gameId,
          segmentId: data.segment?.id,
          segmentType: data.segment?.type,
          contentLength: data.segment?.content?.length,
          contentPreview: typeof data.segment?.content === 'string'
            ? data.segment.content.substring(0, 50) + '...'
            : `[${typeof data.segment?.content}] ${JSON.stringify(data.segment?.content).substring(0, 50)}...`,
          hasTimestamp: !!data.segment?.timestamp,
          timestamp: new Date().toISOString(),
          // 🚀 新增：完整数据结构调试
          fullSegmentData: data.segment
        });

        if (isCleanedUp || data.gameId !== gameId) {
          console.log('⚠️ [useWebSocket] 跳过narrative-update事件', {
            reason: isCleanedUp ? 'cleaned up' : 'gameId mismatch',
            isCleanedUp,
            eventGameId: data.gameId,
            currentGameId: gameId
          });
          return;
        }

        // 🚀 增强数据验证
        const narrativeSegment = data.segment;

        if (!narrativeSegment) {
          console.error('❌ [useWebSocket] narrative-update事件缺少segment数据', data);
          return;
        }

        if (!narrativeSegment.id) {
          console.error('❌ [useWebSocket] narrative-update事件segment缺少id字段', narrativeSegment);
          return;
        }

        if (!narrativeSegment.content) {
          console.error('❌ [useWebSocket] narrative-update事件segment缺少content字段', narrativeSegment);
          return;
        }

        // 🚀 确保content是字符串类型
        let processedSegment = { ...narrativeSegment };
        if (typeof processedSegment.content !== 'string') {
          console.warn('⚠️ [useWebSocket] content不是字符串类型，进行转换', {
            originalType: typeof processedSegment.content,
            originalContent: processedSegment.content
          });
          processedSegment.content = String(processedSegment.content);
        }

        // 🚀 确保必需字段存在
        if (!processedSegment.type) {
          processedSegment.type = 'narration';
        }
        if (!processedSegment.timestamp) {
          processedSegment.timestamp = Date.now();
        }

        console.log('🔄 [useWebSocket] 调用addNarrativeSegment', {
          segmentId: processedSegment.id,
          contentType: typeof processedSegment.content,
          contentLength: processedSegment.content.length,
          beforeCall: new Date().toISOString()
        });

        // 🎯 传递处理后的segment对象给gameStore
        addNarrativeSegment(processedSegment);

        console.log('✅ [useWebSocket] addNarrativeSegment调用完成', {
          segmentId: processedSegment.id,
          afterCall: new Date().toISOString()
        });
      });

      // 🎯 监听选择点 - 直接调用gameStore方法
      localSocket.on('choice-required', (data: { gameId: string; choicePoint: ChoicePoint }) => {
        if (isCleanedUp || data.gameId !== gameId) return;

        console.log('🎯 收到choice-required事件', {
          eventGameId: data.gameId,
          currentGameId: gameId,
          choicePoint: data.choicePoint,
          optionsCount: data.choicePoint?.options?.length || 0
        });

        // 🎯 直接调用gameStore的状态更新方法
        console.log('🔄 [useWebSocket] 调用setChoicePoint', {
          choicePointId: data.choicePoint?.choicePointId,
          beforeCall: new Date().toISOString()
        });

        setChoicePoint(data.choicePoint);

        console.log('✅ [useWebSocket] setChoicePoint调用完成', {
          choicePointId: data.choicePoint?.choicePointId,
          afterCall: new Date().toISOString()
        });
      });

      // 🎯 监听选择完成 - 直接调用gameStore方法
      localSocket.on('choice-completed', (data: { gameId: string; choicePointId: string; selectedOptionId: string; timestamp: number }) => {
        if (isCleanedUp || data.gameId !== gameId) return;

        console.log('✅ 收到choice-completed事件', {
          choicePointId: data.choicePointId,
          selectedOptionId: data.selectedOptionId
        });

        // 🎯 直接调用gameStore的状态更新方法
        setChoicePoint(null);
      });

      // 🔧 监听游戏状态变化
      localSocket.on('game-state-changed', (data: { gameId: string; state: any; reason: string; timestamp: number }) => {
        if (isCleanedUp || data.gameId !== gameId) return;
        
        console.log(`收到game-state-changed事件: ${data.reason}`);
      });

      // 🔧 监听错误
      localSocket.on('error', (err: any) => {
        if (isCleanedUp) return;
        
        console.error('WebSocket错误:', err);
        setError(err.message || '未知WebSocket错误');
      });
    };

    // 🔧 初始连接创建
    createConnection();

    // 🔧 作用域隔离的清理函数：只操作当前作用域的实例
    return () => {
      console.log('🔌 作用域隔离清理', { gameId });
      
      // 🔧 标记为已清理，防止异步操作
      isCleanedUp = true;

      // 🔧 清理当前作用域的socket实例
      if (localSocket) {
        localSocket.emit('leave-game', gameId);
        localSocket.removeAllListeners();
        localSocket.disconnect();
        localSocket = null;
      }

      // 🔧 清理当前作用域的重连定时器
      if (localReconnectTimeout) {
        clearTimeout(localReconnectTimeout);
        localReconnectTimeout = null;
      }
    };
  }, [gameId]); // 🔧 依赖简化：只包含gameId

  // 🎯 只返回连接相关的信息，状态管理完全由gameStore负责
  return {
    isConnected,
    error,
    connectionStatus,
    reconnectAttempts,
    reconnect: manualReconnect,
  };
};
