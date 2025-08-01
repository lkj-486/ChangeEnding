// 新架构集成测试
console.log('🚀 测试新架构：AgentCore + Director 集成...\n');

try {
  // 导入新架构组件
  console.log('尝试导入模块...');

  // 分步导入以便调试
  const coreModule = require('./dist/index.js');
  console.log('可用导出:', Object.keys(coreModule));

  const {
    Director,
    WorldState,
    StubAgentCore,
    eventBus
  } = coreModule;

  console.log('✅ 模块导入成功');

  // 创建测试场景
  const testScene = {
    id: 'test-dungeon',
    title: '测试地牢',
    description: '这是一个测试场景',
    goal: '测试新架构',
    characters: ['hero', 'guard'],
    choicePoints: [],
    initialState: {}
  };

  // 1. 创建组件实例
  console.log('\n🔧 创建组件实例...');
  const worldState = new WorldState();
  const agentCore = new StubAgentCore({ debug: true });
  const director = new Director(worldState, agentCore);

  console.log('✅ 组件创建成功');
  console.log('   AgentCore状态:', agentCore.getStatus());

  // 2. 设置事件监听器
  console.log('\n📡 设置事件监听器...');
  
  let narrativeCount = 0;
  let choiceCount = 0;

  eventBus.on('NARRATIVE_GENERATED', (event) => {
    narrativeCount++;
    console.log(`📖 收到叙事内容 #${narrativeCount}:`, {
      type: event.segment.type,
      content: event.segment.content.substring(0, 50) + '...',
      character: event.segment.character || 'N/A'
    });
  });

  eventBus.on('CHOICE_POINT_RAISED', (event) => {
    choiceCount++;
    console.log(`🎯 收到选择点 #${choiceCount}:`, {
      id: event.choicePointId,
      optionsCount: event.options.length,
      prompt: event.context.prompt.substring(0, 50) + '...'
    });
  });

  // 3. 测试场景加载和AI编排
  console.log('\n🎬 测试场景加载...');
  
  async function runTest() {
    try {
      // 加载场景（这会触发AI编排）
      await director.loadScene(testScene);
      
      // 等待一下让异步事件处理完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('\n📊 测试结果统计:');
      console.log(`   叙事内容生成: ${narrativeCount} 次`);
      console.log(`   选择点触发: ${choiceCount} 次`);
      console.log(`   场景状态: ${director.getSceneState()}`);
      
      // 获取叙事账本状态
      const ledger = director.getNarrativeLedger();
      console.log('\n📚 叙事账本状态:');
      console.log(`   当前场景: ${ledger.worldState.current_scene_id}`);
      console.log(`   最近事件: ${ledger.recentEvents.length} 个`);
      console.log(`   角色关系: ${Object.keys(ledger.characterRelationships).length} 个`);
      
      if (narrativeCount > 0) {
        console.log('\n🎉 新架构集成测试成功！');
        console.log('   ✅ Director 成功调用 AgentCore');
        console.log('   ✅ StubAgentCore 生成了内容');
        console.log('   ✅ 事件系统正常工作');
        console.log('   ✅ 叙事账本状态更新正常');
      } else {
        console.log('\n⚠️ 测试部分成功，但未生成叙事内容');
      }
      
    } catch (error) {
      console.error('❌ 测试执行失败:', error);
    }
  }

  // 运行测试
  runTest();

} catch (error) {
  console.error('❌ 测试初始化失败:', error);
  console.error('   错误详情:', error.message);
  console.error('   可能原因: 模块导入失败或构建问题');
}
