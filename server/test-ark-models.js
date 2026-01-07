/**
 * 测试ARK API可能的模型名称
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

// 尝试多种可能的模型名称
const possibleModels = [
  'jimeng_ti2v_v30_1080p',
  'jimeng-ti2v-v30-1080p',
  'jimeng_ti2v_v30_pro',
  'jimeng-ti2v-v30-pro',
  'jimeng_t2v_v30_1080p', // 文生视频的模型ID
  'jimeng-t2v-v30-1080p',
  'jimeng_video_3.0_pro',
  'jimeng-video-3.0-pro',
  'volcengine-video-3.0-pro',
  'seedance-3.0-pro',
  'ti2v_v30_1080p',
  'ti2v-v30-1080p',
]

async function testModel(modelName) {
  try {
    const response = await fetch(`${VOLCENGINE_ARK_API_HOST}/api/v3/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLCENGINE_ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelName,
        content: [
          {
            type: 'text',
            text: '测试'
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
    
    if (response.ok) {
      console.log(`✅ ${modelName}: 成功!`, JSON.stringify(data, null, 2))
      return true
    } else {
      const errorMsg = data.error?.message || JSON.stringify(data)
      if (errorMsg.includes('model') || errorMsg.includes('endpoint')) {
        console.log(`❌ ${modelName}: 模型不存在 - ${errorMsg.substring(0, 100)}`)
      } else {
        console.log(`⚠️  ${modelName}: 其他错误 - ${errorMsg.substring(0, 100)}`)
      }
      return false
    }
  } catch (error) {
    console.log(`❌ ${modelName}: 请求失败 - ${error.message}`)
    return false
  }
}

async function testAllModels() {
  console.log('🧪 开始测试所有可能的模型名称...\n')
  
  for (const model of possibleModels) {
    await testModel(model)
    await new Promise(resolve => setTimeout(resolve, 500)) // 避免请求过快
  }
  
  console.log('\n✅ 测试完成')
}

testAllModels()


