import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// 创建axios实例
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

// 标准化错误响应接口
interface StandardErrorResponse {
  success: false;
  error: string;
  message: string;
  data?: any;
}

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API响应错误:', error);

    let standardError: StandardErrorResponse;

    if (error.response) {
      // 服务器返回错误状态码
      const { status, data } = error.response;

      // 如果服务器返回的是标准格式，直接使用
      if (data && typeof data === 'object' && 'success' in data) {
        standardError = data;
      } else {
        // 否则转换为标准格式
        standardError = {
          success: false,
          error: `HTTP_${status}`,
          message: data?.message || `HTTP ${status} 错误`,
          data: data
        };
      }
    } else if (error.request) {
      // 请求发送失败
      standardError = {
        success: false,
        error: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置'
      };
    } else {
      // 其他错误
      standardError = {
        success: false,
        error: 'UNKNOWN_ERROR',
        message: error.message || '未知错误'
      };
    }

    // 创建包含标准化错误信息的Error对象
    const enhancedError = new Error(standardError.message);
    (enhancedError as any).standardError = standardError;

    throw enhancedError;
  }
);

// API客户端类
export class ApiClient {
  /**
   * 获取所有故事列表
   */
  async getStories() {
    console.log('🔍 API客户端: 开始获取故事列表');

    const response = await api.get('/stories');

    console.log('🔍 API客户端: 收到响应', {
      responseType: typeof response,
      responseKeys: Object.keys(response || {}),
      response: response
    });

    // axios拦截器已经返回了response.data，所以这里的response就是API的响应体
    // 后端返回格式：{success: true, stories: [...]}
    if (response && response.success && response.stories) {
      console.log('✅ API客户端: 故事数据解析成功', {
        storiesCount: response.stories.length,
        stories: response.stories
      });
      return response; // 返回完整响应，包含stories数组
    } else {
      console.error('❌ API客户端: 响应格式不正确', response);
      throw new Error('API响应格式不正确');
    }
  }

  /**
   * 获取特定故事详情
   */
  async getStoryById(storyId: string) {
    const response = await api.get(`/stories/${storyId}`);
    return response.data; // 返回完整的API响应
  }

  /**
   * 创建新游戏
   */
  async createNewGame(storyId: string, userId?: string) {
    const response = await api.post('/game/new', {
      storyId,
      userId,
    });
    return response.data; // 返回完整的API响应 {success, data: {gameId, ...}, message}
  }

  /**
   * 获取游戏状态
   */
  async getGameState(gameId: string) {
    const response = await api.get(`/game/${gameId}`);
    return response.data; // axios拦截器已经返回了response.data
  }

  /**
   * 提交玩家选择
   */
  async makeChoice(gameId: string, choicePointId: string, selectedOptionId: string) {
    const response = await api.post(`/game/${gameId}/choice`, {
      choicePointId,
      selectedOptionId,
    });
    return response.data; // axios拦截器已经返回了response.data
  }

  /**
   * 暂停游戏
   */
  async pauseGame(gameId: string) {
    const response = await api.post(`/game/${gameId}/pause`);
    return response.data;
  }

  /**
   * 恢复游戏
   */
  async resumeGame(gameId: string) {
    const response = await api.post(`/game/${gameId}/resume`);
    return response.data;
  }

  /**
   * 结束游戏
   */
  async endGame(gameId: string) {
    const response = await api.post(`/game/${gameId}/end`);
    return response.data;
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  }
}

// 导出API客户端实例
export const apiClient = new ApiClient();

// 导出axios实例供其他地方使用
export default api;
