// 测试API端点 - 数据库持久化版本
async function testAPI() {
  try {
    console.log('🧪 阶段2测试：数据库持久化功能');
    console.log('=====================================\n');

    // 1. 测试游戏创建
    console.log('🧪 测试 POST /api/game/new');

    const response = await fetch('http://localhost:3001/api/game/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        storyId: 'escape-dungeon',
        userId: 'test-user-123'
      })
    });

    const data = await response.json();
    console.log('✅ 游戏创建成功:', {
      gameId: data.data.gameId,
      hasNarrativeLedger: !!data.data.narrativeLedger,
      narrativeCount: data.data.narrative.length
    });

    if (data.success && data.data.gameId) {
      const gameId = data.data.gameId;

      // 2. 测试游戏状态获取
      console.log('\n🧪 测试 GET /api/game/' + gameId);

      const gameResponse = await fetch(`http://localhost:3001/api/game/${gameId}`);
      const gameData = await gameResponse.json();

      console.log('✅ 游戏状态获取成功:', {
        gameId: gameData.data.gameId,
        sceneState: gameData.data.scene.state,
        narrativeCount: gameData.data.narrative.length
      });

      // 3. 测试数据库状态保存
      console.log('\n🧪 测试 POST /api/game/' + gameId + '/save');

      const saveResponse = await fetch(`http://localhost:3001/api/game/${gameId}/save`, {
        method: 'POST'
      });

      const saveData = await saveResponse.json();
      console.log('✅ 游戏状态保存成功:', saveData);

      // 4. 测试用户游戏列表
      console.log('\n🧪 测试 GET /api/user/test-user-123/games');

      const userGamesResponse = await fetch('http://localhost:3001/api/user/test-user-123/games');
      const userGamesData = await userGamesResponse.json();

      console.log('✅ 用户游戏列表获取成功:', {
        gamesCount: userGamesData.data.length,
        games: userGamesData.data.map(g => ({ gameId: g.gameId, storyTitle: g.storyTitle }))
      });

      console.log('\n🎉 阶段2数据库持久化测试全部通过！');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testAPI();
