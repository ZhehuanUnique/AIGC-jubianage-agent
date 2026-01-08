import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { uploadBuffer, generateCosKey } from './cosService.js'
import { pipeline } from 'stream/promises'
import { createWriteStream, unlinkSync } from 'fs'
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
 * RIFE 视频补帧服务
 * 使用 RIFE (Real-Time Intermediate Flow Estimation) 进行视频补帧
 * GitHub: https://github.com/hzwer/RIFE
 * 
 * 安装要求：
 * 1. Python 3.8+
 * 2. pip install -r requirements.txt (从RIFE项目)
 * 3. 下载RIFE模型文件
 */

// RIFE Python脚本路径（需要从GitHub下载或自己实现）
const RIFE_SCRIPT_PATH = process.env.RIFE_SCRIPT_PATH || join(__dirname, '../../rife/inference_video.py')
const RIFE_MODEL_PATH = process.env.RIFE_MODEL_PATH || join(__dirname, '../../rife/train_log')

/**
 * 检查RIFE环境是否配置
 * @returns {Promise<boolean>} 是否已配置
 */
async function checkRifeEnvironment() {
  try {
    // 检查Python
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
    const { stdout } = await execAsync(`${pythonCmd} --version`, { timeout: 5000 })
    console.log('✅ Python版本:', stdout.trim())
    
    // 检查RIFE脚本是否存在
    if (!existsSync(RIFE_SCRIPT_PATH)) {
      console.warn('⚠️ RIFE脚本不存在:', RIFE_SCRIPT_PATH)
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ RIFE环境检查失败:', error.message)
    return false
  }
}

/**
 * 获取视频帧率
 * @param {string} videoPath - 视频文件路径
 * @returns {Promise<number>} 视频帧率（FPS）
 */
async function getVideoFrameRate(videoPath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { timeout: 10000 }
    )
    // 输出格式通常是 "30/1" 或 "30000/1001"
    const match = stdout.trim().match(/(\d+)\/(\d+)/)
    if (match) {
      const numerator = parseFloat(match[1])
      const denominator = parseFloat(match[2])
      return denominator > 0 ? numerator / denominator : 24 // 默认24fps
    }
  } catch (error) {
    console.warn('⚠️ 无法获取视频帧率，使用默认值24fps:', error.message)
  }
  return 24 // 默认24fps
}

/**
 * 使用RIFE进行视频补帧
 * @param {string} inputVideoUrl - 输入视频URL
 * @param {Object} options - 补帧选项
 * @param {number} options.multiplier - 补帧倍数（2, 4, 8等），如果提供了targetFps则忽略此参数
 * @param {number} options.targetFps - 目标帧率（如30或60），如果提供则自动计算multiplier
 * @param {string} options.model - RIFE模型版本，默认 '4.6'
 * @param {boolean} options.uhd - 是否使用UHD模式（更高质量），默认 false
 * @returns {Promise<Object>} 返回处理后的视频URL和COS key
 */
