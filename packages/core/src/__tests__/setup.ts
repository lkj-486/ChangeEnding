// Jest测试设置文件

// 扩展全局类型
declare global {
  var createMockScene: () => any;
  var createMockCharacter: () => any;
  var mockTimestamp: number;
  var expectNoConsoleErrors: () => void;
  var expectConsoleError: (message?: string) => void;
}

// 全局测试配置
beforeEach(() => {
  // 清除所有模拟
  jest.clearAllMocks();

  // 重置控制台模拟
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // 恢复所有模拟
  jest.restoreAllMocks();
});

// 全局测试工具
(global as any).createMockScene = () => ({
  id: 'test-scene',
  title: '测试场景',
  description: '这是一个测试场景',
  goal: '测试目标',
  characters: ['hero', 'guard'],
  choicePoints: [],
  initialState: {}
});

(global as any).createMockCharacter = () => ({
  id: 'test-character',
  name: '测试角色',
  description: '这是一个测试角色',
  personality: '友好',
  goals: ['测试目标'],
  relationships: {}
});

// 模拟时间相关函数
(global as any).mockTimestamp = 1234567890000;
Date.now = jest.fn(() => (global as any).mockTimestamp);

// 错误处理测试工具
(global as any).expectNoConsoleErrors = () => {
  expect(console.error).not.toHaveBeenCalled();
};

(global as any).expectConsoleError = (message?: string) => {
  if (message) {
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining(message));
  } else {
    expect(console.error).toHaveBeenCalled();
  }
};
