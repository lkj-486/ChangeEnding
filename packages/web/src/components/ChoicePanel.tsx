import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

interface ChoicePanelProps {
  gameId: string;
}

interface ChoiceOption {
  id: string;
  text: string;
  action: any;
}

interface ChoicePoint {
  choicePointId: string;
  options: ChoiceOption[];
  context: any;
  timestamp: number;
}

const ChoicePanel: React.FC<ChoicePanelProps> = ({ gameId }) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const queryClient = useQueryClient();

  // WebSocket连接用于接收选择点
  const { currentChoicePoint } = useWebSocket(gameId);

  // 提交选择的mutation（带重试机制）
  const makeChoiceMutation = useMutation({
    mutationFn: ({ choicePointId, selectedOptionId }: {
      choicePointId: string;
      selectedOptionId: string;
    }) => apiClient.makeChoice(gameId, choicePointId, selectedOptionId),
    retry: 3, // 最多重试3次
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指数退避
    onSuccess: () => {
      // 重新获取游戏状态
      queryClient.invalidateQueries({ queryKey: ['gameState', gameId] });
      setSelectedOptionId('');
    },
    onError: (error) => {
      console.error('提交选择失败:', error);
      // 错误后延迟重置选择状态，允许用户重新选择
      setTimeout(() => {
        setSelectedOptionId('');
      }, 2000);
    },
  });

  const handleMakeChoice = () => {
    if (!currentChoicePoint || !selectedOptionId) return;

    makeChoiceMutation.mutate({
      choicePointId: currentChoicePoint.choicePointId,
      selectedOptionId,
    });
  };

  const handleOptionSelect = (optionId: string) => {
    setSelectedOptionId(optionId);
  };

  // 如果没有当前选择点，显示等待状态
  if (!currentChoicePoint) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <div className="text-center py-8 md:py-12">
          <Clock className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-gray-500 animate-pulse" />
          <h3 className="text-base md:text-lg font-semibold text-gray-300 mb-2">
            故事进行中
          </h3>
          <p className="text-sm md:text-base text-gray-500">
            AI正在推动故事发展，请耐心等待关键选择时刻...
          </p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* 标题栏 */}
      <div className="bg-yellow-600 px-4 md:px-6 py-3 md:py-4 animate-pulse-glow">
        <div className="flex items-center">
          <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-white mr-2" />
          <h3 className="text-base md:text-lg font-semibold text-white">
            关键选择时刻
          </h3>
        </div>
      </div>

      {/* 选择内容 */}
      <div className="p-4 md:p-6">
        {/* 选择点描述 */}
        {currentChoicePoint.context?.description && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gray-700 rounded-lg">
            <p className="text-gray-200 leading-relaxed text-sm md:text-base">
              {currentChoicePoint.context.description}
            </p>
          </div>
        )}

        {/* 选择选项 */}
        <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
          <h4 className="text-xs md:text-sm font-medium text-gray-400 mb-2 md:mb-3">
            请选择您的行动：
          </h4>
          
          {currentChoicePoint.options.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              disabled={makeChoiceMutation.isLoading}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedOptionId === option.id
                  ? 'border-blue-400 bg-blue-900/30 text-white'
                  : 'border-gray-600 bg-gray-700 text-gray-200 hover:border-gray-500 hover:bg-gray-600'
              } ${
                makeChoiceMutation.isLoading
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer'
              }`}
            >
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-600 text-white text-sm flex items-center justify-center mr-3 mt-0.5">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{option.text}</p>
                  {option.action?.parameters?.reasoning && (
                    <p className="text-sm text-gray-400 mt-1">
                      {option.action.parameters.reasoning}
                    </p>
                  )}
                </div>
                {selectedOptionId === option.id && (
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 ml-2" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 确认按钮 */}
        <button
          onClick={handleMakeChoice}
          disabled={!selectedOptionId || makeChoiceMutation.isLoading}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
            selectedOptionId && !makeChoiceMutation.isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {makeChoiceMutation.isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              提交中...
            </div>
          ) : (
            '确认选择'
          )}
        </button>

        {/* 错误信息 */}
        {makeChoiceMutation.isError && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm">
              提交选择失败，请重试
            </p>
          </div>
        )}

        {/* 选择点信息 */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              选择点ID: {currentChoicePoint.choicePointId}
            </span>
            <span>
              {new Date(currentChoicePoint.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChoicePanel;
