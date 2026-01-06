import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const envPath = join(process.cwd(), '.env')
const serverEnvPath = join(process.cwd(), 'server', '.env')

// 新的API Key
const newKeys = {
  HAILUO_23_API_KEY: 'sk-nDLzOnCgdJ65oJXwzqhHEVq2nhs7FF4TVtxPNA5Zg1lIWk1y',
  HAILUO_02_API_KEY: 'sk-DaSnwWKDMl5oXBNfZYndh9IxyQtoX9E9yJ0w6iHJjkPt42yj',
}

function updateEnvFile(filePath) {
  if (!existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${filePath}`)
    return false
  }
  
  let content = readFileSync(filePath, 'utf-8')
  let updated = false
  
  for (const [key, value] of Object.entries(newKeys)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`)
      updated = true
      console.log(`✅ 已更新 ${key} 在 ${filePath}`)
    } else {
      // 如果不存在，添加到文件末尾
      content += `\n${key}=${value}\n`
      updated = true
      console.log(`✅ 已添加 ${key} 到 ${filePath}`)
    }
  }
  
  if (updated) {
    writeFileSync(filePath, content, 'utf-8')
    return true
  }
  
  return false
}

console.log('🔄 更新Hailuo API Key...\n')

let updated1 = updateEnvFile(envPath)
let updated2 = updateEnvFile(serverEnvPath)

if (updated1 || updated2) {
  console.log('\n✅ API Key更新完成!')
} else {
  console.log('\n⚠️  未找到需要更新的文件')
}


