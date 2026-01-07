import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { uploadBuffer, generateCosKey } from './cosService.js'
import { pipeline } from 'stream/promises'
import { createWriteStream, unlinkSync, readFileSync } from 'fs'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

/**
 * Real-ESRGAN 超分辨率服务
 * 使用 Real-ESRGAN 进行图像和视频超分辨率
 * GitHub: https://github.com/xinntao/Real-ESRGAN
 * 
 * 安装要求：
 * 1. Python 3.8+
 * 2. pip install realesrgan
 * 3. 或者使用官方仓库: git clone https://github.com/xinntao/Real-ESRGAN.git
 */

// Real-ESRGAN Python脚本路径
const REALESRGAN_SCRIPT_PATH = process.env.REALESRGAN_SCRIPT_PATH || join(__dirname, '../../Real-ESRGAN/inference_realesrgan.py')
const REALESRGAN_MODEL_PATH = process.env.REALESRGAN_MODEL_PATH || join(__dirname, '../../Real-ESRGAN')

/**
 * 检查Real-ESRGAN环境是否配置
 * @returns {Promise<boolean>} 是否已配置
 */
async function checkRealESRGANEnvironment() {
  try {
    // 检查Python
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
    const { stdout } = await execAsync(`${pythonCmd} --version`, { timeout: 5000 })
    console.log('✅ Python版本:', stdout.trim())
    
    // 检查Real-ESRGAN是否安装（通过pip list或直接尝试导入）
    try {
      await execAsync(`${pythonCmd} -c "import realesrgan"`, { timeout: 5000 })
      console.log('✅ Real-ESRGAN已安装')
      return true
    } catch (importError) {
      // 如果pip安装的不可用，检查是否有脚本文件
      if (existsSync(REALESRGAN_SCRIPT_PATH)) {
        console.log('✅ Real-ESRGAN脚本存在:', REALESRGAN_SCRIPT_PATH)
        return true
      }
      console.warn('⚠️ Real-ESRGAN未安装，请运行: pip install realesrgan')
      return false
    }
  } catch (error) {
    console.error('❌ Real-ESRGAN环境检查失败:', error.message)
    return false
  }
}

/**
 * 获取视频分辨率
 * @param {string} videoPath - 视频文件路径
 * @returns {Promise<{width: number, height: number}>} 视频分辨率
 */
