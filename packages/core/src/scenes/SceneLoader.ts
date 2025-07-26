import { Scene, Character } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 场景加载器配置
 */
export interface SceneLoaderConfig {
  scenesPath?: string;
  charactersPath?: string;
  encoding?: BufferEncoding;
}

/**
 * 场景加载器
 * 负责从文件系统加载场景和角色配置
 */
export class SceneLoader {
  private config: SceneLoaderConfig;
  private sceneCache: Map<string, Scene> = new Map();
  private characterCache: Map<string, Character> = new Map();

  constructor(config: SceneLoaderConfig = {}) {
    this.config = {
      scenesPath: './data/scenes',
      charactersPath: './data/characters',
      encoding: 'utf-8',
      ...config,
    };
  }

  /**
   * 加载场景
   */
  async loadScene(sceneId: string): Promise<Scene> {
    // 检查缓存
    if (this.sceneCache.has(sceneId)) {
      return this.sceneCache.get(sceneId)!;
    }

    try {
      const scenePath = path.join(this.config.scenesPath!, `${sceneId}.json`);
      const sceneData = await fs.readFile(scenePath, this.config.encoding!);
      const scene = JSON.parse(sceneData) as Scene;

      // 验证场景数据
      this.validateScene(scene);

      // 缓存场景
      this.sceneCache.set(sceneId, scene);

      console.log(`场景 '${sceneId}' 加载成功`);
      return scene;
    } catch (error) {
      console.error(`加载场景 '${sceneId}' 失败:`, error);
      throw new Error(`无法加载场景: ${sceneId}`);
    }
  }

  /**
   * 加载角色
   */
  async loadCharacter(characterId: string): Promise<Character> {
    // 检查缓存
    if (this.characterCache.has(characterId)) {
      return this.characterCache.get(characterId)!;
    }

    try {
      const characterPath = path.join(this.config.charactersPath!, `${characterId}.json`);
      const characterData = await fs.readFile(characterPath, this.config.encoding!);
      const character = JSON.parse(characterData) as Character;

      // 验证角色数据
      this.validateCharacter(character);

      // 缓存角色
      this.characterCache.set(characterId, character);

      console.log(`角色 '${characterId}' 加载成功`);
      return character;
    } catch (error) {
      console.error(`加载角色 '${characterId}' 失败:`, error);
      throw new Error(`无法加载角色: ${characterId}`);
    }
  }

  /**
   * 加载场景及其相关角色
   */
  async loadSceneWithCharacters(sceneId: string): Promise<{
    scene: Scene;
    characters: Map<string, Character>;
  }> {
    const scene = await this.loadScene(sceneId);
    const characters = new Map<string, Character>();

    // 加载场景中的所有角色
    for (const characterId of scene.characters) {
      try {
        const character = await this.loadCharacter(characterId);
        characters.set(characterId, character);
      } catch (error) {
        console.warn(`加载角色 '${characterId}' 失败，将使用默认角色:`, error);
        // 创建默认角色
        const defaultCharacter = this.createDefaultCharacter(characterId);
        characters.set(characterId, defaultCharacter);
      }
    }

    return { scene, characters };
  }

