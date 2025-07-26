// 测试API端点
async function testAPI() {
  try {
    console.log('🧪 测试 POST /api/game/new');

    const response = await fetch('http://localhost:3001/api/game/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        storyId: 'escape-dungeon'
      })
    });

    const data = await response.json();
    console.log('✅ 游戏创建成功:', data);

    if (data.success && data.data.gameId) {
      const gameId = data.data.gameId;

      console.log('🧪 测试 GET /api/game/' + gameId);

      const gameResponse = await fetch(`http://localhost:3001/api/game/${gameId}`);
      const gameData = await gameResponse.json();

      console.log('✅ 游戏状态获取成功:', gameData);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testAPI();
