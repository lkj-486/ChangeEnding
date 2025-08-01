// 测试WebSocket连接和选择选项显示
// 使用简单的fetch测试，不需要socket.io-client

async function testWebSocketConnection() {
  try {
    console.log('🎮 创建新游戏会话...');
    
    // 1. 创建新游戏
    const response = await fetch('http://localhost:3002/api/game/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storyId: 'escape-dungeon',
        userId: 'websocket-test-user'
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      console.log('❌ 游戏创建失败:', data.message);
      return;
    }

    const gameId = data.data.gameId;
    console.log('✅ 游戏创建成功! GameID:', gameId);

    console.log('⏰ 等待15秒让后端推送WebSocket事件...');
    console.log('💡 请在浏览器中访问 http://localhost:3000 测试完整的前后端连通性');

    // 15秒后退出
    setTimeout(() => {
      console.log('🔚 测试完成');
      process.exit(0);
    }, 15000);

  } catch (error) {
    console.error('💥 测试失败:', error.message);
  }
}

testWebSocketConnection();