  /**
   * 获取所有可用场景列表
   */
  async getAvailableScenes(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.scenesPath!);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => path.basename(file, '.json'));
    } catch (error) {
      console.error('获取场景列表失败:', error);
      return [];
    }
  }

  /**
   * 获取所有可用角色列表
   */
  async getAvailableCharacters(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.charactersPath!);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => path.basename(file, '.json'));
    } catch (error) {
      console.error('获取角色列表失败:', error);
      return [];
    }
  }

  /**
   * 验证场景数据
   */
  private validateScene(scene: Scene): void {
    const requiredFields = ['id', 'title', 'description', 'goal', 'characters', 'choicePoints'];
    
    for (const field of requiredFields) {
      if (!(field in scene)) {
        throw new Error(`场景缺少必需字段: ${field}`);
      }
    }

    if (!Array.isArray(scene.characters)) {
      throw new Error('场景的characters字段必须是数组');
    }

    if (!Array.isArray(scene.choicePoints)) {
      throw new Error('场景的choicePoints字段必须是数组');
    }

    // 验证抉择点
    scene.choicePoints.forEach((choicePoint, index) => {
      if (!choicePoint.id || !choicePoint.triggerCondition || !choicePoint.options) {
        throw new Error(`抉择点 ${index} 缺少必需字段`);
      }

      if (!Array.isArray(choicePoint.options)) {
        throw new Error(`抉择点 ${index} 的options字段必须是数组`);
      }

      choicePoint.options.forEach((option, optionIndex) => {
        if (!option.id || !option.text || !option.action) {
          throw new Error(`抉择点 ${index} 的选项 ${optionIndex} 缺少必需字段`);
        }
      });
    });
  }

  /**
   * 验证角色数据
   */
  private validateCharacter(character: Character): void {
    const requiredFields = ['id', 'name', 'description', 'personality', 'goals'];
    
    for (const field of requiredFields) {
      if (!(field in character)) {
        throw new Error(`角色缺少必需字段: ${field}`);
      }
    }

    if (!Array.isArray(character.goals)) {
      throw new Error('角色的goals字段必须是数组');
    }
  }

  /**
   * 创建默认角色
   */
  private createDefaultCharacter(characterId: string): Character {
    return {
      id: characterId,
      name: characterId,
      description: `默认角色 ${characterId}`,
      personality: '神秘而未知',
      goals: ['完成场景目标'],
      relationships: {},
    };
  }

  /**
   * 保存场景到文件
   */
  async saveScene(scene: Scene): Promise<void> {
    try {
      this.validateScene(scene);
      
      const scenePath = path.join(this.config.scenesPath!, `${scene.id}.json`);
      const sceneData = JSON.stringify(scene, null, 2);
      
      await fs.writeFile(scenePath, sceneData, this.config.encoding!);
      
      // 更新缓存
      this.sceneCache.set(scene.id, scene);
      
      console.log(`场景 '${scene.id}' 保存成功`);
    } catch (error) {
      console.error(`保存场景 '${scene.id}' 失败:`, error);
      throw error;
    }
  }

  /**
   * 保存角色到文件
   */
  async saveCharacter(character: Character): Promise<void> {
    try {
      this.validateCharacter(character);
      
      const characterPath = path.join(this.config.charactersPath!, `${character.id}.json`);
      const characterData = JSON.stringify(character, null, 2);
      
      await fs.writeFile(characterPath, characterData, this.config.encoding!);
      
      // 更新缓存
      this.characterCache.set(character.id, character);
      
      console.log(`角色 '${character.id}' 保存成功`);
    } catch (error) {
      console.error(`保存角色 '${character.id}' 失败:`, error);
      throw error;
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.sceneCache.clear();
    this.characterCache.clear();
    console.log('场景和角色缓存已清除');
  }

  /**
   * 预加载所有场景和角色
   */
  async preloadAll(): Promise<void> {
    try {
      const [sceneIds, characterIds] = await Promise.all([
        this.getAvailableScenes(),
        this.getAvailableCharacters(),
      ]);

      console.log(`开始预加载 ${sceneIds.length} 个场景和 ${characterIds.length} 个角色`);

      // 并行加载所有场景
      await Promise.all(sceneIds.map(id => this.loadScene(id)));

      // 并行加载所有角色
      await Promise.all(characterIds.map(id => this.loadCharacter(id)));

      console.log('所有场景和角色预加载完成');
    } catch (error) {
      console.error('预加载失败:', error);
      throw error;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    scenesLoaded: number;
    charactersLoaded: number;
    totalMemoryUsage: string;
  } {
    const scenesLoaded = this.sceneCache.size;
    const charactersLoaded = this.characterCache.size;
    
    // 简化的内存使用估算
    const estimatedMemory = (scenesLoaded + charactersLoaded) * 1024; // 假设每个对象1KB
    const totalMemoryUsage = `${(estimatedMemory / 1024).toFixed(2)} KB`;

    return {
      scenesLoaded,
      charactersLoaded,
      totalMemoryUsage,
    };
  }
}
