import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 海报文件夹路径（相对于项目根目录）
const POSTER_DIR = join(__dirname, '../../poster')

/**
 * 检查海报文件夹是否存在
 */
function checkPostersFolder() {
  console.log('🔍 检查海报文件夹...\n')
  console.log(`📁 检查路径: ${POSTER_DIR}\n`)

  if (!existsSync(POSTER_DIR)) {
    console.log('❌ poster/ 文件夹不存在\n')
    console.log('💡 解决方案：')
    console.log('   1. 从本地复制 poster/ 文件夹到服务器')
    console.log('   2. 或者从 COS 下载已有的海报（如果有）')
    console.log('   3. 或者创建空文件夹，稍后手动上传海报\n')
    return false
  }

  const stats = statSync(POSTER_DIR)
  if (!stats.isDirectory()) {
    console.log('❌ poster/ 路径存在但不是文件夹\n')
    return false
  }

  console.log('✅ poster/ 文件夹存在\n')

  // 检查子文件夹
  const requiredFolders = ['7：10', '3：4']
  let allFoldersExist = true
  let hasAnyFiles = false
  let totalFiles = 0

  for (const folder of requiredFolders) {
    const folderPath = join(POSTER_DIR, folder)
    if (existsSync(folderPath) && statSync(folderPath).isDirectory()) {
      const files = readdirSync(folderPath).filter(f => 
        /\.(jpg|jpeg|png|webp)$/i.test(f)
      )
      totalFiles += files.length
      if (files.length > 0) {
        hasAnyFiles = true
        console.log(`   ✅ ${folder}/ 存在 (${files.length} 个图片文件)`)
      } else {
        console.log(`   ⚠️  ${folder}/ 存在但为空 (没有图片文件)`)
      }
    } else {
      console.log(`   ❌ ${folder}/ 不存在`)
      allFoldersExist = false
    }
  }

  console.log('')

  if (!allFoldersExist) {
    console.log('⚠️  部分海报文件夹缺失，请先创建或复制缺失的文件夹\n')
    return false
  }

  if (totalFiles === 0) {
    console.log('⚠️  所有海报文件夹都存在，但都是空的！')
    console.log('💡 解决方案：')
    console.log('   1. 从本地复制海报图片到服务器：')
    console.log('      scp -r poster/ ubuntu@your-server:/var/www/aigc-agent/')
    console.log('   2. 或者手动上传图片到 poster/7：10/ 和 poster/3：4/ 文件夹')
    console.log('   3. 如果 COS 中已有海报，可以跳过上传步骤\n')
    return false
  }

  if (hasAnyFiles) {
    console.log(`✅ 所有必需的海报文件夹都存在，共找到 ${totalFiles} 个图片文件`)
    console.log('✅ 可以运行 npm run upload-posters 上传到 COS\n')
    return true
  }

  return false
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('check-posters.js')) {
  const result = checkPostersFolder()
  process.exit(result ? 0 : 1)
}

export { checkPostersFolder }

