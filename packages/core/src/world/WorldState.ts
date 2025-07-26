// @ts-ignore - geotic库没有类型定义
import { Engine, Component as GeoticComponent } from 'geotic';
import { Entity, Position, Identity, IsInScene } from '../types';

/**
 * Position组件 - 实体在世界中的位置
 */
export class PositionComponent extends GeoticComponent {
  static typeName = 'Position';

  x: number = 0;
  y: number = 0;
  z: number = 0;
}

/**
 * Identity组件 - 实体的身份信息
 */
export class IdentityComponent extends GeoticComponent {
  static typeName = 'Identity';

  id: string = '';
  displayName: string = '';
  description: string = '';

  _onAttached() {
    // 组件附加到实体时的初始化逻辑
  }
}

/**
 * IsInScene组件 - 标记实体当前所在的场景
 */
export class IsInSceneComponent extends GeoticComponent {
  static typeName = 'IsInScene';

  sceneId: string = '';
}

/**
 * 世界状态管理器
 * 使用ECS架构管理游戏世界中的所有实体和组件
 */
export class WorldState {
  private world: any;
  private entityCounter = 0;

  constructor() {
    this.world = new Engine();
    this.registerComponents();
  }

  /**
   * 注册所有组件类型
   */
  private registerComponents(): void {
    this.world.registerComponent(PositionComponent);
    this.world.registerComponent(IdentityComponent);
    this.world.registerComponent(IsInSceneComponent);
  }

  /**
   * 创建新实体
   */
  createEntity(id?: string): any {
    const entityId = id || `entity_${++this.entityCounter}`;
    return this.world.createEntity(entityId);
  }

  /**
   * 获取实体
   */
  getEntity(id: string): any {
    return this.world.getEntity(id);
  }

  /**
   * 删除实体
   */
  removeEntity(id: string): void {
    const entity = this.getEntity(id);
    if (entity) {
      entity.destroy();
    }
  }

  /**
   * 创建角色实体
   */
  createCharacter(
    id: string,
    displayName: string,
    description: string,
    position: { x: number; y: number; z?: number } = { x: 0, y: 0 },
    sceneId?: string
  ): any {
    const entity = this.createEntity(id);

    // 添加身份组件
    entity.add(IdentityComponent);
    const identityComponent = entity.get(IdentityComponent);
    identityComponent.id = id;
    identityComponent.displayName = displayName;
    identityComponent.description = description;

    // 添加位置组件
    entity.add(PositionComponent);
    const positionComponent = entity.get(PositionComponent);
    positionComponent.x = position.x;
    positionComponent.y = position.y;
    positionComponent.z = position.z || 0;

    // 如果指定了场景，添加场景组件
    if (sceneId) {
      entity.add(IsInSceneComponent);
      const sceneComponent = entity.get(IsInSceneComponent);
      sceneComponent.sceneId = sceneId;
    }

    return entity;
  }

  /**
   * 获取场景中的所有实体
   */
  getEntitiesInScene(sceneId: string): any[] {
    return this.world.createQuery({
      all: [IsInSceneComponent],
    }).get().filter((entity: any) => {
      const sceneComponent = entity.get(IsInSceneComponent);
      return sceneComponent && sceneComponent.sceneId === sceneId;
    });
  }

  /**
   * 移动实体到新位置
   */
  moveEntity(entityId: string, x: number, y: number, z = 0): boolean {
    const entity = this.getEntity(entityId);
    if (!entity) return false;

    let position = entity.get(PositionComponent);
    if (!position) {
      entity.add(PositionComponent, x, y, z);
    } else {
      position.x = x;
      position.y = y;
      position.z = z;
    }

    return true;
  }

  /**
   * 将实体移动到场景
   */
  moveEntityToScene(entityId: string, sceneId: string): boolean {
    const entity = this.getEntity(entityId);
    if (!entity) return false;

    let sceneComponent = entity.get(IsInSceneComponent);
    if (!sceneComponent) {
      entity.add(IsInSceneComponent, sceneId);
    } else {
      sceneComponent.sceneId = sceneId;
    }

    return true;
  }

  /**
   * 获取实体的位置
   */
  getEntityPosition(entityId: string): { x: number; y: number; z: number } | null {
    const entity = this.getEntity(entityId);
    if (!entity) return null;

    const position = entity.get(PositionComponent);
    if (!position) return null;

    return { x: position.x, y: position.y, z: position.z };
  }

  /**
   * 获取实体的身份信息
   */
  getEntityIdentity(entityId: string): { id: string; displayName: string; description: string } | null {
    const entity = this.getEntity(entityId);
    if (!entity) return null;

    const identity = entity.get(IdentityComponent);
    if (!identity) return null;

    return {
      id: identity.id,
      displayName: identity.displayName,
      description: identity.description,
    };
  }

  /**
   * 序列化世界状态
   */
  serialize(): string {
    const entities = this.world.createQuery().get().map((entity: any) => {
      const components: any = {};
      
      // 收集所有组件数据
      if (entity.has(PositionComponent)) {
        const pos = entity.get(PositionComponent);
        components.Position = { x: pos.x, y: pos.y, z: pos.z };
      }
      
      if (entity.has(IdentityComponent)) {
        const identity = entity.get(IdentityComponent);
        components.Identity = {
          id: identity.id,
          displayName: identity.displayName,
          description: identity.description,
        };
      }
      
      if (entity.has(IsInSceneComponent)) {
        const scene = entity.get(IsInSceneComponent);
        components.IsInScene = { sceneId: scene.sceneId };
      }

      return {
        id: entity.id,
        components,
      };
    });

    return JSON.stringify({
      entities,
      entityCounter: this.entityCounter,
    });
  }

  /**
   * 反序列化世界状态
   */
  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    
    // 清空当前世界
    this.world.createQuery().get().forEach((entity: any) => entity.destroy());
    
    // 恢复实体计数器
    this.entityCounter = parsed.entityCounter || 0;
    
    // 重建实体
    parsed.entities.forEach((entityData: any) => {
      const entity = this.createEntity(entityData.id);
      
      // 重建组件
      Object.entries(entityData.components).forEach(([componentType, componentData]: [string, any]) => {
        switch (componentType) {
          case 'Position':
            entity.add(PositionComponent, componentData.x, componentData.y, componentData.z);
            break;
          case 'Identity':
            entity.add(IdentityComponent, componentData.id, componentData.displayName, componentData.description);
            break;
          case 'IsInScene':
            entity.add(IsInSceneComponent, componentData.sceneId);
            break;
        }
      });
    });
  }

  /**
   * 清空世界状态
   */
  clear(): void {
    this.world.createQuery().get().forEach((entity: any) => entity.destroy());
    this.entityCounter = 0;
  }
}
