/**
 * 检查火山引擎API配置
 * 用于验证 VOLCENGINE_AK 和 VOLCENGINE_SK 是否正确配置
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '.env')

if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log('✅ 已加载 .env 文件:', envPath)
} else {
  console.warn('⚠️  未找到 .env 文件:', envPath)
}

// 检查环境变量
const VOLCENGINE_AK = process.env.VOLCENGINE_AK || process.env.VOLCENGINE_ACCESS_KEY || process.env.VOLC_ACCESSKEY
const VOLCENGINE_SK = process.env.VOLCENGINE_SK || process.env.VOLCENGINE_SECRET_KEY || process.env.VOLC_SECRETKEY
const VOLCENGINE_API_HOST = process.env.VOLCENGINE_API_HOST || 'https://visual.volcengineapi.com'

console.log('\n==========================================')
console.log('火山引擎API配置检查')
console.log('==========================================\n')

console.log('环境变量检查:')
console.log('  VOLCENGINE_AK:', VOLCENGINE_AK ? `${VOLCENGINE_AK.substring(0, 10)}...${VOLCENGINE_AK.substring(VOLCENGINE_AK.length - 4)}` : '❌ 未设置')
console.log('  VOLCENGINE_SK:', VOLCENGINE_SK ? `${VOLCENGINE_SK.substring(0, 10)}...${VOLCENGINE_SK.substring(VOLCENGINE_SK.length - 4)}` : '❌ 未设置')
console.log('  VOLCENGINE_API_HOST:', VOLCENGINE_API_HOST)

console.log('\n兼容的环境变量名称:')
console.log('  VOLCENGINE_AK:', process.env.VOLCENGINE_AK ? '✅ 已设置' : '❌ 未设置')
console.log('  VOLCENGINE_ACCESS_KEY:', process.env.VOLCENGINE_ACCESS_KEY ? '✅ 已设置' : '❌ 未设置')
console.log('  VOLC_ACCESSKEY:', process.env.VOLC_ACCESSKEY ? '✅ 已设置' : '❌ 未设置')
console.log('  VOLCENGINE_SK:', process.env.VOLCENGINE_SK ? '✅ 已设置' : '❌ 未设置')
console.log('  VOLCENGINE_SECRET_KEY:', process.env.VOLCENGINE_SECRET_KEY ? '✅ 已设置' : '❌ 未设置')
console.log('  VOLC_SECRETKEY:', process.env.VOLC_SECRETKEY ? '✅ 已设置' : '❌ 未设置')

if (!VOLCENGINE_AK || !VOLCENGINE_SK) {
  console.log('\n❌ 错误: VOLCENGINE_AK 或 VOLCENGINE_SK 未设置')
  console.log('\n请在 server/.env 文件中添加以下配置:')
  console.log('VOLCENGINE_AK=your_volcengine_access_key_id_here')
  console.log('VOLCENGINE_SK=your_volcengine_secret_access_key_here')
  console.log('VOLCENGINE_API_HOST=https://visual.volcengineapi.com')
  console.log('\n获取方式:')
  console.log('1. 登录火山引擎控制台: https://console.volcengine.com/')
  console.log('2. 进入"访问控制" → "密钥管理"')
  console.log('3. 创建或查看 Access Key ID 和 Secret Access Key')
  console.log('4. 将密钥添加到 server/.env 文件中')
  process.exit(1)
}

// 验证格式（基本检查）
if (VOLCENGINE_AK.length < 10) {
  console.log('\n⚠️  警告: VOLCENGINE_AK 长度似乎不正确（通常应该更长）')
}

if (VOLCENGINE_SK.length < 10) {
  console.log('\n⚠️  警告: VOLCENGINE_SK 长度似乎不正确（通常应该更长）')
}

console.log('\n✅ 配置检查通过')
console.log('\n提示: 如果仍然遇到认证错误，请检查:')
console.log('1. AK/SK 是否正确（没有多余的空格或换行）')
console.log('2. AK/SK 是否已激活')
console.log('3. 账户是否有使用即梦AI-视频生成3.0 Pro的权限')
console.log('4. 账户余额是否充足')

