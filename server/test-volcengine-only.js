import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { generateVideoFromImage } from './services/imageToVideoService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const desktopPath = join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop', '杨齐.png')
const imageBuffer = readFileSync(desktopPath)
const imageBase64 = imageBuffer.toString('base64')
const imageDataUrl = `data:image/png;base64,${imageBase64}`

console.log('测试火山引擎模型...')
try {
  const result = await generateVideoFromImage(imageDataUrl, {
    model: 'volcengine-video-3.0-pro',
    resolution: '720p',
    duration: 5,
    text: '人物跳起来',
  })
  console.log('✅ 成功:', JSON.stringify(result, null, 2))
} catch (e) {
  console.log('❌ 失败:', e.message)
  console.log(e.stack)
}


