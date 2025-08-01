// 测试创建游戏会话的脚本
// 使用Node.js内置的fetch (Node.js 18+)

async function createGame() {
  try {
    console.log('🎮 开始创建游戏会话...');
    
    const response = await fetch('http://localhost:3002/api/game/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storyId: 'escape-dungeon',
        userId: 'test-user'
      })
    });

    const data = await response.json();
    console.log('📊 API响应:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ 游戏会话创建成功!');
      console.log('🆔 游戏ID:', data.data.gameId);
    } else {
      console.log('❌ 游戏会话创建失败:', data.message);
    }
  } catch (error) {
    console.error('💥 请求失败:', error.message);
  }
}

createGame();
