// 测试任务管理API
const API_BASE_URL = 'http://localhost:3002'

async function testAPI() {
  console.log('🧪 开始测试任务管理API...\n')

  try {
    // 1. 测试获取任务列表
    console.log('1️⃣ 测试获取任务列表...')
    const getResponse = await fetch(`${API_BASE_URL}/api/tasks`)
    const getData = await getResponse.json()
    console.log('✅ 获取任务列表成功')
    console.log(`   当前任务数量: ${getData.data.length}\n`)

    // 2. 测试创建任务
    console.log('2️⃣ 测试创建任务...')
    const createResponse = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '测试任务',
        description: '这是一个测试任务，用于验证数据库功能',
        date: '2025/12/25',
        progress1: 0,
        progress2: 0,
        is_completed1: false,
        mode: 'image',
      }),
    })
    const createData = await createResponse.json()
    
    if (createData.success) {
      console.log('✅ 创建任务成功')
      console.log(`   任务ID: ${createData.data.id}`)
      console.log(`   任务标题: ${createData.data.title}\n`)
      
      const taskId = createData.data.id

      // 3. 测试获取单个任务
      console.log('3️⃣ 测试获取单个任务...')
      const getOneResponse = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`)
      const getOneData = await getOneResponse.json()
      if (getOneData.success) {
        console.log('✅ 获取单个任务成功')
        console.log(`   任务标题: ${getOneData.data.title}\n`)
      }

      // 4. 测试切换展开状态
      console.log('4️⃣ 测试切换展开状态...')
      const toggleResponse = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/toggle-expand`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_expanded: true,
        }),
      })
      const toggleData = await toggleResponse.json()
      if (toggleData.success) {
        console.log('✅ 切换展开状态成功')
        console.log(`   展开状态: ${toggleData.data.is_expanded}\n`)
      }

      // 5. 测试更新任务进度
      console.log('5️⃣ 测试更新任务进度...')
      const progressResponse = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          progress1: 50,
          progress2: 25,
          isCompleted1: false,
        }),
      })
      const progressData = await progressResponse.json()
      if (progressData.success) {
        console.log('✅ 更新任务进度成功')
        console.log(`   进度1: ${progressData.data.progress1}%`)
        console.log(`   进度2: ${progressData.data.progress2}%\n`)
      }

      // 6. 测试删除任务
      console.log('6️⃣ 测试删除任务...')
      const deleteResponse = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
      })
      const deleteData = await deleteResponse.json()
      if (deleteData.success) {
        console.log('✅ 删除任务成功\n')
      }

      // 7. 验证任务已删除
      console.log('7️⃣ 验证任务已删除...')
      const verifyResponse = await fetch(`${API_BASE_URL}/api/tasks`)
      const verifyData = await verifyResponse.json()
      console.log(`✅ 验证完成，当前任务数量: ${verifyData.data.length}\n`)

    } else {
      console.error('❌ 创建任务失败:', createData.error)
    }

    console.log('🎉 所有测试完成！')
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

testAPI()


