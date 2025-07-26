// 测试AI代理是否正常工作
console.log('🧪 测试AI代理功能...\n');

// 模拟一个简单的测试
async function testAIAgent() {
  try {
    // 检查端口3001是否可访问
    const response = await fetch('http://localhost:3001/api/stories');
    if (response.ok) {
      console.log('✅ 后端服务器正在运行');
      
      // 创建一个新游戏来测试AI代理
      const gameResponse = await fetch('http://localhost:3001/api/game/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: 'escape-dungeon'
        })
      });
      
      if (gameResponse.ok) {
        const gameData = await gameResponse.json();
        console.log('✅ 游戏创建成功:', gameData.data.gameId);
        
        // 等待几秒钟让AI代理开始工作
        console.log('⏳ 等待AI代理开始工作...');
        setTimeout(async () => {
          // 检查游戏状态
          const stateResponse = await fetch(`http://localhost:3001/api/game/${gameData.data.gameId}`);
          if (stateResponse.ok) {
            const stateData = await stateResponse.json();
            console.log('📊 游戏状态:', {
              narrativeCount: stateData.data.narrative?.length || 0,
              isWaitingForChoice: stateData.data.isWaitingForChoice,
              currentChoice: stateData.data.currentChoice
            });
          }
        }, 10000); // 等待10秒
        
      } else {
        console.log('❌ 游戏创建失败');
      }
    } else {
      console.log('❌ 后端服务器未运行');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 在Node.js环境中运行
if (typeof fetch === 'undefined') {
  // 如果没有fetch，提示用户在浏览器中运行
  console.log('请在浏览器控制台中运行此测试脚本');
} else {
  testAIAgent();
}
