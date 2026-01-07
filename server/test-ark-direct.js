/**
 * 直接测试ARK API，尝试最简单的请求
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
const rootEnvPath = join(__dirname, '../.env')
const serverEnvPath = join(__dirname, '.env')

if (existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath })
}
if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: true })
}

const VOLCENGINE_ARK_API_KEY = process.env.VOLCENGINE_ARK_API_KEY
const VOLCENGINE_ARK_API_HOST = process.env.VOLCENGINE_ARK_API_HOST || 'https://ark.cn-beijing.volces.com'

if (!VOLCENGINE_ARK_API_KEY) {
  console.error('❌ VOLCENGINE_ARK_API_KEY 未设置')
  process.exit(1)
}

console.log('🧪 测试ARK API连接...\n')
console.log('API Host:', VOLCENGINE_ARK_API_HOST)
console.log('API Key:', VOLCENGINE_ARK_API_KEY.substring(0, 20) + '...\n')

// 测试1: 尝试获取模型列表（如果有这个端点）
async function testListModels() {
  console.log('📤 测试1: 尝试获取模型列表...')
  try {
    const response = await fetch(`${VOLCENGINE_ARK_API_HOST}/api/v3/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VOLCENGINE_ARK_API_KEY}`,
      },
    })
    const data = await response.json()
    console.log('响应状态:', response.status)
    console.log('响应数据:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.log('❌ 请求失败:', error.message)
  }
  console.log('')
}

// 测试2: 使用jimeng_t2v_v30_1080p，但只使用文本（文生视频）
async function testTextToVideo() {
  console.log('📤 测试2: 尝试文生视频（仅文本，不使用图片）...')
  try {
    const response = await fetch(`${VOLCENGINE_ARK_API_HOST}/api/v3/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLCENGINE_ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'jimeng_t2v_v30_1080p',
        content: [
          {
            type: 'text',
            text: '千军万马'
          }
        ],
        generate_audio: true,
      }),
    })
    const data = await response.json()
    console.log('响应状态:', response.status)
    console.log('响应数据:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ 文生视频请求成功!')
    } else {
      console.log('❌ 文生视频请求失败')
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message)
  }
  console.log('')
}

// 测试3: 使用jimeng_t2v_v30_1080p，但使用不同的content格式
async function testImageToVideo() {
  console.log('📤 测试3: 尝试图生视频（使用first_frame role）...')
  try {
    const response = await fetch(`${VOLCENGINE_ARK_API_HOST}/api/v3/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLCENGINE_ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'jimeng_t2v_v30_1080p',
        content: [
          {
            type: 'text',
            text: '测试视频生成'
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://picsum.photos/1280/720'
            },
            role: 'first_frame'
          }
        ],
        generate_audio: true,
      }),
    })
    const data = await response.json()
    console.log('响应状态:', response.status)
    console.log('响应数据:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ 图生视频请求成功!')
    } else {
      console.log('❌ 图生视频请求失败')
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message)
  }
  console.log('')
}

async function runTests() {
  await testListModels()
  await testTextToVideo()
  await testImageToVideo()
  console.log('✅ 所有测试完成')
}

runTests()


