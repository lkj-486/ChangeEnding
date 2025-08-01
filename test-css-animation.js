// 测试CSS动画解决方案
async function testCSSAnimation() {
  try {
    console.log('🎮 创建新游戏会话测试CSS动画...');
    
    const response = await fetch('http://localhost:3002/api/game/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storyId: 'escape-dungeon',
        userId: 'css-test-user'
      })
    });

    const data = await response.json();
    console.log('📊 新游戏创建响应:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ 新游戏创建成功!');
      console.log('🆔 游戏ID:', data.data.gameId);
      console.log('📖 叙事内容数量:', data.data.narrative?.length || 0);
      
      // 显示所有叙事内容
      if (data.data.narrative) {
        data.data.narrative.forEach((item, index) => {
          console.log(`📝 段落 ${index + 1}:`, {
            id: item.id,
            type: item.type,
            content: item.content.substring(0, 50) + '...',
            timestamp: item.timestamp
          });
        });
      }
    } else {
      console.log('❌ 游戏创建失败:', data.message);
    }
  } catch (error) {
    console.error('💥 请求失败:', error.message);
  }
}

testCSSAnimation();
