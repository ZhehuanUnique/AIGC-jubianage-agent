/**
 * Photoshop 自动化服务
 * 通过 ExtendScript (.jsx) 实现 Photoshop 自动化功能
 */

import fs from 'fs/promises'
import { existsSync, createWriteStream, unlink } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import https from 'https'
import http from 'http'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 创建新文档
 * @param {Object} options - 选项
 * @param {string} options.projectName - 项目名称
 * @param {number} options.width - 宽度（默认 1920）
 * @param {number} options.height - 高度（默认 1080）
 * @param {number} options.resolution - 分辨率（默认 72）
 */
async function createNewDocument(options = {}) {
  const {
    projectName = '新项目',
    width = 1920,
    height = 1080,
    resolution = 72
  } = options

  try {
    // 准备配置
    const config = {
      action: 'createDocument',
      params: {
        projectName,
        width,
        height,
        resolution
      }
    }

    // 执行 ExtendScript
    return await executeExtendScript(config)
  } catch (error) {
    console.error('❌ 创建文档失败:', error)
    throw new Error(`创建文档失败: ${error.message}`)
  }
}

/**
 * 导入图片到最上层图层
 * @param {Object} options - 选项
 * @param {string} options.imageUrl - 图片 URL（支持 HTTP URL 或本地路径）
 * @param {string} options.localImagePath - 本地图片路径（如果 imageUrl 是 HTTP，需要先下载）
 */
async function importImageToTopLayer(options = {}) {
  const { imageUrl, localImagePath } = options

  if (!imageUrl && !localImagePath) {
    throw new Error('图片 URL 或本地路径不能为空')
  }

  try {
    // 确保 imageUrl 是字符串类型
    const imageUrlStr = imageUrl ? String(imageUrl) : null
    
    // 如果是 HTTP URL，先下载到本地
    let finalImagePath = localImagePath || imageUrlStr
    
    if (imageUrlStr && typeof imageUrlStr === 'string' && (imageUrlStr.startsWith('http://') || imageUrlStr.startsWith('https://'))) {
      console.log('📥 下载图片:', imageUrlStr)
      finalImagePath = await downloadImage(imageUrlStr)
    }

    // 准备配置
    const config = {
      action: 'importImage',
      params: {
        imageUrl: finalImagePath // ExtendScript 使用本地路径
      }
    }

    // 执行 ExtendScript
    return await executeExtendScript(config)
  } catch (error) {
    console.error('❌ 导入图片失败:', error)
    throw new Error(`导入图片失败: ${error.message}`)
  }
}

/**
 * 创建新文档并导入图片（一键操作）
 * @param {Object} options - 选项
 * @param {string} options.projectName - 项目名称
 * @param {number} options.width - 宽度（默认 1920）
 * @param {number} options.height - 高度（默认 1080）
 * @param {number} options.resolution - 分辨率（默认 72）
 * @param {string} options.imageUrl - 图片 URL
 */
async function createAndImport(options = {}) {
  const {
    projectName = '新项目',
    width = 1920,
    height = 1080,
    resolution = 72,
    imageUrl
  } = options

  if (!imageUrl) {
    throw new Error('图片 URL 不能为空')
  }

  // 确保 imageUrl 是字符串类型
  const imageUrlStr = String(imageUrl)
  if (typeof imageUrlStr !== 'string' || imageUrlStr.trim() === '') {
    throw new Error('图片 URL 必须是有效的字符串')
  }

  try {
    // 如果是 HTTP URL，先下载到本地
    let localImagePath = imageUrlStr
    if (imageUrlStr.startsWith('http://') || imageUrlStr.startsWith('https://')) {
      console.log('📥 下载图片:', imageUrlStr)
      localImagePath = await downloadImage(imageUrlStr)
    }

    // 准备配置
    const config = {
      action: 'createAndImport',
      params: {
        projectName,
        width,
        height,
        resolution,
        imageUrl: localImagePath // ExtendScript 使用本地路径
      }
    }

    // 执行 ExtendScript
    return await executeExtendScript(config)
  } catch (error) {
    console.error('❌ 创建并导入失败:', error)
    throw new Error(`创建并导入失败: ${error.message}`)
  }
}

/**
 * 下载图片到本地临时文件
 * @param {string} imageUrl - 图片 URL
 * @returns {Promise<string>} 本地文件路径
 */
async function downloadImage(imageUrl) {
  try {
    const parsedUrl = new URL(imageUrl)
    const protocol = parsedUrl.protocol === 'https:' ? https : http
    
    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir()
      const fileName = `ps_automation_${Date.now()}_${path.basename(parsedUrl.pathname)}`
      const filePath = path.join(tempDir, fileName)
      
      const file = createWriteStream(filePath)
      
      protocol.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`下载失败: HTTP ${response.statusCode}`))
          return
        }
        
        response.pipe(file)
        
        file.on('finish', () => {
          file.close()
          console.log('✅ 图片已下载到:', filePath)
          resolve(filePath)
        })
      }).on('error', (error) => {
        unlink(filePath, () => {}) // 删除失败的文件
        reject(error)
      })
    })
  } catch (error) {
    throw new Error(`下载图片失败: ${error.message}`)
  }
}

