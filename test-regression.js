// 阶段2回归测试 - 全面功能验证
console.log('🧪 阶段2回归测试：状态快照持久化功能验证');
console.log('='.repeat(60));

let testResults = {
  apiHealth: false,
  gameCreation: false,
  databaseSave: false,
  stateRecovery: false,
  choiceHandling: false,
  apiEndpoints: false
};

async function runRegressionTests() {
  try {
    // 1. API健康检查
    console.log('\n📡 测试1：API健康检查');
    console.log('-'.repeat(30));
    
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    
    if (healthData.status === 'ok') {
      console.log('✅ 后端API服务正常');
      testResults.apiHealth = true;
    } else {
      console.log('❌ 后端API服务异常');
      return;
    }
    
    // 2. 完整游戏流程测试
    console.log('\n🎮 测试2：完整游戏流程');
    console.log('-'.repeat(30));
    
    // 2.1 故事列表获取
    console.log('  📚 获取故事列表...');
    const storiesResponse = await fetch('http://localhost:3001/api/stories');
    const storiesData = await storiesResponse.json();
    
    if (storiesData.success && storiesData.stories.length > 0) {
      console.log(`  ✅ 故事列表获取成功，共${storiesData.stories.length}个故事`);
    } else {
      console.log('  ❌ 故事列表获取失败');
      return;
    }
    
    // 2.2 游戏创建
    console.log('  🎯 创建新游戏...');
    const createResponse = await fetch('http://localhost:3001/api/game/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId: 'escape-dungeon',
        userId: 'regression-test-user'
      })
    });
    
    const createData = await createResponse.json();
    
    if (createData.success && createData.data.gameId) {
      const gameId = createData.data.gameId;
      console.log(`  ✅ 游戏创建成功: ${gameId}`);
      console.log(`  📖 初始叙事段落数: ${createData.data.narrative.length}`);
      console.log(`  🧠 叙事账本包含: ${Object.keys(createData.data.narrativeLedger).join(', ')}`);
      testResults.gameCreation = true;
      
      // 2.3 游戏状态获取
      console.log('  📋 获取游戏状态...');
      const stateResponse = await fetch(`http://localhost:3001/api/game/${gameId}`);
      const stateData = await stateResponse.json();
      
      if (stateData.success) {
        console.log('  ✅ 游戏状态获取成功');
        console.log(`  🎭 场景状态: ${stateData.data.scene.state}`);
        console.log(`  📚 叙事历史: ${stateData.data.narrative.length}段`);
      } else {
        console.log('  ❌ 游戏状态获取失败');
        return;
      }
      
      // 2.4 数据库保存验证
      console.log('  💾 验证数据库保存...');
      const saveResponse = await fetch(`http://localhost:3001/api/game/${gameId}/save`, {
        method: 'POST'
      });
      
      const saveData = await saveResponse.json();
      
      if (saveData.success) {
        console.log('  ✅ 游戏状态保存到数据库成功');
        testResults.databaseSave = true;
      } else {
        console.log('  ❌ 游戏状态保存到数据库失败');
      }
      
      // 2.5 玩家选择处理
      console.log('  🎯 测试玩家选择处理...');
      const choiceResponse = await fetch(`http://localhost:3001/api/game/${gameId}/choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choicePointId: 'regression-test-choice',
          selectedOptionId: 'stealth'
        })
      });
      
      const choiceData = await choiceResponse.json();
      
      if (choiceData.success) {
        console.log('  ✅ 玩家选择处理成功');
        console.log(`  📝 新叙事内容: ${choiceData.data.narrative.content.substring(0, 50)}...`);
        console.log(`  🎭 选择后果: ${choiceData.data.consequence}`);
        testResults.choiceHandling = true;
      } else {
        console.log('  ❌ 玩家选择处理失败');
      }
      
      // 2.6 状态恢复测试
      console.log('  🔄 测试状态恢复...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待数据库写入
      
      const recoveryResponse = await fetch(`http://localhost:3001/api/game/${gameId}`);
      const recoveryData = await recoveryResponse.json();
      
      if (recoveryData.success) {
        const finalNarrativeCount = recoveryData.data.narrative.length;
        console.log(`  ✅ 状态恢复成功，最终叙事段落数: ${finalNarrativeCount}`);
        
        if (finalNarrativeCount >= 2) { // 初始 + 选择后的叙事
          console.log('  ✅ 数据完整性验证通过');
          testResults.stateRecovery = true;
        } else {
          console.log('  ⚠️ 数据完整性验证失败');
        }
      } else {
        console.log('  ❌ 状态恢复失败');
      }
      
      // 3. API端点功能验证
      console.log('\n🔗 测试3：API端点功能验证');
      console.log('-'.repeat(30));
      
      // 3.1 用户游戏列表
      console.log('  👤 测试用户游戏列表...');
      const userGamesResponse = await fetch('http://localhost:3001/api/user/regression-test-user/games');
      const userGamesData = await userGamesResponse.json();
      
      if (userGamesData.success) {
        console.log(`  ✅ 用户游戏列表获取成功，共${userGamesData.data.length}个游戏`);
        testResults.apiEndpoints = true;
      } else {
        console.log('  ❌ 用户游戏列表获取失败');
      }
      
    } else {
      console.log('  ❌ 游戏创建失败');
      return;
    }
    
    // 4. 测试结果汇总
    console.log('\n📊 回归测试结果汇总');
    console.log('='.repeat(60));
    
    const passedTests = Object.values(testResults).filter(result => result).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log(`总测试项目: ${totalTests}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${totalTests - passedTests}`);
    console.log(`通过率: ${Math.round(passedTests / totalTests * 100)}%`);
    
    console.log('\n详细结果:');
    Object.entries(testResults).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const testNames = {
        apiHealth: 'API健康检查',
        gameCreation: '游戏创建功能',
        databaseSave: '数据库保存功能',
        stateRecovery: '状态恢复功能',
        choiceHandling: '选择处理功能',
        apiEndpoints: 'API端点功能'
      };
      console.log(`  ${status} ${testNames[test]}`);
    });
    
    if (passedTests === totalTests) {
      console.log('\n🎉 所有回归测试通过！系统状态良好，可以进入阶段3。');
    } else {
      console.log('\n⚠️ 部分测试失败，需要修复后再进入阶段3。');
    }
    
  } catch (error) {
    console.error('\n❌ 回归测试执行失败:', error.message);
    console.error('请检查服务器状态和网络连接。');
  }
}

runRegressionTests();
