// 更新.env文件中的API key
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '.env')

const newApiKey = 'sk-fb45a4d6880740a596ee5c49f18f3da3'

if (!existsSync(envPath)) {
  console.log('❌ .env 文件不存在，正在创建...')
  // 创建新的.env文件
  const defaultContent = `DASHSCOPE_API_KEY=${newApiKey}
QWEN_MODEL=qwen-plus
PORT=3002
VIDEO_MODEL=doubao-seedance-1-5-pro-251215
`
  writeFileSync(envPath, defaultContent, 'utf-8')
  console.log('✅ .env 文件已创建')
} else {
  console.log('✅ .env 文件已存在，正在更新 DASHSCOPE_API_KEY...')
  
  // 读取现有内容
  let content = readFileSync(envPath, 'utf-8')
  
  // 更新或添加 DASHSCOPE_API_KEY
  if (content.includes('DASHSCOPE_API_KEY=')) {
    // 替换现有的API key
    content = content.replace(/DASHSCOPE_API_KEY=.*/g, `DASHSCOPE_API_KEY=${newApiKey}`)
  } else {
    // 如果不存在，添加到文件开头
    content = `DASHSCOPE_API_KEY=${newApiKey}\n${content}`
  }
  
  // 确保有VIDEO_MODEL配置
  if (!content.includes('VIDEO_MODEL=')) {
    content += '\nVIDEO_MODEL=doubao-seedance-1-5-pro-251215\n'
  }
  
  writeFileSync(envPath, content, 'utf-8')
  console.log('✅ DASHSCOPE_API_KEY 已更新')
}

console.log('✅ 配置完成！API Key:', newApiKey.substring(0, 10) + '...' + newApiKey.substring(newApiKey.length - 4))









