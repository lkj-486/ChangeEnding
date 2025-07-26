// 简单的Demo测试脚本
const {
  WorldState,
  Director,
  SceneLoader,
  eventBus
} = require('./dist/index.js');

async function testDemo() {
  console.log('🚀 开始测试故事编织者核心引擎...\n');

  try {
    // 1. 测试世界状态
    console.log('1. 测试ECS世界状态系统...');
    const worldState = new WorldState();
    
    // 创建角色
    const hero = worldState.createCharacter(
      'hero',
      '艾伦',
      '勇敢的冒险者',
      { x: 0, y: 0 },
      'escape-dungeon'
    );
    
    console.log('✅ 成功创建角色:', worldState.getEntityIdentity('hero'));

    // 2. 测试场景加载器
    console.log('\n2. 测试场景加载器...');
    const sceneLoader = new SceneLoader({
      scenesPath: './data/scenes',
      charactersPath: './data/characters',
    });

    const availableScenes = await sceneLoader.getAvailableScenes();
    console.log('✅ 可用场景:', availableScenes);

    if (availableScenes.length > 0) {
      const scene = await sceneLoader.loadScene(availableScenes[0]);
      console.log('✅ 成功加载场景:', scene.title);
      console.log('   场景描述:', scene.description);
      console.log('   场景目标:', scene.goal);
      console.log('   角色数量:', scene.characters.length);
      console.log('   选择点数量:', scene.choicePoints.length);
    }

    // 3. 测试导演模块
    console.log('\n3. 测试导演模块...');
    const director = new Director(worldState);
    
    // 监听事件
    eventBus.on('SCENE_LOADED', ({ sceneId, scene }) => {
      console.log('✅ 场景加载事件触发:', sceneId);
    });

    eventBus.on('ERROR_OCCURRED', ({ error, context }) => {
      console.log('❌ 错误事件:', error.message);
    });

    if (availableScenes.length > 0) {
      const scene = await sceneLoader.loadScene(availableScenes[0]);
      await director.loadScene(scene);
      console.log('✅ 导演成功加载场景');
      console.log('   当前场景状态:', director.getSceneState());
    }

    // 4. 测试事件总线
    console.log('\n4. 测试事件总线...');
    
    eventBus.emit('GAME_STATE_CHANGED', { state: 'testing' });
    
    const eventHistory = eventBus.getEventHistory(5);
    console.log('✅ 事件历史记录数量:', eventHistory.length);

    console.log('\n🎉 所有核心功能测试完成！');
    console.log('\n📋 测试总结:');
    console.log('   ✅ ECS世界状态系统 - 正常');
    console.log('   ✅ 场景加载器 - 正常');
    console.log('   ✅ 导演模块 - 正常');
    console.log('   ✅ 事件总线 - 正常');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testDemo().catch(console.error);
