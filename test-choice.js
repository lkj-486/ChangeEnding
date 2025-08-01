// 测试选择API
async function testChoice() {
  try {
    const response = await fetch('http://localhost:3001/api/game/79bde29b-99e2-4a00-bdaa-a79a444766f1/choice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        choicePointId: 'guard_encounter_choice',
        selectedOptionId: 'sneak'
      })
    });
    
    const data = await response.json();
    console.log('✅ 选择API响应:', data);
    
  } catch (error) {
    console.error('❌ 选择API失败:', error);
  }
}

testChoice();
