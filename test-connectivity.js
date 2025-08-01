// 系统连通性测试脚本
async function testSystemConnectivity() {
  console.log('🔍 开始系统连通性测试...\n');

  // 1. 后端服务验证
  console.log('📡 1. 后端服务验证');
  console.log('================');

  try {
    // 1.1 健康检查
    console.log('🏥 测试健康检查端点...');
    const healthResponse = await fetch('http://localhost:3002/health');
    const healthData = await healthResponse.json();
    console.log('✅ 健康检查通过:', healthData);

    // 1.2 API端点测试
    console.log('\n🎮 测试游戏创建API...');
    const gameResponse = await fetch('http://localhost:3002/api/game/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storyId: 'escape-dungeon',
        userId: 'connectivity-test-user'
      })
    });

    const gameData = await gameResponse.json();
    console.log('✅ 游戏创建API响应:', {
      success: gameData.success,
      gameId: gameData.data?.gameId,
      narrativeCount: gameData.data?.narrative?.length || 0
    });

    if (gameData.success) {
      console.log('📖 叙事内容预览:');
      gameData.data.narrative?.slice(0, 2).forEach((item, index) => {
        console.log(`   ${index + 1}. [${item.type}] ${item.content.substring(0, 50)}...`);
      });
    }

    return gameData.data?.gameId;

  } catch (error) {
    console.error('❌ 后端服务测试失败:', error.message);
    return null;
  }
}

// 2. 前端服务验证
async function testFrontendService() {
  console.log('\n🌐 2. 前端服务验证');
  console.log('================');

  try {
    const frontendResponse = await fetch('http://localhost:3000');
    const frontendText = await frontendResponse.text();
    
    if (frontendText.includes('故事编织者')) {
      console.log('✅ 前端服务正常运行');
      console.log('📄 页面标题包含: "故事编织者"');
      return true;
    } else {
      console.log('⚠️ 前端服务响应异常');
      return false;
    }
  } catch (error) {
    console.error('❌ 前端服务测试失败:', error.message);
    return false;
  }
}

// 3. WebSocket连接测试
function testWebSocketConnection(gameId) {
  return new Promise((resolve) => {
    console.log('\n🔌 3. WebSocket连接测试');
    console.log('====================');

    if (!gameId) {
      console.log('❌ 无法测试WebSocket：缺少gameId');
      resolve(false);
      return;
    }

    try {
      const io = require('socket.io-client');
      const socket = io('http://localhost:3002');

      let connected = false;
      let receivedEvents = [];

      socket.on('connect', () => {
        console.log('✅ WebSocket连接成功');
        connected = true;
        
        // 加入游戏房间
        socket.emit('join-game', gameId);
        console.log(`🏠 已加入游戏房间: ${gameId}`);
      });

      socket.on('narrative-update', (data) => {
        receivedEvents.push('narrative-update');
        console.log('📖 收到叙事更新事件');
      });

      socket.on('choice-required', (data) => {
        receivedEvents.push('choice-required');
        console.log('🎯 收到选择点事件');
      });

      socket.on('disconnect', () => {
        console.log('🔌 WebSocket连接断开');
      });

      // 15秒后检查结果
      setTimeout(() => {
        console.log(`📊 WebSocket测试结果:`);
        console.log(`   连接状态: ${connected ? '✅ 已连接' : '❌ 未连接'}`);
        console.log(`   接收事件: ${receivedEvents.length > 0 ? '✅ ' + receivedEvents.join(', ') : '⚠️ 无事件'}`);
        
        socket.disconnect();
        resolve(connected && receivedEvents.length > 0);
      }, 15000);

    } catch (error) {
      console.error('❌ WebSocket测试失败:', error.message);
      resolve(false);
    }
  });
}

// 主测试函数
async function runConnectivityTest() {
  try {
    const gameId = await testSystemConnectivity();
    const frontendOk = await testFrontendService();
    const websocketOk = await testWebSocketConnection(gameId);

    console.log('\n📋 测试总结');
    console.log('==========');
    console.log(`后端服务: ${gameId ? '✅ 正常' : '❌ 异常'}`);
    console.log(`前端服务: ${frontendOk ? '✅ 正常' : '❌ 异常'}`);
    console.log(`WebSocket: ${websocketOk ? '✅ 正常' : '❌ 异常'}`);

    if (gameId && frontendOk && websocketOk) {
      console.log('\n🎉 系统连通性测试全部通过！');
      console.log('🌐 请访问 http://localhost:3000 开始游戏');
    } else {
      console.log('\n⚠️ 发现连通性问题，需要进一步诊断');
    }

  } catch (error) {
    console.error('💥 测试过程中发生错误:', error);
  }
}

runConnectivityTest();
