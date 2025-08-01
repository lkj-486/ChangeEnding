// 测试数据库连接和数据
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 测试数据库连接...');
    
    // 检查用户数据
    const users = await prisma.user.findMany();
    console.log(`✅ 用户数量: ${users.length}`);
    
    // 检查故事数据
    const stories = await prisma.story.findMany();
    console.log(`✅ 故事数量: ${stories.length}`);
    
    // 检查游戏状态数据
    const gameStates = await prisma.gameState.findMany();
    console.log(`✅ 游戏状态数量: ${gameStates.length}`);
    
    if (gameStates.length > 0) {
      const firstGame = gameStates[0];
      console.log('📋 第一个游戏状态:');
      console.log(`   gameId: ${firstGame.gameId}`);
      console.log(`   storyId: ${firstGame.storyId}`);
      console.log(`   sceneState: ${firstGame.sceneState}`);
      console.log(`   叙事账本包含: ${Object.keys(firstGame.narrativeLedger).join(', ')}`);
    }
    
    console.log('🎉 数据库测试成功！');
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
