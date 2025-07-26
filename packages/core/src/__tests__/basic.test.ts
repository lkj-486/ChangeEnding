// 基础功能测试
describe('基础功能测试', () => {
  test('应该能够导入核心模块', () => {
    expect(() => {
      require('../director/Director');
      require('../world/WorldState');
      require('../events/EventBus');
    }).not.toThrow();
  });

  test('基本数学运算', () => {
    expect(1 + 1).toBe(2);
  });
});