export async function interpolateVideoWithRife(inputVideoUrl, options = {}) {
  const {
    multiplier: providedMultiplier,
    targetFps,
    model = '4.6', // RIFE模型版本
    uhd = false, // 是否使用UHD模式
  } = options

  // 检查环境
  const envOk = await checkRifeEnvironment()
  if (!envOk) {
    throw new Error('RIFE环境未配置，请先安装RIFE。参考: https://github.com/hzwer/RIFE')
  }

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
  const tempDir = join(tmpdir(), `rife_${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })

  let inputVideoPath = null
  let outputVideoPath = null

  try {
    console.log('🎬 开始RIFE补帧处理...')
    console.log('   输入视频:', inputVideoUrl)
    console.log('   补帧倍数:', multiplier)
    console.log('   模型版本:', model)

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

    // 步骤1.5: 计算补帧倍数
    let multiplier = providedMultiplier || 2
    if (targetFps) {
      // 如果提供了目标帧率，先获取原视频帧率
      const sourceFps = await getVideoFrameRate(inputVideoPath)
      console.log(`   原视频帧率: ${sourceFps.toFixed(2)} FPS`)
      console.log(`   目标帧率: ${targetFps} FPS`)
      
      // 计算需要的倍数（向上取整到最近的2的幂次）
      const ratio = targetFps / sourceFps
      if (ratio <= 1) {
        throw new Error(`目标帧率(${targetFps} FPS)必须大于原视频帧率(${sourceFps.toFixed(2)} FPS)`)
      }
      
      // RIFE支持2的幂次倍数（2, 4, 8等），选择最接近的
      multiplier = Math.pow(2, Math.ceil(Math.log2(ratio)))
      console.log(`   计算得到的补帧倍数: ${multiplier}x (实际输出约 ${(sourceFps * multiplier).toFixed(2)} FPS)`)
    }

    // 步骤2: 使用RIFE进行补帧
    console.log('🔄 开始补帧处理...')
    outputVideoPath = join(tempDir, 'output.mp4')
    
    // 构建RIFE命令
    // 注意：这里需要根据实际的RIFE脚本调整命令格式
    // RIFE的命令格式通常是: python inference_video.py --video input.mp4 --output output.mp4 --exp 2
    const rifeCommand = [
      pythonCmd,
      `"${RIFE_SCRIPT_PATH}"`,
      '--video', `"${inputVideoPath}"`,
      '--output', `"${outputVideoPath}"`,
      '--exp', multiplier.toString(), // 补帧倍数（2的幂次）
      '--model', model,
    ]
    
    if (uhd) {
      rifeCommand.push('--UHD')
    }

    const command = rifeCommand.join(' ')
    console.log('📤 执行RIFE命令:', command)

    const { stdout, stderr } = await execAsync(command, {
      timeout: 600000, // 10分钟超时（补帧可能需要较长时间）
      maxBuffer: 10 * 1024 * 1024, // 10MB缓冲区
    })

    if (stdout) {
      console.log('📄 RIFE输出:', stdout)
    }
    if (stderr) {
      console.warn('⚠️ RIFE警告:', stderr)
    }

    // 检查输出文件是否存在
    if (!existsSync(outputVideoPath)) {
      throw new Error('RIFE处理失败：未生成输出文件')
    }

    console.log('✅ 补帧处理完成')

    // 步骤3: 上传处理后的视频到COS
    console.log('📤 上传处理后的视频到COS...')
    const { readFileSync } = await import('fs')
    const outputVideoBuffer = readFileSync(outputVideoPath)
    const cosKey = generateCosKey('video', 'mp4')
    
    const uploadResult = await uploadBuffer(outputVideoBuffer, cosKey, 'video/mp4')
    console.log('✅ 视频上传完成:', uploadResult.url)

    return {
      success: true,
      videoUrl: uploadResult.url,
      cosKey: cosKey,
      multiplier: multiplier,
      targetFps: targetFps || null,
    }
  } catch (error) {
    console.error('❌ RIFE补帧失败:', error)
    throw new Error(`RIFE补帧失败: ${error.message}`)
  } finally {
    // 清理临时文件
    try {
      if (inputVideoPath && existsSync(inputVideoPath)) {
        unlinkSync(inputVideoPath)
      }
      if (outputVideoPath && existsSync(outputVideoPath)) {
        unlinkSync(outputVideoPath)
      }
      // 注意：不删除整个tempDir，因为可能还有其他文件
    } catch (cleanupError) {
      console.warn('⚠️ 清理临时文件失败:', cleanupError.message)
    }
  }
}

/**
 * 使用简化的RIFE实现（如果完整版不可用）
 * 可以使用ffmpeg + 简单的光流法补帧
 * @param {string} inputVideoUrl - 输入视频URL
 * @param {Object} options - 补帧选项
 * @param {number} options.multiplier - 补帧倍数，如果提供了targetFps则忽略此参数
 * @param {number} options.targetFps - 目标帧率（如30或60），如果提供则自动计算multiplier
 * @returns {Promise<Object>} 返回处理后的视频URL
 */
export async function interpolateVideoWithFfmpeg(inputVideoUrl, options = {}) {
  const { multiplier: providedMultiplier, targetFps } = options

  try {
    console.log('🎬 使用FFmpeg进行补帧...')
    
    // 检查ffmpeg是否可用
    try {
      await execAsync('ffmpeg -version', { timeout: 5000 })
    } catch (error) {
      throw new Error('FFmpeg未安装，请先安装FFmpeg')
    }

    const tempDir = join(tmpdir(), `ffmpeg_rife_${Date.now()}`)
    mkdirSync(tempDir, { recursive: true })

    const inputVideoPath = join(tempDir, 'input.mp4')
    const outputVideoPath = join(tempDir, 'output.mp4')

    // 下载视频
    console.log('📥 下载输入视频...')
    const response = await fetch(inputVideoUrl)
    if (!response.ok) {
      throw new Error(`下载视频失败: HTTP ${response.status}`)
    }
    
    const fileStream = createWriteStream(inputVideoPath)
    await pipeline(response.body, fileStream)
    console.log('✅ 视频下载完成')

    // 计算目标帧率
    let finalTargetFps = targetFps
    const sourceFps = await getVideoFrameRate(inputVideoPath)
    console.log(`   原视频帧率: ${sourceFps.toFixed(2)} FPS`)
    
    if (!finalTargetFps) {
      // 如果没有提供目标帧率，使用multiplier计算
      const multiplier = providedMultiplier || 2
      finalTargetFps = sourceFps * multiplier
      console.log(`   补帧倍数: ${multiplier}x`)
    } else {
      console.log(`   目标帧率: ${finalTargetFps} FPS`)
      if (finalTargetFps <= sourceFps) {
        throw new Error(`目标帧率(${finalTargetFps} FPS)必须大于原视频帧率(${sourceFps.toFixed(2)} FPS)`)
      }
    }
    
    console.log(`   输出帧率: ${finalTargetFps} FPS`)
    
    // 使用更快的补帧方法：blend模式的minterpolate或简单的帧复制
    // blend模式比mci模式快很多，虽然质量稍差但速度快10倍以上
    const ffmpegCommand = [
      'ffmpeg',
      '-i', `"${inputVideoPath}"`,
      '-filter_complex', `minterpolate=fps=${finalTargetFps}:mi_mode=blend`,
      '-c:v', 'libx264',
      '-preset', 'fast', // 使用fast预设加速编码
      '-crf', '23',
      '-c:a', 'aac', // 保留音频
      '-y', // 覆盖输出文件
      `"${outputVideoPath}"`,
    ].join(' ')

    console.log('📤 执行FFmpeg命令:', ffmpegCommand)
    const { stdout, stderr } = await execAsync(ffmpegCommand, {
      timeout: 1800000, // 30分钟超时（增加超时时间）
      maxBuffer: 50 * 1024 * 1024, // 50MB缓冲区
    })

    if (stderr) {
      console.log('📄 FFmpeg输出:', stderr.slice(-500)) // 只显示最后500字符
    }

    if (!existsSync(outputVideoPath)) {
      throw new Error('FFmpeg补帧失败：未生成输出文件')
    }

    // 上传到COS
    console.log('📤 上传处理后的视频到COS...')
    const { readFileSync } = await import('fs')
    const outputVideoBuffer = readFileSync(outputVideoPath)
    const cosKey = generateCosKey('video', 'mp4')
    
    const uploadResult = await uploadBuffer(outputVideoBuffer, cosKey, 'video/mp4')
    console.log('✅ 视频上传完成:', uploadResult.url)

    // 清理临时文件
    try {
      unlinkSync(inputVideoPath)
      unlinkSync(outputVideoPath)
    } catch (cleanupError) {
      console.warn('⚠️ 清理临时文件失败:', cleanupError.message)
    }

    return {
      success: true,
      videoUrl: uploadResult.url,
      cosKey: cosKey,
      multiplier: providedMultiplier || 2,
      targetFps: finalTargetFps,
      method: 'ffmpeg', // 标记使用的方法
    }
  } catch (error) {
    console.error('❌ FFmpeg补帧失败:', error)
    throw new Error(`FFmpeg补帧失败: ${error.message}`)
  }
}

