// 简单测试 StubAgentCore
console.log('🧪 测试 StubAgentCore...\n');

try {
  // 直接导入编译后的文件
  const { StubAgentCore } = require('./dist/agents/StubAgentCore.js');
  
  console.log('✅ StubAgentCore 导入成功');
  
  // 创建实例
  const agentCore = new StubAgentCore({ debug: true });
  
  console.log('✅ StubAgentCore 实例创建成功');
  console.log('   状态:', agentCore.getStatus());
  
  // 测试决策功能
  const testLedger = {
    playerCharacter: {
      morality_vector: { honesty: 0.5, violence: 0.0, compassion: 0.5 },
      methodology_preference: { stealth: 5, diplomacy: 5, force: 5 },
      personality_traits: []
    },
    characterRelationships: {
      guard: {
        affinity: 50,
        trust: 50,
        last_interaction_summary: '初次相遇'
      }
    },
    worldState: {
      current_scene_id: 'test-scene',
      scene_flags: {},
      time_of_day: 'evening',
      location: '测试地牢'
    },
    recentEvents: []
  };
  
  async function testDecision() {
    console.log('\n🎯 测试决策功能...');
    
    const decision = await agentCore.decideNextStep({
      ledger: testLedger,
      availableActions: ['narration', 'dialogue', 'introspection'],
      context: { trigger_reason: 'scene_entered' }
    });
    
    console.log('✅ 决策结果:', decision);
    
    console.log('\n📝 测试内容生成...');
    
    const content = await agentCore.generateContent({
      action: decision.nextAction,
      context: decision.context,
      ledger: testLedger
    });
    
    console.log('✅ 生成内容:', {
      type: content.type,
      content: content.content.substring(0, 100) + '...',
      metadata: content.metadata
    });
    
    console.log('\n🎉 StubAgentCore 测试成功！');
  }
  
  testDecision().catch(error => {
    console.error('❌ 测试失败:', error);
  });
  
} catch (error) {
  console.error('❌ 测试初始化失败:', error);
}
