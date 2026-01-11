import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { uploadFile } from '../services/storageService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 海报文件夹路径（相对于项目根目录）
const POSTER_DIR = join(__dirname, '../../poster')

/**
 * 上传海报图片到COS
 */
async function uploadPostersToCOS() {
  try {
    console.log('📤 开始上传海报图片到COS...\n')

    const posterFolders = ['7：10', '3：4']
    const uploadedFiles = []

    for (const folder of posterFolders) {
      const folderPath = join(POSTER_DIR, folder)
      
      try {
        const allFiles = await readdir(folderPath)
        const imageFiles = allFiles.filter(f => 
          /\.(jpg|jpeg|png|webp)$/i.test(f)
        )
        
        console.log(`\n📁 处理文件夹: ${folder}`)
        console.log(`   找到 ${imageFiles.length} 个图片文件\n`)

        if (imageFiles.length === 0) {
          console.log(`   ⚠️  文件夹为空，跳过\n`)
          continue
        }

        for (const file of imageFiles) {
          const filePath = join(folderPath, file)
          const cosKey = `posters/${folder}/${file}`
          
          try {
            console.log(`   📤 上传: ${file}`)
            const result = await uploadFile(filePath, cosKey)
            uploadedFiles.push({
              folder,
              fileName: file,
              cosKey: result.key,
              cosUrl: result.url,
            })
            console.log(`   ✅ 成功: ${result.url}\n`)
          } catch (error) {
            console.error(`   ❌ 失败: ${file} - ${error.message}\n`)
          }
        }
      } catch (error) {
        console.error(`❌ 无法读取文件夹 ${folder}: ${error.message}`)
      }
    }

    // 生成配置文件
    const configContent = JSON.stringify({
      posters: uploadedFiles,
      lastUpdated: new Date().toISOString(),
    }, null, 2)

    const configPath = join(__dirname, '../../public/poster-config.json')
    await writeFile(configPath, configContent, 'utf-8')

    console.log('\n✅ 所有海报上传完成！')
    console.log(`📊 总计: ${uploadedFiles.length} 个文件`)
    console.log(`📝 配置文件已保存: ${configPath}\n`)

    return uploadedFiles
  } catch (error) {
    console.error('❌ 上传海报失败:', error)
    throw error
  }
}

// 如果直接运行此脚本
const isMainModule = process.argv[1]?.includes('upload-posters-to-cos.js')
if (isMainModule) {
  uploadPostersToCOS()
    .then(() => {
      console.log('✅ 脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error)
      process.exit(1)
    })
}

export { uploadPostersToCOS }

