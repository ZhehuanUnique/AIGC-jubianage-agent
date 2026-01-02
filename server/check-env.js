// 检查环境变量配置
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '.env')

console.log('='.repeat(50))
console.log('环境变量检查工具')
console.log('='.repeat(50))
console.log()

// 检查文件是否存在
if (existsSync(envPath)) {
  console.log('✅ .env 文件存在:', envPath)
  console.log()
  
  // 读取文件内容（不包含敏感信息）
  const envContent = readFileSync(envPath, 'utf-8')
  const lines = envContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'))
  
  console.log('📄 .env 文件内容:')
  lines.forEach(line => {
    const [key] = line.split('=')
    if (key) {
      console.log(`  ${key.trim()}=${line.includes('=') ? '***已设置***' : '未设置'}`)
    }
  })
  console.log()
} else {
  console.log('❌ .env 文件不存在:', envPath)
  console.log()
  console.log('请创建 .env 文件，内容如下:')
  console.log('DASHSCOPE_API_KEY=sk-你的API密钥')
  console.log('QWEN_MODEL=qwen-plus')
  console.log('PORT=3002')
  console.log()
  process.exit(1)
}

// 加载环境变量
dotenv.config({ path: envPath })

// 检查关键变量
console.log('🔍 环境变量值检查:')
console.log()

const checks = [
  { key: 'DASHSCOPE_API_KEY', required: true },
  { key: 'QWEN_MODEL', required: false, default: 'qwen-plus' },
  { key: 'PORT', required: false, default: '3002' },
]

let hasError = false

checks.forEach(({ key, required, default: defaultValue }) => {
  const value = process.env[key]
  if (value) {
    if (key === 'DASHSCOPE_API_KEY') {
      console.log(`  ✅ ${key}: ${value.substring(0, 10)}...${value.substring(value.length - 4)}`)
    } else {
      console.log(`  ✅ ${key}: ${value}`)
    }
  } else {
    if (required) {
      console.log(`  ❌ ${key}: 未设置 (必需)`)
      hasError = true
    } else {
      console.log(`  ⚠️  ${key}: 未设置 (将使用默认值: ${defaultValue})`)
    }
  }
})

console.log()
console.log('='.repeat(50))

if (hasError) {
  console.log('❌ 配置检查失败，请修复上述问题')
  process.exit(1)
} else {
  console.log('✅ 配置检查通过，可以启动服务')
  process.exit(0)
}









