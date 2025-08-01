// 状态恢复功能专项测试
console.log('🔄 阶段2回归测试：状态恢复功能验证');
console.log('='.repeat(50));

async function testStateRecovery() {
  try {
    // 1. 创建新游戏
    console.log('\n📝 步骤1：创建新游戏');
    const createResponse = await fetch('http://localhost:3001/api/game/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId: 'escape-dungeon',
        userId: 'recovery-test-user'
      })
    });
    
    const createData = await createResponse.json();
    const gameId = createData.data.gameId;
    
    console.log(`✅ 游戏创建成功: ${gameId}`);
    console.log(`📖 初始叙事段落: ${createData.data.narrative.length}`);
    
    // 2. 进行一次选择操作
    console.log('\n🎯 步骤2：进行选择操作');
    const choiceResponse = await fetch(`http://localhost:3001/api/game/${gameId}/choice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        choicePointId: 'recovery-test-choice',
        selectedOptionId: 'stealth'
      })
    });
    
    const choiceData = await choiceResponse.json();
    console.log('✅ 选择处理成功');
    console.log(`📝 新叙事内容: ${choiceData.data.narrative.content.substring(0, 50)}...`);
    
    // 3. 获取当前完整状态
    console.log('\n📋 步骤3：获取当前游戏状态');
    const stateResponse = await fetch(`http://localhost:3001/api/game/${gameId}`);
    const stateData = await stateResponse.json();
    
    const originalState = stateData.data;
    console.log(`✅ 当前状态获取成功`);
    console.log(`📚 叙事段落数: ${originalState.narrative.length}`);
    console.log(`🧠 叙事账本字段: ${Object.keys(originalState.narrativeLedger).join(', ')}`);
    console.log(`🎭 场景状态: ${originalState.scene.state}`);
    
    // 4. 强制保存到数据库
    console.log('\n💾 步骤4：强制保存到数据库');
    const saveResponse = await fetch(`http://localhost:3001/api/game/${gameId}/save`, {
      method: 'POST'
    });
    
    const saveData = await saveResponse.json();
    console.log('✅ 数据库保存成功');
    
    // 5. 等待一段时间，然后重新获取（模拟服务器重启）
    console.log('\n🔄 步骤5：模拟服务器重启后状态恢复');
    console.log('   等待2秒...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const recoveryResponse = await fetch(`http://localhost:3001/api/game/${gameId}`);
    const recoveryData = await recoveryResponse.json();
    
    if (recoveryData.success) {
      const recoveredState = recoveryData.data;
      
      console.log('✅ 状态恢复成功');
      
      // 6. 数据完整性验证
      console.log('\n🔍 步骤6：数据完整性验证');
      
      const checks = {
        gameId: originalState.gameId === recoveredState.gameId,
        narrativeCount: originalState.narrative.length === recoveredState.narrative.length,
        sceneState: originalState.scene.state === recoveredState.scene.state,
        hasNarrativeLedger: !!recoveredState.narrativeLedger,
        hasPlayerCharacter: !!recoveredState.narrativeLedger?.playerCharacter,
        hasWorldState: !!recoveredState.narrativeLedger?.worldState,
        hasCharacterRelationships: !!recoveredState.narrativeLedger?.characterRelationships
      };
      
      console.log('数据完整性检查结果:');
      Object.entries(checks).forEach(([check, passed]) => {
        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${check}: ${passed}`);
      });
      
      const passedChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.keys(checks).length;
      
      console.log(`\n📊 完整性验证结果: ${passedChecks}/${totalChecks} 通过`);
      
      if (passedChecks === totalChecks) {
        console.log('🎉 状态恢复功能测试完全通过！');
        
        // 7. 详细数据对比
        console.log('\n📋 详细数据对比:');
        console.log(`原始叙事段落数: ${originalState.narrative.length}`);
        console.log(`恢复叙事段落数: ${recoveredState.narrative.length}`);
        console.log(`原始场景ID: ${originalState.scene.id}`);
        console.log(`恢复场景ID: ${recoveredState.scene.id}`);
        console.log(`叙事账本玩家特质数: ${recoveredState.narrativeLedger.playerCharacter.personality_traits.length}`);
        console.log(`叙事账本角色关系数: ${Object.keys(recoveredState.narrativeLedger.characterRelationships).length}`);
        
      } else {
        console.log('⚠️ 状态恢复功能存在问题，需要修复');
      }
      
    } else {
      console.log('❌ 状态恢复失败:', recoveryData.error);
    }
    
  } catch (error) {
    console.error('❌ 状态恢复测试失败:', error.message);
  }
}

testStateRecovery();
