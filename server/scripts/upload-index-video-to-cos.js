import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { uploadFile } from '../services/cosService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 视频文件路径（相对于项目根目录）
const VIDEO_PATH = join(__dirname, '../../public/index.mp4')
const CONFIG_PATH = join(__dirname, '../../public/video-config.json')

/**
 * 上传首页背景视频到COS
 */
async function uploadIndexVideoToCOS() {
  try {
    console.log('📤 开始上传首页背景视频到COS...\n')

    // 检查文件是否存在
    if (!existsSync(VIDEO_PATH)) {
      console.error(`❌ 视频文件不存在: ${VIDEO_PATH}`)
      console.log('💡 请确保 index.mp4 文件在 public/ 目录下\n')
      process.exit(1)
    }

    const cosKey = 'videos/index.mp4'
    
    console.log(`📤 上传视频: ${VIDEO_PATH}`)
    console.log(`📤 COS路径: ${cosKey}\n`)

    const result = await uploadFile(VIDEO_PATH, cosKey, {
      ContentType: 'video/mp4',
    })

    console.log(`✅ 视频上传成功: ${result.url}\n`)

    // 生成配置文件
    const configContent = JSON.stringify({
      indexVideo: {
        cosKey: result.key,
        cosUrl: result.url,
        uploadedAt: new Date().toISOString(),
      },
    }, null, 2)

    writeFileSync(CONFIG_PATH, configContent, 'utf-8')

    console.log('✅ 配置文件已保存:', CONFIG_PATH)
    console.log('📝 视频URL:', result.url)
    console.log('\n✅ 上传完成！\n')

    return result
  } catch (error) {
    console.error('❌ 上传视频失败:', error)
    throw error
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('upload-index-video-to-cos.js')) {
  uploadIndexVideoToCOS()
    .then(() => {
      console.log('✅ 脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error)
      process.exit(1)
    })
}

export { uploadIndexVideoToCOS }