async function getVideoResolution(videoPath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of default=noprint_wrappers=1 "${videoPath}"`,
      { timeout: 10000 }
    )
    const widthMatch = stdout.match(/width=(\d+)/)
    const heightMatch = stdout.match(/height=(\d+)/)
    if (widthMatch && heightMatch) {
      return {
        width: parseInt(widthMatch[1]),
        height: parseInt(heightMatch[1])
      }
    }
  } catch (error) {
    console.warn('⚠️ 无法获取视频分辨率:', error.message)
  }
  return { width: 1280, height: 720 } // 默认720p
}

/**
 * 使用Real-ESRGAN进行视频超分辨率
 * @param {string} inputVideoUrl - 输入视频URL
 * @param {Object} options - 超分辨率选项
 * @param {number} options.scale - 放大倍数（2或4），默认2
 * @param {string} options.model - 模型名称，默认 'realesrgan-x4plus' (2x/4x通用) 或 'RealESRGAN_x4plus'
 * @param {number} options.tileSize - 分块大小（用于处理大视频），默认0（自动）
 * @param {number} options.tilePad - 分块填充，默认10
 * @returns {Promise<Object>} 返回处理后的视频URL和COS key
 */
export async function upscaleVideoWithRealESRGAN(inputVideoUrl, options = {}) {
  const {
    scale = 2, // 默认2倍放大
    model = 'RealESRGAN_x4plus', // 支持2x和4x的模型
    tileSize = 0, // 0表示自动
    tilePad = 10,
  } = options

  // 检查环境
  const envOk = await checkRealESRGANEnvironment()
  if (!envOk) {
    throw new Error('Real-ESRGAN环境未配置，请先安装Real-ESRGAN。参考: https://github.com/xinntao/Real-ESRGAN')
  }

  // 验证scale参数
  if (![2, 4].includes(scale)) {
    throw new Error('scale参数必须是2或4')
  }

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
  const tempDir = join(tmpdir(), `realesrgan_${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })

  let inputVideoPath = null
  let outputVideoPath = null

  try {
    console.log('🎬 开始Real-ESRGAN超分辨率处理...')
    console.log('   输入视频:', inputVideoUrl)
    console.log('   放大倍数:', scale)
    console.log('   模型:', model)

    // 步骤1: 下载输入视频到临时目录
    console.log('📥 下载输入视频...')
    inputVideoPath = join(tempDir, 'input.mp4')
    const response = await fetch(inputVideoUrl)
    if (!response.ok) {
      throw new Error(`下载视频失败: HTTP ${response.status}`)
    }
    
    const fileStream = createWriteStream(inputVideoPath)
    await pipeline(response.body, fileStream)
    console.log('✅ 视频下载完成')

    // 获取原视频分辨率
    const sourceResolution = await getVideoResolution(inputVideoPath)
    console.log(`   原视频分辨率: ${sourceResolution.width}x${sourceResolution.height}`)
    console.log(`   目标分辨率: ${sourceResolution.width * scale}x${sourceResolution.height * scale}`)

    // 步骤2: 使用Real-ESRGAN进行超分辨率
    console.log('🔄 开始超分辨率处理...')
    outputVideoPath = join(tempDir, 'output.mp4')
    
    // 构建Real-ESRGAN命令
    // 使用realesrgan命令行工具（如果通过pip安装）
    // 或者使用官方脚本
    let command
    
    // 尝试使用realesrgan命令行工具（pip安装版本）
    try {
      await execAsync(`${pythonCmd} -c "import realesrgan"`, { timeout: 2000 })
      // 使用realesrgan命令行工具
      command = [
        pythonCmd,
        '-m', 'realesrgan',
        '-i', `"${inputVideoPath}"`,
        '-o', `"${outputVideoPath}"`,
        '-s', scale.toString(),
        '-n', model,
      ]
      if (tileSize > 0) {
        command.push('--tile', tileSize.toString())
        command.push('--tile_pad', tilePad.toString())
      }
      command = command.join(' ')
    } catch (e) {
      // 如果pip版本不可用，使用官方脚本
      if (existsSync(REALESRGAN_SCRIPT_PATH)) {
        command = [
          pythonCmd,
          `"${REALESRGAN_SCRIPT_PATH}"`,
          '-i', `"${inputVideoPath}"`,
          '-o', `"${outputVideoPath}"`,
          '-s', scale.toString(),
          '-n', model,
        ]
        if (tileSize > 0) {
          command.push('--tile', tileSize.toString())
          command.push('--tile_pad', tilePad.toString())
        }
        command = command.join(' ')
      } else {
        throw new Error('Real-ESRGAN未正确安装，请参考: https://github.com/xinntao/Real-ESRGAN')
      }
    }

    console.log('📤 执行Real-ESRGAN命令:', command)

    const { stdout, stderr } = await execAsync(command, {
      timeout: 1800000, // 30分钟超时（超分辨率可能需要较长时间）
      maxBuffer: 50 * 1024 * 1024, // 50MB缓冲区
    })

    if (stdout) {
      console.log('📄 Real-ESRGAN输出:', stdout)
    }
    if (stderr) {
      console.warn('⚠️ Real-ESRGAN警告:', stderr)
    }

    // 检查输出文件是否存在
    if (!existsSync(outputVideoPath)) {
      throw new Error('Real-ESRGAN处理失败：未生成输出文件')
    }

    console.log('✅ 超分辨率处理完成')

    // 步骤3: 上传处理后的视频到COS
    console.log('📤 上传处理后的视频到COS...')
    const outputVideoBuffer = readFileSync(outputVideoPath)
    const cosKey = generateCosKey('video', 'mp4')
    
    const uploadResult = await uploadBuffer(outputVideoBuffer, cosKey, 'video/mp4')
    console.log('✅ 视频上传完成:', uploadResult.url)

    return {
      success: true,
      videoUrl: uploadResult.url,
      cosKey: cosKey,
      scale: scale,
      sourceResolution: sourceResolution,
      targetResolution: {
        width: sourceResolution.width * scale,
        height: sourceResolution.height * scale
      },
      model: model,
    }
  } catch (error) {
    console.error('❌ Real-ESRGAN超分辨率失败:', error)
    throw new Error(`Real-ESRGAN超分辨率失败: ${error.message}`)
  } finally {
    // 清理临时文件
    try {
      if (inputVideoPath && existsSync(inputVideoPath)) {
        unlinkSync(inputVideoPath)
      }
      if (outputVideoPath && existsSync(outputVideoPath)) {
        unlinkSync(outputVideoPath)
      }
    } catch (cleanupError) {
      console.warn('⚠️ 清理临时文件失败:', cleanupError.message)
    }
  }
}

