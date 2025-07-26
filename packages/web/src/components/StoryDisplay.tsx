import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, BookOpen } from 'lucide-react';
import { apiClient } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

interface StoryDisplayProps {
  gameId: string;
}

interface NarrativeSegment {
  id: string;
  type: 'dialogue' | 'narration' | 'internal_thought' | 'description';
  content: string;
  character?: string;
  timestamp: number;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ gameId }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 获取游戏状态（仅初始加载，后续通过WebSocket更新）
  const { data: gameState, isLoading } = useQuery({
    queryKey: ['gameState', gameId],
    queryFn: () => apiClient.getGameState(gameId),
    // 移除轮询，改为仅在WebSocket断开时手动刷新
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity, // 数据永不过期，完全依赖WebSocket更新
  });

  // WebSocket连接用于实时更新
  const {
    narrativeUpdates,
    currentChoicePoint,
    isConnected,
    connectionStatus,
    reconnectAttempts
  } = useWebSocket(gameId);

  // 🔍 调试WebSocket状态 - 减少日志频率
  useEffect(() => {
    console.log("🔗 WebSocket状态变化", {
      gameId,
      isConnected,
      connectionStatus,
      narrativeUpdatesCount: narrativeUpdates?.length || 0,
      hasCurrentChoicePoint: !!currentChoicePoint,
      currentChoicePoint: currentChoicePoint,
      timestamp: new Date().toISOString()
    });
  }, [isConnected, connectionStatus, currentChoicePoint]);

  // 🎯 处理玩家选择
  const handleChoiceSelection = async (optionId: string) => {
    if (!currentChoicePoint) {
      console.warn('⚠️ 没有当前选择点，无法提交选择');
      return;
    }

    console.log('🎯 玩家选择', {
      choicePointId: currentChoicePoint.choicePointId,
      selectedOptionId: optionId,
      gameId
    });

    try {
      // 调用API提交选择
      const response = await apiClient.makeChoice(
        gameId,
        currentChoicePoint.choicePointId,
        optionId
      );

      console.log('✅ 选择提交成功', response);

      // 选择提交后，WebSocket会收到choice-completed事件，自动清除currentChoicePoint
    } catch (error) {
      console.error('❌ 选择提交失败', error);
      // 可以在这里添加错误提示UI
    }
  };

  // 合并API数据和WebSocket更新的叙述（优化版本）
  const allNarratives = React.useMemo(() => {
    const apiNarratives = gameState?.narrative || [];
    const wsNarratives = narrativeUpdates || [];

    // 🔍 详细分析gameState结构
    console.log("🔍 StoryDisplay数据处理 - 完整分析", {
      // 基本信息
      gameStateExists: !!gameState,
      gameStateType: typeof gameState,
      gameStateKeys: gameState ? Object.keys(gameState) : [],

      // narrative字段分析
      narrativeExists: !!gameState?.narrative,
      narrativeType: typeof gameState?.narrative,
      narrativeIsArray: Array.isArray(gameState?.narrative),
      narrativeLength: gameState?.narrative?.length || 0,
      narrativeRawValue: gameState?.narrative,

      // 处理后的数组
      apiNarrativesLength: apiNarratives.length,
      wsNarrativesLength: wsNarratives.length,

      // 完整的gameState内容（用于调试）
      fullGameState: gameState
    });

    // 🔍 如果narrative数组存在但为空，分析原因
    if (gameState?.narrative && Array.isArray(gameState.narrative) && gameState.narrative.length === 0) {
      console.log("⚠️ 发现问题：narrative数组存在但为空", {
        gameId: gameState.gameId,
        sceneState: gameState.scene?.state,
        sceneTitle: gameState.scene?.title,
        isWaitingForChoice: gameState.isWaitingForChoice,
        currentChoice: gameState.currentChoice,
        message: "后端返回了空的narrative数组，可能是游戏刚开始，叙事代理还没有生成内容"
      });
    }

    // 使用Map进行高效去重和版本控制
    const narrativeMap = new Map<string, NarrativeSegment>();

    // 先添加API数据中的叙述
    console.log("🔍 开始处理API叙事数据", {
      apiNarrativesLength: apiNarratives.length,
      apiNarrativesType: typeof apiNarratives,
      isArray: Array.isArray(apiNarratives)
    });

    apiNarratives.forEach((narrative: any, index: number) => {
      console.log(`🔍 处理第${index}个narrative`, {
        narrative,
        hasId: !!narrative?.id,
        idValue: narrative?.id,
        idType: typeof narrative?.id,
        allKeys: Object.keys(narrative || {}),
        willBeAdded: !!narrative?.id
      });

      if (narrative.id) {
        narrativeMap.set(narrative.id, narrative);
        console.log(`✅ 已添加narrative ${narrative.id} 到Map`);
      } else {
        console.log(`❌ 跳过narrative，因为没有id字段`);
      }
    });

    // 再添加WebSocket更新的叙述（会覆盖旧版本）
    wsNarratives.forEach(narrative => {
      if (narrative.id) {
        // 检查时间戳，只保留更新的版本
        const existing = narrativeMap.get(narrative.id);
        if (!existing || narrative.timestamp >= existing.timestamp) {
          narrativeMap.set(narrative.id, narrative);
        }
      }
    });

    // 转换为数组并按时间戳排序
    const finalNarratives = Array.from(narrativeMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // 调试最终的叙事数组
    console.log("🔍 最终叙事数组处理", {
      narrativeMapSize: narrativeMap.size,
      finalNarrativesLength: finalNarratives.length,
      firstThreeFinalNarratives: finalNarratives.slice(0, 3),
      finalNarrativesHasContent: finalNarratives.slice(0, 3).map(n => ({
        id: n.id,
        hasContent: !!n.content,
        contentType: typeof n.content,
        contentLength: n.content?.length || 0,
        contentPreview: typeof n.content === 'string' ? n.content.substring(0, 50) : 'Not string'
      }))
    });

    return finalNarratives;
  }, [gameState?.narrative, narrativeUpdates]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allNarratives]);

  const getSegmentClassName = (type: string) => {
    const baseClass = 'story-text mb-4 p-3 rounded-lg';
    switch (type) {
      case 'dialogue':
        return `${baseClass} dialogue bg-blue-900/20 border-l-4 border-blue-400`;
      case 'narration':
        return `${baseClass} narration bg-gray-800/50`;
      case 'internal_thought':
        return `${baseClass} internal-thought bg-yellow-900/20 border-l-4 border-yellow-400 italic`;
      case 'description':
        return `${baseClass} description bg-green-900/20 border-l-4 border-green-400`;
      default:
        return `${baseClass} bg-gray-800/50`;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'dialogue':
        return '对话';
      case 'narration':
        return '叙述';
      case 'internal_thought':
        return '内心独白';
      case 'description':
        return '环境描述';
      default:
        return '未知';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <div className="flex flex-col items-center justify-center py-8 md:py-12">
          <div className="relative mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <div className="absolute inset-0 w-8 h-8 border-2 border-blue-400/20 rounded-full animate-pulse"></div>
          </div>
          <span className="text-gray-400 text-sm md:text-base mb-2">加载故事内容...</span>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* 标题栏 */}
      <div className="bg-gray-700 px-4 md:px-6 py-3 md:py-4 border-b border-gray-600">
        <div className="flex items-center">
          <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-blue-400 mr-2" />
          <h2 className="text-base md:text-lg font-semibold text-white flex-1 truncate">
            {gameState?.scene?.title || '故事进行中'}
          </h2>
          <div className="ml-2 flex items-center space-x-2">
            {/* 连接状态指示器 */}
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-1 ${
                isConnected
                  ? 'bg-green-400 animate-pulse'
                  : connectionStatus === 'reconnecting'
                  ? 'bg-yellow-400 animate-bounce'
                  : 'bg-red-400'
              }`}></div>
              <span className="text-xs text-gray-400 hidden md:inline">
                {isConnected ? '已连接' : connectionStatus === 'reconnecting' ? `重连中(${reconnectAttempts})` : '已断开'}
              </span>
            </div>

            {/* 游戏状态 */}
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              gameState?.scene?.state === 'RUNNING'
                ? 'bg-green-600 text-white'
                : gameState?.scene?.state === 'PAUSED'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-600 text-gray-300'
            }`}>
              {gameState?.scene?.state === 'RUNNING' && '进行中'}
              {gameState?.scene?.state === 'PAUSED' && '暂停'}
              {gameState?.scene?.state === 'LOADING' && '加载中'}
              {gameState?.scene?.state === 'ENDED' && '已结束'}
            </span>
          </div>
        </div>
      </div>

      {/* 故事内容区域 */}
      <div
        ref={scrollRef}
        className="story-container h-80 md:h-96 overflow-y-auto p-4 md:p-6 scroll-smooth"
      >
        {(() => {
          // 调试渲染条件
          console.log("🔍 渲染条件判断", {
            allNarrativesLength: allNarratives.length,
            allNarrativesIsEmpty: allNarratives.length === 0,
            allNarrativesType: typeof allNarratives,
            allNarrativesIsArray: Array.isArray(allNarratives),
            allNarrativesContent: allNarratives.slice(0, 2)
          });
          return allNarratives.length === 0;
        })() ? (
          <div className="text-center py-8 md:py-12 text-gray-400">
            <BookOpen className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm md:text-base">故事即将开始...</p>
            <p className="text-xs md:text-sm mt-2">AI正在为您编织精彩的故事</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {allNarratives.map((segment: NarrativeSegment, index) => (
              <div
                key={segment.id}
                className={`${getSegmentClassName(segment.type)} transform transition-all duration-300 ease-in-out`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animation: 'fadeInUp 0.5s ease-out forwards'
                }}
              >
                {/* 类型标签 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-medium">
                    {getTypeLabel(segment.type)}
                    {segment.character && ` - ${segment.character}`}
                  </span>
                  <span className="text-xs text-gray-500 hidden md:inline">
                    {new Date(segment.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* 内容 */}
                <div className="text-gray-200 leading-relaxed text-sm md:text-base">
                  {segment.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🎯 选择点UI - 关键修复！ */}
        {currentChoicePoint && (
          <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-yellow-500/30">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                ⚡ 关键抉择时刻
              </h3>
              <p className="text-gray-300 text-sm">
                请选择您的行动方案：
              </p>
            </div>

            <div className="space-y-3">
              {currentChoicePoint.options.map((option: any, index: number) => (
                <button
                  key={option.id}
                  onClick={() => handleChoiceSelection(option.id)}
                  className="w-full text-left p-3 bg-gray-600 hover:bg-gray-500 rounded-lg border border-gray-500 hover:border-yellow-400 transition-all duration-200 group"
                >
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-black rounded-full flex items-center justify-center text-sm font-bold group-hover:bg-yellow-400">
                      {index + 1}
                    </span>
                    <span className="text-gray-200 group-hover:text-white">
                      {option.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-xs text-gray-400 text-center">
              💡 您的选择将影响故事的发展方向
            </div>
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="bg-gray-700 px-4 md:px-6 py-2 md:py-3 border-t border-gray-600">
        <div className="flex items-center justify-between text-xs md:text-sm text-gray-400">
          <span>
            共 {allNarratives.length} 段叙述
          </span>
          <div className="flex items-center space-x-2 md:space-x-4">
            {gameState?.isWaitingForChoice && (
              <span className="text-yellow-400 font-medium flex items-center">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-1"></div>
                等待选择...
              </span>
            )}
            <span className="hidden md:inline">
              游戏ID: {gameId.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryDisplay;
