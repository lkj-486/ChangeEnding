import { WorldState } from '../WorldState';

describe('WorldState', () => {
  let worldState: WorldState;

  beforeEach(() => {
    worldState = new WorldState();
  });

  describe('实体创建', () => {
    test('应该能够创建角色实体', () => {
      const character = worldState.createCharacter(
        'hero',
        '艾伦',
        '勇敢的冒险者',
        { x: 0, y: 0 },
        'test-scene'
      );

      expect(character).toBeDefined();
      expect(character.id).toBe('hero');
    });

    test('应该能够创建物品实体', () => {
      const item = worldState.createItem(
        'sword',
        '铁剑',
        '一把锋利的铁剑',
        { x: 5, y: 5 },
        'test-scene'
      );

      expect(item).toBeDefined();
      expect(item.id).toBe('sword');
    });

    test('应该能够创建位置实体', () => {
      const location = worldState.createLocation(
        'dungeon',
        '地牢',
        '阴暗潮湿的地牢',
        { x: 10, y: 10 },
        'test-scene'
      );

      expect(location).toBeDefined();
      expect(location.id).toBe('dungeon');
    });
  });

  describe('实体查询', () => {
    beforeEach(() => {
      worldState.createCharacter('hero', '艾伦', '主角', { x: 0, y: 0 }, 'scene1');
      worldState.createCharacter('guard', '守卫', 'NPC', { x: 5, y: 5 }, 'scene1');
      worldState.createItem('key', '钥匙', '重要物品', { x: 3, y: 3 }, 'scene1');
    });

    test('应该能够通过ID获取实体身份', () => {
      const heroIdentity = worldState.getEntityIdentity('hero');
      
      expect(heroIdentity).toBeDefined();
      expect(heroIdentity?.id).toBe('hero');
      expect(heroIdentity?.displayName).toBe('艾伦');
      expect(heroIdentity?.description).toBe('主角');
    });

    test('应该能够通过ID获取实体位置', () => {
      const heroPosition = worldState.getEntityPosition('hero');
      
      expect(heroPosition).toBeDefined();
      expect(heroPosition?.x).toBe(0);
      expect(heroPosition?.y).toBe(0);
    });

    test('应该能够获取场景中的所有实体', () => {
      const entitiesInScene = worldState.getEntitiesInScene('scene1');
      
      expect(entitiesInScene).toHaveLength(3);
      expect(entitiesInScene.map(e => e.id)).toContain('hero');
      expect(entitiesInScene.map(e => e.id)).toContain('guard');
      expect(entitiesInScene.map(e => e.id)).toContain('key');
    });

    test('应该能够按类型获取实体', () => {
      const characters = worldState.getEntitiesByType('character');
      const items = worldState.getEntitiesByType('item');
      
      expect(characters).toHaveLength(2);
      expect(items).toHaveLength(1);
    });

    test('不存在的实体应该返回undefined', () => {
      const nonExistent = worldState.getEntityIdentity('non-existent');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('实体更新', () => {
    beforeEach(() => {
      worldState.createCharacter('hero', '艾伦', '主角', { x: 0, y: 0 }, 'scene1');
    });

    test('应该能够更新实体位置', () => {
      const success = worldState.updateEntityPosition('hero', { x: 10, y: 15, z: 1 });
      
      expect(success).toBe(true);
      
      const newPosition = worldState.getEntityPosition('hero');
      expect(newPosition?.x).toBe(10);
      expect(newPosition?.y).toBe(15);
      expect(newPosition?.z).toBe(1);
    });

    test('应该能够移动实体到新场景', () => {
      const success = worldState.moveEntityToScene('hero', 'scene2');
      
      expect(success).toBe(true);
      
      const entitiesInScene1 = worldState.getEntitiesInScene('scene1');
      const entitiesInScene2 = worldState.getEntitiesInScene('scene2');
      
      expect(entitiesInScene1.map(e => e.id)).not.toContain('hero');
      expect(entitiesInScene2.map(e => e.id)).toContain('hero');
    });

    test('更新不存在的实体应该返回false', () => {
      const success = worldState.updateEntityPosition('non-existent', { x: 0, y: 0 });
      expect(success).toBe(false);
    });
  });

  describe('实体删除', () => {
    beforeEach(() => {
      worldState.createCharacter('hero', '艾伦', '主角', { x: 0, y: 0 }, 'scene1');
    });

    test('应该能够删除实体', () => {
      const success = worldState.removeEntity('hero');
      
      expect(success).toBe(true);
      
      const heroIdentity = worldState.getEntityIdentity('hero');
      expect(heroIdentity).toBeUndefined();
    });

    test('删除不存在的实体应该返回false', () => {
      const success = worldState.removeEntity('non-existent');
      expect(success).toBe(false);
    });
  });

  describe('序列化', () => {
    beforeEach(() => {
      worldState.createCharacter('hero', '艾伦', '主角', { x: 0, y: 0 }, 'scene1');
      worldState.createItem('sword', '剑', '武器', { x: 1, y: 1 }, 'scene1');
    });

    test('应该能够序列化世界状态', () => {
      const serialized = worldState.serialize();
      
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
      
      const parsed = JSON.parse(serialized);
      expect(parsed.entities).toBeDefined();
      expect(parsed.entityCounter).toBeDefined();
      expect(parsed.entities).toHaveLength(2);
    });

    test('序列化的数据应该包含实体信息', () => {
      const serialized = worldState.serialize();
      const parsed = JSON.parse(serialized);
      
      const heroEntity = parsed.entities.find((e: any) => e.id === 'hero');
      expect(heroEntity).toBeDefined();
      expect(heroEntity.components.Identity.displayName).toBe('艾伦');
      expect(heroEntity.components.Position.x).toBe(0);
      expect(heroEntity.components.Position.y).toBe(0);
    });
  });

  describe('状态管理', () => {
    test('应该能够清除所有实体', () => {
      worldState.createCharacter('hero', '艾伦', '主角', { x: 0, y: 0 }, 'scene1');
      worldState.createItem('sword', '剑', '武器', { x: 1, y: 1 }, 'scene1');
      
      worldState.clear();
      
      const entitiesInScene = worldState.getEntitiesInScene('scene1');
      expect(entitiesInScene).toHaveLength(0);
    });

    test('应该能够获取实体总数', () => {
      expect(worldState.getEntityCount()).toBe(0);
      
      worldState.createCharacter('hero', '艾伦', '主角', { x: 0, y: 0 }, 'scene1');
      expect(worldState.getEntityCount()).toBe(1);
      
      worldState.createItem('sword', '剑', '武器', { x: 1, y: 1 }, 'scene1');
      expect(worldState.getEntityCount()).toBe(2);
    });
  });
});
