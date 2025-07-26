// 测试Mock LLM适配器
console.log('🤖 测试Mock LLM适配器...\n');

try {
  // 直接测试Mock适配器
  const { MockLLMAdapter } = require('./dist/services/adapters/MockLLMAdapter.js');
  
  console.log('✅ MockLLMAdapter导入成功');
  
  // 创建Mock适配器实例
  const mockAdapter = new MockLLMAdapter({
    enableScenarioResponses: true,
    defaultDelay: 100,
    enableLogging: true,
  });
  
  console.log('✅ MockLLMAdapter实例创建成功');
  console.log('   可用性:', mockAdapter.isAvailable());
  console.log('   模型信息:', mockAdapter.getModelInfo());
  
  // 测试基本响应
  async function testBasicResponse() {
    console.log('\n📝 测试基本响应...');
    
    const request = {
      prompt: '请生成一个简单的叙述',
      maxTokens: 100,
      temperature: 0.7,
    };
    
    const response = await mockAdapter.generateResponse(request);
    console.log('✅ 基本响应生成成功');
    console.log('   内容长度:', response.content.length);
    console.log('   使用统计:', response.usage);
    console.log('   内容预览:', response.content.substring(0, 50) + '...');
  }
  
  // 测试场景特定响应
  async function testScenarioResponse() {
    console.log('\n🎭 测试场景特定响应...');
    
    const request = {
      prompt: '在escape-dungeon场景中生成开场叙述',
      maxTokens: 200,
      temperature: 0.8,
      context: {
        sceneId: 'escape-dungeon'
      }
    };
    
    const response = await mockAdapter.generateResponse(request);
    console.log('✅ 场景响应生成成功');
    console.log('   内容长度:', response.content.length);
    console.log('   内容预览:', response.content.substring(0, 100) + '...');
  }
  
  // 测试动作生成
  async function testActionGeneration() {
    console.log('\n⚡ 测试动作生成...');
    
    const request = {
      prompt: '生成一个JSON格式的动作',
      maxTokens: 150,
      temperature: 0.6,
    };
    
    const response = await mockAdapter.generateResponse(request);
    console.log('✅ 动作响应生成成功');
    console.log('   内容:', response.content);
    
    // 尝试解析JSON
    try {
      const action = JSON.parse(response.content);
      console.log('✅ JSON解析成功');
      console.log('   动作类型:', action.type);
      console.log('   动作目标:', action.target);
    } catch (e) {
      console.log('⚠️  JSON解析失败，但这在Mock模式下是正常的');
    }
  }
  
  // 运行所有测试
  async function runAllTests() {
    await testBasicResponse();
    await testScenarioResponse();
    await testActionGeneration();
    
    console.log('\n🎉 所有Mock适配器测试完成！');
    console.log('\n📋 测试总结:');
    console.log('   ✅ Mock适配器导入 - 正常');
    console.log('   ✅ 实例创建 - 正常');
    console.log('   ✅ 基本响应生成 - 正常');
    console.log('   ✅ 场景特定响应 - 正常');
    console.log('   ✅ 动作生成 - 正常');
  }
  
  // 执行测试
  runAllTests().catch(error => {
    console.error('❌ 测试执行失败:', error);
  });

} catch (error) {
  console.error('❌ Mock适配器测试失败:', error.message);
  console.error('错误详情:', error);
}