/**
 * 使用Real-ESRGAN进行图像超分辨率
 * @param {string} inputImageUrl - 输入图像URL
 * @param {Object} options - 超分辨率选项
 * @param {number} options.scale - 放大倍数（2或4），默认2
 * @param {string} options.model - 模型名称，默认 'RealESRGAN_x4plus'
 * @returns {Promise<Object>} 返回处理后的图像URL和COS key
 */
export async function upscaleImageWithRealESRGAN(inputImageUrl, options = {}) {
  const {
    scale = 2,
    model = 'RealESRGAN_x4plus',
  } = options

  // 检查环境
  const envOk = await checkRealESRGANEnvironment()
  if (!envOk) {
    throw new Error('Real-ESRGAN环境未配置，请先安装Real-ESRGAN。参考: https://github.com/xinntao/Real-ESRGAN')
  }

  if (![2, 4].includes(scale)) {
    throw new Error('scale参数必须是2或4')
  }

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
  const tempDir = join(tmpdir(), `realesrgan_image_${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })

  let inputImagePath = null
  let outputImagePath = null

  try {
    console.log('🖼️ 开始Real-ESRGAN图像超分辨率处理...')
    console.log('   输入图像:', inputImageUrl)
    console.log('   放大倍数:', scale)
    console.log('   模型:', model)

    // 下载输入图像
    console.log('📥 下载输入图像...')
    inputImagePath = join(tempDir, 'input.jpg')
    const response = await fetch(inputImageUrl)
    if (!response.ok) {
      throw new Error(`下载图像失败: HTTP ${response.status}`)
    }
    
    const fileStream = createWriteStream(inputImagePath)
    await pipeline(response.body, fileStream)
    console.log('✅ 图像下载完成')

    // 使用Real-ESRGAN处理图像
    console.log('🔄 开始超分辨率处理...')
    outputImagePath = join(tempDir, 'output.jpg')
    
    let command
    try {
      await execAsync(`${pythonCmd} -c "import realesrgan"`, { timeout: 2000 })
      command = [
        pythonCmd,
        '-m', 'realesrgan',
        '-i', `"${inputImagePath}"`,
        '-o', `"${outputImagePath}"`,
        '-s', scale.toString(),
        '-n', model,
      ].join(' ')
    } catch (e) {
      if (existsSync(REALESRGAN_SCRIPT_PATH)) {
        command = [
          pythonCmd,
          `"${REALESRGAN_SCRIPT_PATH}"`,
          '-i', `"${inputImagePath}"`,
          '-o', `"${outputImagePath}"`,
          '-s', scale.toString(),
          '-n', model,
        ].join(' ')
      } else {
        throw new Error('Real-ESRGAN未正确安装')
      }
    }

    console.log('📤 执行Real-ESRGAN命令:', command)

    const { stdout, stderr } = await execAsync(command, {
      timeout: 600000, // 10分钟超时
      maxBuffer: 50 * 1024 * 1024,
    })

    if (stdout) {
      console.log('📄 Real-ESRGAN输出:', stdout)
    }
    if (stderr) {
      console.warn('⚠️ Real-ESRGAN警告:', stderr)
    }

    if (!existsSync(outputImagePath)) {
      throw new Error('Real-ESRGAN处理失败：未生成输出文件')
    }

    console.log('✅ 超分辨率处理完成')

    // 上传到COS
    console.log('📤 上传处理后的图像到COS...')
    const outputImageBuffer = readFileSync(outputImagePath)
    const cosKey = generateCosKey('image', 'jpg')
    
    const uploadResult = await uploadBuffer(outputImageBuffer, cosKey, 'image/jpeg')
    console.log('✅ 图像上传完成:', uploadResult.url)

    return {
      success: true,
      imageUrl: uploadResult.url,
      cosKey: cosKey,
      scale: scale,
      model: model,
    }
  } catch (error) {
    console.error('❌ Real-ESRGAN图像超分辨率失败:', error)
    throw new Error(`Real-ESRGAN图像超分辨率失败: ${error.message}`)
  } finally {
    try {
      if (inputImagePath && existsSync(inputImagePath)) {
        unlinkSync(inputImagePath)
      }
      if (outputImagePath && existsSync(outputImagePath)) {
        unlinkSync(outputImagePath)
      }
    } catch (cleanupError) {
      console.warn('⚠️ 清理临时文件失败:', cleanupError.message)
    }
  }
}