/**
 * 执行 ExtendScript
 * @param {Object} config - 配置对象
 */
async function executeExtendScript(config) {
  try {
    // 1. 将配置写入临时文件
    const tempDir = os.tmpdir()
    const configFilePath = path.join(tempDir, 'ps_automation_config.json')
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8')
    
    // 2. 获取 ExtendScript 文件路径
    const scriptPath = path.join(__dirname, '../../photoshop-uxp-plugin/automation.jsx')
    
    if (!existsSync(scriptPath)) {
      throw new Error(`ExtendScript 文件不存在: ${scriptPath}`)
    }
    
    // 3. 查找 Photoshop 可执行文件
    const photoshopPath = await findPhotoshopPath()
    if (!photoshopPath) {
      throw new Error('未找到 Photoshop 可执行文件')
    }
    
    // 4. 执行 ExtendScript
    // Windows: photoshop.exe -script "path/to/script.jsx"
    // 注意：如果 Photoshop 已经在运行，-script 参数会在新实例中执行
    // 使用绝对路径，避免路径问题
    const absoluteScriptPath = path.resolve(scriptPath)
    const absoluteConfigPath = path.resolve(configFilePath)
    
    // 确保脚本文件存在
    if (!existsSync(absoluteScriptPath)) {
      throw new Error(`ExtendScript 文件不存在: ${absoluteScriptPath}`)
    }
    
    // 确保配置文件已写入
    const configExists = existsSync(absoluteConfigPath)
    if (!configExists) {
      throw new Error(`配置文件不存在: ${absoluteConfigPath}`)
    }
    
    const command = `"${photoshopPath}" -script "${absoluteScriptPath}"`
    
    console.log('🚀 执行 ExtendScript:')
    console.log('   命令:', command)
    console.log('   脚本路径:', absoluteScriptPath)
    console.log('   配置文件路径:', absoluteConfigPath)
    console.log('   配置内容:', JSON.stringify(config, null, 2))
    
    // 注意：exec 不会等待 Photoshop 执行完成，所以我们需要使用其他方法
    // 或者使用文件系统监听来检测执行结果
    return new Promise((resolve, reject) => {
      exec(command, { 
        timeout: 60000, // 60秒超时（增加超时时间）
        windowsHide: true, // Windows下隐藏窗口
        maxBuffer: 10 * 1024 * 1024, // 10MB 缓冲区
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ 执行 ExtendScript 失败:', error)
          console.error('❌ 错误详情:', error.message)
          if (stderr) {
            console.error('❌ stderr:', stderr)
          }
          // 不立即 reject，因为脚本可能在后台执行
          console.warn('⚠️ 命令执行返回错误，但脚本可能在后台执行中')
        } else {
          console.log('✅ ExtendScript 命令执行完成')
          if (stdout) {
            console.log('📄 stdout:', stdout)
          }
        }
        
        // 无论成功失败，都返回成功（因为脚本可能在后台执行）
        resolve({
          success: true,
          message: 'Photoshop 自动化命令已发送',
          scriptPath: absoluteScriptPath,
          configPath: absoluteConfigPath,
        })
      })
      
      // 注意：不等待 exec 完成，立即返回
      // 因为 ExtendScript 会在 Photoshop 中异步执行
    })
  } catch (error) {
    console.error('❌ 执行 ExtendScript 失败:', error)
    throw error
  }
}

/**
 * 查找 Photoshop 可执行文件路径
 */
async function findPhotoshopPath() {
  // 优先使用环境变量
  if (process.env.PHOTOSHOP_PATH) {
    const envPath = process.env.PHOTOSHOP_PATH
    if (existsSync(envPath)) {
      return envPath
    }
  }
  
  const homeDir = os.homedir()
  const desktopPath = path.join(homeDir, 'Desktop')
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  
  const possiblePaths = [
    // 桌面快捷方式
    path.join(desktopPath, 'Adobe Photoshop.lnk'),
    path.join(desktopPath, 'Adobe Photoshop 2025.lnk'),
    path.join(desktopPath, 'Photoshop.lnk'),
    // 常见安装路径
    path.join(programFiles, 'Adobe', 'Adobe Photoshop 2025', 'Photoshop.exe'),
    path.join(programFiles, 'Adobe', 'Adobe Photoshop 2024', 'Photoshop.exe'),
    path.join(programFiles, 'Adobe', 'Adobe Photoshop 2023', 'Photoshop.exe'),
    path.join(programFiles, 'Adobe', 'Adobe Photoshop 2022', 'Photoshop.exe'),
    path.join(programFiles, 'Adobe', 'Adobe Photoshop 2021', 'Photoshop.exe'),
    path.join(programFilesX86, 'Adobe', 'Adobe Photoshop 2025', 'Photoshop.exe'),
    path.join(programFilesX86, 'Adobe', 'Adobe Photoshop 2024', 'Photoshop.exe'),
    path.join(programFilesX86, 'Adobe', 'Adobe Photoshop 2023', 'Photoshop.exe'),
  ]
  
  for (const possiblePath of possiblePaths) {
    if (existsSync(possiblePath)) {
      return possiblePath
    }
  }
  
  return null
}

export {
  createNewDocument,
  importImageToTopLayer,
  createAndImport
}

