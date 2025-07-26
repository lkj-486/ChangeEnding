import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Play, Loader2 } from 'lucide-react';
import StoryDisplay from './components/StoryDisplay';
import ChoicePanel from './components/ChoicePanel';
import { useGameStore } from './stores/gameStore';
import { apiClient } from './services/api';

function App() {
  console.log("🔍 调试步骤0: App组件开始渲染", { timestamp: new Date().toISOString() });

  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [testGameId, setTestGameId] = useState<string>('');
  const { gameId, isGameActive, startGame } = useGameStore();

  // 调试状态变化
  React.useEffect(() => {
    console.log("🔍 调试步骤4: App组件状态变化", {
      gameId,
      isGameActive,
      timestamp: new Date().toISOString()
    });
  }, [gameId, isGameActive]);

  // 获取故事列表
  const { data: storiesData, isLoading: isLoadingStories, error: storiesError } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      console.log('🔍 React Query: 开始执行queryFn');
      try {
        const result = await apiClient.getStories();
        console.log('✅ React Query: queryFn执行成功', result);
        return result;
      } catch (error) {
        console.error('❌ React Query: queryFn执行失败', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
    cacheTime: 10 * 60 * 1000, // 缓存10分钟
    refetchOnWindowFocus: false, // 窗口聚焦时不重新请求
    refetchOnReconnect: false, // 重连时不重新请求
    retry: 1, // 失败时只重试1次
  });

  // 🔍 调试故事数据加载
  React.useEffect(() => {
    console.log("🔍 故事数据状态变化", {
      isLoadingStories,
      storiesError: storiesError?.message || null,
      storiesData,
      storiesDataType: typeof storiesData,
      storiesDataKeys: storiesData ? Object.keys(storiesData) : [],
      storiesCount: storiesData?.stories?.length || 0,
      hasStories: !!storiesData?.stories,
      storiesArray: storiesData?.stories,
      timestamp: new Date().toISOString()
    });
  }, [isLoadingStories, storiesError, storiesData]);



  // 开始游戏
  const handleStartGame = async () => {
    console.log("🔍 调试步骤1: 开始故事按钮点击事件触发", { selectedStoryId, timestamp: new Date().toISOString() });

    if (!selectedStoryId) {
      console.log("🔍 调试步骤1: 未选择故事，退出处理");
      return;
    }

    try {
      console.log("🔍 调试步骤1: 准备调用startGame函数", { selectedStoryId });
      await startGame(selectedStoryId);
      console.log("🔍 调试步骤1: startGame函数调用成功");
    } catch (error) {
      console.error('🔍 调试步骤1: 启动游戏失败:', error);
    }
  };

  // 测试现有游戏
  const handleTestExistingGame = () => {
    if (!testGameId) return;

    // 直接设置游戏状态为活跃
    useGameStore.setState({
      gameId: testGameId,
      storyId: 'escape-dungeon',
      isGameActive: true,
    });
  };

  // 如果游戏已激活，显示游戏界面
  if (isGameActive && gameId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-4 md:py-8">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">故事编织者</h1>
            <p className="text-gray-400 text-center text-sm md:text-base">AI驱动的互动叙事体验</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            {/* 故事显示区域 */}
            <div className="lg:col-span-2 order-1">
              <StoryDisplay gameId={gameId} />
            </div>

            {/* 选择面板 */}
            <div className="lg:col-span-1 order-2 lg:order-2">
              <ChoicePanel gameId={gameId} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 显示故事选择界面
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <header className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-blue-400 mr-3 md:mr-4" />
            <h1 className="text-3xl md:text-4xl font-bold">故事编织者</h1>
          </div>
          <p className="text-lg md:text-xl text-gray-400 mb-2">AI驱动的互动叙事游戏</p>
          <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto px-2">
            体验AI自主叙事与玩家关键决策相结合的创新玩法
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-center">选择你的故事</h2>

          {isLoadingStories ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="ml-2 text-gray-400">加载故事列表...</span>
            </div>
          ) : storiesError ? (
            <div className="text-center py-12">
              <div className="text-red-400 mb-4">
                ❌ 加载故事列表失败
              </div>
              <div className="text-gray-400 text-sm">
                {storiesError.message || '网络连接错误'}
              </div>
            </div>
          ) : !storiesData?.stories || storiesData.stories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                📚 暂无可用故事
              </div>
              <div className="text-gray-500 text-sm">
                请稍后再试或联系管理员
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
              {storiesData.stories.map((story: any) => (
                <div
                  key={story.id}
                  className={`p-4 md:p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedStoryId === story.id
                      ? 'border-blue-400 bg-blue-900/20'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600 active:scale-95'
                  }`}
                  onClick={() => {
                    console.log("🔍 调试步骤0.5: 故事卡片点击", { storyId: story.id });
                    setSelectedStoryId(story.id);
                  }}
                >
                  <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">{story.title}</h3>
                  <p className="text-gray-400 mb-3 md:mb-4 text-sm md:text-base line-clamp-3">
                    {story.description}
                  </p>
                  <div className="flex items-center justify-between text-xs md:text-sm text-gray-500">
                    <span>{story.characters.length} 个角色</span>
                    <span>{story.choicePointsCount} 个选择点</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 开始游戏按钮 */}
          <div className="text-center">
            <button
              onClick={handleStartGame}
              disabled={!selectedStoryId}
              className={`inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 ${
                selectedStoryId
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 mr-2" />
              开始故事
            </button>
          </div>

          {/* 功能说明 */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI自主叙事</h3>
              <p className="text-gray-400">
                AI角色自主推动故事发展，创造动态的叙事体验
              </p>
            </div>

            <div className="p-6">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">关键决策</h3>
              <p className="text-gray-400">
                在关键时刻介入，做出影响故事走向的重要选择
              </p>
            </div>

            <div className="p-6">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">文学化渲染</h3>
              <p className="text-gray-400">
                AI将游戏事件转化为精美的文学化叙述
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
