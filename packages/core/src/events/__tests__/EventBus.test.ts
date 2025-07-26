import { EventBus } from '../EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('事件发布和订阅', () => {
    test('应该能够订阅和触发事件', () => {
      const mockHandler = jest.fn();
      const testData = { message: 'test' };

      eventBus.on('TEST_EVENT', mockHandler);
      eventBus.emit('TEST_EVENT', testData);

      expect(mockHandler).toHaveBeenCalledWith(testData);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    test('应该能够订阅多个处理器', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const testData = { message: 'test' };

      eventBus.on('TEST_EVENT', handler1);
      eventBus.on('TEST_EVENT', handler2);
      eventBus.emit('TEST_EVENT', testData);

      expect(handler1).toHaveBeenCalledWith(testData);
      expect(handler2).toHaveBeenCalledWith(testData);
    });

    test('应该能够取消订阅事件', () => {
      const mockHandler = jest.fn();
      const testData = { message: 'test' };

      eventBus.on('TEST_EVENT', mockHandler);
      eventBus.off('TEST_EVENT', mockHandler);
      eventBus.emit('TEST_EVENT', testData);

      expect(mockHandler).not.toHaveBeenCalled();
    });

    test('应该能够一次性订阅事件', () => {
      const mockHandler = jest.fn();
      const testData1 = { message: 'test1' };
      const testData2 = { message: 'test2' };

      eventBus.once('TEST_EVENT', mockHandler);
      eventBus.emit('TEST_EVENT', testData1);
      eventBus.emit('TEST_EVENT', testData2);

      expect(mockHandler).toHaveBeenCalledWith(testData1);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('事件历史记录', () => {
    test('应该记录发出的事件', () => {
      const testData = { message: 'test' };

      eventBus.emit('TEST_EVENT', testData);

      const history = eventBus.getEventHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('TEST_EVENT');
      expect(history[0].payload).toEqual(testData);
      expect(history[0].timestamp).toBeDefined();
    });

    test('应该能够限制历史记录数量', () => {
      // 发出多个事件
      for (let i = 0; i < 15; i++) {
        eventBus.emit('TEST_EVENT', { index: i });
      }

      const history = eventBus.getEventHistory(5);
      expect(history).toHaveLength(5);
      
      // 应该返回最新的5个事件
      expect(history[0].payload.index).toBe(14);
      expect(history[4].payload.index).toBe(10);
    });

    test('应该能够获取所有历史记录', () => {
      for (let i = 0; i < 3; i++) {
        eventBus.emit('TEST_EVENT', { index: i });
      }

      const allHistory = eventBus.getEventHistory();
      expect(allHistory).toHaveLength(3);
    });

    test('应该能够清除历史记录', () => {
      eventBus.emit('TEST_EVENT', { message: 'test' });
      expect(eventBus.getEventHistory()).toHaveLength(1);

      eventBus.clearHistory();
      expect(eventBus.getEventHistory()).toHaveLength(0);
    });
  });

  describe('事件过滤', () => {
    test('应该能够按类型过滤事件历史', () => {
      eventBus.emit('EVENT_A', { data: 'a' });
      eventBus.emit('EVENT_B', { data: 'b' });
      eventBus.emit('EVENT_A', { data: 'a2' });

      const filteredHistory = eventBus.getEventHistory(10, 'EVENT_A');
      expect(filteredHistory).toHaveLength(2);
      expect(filteredHistory.every(event => event.type === 'EVENT_A')).toBe(true);
    });

    test('过滤不存在的事件类型应该返回空数组', () => {
      eventBus.emit('EVENT_A', { data: 'a' });

      const filteredHistory = eventBus.getEventHistory(10, 'NON_EXISTENT');
      expect(filteredHistory).toHaveLength(0);
    });
  });

  describe('错误处理', () => {
    test('事件处理器抛出错误不应该影响其他处理器', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = jest.fn();

      eventBus.on('TEST_EVENT', errorHandler);
      eventBus.on('TEST_EVENT', normalHandler);

      // 应该不会抛出错误
      expect(() => {
        eventBus.emit('TEST_EVENT', { data: 'test' });
      }).not.toThrow();

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    test('应该能够处理大量事件', () => {
      const handler = jest.fn();
      eventBus.on('PERFORMANCE_TEST', handler);

      const startTime = Date.now();
      
      // 发出1000个事件
      for (let i = 0; i < 1000; i++) {
        eventBus.emit('PERFORMANCE_TEST', { index: i });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(handler).toHaveBeenCalledTimes(1000);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe('内存管理', () => {
    test('应该能够清理所有监听器', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('EVENT_A', handler1);
      eventBus.on('EVENT_B', handler2);

      eventBus.clear();

      eventBus.emit('EVENT_A', { data: 'test' });
      eventBus.emit('EVENT_B', { data: 'test' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });
});
