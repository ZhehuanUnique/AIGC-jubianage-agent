import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { analyzeScript } from './services/scriptAnalyzer.js'
import { parseDocx } from './utils/docxParser.js'
import { generateVideoFromImage, getVideoTaskStatus } from './services/imageToVideoService.js'
import { 
  generateReferenceVideoWithSeedance, 
  generateFirstLastFrameVideoWithSeedance 
} from './services/doubaoSeedanceService.js'
import { segmentScript } from './services/scriptSegmenter.js'
import { TaskRepository } from './db/taskRepository.js'
import { testConnection } from './db/connection.js'
import { generateImageWithNanoBanana, getNanoBananaTaskStatus } from './services/nanoBananaService.js'
import { generateImageWithMidjourney, getMidjourneyTaskStatus } from './services/midjourneyService.js'
import { generateImageWithFlux, getFluxTaskStatus } from './services/fluxService.js'
import { generateImageWithSeedream, getSeedreamTaskStatus } from './services/seedreamService.js'
import { generateVideoMotionPrompt } from './services/videoMotionPrompt/videoMotionPromptGenerator.js'
import { ragService } from './services/videoMotionPrompt/ragService.js'
import { ollamaService } from './services/videoMotionPrompt/ollamaService.js'
import { getModelInfo } from './services/videoMotionPrompt/config.js'
import { AuthService } from './services/authService.js'
import { UserService } from './services/userService.js'
import { authenticateToken } from './middleware/authMiddleware.js'
import { initDefaultUsers } from './db/initDefaultUsers.js'
import { SunoService } from './services/sunoService.js'
import { MusicGptService } from './services/musicGptService.js'
import { checkIndexTtsHealth, getVoices, generateSpeech, generateSpeechBatch } from './services/indexTtsService.js'
import { generateJianyingDraft } from './services/jianyingDraftService.js'
import { importVideosToJianying, createDraft, addVideosToDraft, saveDraft, getDraftFiles } from './services/jianyingAssistantService.js'
import { uploadMusicToCOS, saveMusicToDatabase, getUserMusicList, deleteMusic } from './services/musicStorageService.js'
import { listFiles } from './services/cosService.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
// 优先尝试加载根目录的 .env 文件（与 services 保持一致）
const rootEnvPath = join(__dirname, '../.env')
const serverEnvPath = join(__dirname, '.env')

if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath })
  console.log('✅ .env 文件已加载:', rootEnvPath)
} else if (existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath })
  console.log('✅ .env 文件已加载:', serverEnvPath)
} else {
  console.warn('⚠️  .env 文件不存在，尝试从默认位置加载')
  dotenv.config() // 尝试从默认位置加载
}

// 调试：检查环境变量是否加载
console.log('📋 环境变量检查:')
console.log('  PORT:', process.env.PORT || '未设置 (使用默认值 3002)')
console.log('  QWEN_MODEL:', process.env.QWEN_MODEL || '未设置 (使用默认值 qwen-plus)')
console.log('  DASHSCOPE_API_KEY:', process.env.DASHSCOPE_API_KEY ? `${process.env.DASHSCOPE_API_KEY.substring(0, 10)}...` : '❌ 未设置')
    console.log('  NANO_BANANA_API_KEY:', process.env.NANO_BANANA_API_KEY ? `${process.env.NANO_BANANA_API_KEY.substring(0, 10)}...` : '❌ 未设置')
    console.log('  NANO_BANANA_API_HOST:', process.env.NANO_BANANA_API_HOST || '使用默认值 (国内直连)')
    console.log('  MIDJOURNEY_API_KEY:', process.env.MIDJOURNEY_API_KEY ? `${process.env.MIDJOURNEY_API_KEY.substring(0, 10)}...` : '❌ 未设置')
    console.log('  MIDJOURNEY_API_HOST:', process.env.MIDJOURNEY_API_HOST || '使用默认值 (https://api.302.ai)')
console.log('  COS_SECRET_ID:', process.env.COS_SECRET_ID ? `${process.env.COS_SECRET_ID.substring(0, 10)}...` : '❌ 未设置')
console.log('  COS_SECRET_KEY:', process.env.COS_SECRET_KEY ? '***已设置***' : '❌ 未设置')
console.log('  COS_REGION:', process.env.COS_REGION || '未设置 (使用默认值 ap-guangzhou)')
console.log('  COS_BUCKET:', process.env.COS_BUCKET || '❌ 未设置')

const app = express()
const PORT = process.env.PORT || 3002

// 中间件 - CORS 配置
app.use(cors({
  origin: [
    'https://jubianai.cn',
    'https://www.jubianai.cn',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
// 增加 JSON 请求体大小限制（用于处理 base64 图片）
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 使用内存存储，直接上传到COS，不保存到本地
const memoryStorage = multer.memoryStorage()

// 配置文件上传 - docx文件
const uploadDocx = multer({
  storage: memoryStorage, // 使用内存存储，大文件直接上传到COS
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB - 移除文件大小限制，大文件直接上传到COS
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.originalname.endsWith('.docx')) {
      cb(null, true)
    } else {
      cb(new Error('只支持 .docx 文件格式'))
    }
  },
})

// 配置文件上传 - 图片文件
const uploadImage = multer({
  storage: memoryStorage, // 使用内存存储，大文件直接上传到COS
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB - 移除文件大小限制，大文件直接上传到COS
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只支持图片格式'))
    }
  },
})

// 配置文件上传 - 视频文件
const uploadVideo = multer({
  storage: memoryStorage, // 使用内存存储，大文件直接上传到COS
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB - 移除文件大小限制，大文件直接上传到COS
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('只支持视频格式'))
    }
  },
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' })
})

// API 健康检查（前端使用）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' })
})

// 剧本分析接口 - 文本输入
app.post('/api/analyze-script', async (req, res) => {
  try {
    const { scriptContent, scriptTitle, model, workStyle, workBackground } = req.body

    if (!scriptContent || scriptContent.trim().length === 0) {
      return res.status(400).json({ error: '剧本内容不能为空' })
    }

    console.log('📝 收到剧本分析请求，作品风格:', workStyle || '未指定', '作品背景:', workBackground || '未指定')

    // 分析剧本，使用指定的模型（默认 qwen-max）
    // 注意：analyzeScript 函数目前不接收 workStyle 和 workBackground，但我们可以记录日志
    const result = await analyzeScript(scriptContent, scriptTitle, model || 'qwen-max')

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('剧本分析错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '剧本分析失败，请稍后重试',
    })
  }
})

// 剧本分析接口 - 文件上传
app.post('/api/analyze-script-file', uploadDocx.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' })
    }

    // 解析docx文件（直接从内存Buffer读取）
    const scriptContent = await parseDocx(req.file.buffer)
    
    if (!scriptContent || scriptContent.trim().length === 0) {
      return res.status(400).json({ error: '文件内容为空或无法解析' })
    }

    // 分析剧本，使用 qwen-max 模型
    const model = req.body.model || 'qwen-max'
    const workStyle = req.body.workStyle
    const workBackground = req.body.workBackground
    
    console.log('📝 收到文件分析请求，作品风格:', workStyle || '未指定', '作品背景:', workBackground || '未指定')
    
    const result = await analyzeScript(scriptContent, req.file.originalname.replace('.docx', ''), model)

    res.json({
      success: true,
      data: {
        ...result,
        scriptContent, // 返回解析出的文本内容
      },
    })
  } catch (error) {
    console.error('文件分析错误:', error)
    
    // 清理上传的文件
    if (req.file) {
      // 使用内存存储，无需清理临时文件
    }

    res.status(500).json({
      success: false,
      error: error.message || '文件分析失败，请稍后重试',
    })
  }
})

// 剧本切分接口 - 将剧本切分为多个片段，并生成分镜提示词
app.post('/api/segment-script', async (req, res) => {
  try {
    const { 
      scriptContent, 
      scriptTitle, 
      model = 'qwen-max', 
      generatePrompts = true,
      workStyle = '真人电影风格',
      workBackground = '现代'
    } = req.body

    if (!scriptContent || scriptContent.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: '剧本内容不能为空' 
      })
    }

    console.log('📝 收到剧本切分请求，长度:', scriptContent.length, '字符')
    console.log('📝 使用模型:', model, '生成提示词:', generatePrompts)
    console.log('📝 作品风格:', workStyle, '作品背景:', workBackground)

    // 切分剧本并生成分镜提示词
    const segments = await segmentScript(scriptContent, scriptTitle, model, generatePrompts, workStyle, workBackground)

    res.json({
      success: true,
      data: {
        segments,
        totalShots: segments.length,
      },
    })
  } catch (error) {
    console.error('剧本切分错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '剧本切分失败，请稍后重试',
    })
  }
})

// 图生视频接口 - 图片上传生成视频
app.post('/api/generate-video', uploadImage.single('image'), async (req, res) => {
  try {
    const { model = 'doubao-seedance-1-5-pro-251215', resolution = '480p', duration = 5, text = '', ratio = 'adaptive', projectName } = req.body

    // 检查是否有上传的图片文件
    let imageUrl
    if (req.file) {
      // 直接从内存Buffer读取并转换为base64
      const imageBuffer = req.file.buffer
      const imageBase64 = imageBuffer.toString('base64')
      const imageMimeType = req.file.mimetype
      imageUrl = `data:${imageMimeType};base64,${imageBase64}`
    } else if (req.body.imageUrl) {
      // 使用提供的图片URL
      imageUrl = req.body.imageUrl
    } else {
      return res.status(400).json({ 
        success: false,
        error: '请上传图片或提供图片URL' 
      })
    }

    console.log('📹 收到图生视频请求:', {
      model,
      resolution,
      duration,
      hasImage: !!imageUrl,
      hasText: !!text,
      imageUrlType: imageUrl ? (imageUrl.startsWith('data:') ? 'base64' : imageUrl.startsWith('http') ? 'http' : 'unknown') : 'none',
      imageUrlPreview: imageUrl ? (imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : '')) : 'none',
    })

    // 如果没有提供文本提示词，且使用的是支持文本的模型，尝试自动生成
    let finalText = text
    if (!finalText && model === 'doubao-seedance-1-5-pro-251215' && req.body.autoGenerateMotionPrompt !== false) {
      try {
        // 尝试从请求中获取剧本上下文
        const scriptContext = req.body.scriptContext || ''
        const shotNumber = req.body.shotNumber || 1
        const scriptId = req.body.scriptId

        if (scriptContext) {
          console.log('🤖 自动生成视频运动提示词...')
          const motionResult = await generateVideoMotionPrompt({
            imageUrl,
            scriptContext,
            shotNumber,
            scriptId,
            characterInfo: req.body.characterInfo,
            sceneInfo: req.body.sceneInfo,
          })
          finalText = motionResult.motionPrompt
          console.log(`✅ 自动生成的视频运动提示词: ${finalText}`)
        }
      } catch (error) {
        console.warn('⚠️ 自动生成视频运动提示词失败，继续使用空提示词:', error.message)
        // 如果生成失败，继续使用空提示词
      }
    }

    // 调用图生视频API
    const result = await generateVideoFromImage(imageUrl, {
      model,
      resolution,
      duration: parseInt(duration),
      text: finalText, // 使用生成的或提供的文本提示词
      ratio, // 宽高比（用于 doubao-seedance-1-5-pro-251215）
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('图生视频错误:', error)
    
    // 清理上传的文件
    if (req.file) {
      // 使用内存存储，无需清理临时文件
    }

    res.status(500).json({
      success: false,
      error: error.message || '图生视频失败，请稍后重试',
    })
  }
})

// ==================== Seedance 参考生视频 API ====================
// 注意：参考生视频功能需要 doubao-seedance-1-0-lite-i2v-250428 模型，但该模型已不可用
app.post('/api/generate-reference-video', uploadImage.fields([
  { name: 'referenceImage', maxCount: 1 },
  { name: 'referenceVideo', maxCount: 1 }
]), async (req, res) => {
  try {
    const { text = '', resolution = '720p', ratio = '16:9', duration = 5 } = req.body

    // 检查参考图片
    let referenceImageUrl
    if (req.files && req.files.referenceImage && req.files.referenceImage[0]) {
      // 直接从内存Buffer读取
      const imageBuffer = req.files.referenceImage[0].buffer
      const imageBase64 = imageBuffer.toString('base64')
      const imageMimeType = req.files.referenceImage[0].mimetype
      referenceImageUrl = `data:${imageMimeType};base64,${imageBase64}`
      
      // 如果是 base64，需要先上传到 COS 转换为 HTTP URL
      if (referenceImageUrl.startsWith('data:image/')) {
        const { uploadBuffer, generateCosKey } = await import('./services/cosService.js')
        const base64Data = referenceImageUrl.split(',')[1]
        const mimeType = referenceImageUrl.match(/data:([^;]+)/)?.[1] || 'image/png'
        const imageBuffer = Buffer.from(base64Data, 'base64')
        const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' :
                    mimeType.includes('png') ? 'png' :
                    mimeType.includes('gif') ? 'gif' :
                    mimeType.includes('webp') ? 'webp' : 'jpg'
        const cosKey = generateCosKey('image', ext)
        const uploadResult = await uploadBuffer(imageBuffer, cosKey, mimeType)
        referenceImageUrl = uploadResult.url
      }
    } else if (req.body.referenceImageUrl) {
      referenceImageUrl = req.body.referenceImageUrl
    } else {
      return res.status(400).json({ 
        success: false,
        error: '请上传参考图片或提供参考图片URL' 
      })
    }

    // 检查参考视频
    let referenceVideoUrl
    if (req.files && req.files.referenceVideo && req.files.referenceVideo[0]) {
      // 视频文件需要上传到 COS（直接从内存Buffer读取）
      const { uploadBuffer, generateCosKey } = await import('./services/cosService.js')
      const videoBuffer = req.files.referenceVideo[0].buffer
      const videoMimeType = req.files.referenceVideo[0].mimetype
      const ext = videoMimeType.includes('mp4') ? 'mp4' :
                  videoMimeType.includes('webm') ? 'webm' :
                  videoMimeType.includes('mov') ? 'mov' : 'mp4'
      const cosKey = generateCosKey('video', ext)
      const uploadResult = await uploadBuffer(videoBuffer, cosKey, videoMimeType)
      referenceVideoUrl = uploadResult.url
    } else if (req.body.referenceVideoUrl) {
      referenceVideoUrl = req.body.referenceVideoUrl
    } else {
      return res.status(400).json({ 
        success: false,
        error: '请上传参考视频或提供参考视频URL' 
      })
    }

    console.log('📹 收到参考生视频请求:', {
      referenceImageUrl: referenceImageUrl.substring(0, 100) + (referenceImageUrl.length > 100 ? '...' : ''),
      referenceVideoUrl: referenceVideoUrl.substring(0, 100) + (referenceVideoUrl.length > 100 ? '...' : ''),
      resolution,
      ratio,
      duration,
      hasText: !!text,
    })

    // 调用参考生视频API
    const result = await generateReferenceVideoWithSeedance(referenceImageUrl, referenceVideoUrl, {
      text,
      resolution,
      ratio,
      duration: parseInt(duration),
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('参考生视频错误:', error)
    
    // 清理上传的文件
    if (req.files) {
      const fs = await import('fs')
      try {
        if (req.files.referenceImage && req.files.referenceImage[0]) {
          fs.unlinkSync(req.files.referenceImage[0].path)
        }
        if (req.files.referenceVideo && req.files.referenceVideo[0]) {
          fs.unlinkSync(req.files.referenceVideo[0].path)
        }
      } catch (e) {
        // 忽略删除错误
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || '参考生视频失败，请稍后重试',
    })
  }
})

// ==================== Seedance 首尾帧生视频 API ====================
// 支持模型：doubao-seedance-1-5-pro-251215
app.post('/api/generate-first-last-frame-video', uploadImage.fields([
  { name: 'firstFrame', maxCount: 1 },
  { name: 'lastFrame', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      model = 'volcengine-video-3.0-pro', 
      text = '', 
      resolution = '720p', 
      ratio = '16:9', 
      duration = 5 
    } = req.body

    // 检查首帧图片
    let firstFrameUrl
    if (req.files && req.files.firstFrame && req.files.firstFrame[0]) {
      // 直接从内存Buffer读取
      const imageBuffer = req.files.firstFrame[0].buffer
      const imageBase64 = imageBuffer.toString('base64')
      const imageMimeType = req.files.firstFrame[0].mimetype
      firstFrameUrl = `data:${imageMimeType};base64,${imageBase64}`
      
      // 如果是 base64，需要先上传到 COS 转换为 HTTP URL
      if (firstFrameUrl.startsWith('data:image/')) {
        const { uploadBuffer, generateCosKey } = await import('./services/cosService.js')
        const base64Data = firstFrameUrl.split(',')[1]
        const mimeType = firstFrameUrl.match(/data:([^;]+)/)?.[1] || 'image/png'
        const imageBuffer = Buffer.from(base64Data, 'base64')
        const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' :
                    mimeType.includes('png') ? 'png' :
                    mimeType.includes('gif') ? 'gif' :
                    mimeType.includes('webp') ? 'webp' : 'jpg'
        const cosKey = generateCosKey('image', ext)
        const uploadResult = await uploadBuffer(imageBuffer, cosKey, mimeType)
        firstFrameUrl = uploadResult.url
      }
    } else if (req.body.firstFrameUrl) {
      firstFrameUrl = req.body.firstFrameUrl
    } else {
      return res.status(400).json({ 
        success: false,
        error: '请上传首帧图片或提供首帧图片URL' 
      })
    }

    // 检查尾帧图片
    let lastFrameUrl
    if (req.files && req.files.lastFrame && req.files.lastFrame[0]) {
      // 直接从内存Buffer读取
      const imageBuffer = req.files.lastFrame[0].buffer
      const imageBase64 = imageBuffer.toString('base64')
      const imageMimeType = req.files.lastFrame[0].mimetype
      lastFrameUrl = `data:${imageMimeType};base64,${imageBase64}`
      
      // 如果是 base64，需要先上传到 COS 转换为 HTTP URL
      if (lastFrameUrl.startsWith('data:image/')) {
        const { uploadBuffer, generateCosKey } = await import('./services/cosService.js')
        const base64Data = lastFrameUrl.split(',')[1]
        const mimeType = lastFrameUrl.match(/data:([^;]+)/)?.[1] || 'image/png'
        const imageBuffer = Buffer.from(base64Data, 'base64')
        const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' :
                    mimeType.includes('png') ? 'png' :
                    mimeType.includes('gif') ? 'gif' :
                    mimeType.includes('webp') ? 'webp' : 'jpg'
        const cosKey = generateCosKey('image', ext)
        const uploadResult = await uploadBuffer(imageBuffer, cosKey, mimeType)
        lastFrameUrl = uploadResult.url
      }
    } else if (req.body.lastFrameUrl) {
      lastFrameUrl = req.body.lastFrameUrl
    } else {
      return res.status(400).json({ 
        success: false,
        error: '请上传尾帧图片或提供尾帧图片URL' 
      })
    }

    console.log('📹 收到首尾帧生视频请求:', {
      firstFrameUrl: firstFrameUrl.substring(0, 100) + (firstFrameUrl.length > 100 ? '...' : ''),
      lastFrameUrl: lastFrameUrl.substring(0, 100) + (lastFrameUrl.length > 100 ? '...' : ''),
      model,
      resolution,
      ratio,
      duration,
      hasText: !!text,
    })

    // 调用首尾帧生视频API
    const result = await generateFirstLastFrameVideoWithSeedance(firstFrameUrl, lastFrameUrl, {
      model,
      text,
      resolution,
      ratio,
      duration: parseInt(duration),
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('首尾帧生视频错误:', error)
    
    // 清理上传的文件
    if (req.files) {
      const fs = await import('fs')
      try {
        if (req.files.firstFrame && req.files.firstFrame[0]) {
          fs.unlinkSync(req.files.firstFrame[0].path)
        }
        if (req.files.lastFrame && req.files.lastFrame[0]) {
          fs.unlinkSync(req.files.lastFrame[0].path)
        }
      } catch (e) {
        // 忽略删除错误
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || '首尾帧生视频失败，请稍后重试',
    })
  }
})

// ==================== 首尾帧生视频 API（保存到项目文件夹）====================
// 生成首尾帧视频并保存到 projects/{projectId}/videos/
app.post('/api/first-last-frame-video/generate', authenticateToken, uploadImage.fields([
  { name: 'firstFrame', maxCount: 1 },
  { name: 'lastFrame', maxCount: 1 }
]), async (req, res) => {
  // 尾帧现在是可选的，如果没有尾帧，使用单首帧+提示词模式
  try {
    const userId = req.user?.id
    const { 
      projectId,
      model = 'volcengine-video-3.0-pro', 
      text = '', 
      resolution = '720p', 
      ratio = '16:9', 
      duration = 5 
    } = req.body

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: '项目ID不能为空'
      })
    }

    // 验证项目是否存在且属于当前用户
    const pool = await import('./db/connection.js')
    const db = pool.default
    const projectResult = await db.query(
      'SELECT id, name FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '项目不存在或无权限访问'
      })
    }

    const project = projectResult.rows[0]

    // 检查首帧图片
    let firstFrameUrl
    if (req.files && req.files.firstFrame && req.files.firstFrame[0]) {
      const { uploadBuffer } = await import('./services/cosService.js')
      const imageBuffer = req.files.firstFrame[0].buffer
      const mimeType = req.files.firstFrame[0].mimetype
      const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' :
                  mimeType.includes('png') ? 'png' :
                  mimeType.includes('gif') ? 'gif' :
                  mimeType.includes('webp') ? 'webp' : 'jpg'
      const cosKey = `projects/${projectId}/images/first_frame_${Date.now()}.${ext}`
      const uploadResult = await uploadBuffer(imageBuffer, cosKey, mimeType)
      firstFrameUrl = uploadResult.url
    } else {
      return res.status(400).json({ 
        success: false,
        error: '请上传首帧图片' 
      })
    }

    // 检查尾帧图片（可选）
    let lastFrameUrl
    const hasLastFrame = req.files && req.files.lastFrame && req.files.lastFrame[0]
    if (hasLastFrame) {
      const { uploadBuffer } = await import('./services/cosService.js')
      const imageBuffer = req.files.lastFrame[0].buffer
      const mimeType = req.files.lastFrame[0].mimetype
      const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' :
                  mimeType.includes('png') ? 'png' :
                  mimeType.includes('gif') ? 'gif' :
                  mimeType.includes('webp') ? 'webp' : 'jpg'
      const cosKey = `projects/${projectId}/images/last_frame_${Date.now()}.${ext}`
      const uploadResult = await uploadBuffer(imageBuffer, cosKey, mimeType)
      lastFrameUrl = uploadResult.url
    }

    // 根据模型选择不同的服务
    let result
    if (model === 'volcengine-video-3.0-pro' || model === 'doubao-seedance-3.0-pro') {
      // 使用火山引擎即梦AI-3.0 Pro
      console.log('📹 收到即梦AI-3.0 Pro生视频请求（保存到项目文件夹）:', {
        projectId,
        projectName: project.name,
        firstFrameUrl: firstFrameUrl.substring(0, 100) + '...',
        hasLastFrame,
        model,
        resolution,
        ratio,
        duration,
        hasText: !!text,
        mode: hasLastFrame ? 'first_last_frame' : 'single_frame',
      })

      // 火山引擎即梦AI-3.0 Pro目前只支持单首帧+提示词模式
      // 如果有尾帧，暂时忽略尾帧，只使用首帧
      if (hasLastFrame) {
        console.log('⚠️  火山引擎即梦AI-3.0 Pro暂不支持首尾帧模式，将使用首帧+提示词模式')
      }

      const { generateVideoWithVolcengine } = await import('./services/volcengineVideoService.js')
      result = await generateVideoWithVolcengine(firstFrameUrl, {
        model: 'volcengine-video-3.0-pro',
        text,
        resolution,
        ratio,
        duration: parseInt(duration),
        serviceTier: 'offline', // 使用离线推理，更稳定
        generateAudio: true,
      })
    } else {
      // 使用豆包 Seedance 服务（3.5 Pro等）
      if (hasLastFrame) {
        // 模式1: 首帧 + 尾帧 + 提示词
        console.log('📹 收到首尾帧生视频请求（保存到项目文件夹）:', {
          projectId,
          projectName: project.name,
          firstFrameUrl: firstFrameUrl.substring(0, 100) + '...',
          lastFrameUrl: lastFrameUrl.substring(0, 100) + '...',
          model,
          resolution,
          ratio,
          duration,
          hasText: !!text,
          mode: 'first_last_frame',
        })

        const { generateFirstLastFrameVideoWithSeedance } = await import('./services/doubaoSeedanceService.js')
        result = await generateFirstLastFrameVideoWithSeedance(firstFrameUrl, lastFrameUrl, {
          model,
          text,
          resolution,
          ratio,
          duration: parseInt(duration),
        })
      } else {
        // 模式2: 单首帧 + 提示词
        console.log('📹 收到单首帧生视频请求（保存到项目文件夹）:', {
          projectId,
          projectName: project.name,
          firstFrameUrl: firstFrameUrl.substring(0, 100) + '...',
          model,
          resolution,
          ratio,
          duration,
          hasText: !!text,
          mode: 'single_frame',
        })

        const { generateVideoWithSeedance } = await import('./services/doubaoSeedanceService.js')
        result = await generateVideoWithSeedance(firstFrameUrl, {
          model,
          text,
          resolution,
          ratio,
          duration: parseInt(duration),
          generateAudio: model === 'doubao-seedance-1-5-pro-251215', // 只有 1.5 Pro 支持音频
        })
      }
    }

    res.json({
      success: true,
      data: {
        taskId: result.taskId,
        status: result.status,
        message: result.message,
      },
    })
  } catch (error) {
    console.error('首尾帧生视频错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '首尾帧生视频失败，请稍后重试',
    })
  }
})

// 查询首尾帧生视频任务状态
app.get('/api/first-last-frame-video/status/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params
    const { model } = req.query // 从查询参数获取模型
    const userId = req.user?.id

    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: '任务ID不能为空'
      })
    }

    // 根据模型选择不同的状态查询服务
    let result
    if (model === 'volcengine-video-3.0-pro' || model === 'doubao-seedance-3.0-pro') {
      // 使用火山引擎即梦AI-3.0 Pro状态查询
      const { getVolcengineTaskStatus } = await import('./services/volcengineVideoService.js')
      result = await getVolcengineTaskStatus(taskId, 'volcengine-video-3.0-pro')
    } else {
      // 使用豆包 Seedance 状态查询
      const { getSeedanceTaskStatus } = await import('./services/doubaoSeedanceService.js')
      result = await getSeedanceTaskStatus(taskId)
    }

    // 如果视频生成完成，下载并保存到项目文件夹
    if (result.status === 'completed' && result.videoUrl) {
      try {
        const pool = await import('./db/connection.js')
        const db = pool.default

        // 从任务ID中提取项目ID（需要从请求参数或任务元数据中获取）
        // 这里我们通过查询最近的任务来获取项目ID
        // 更好的方式是前端在轮询时传递 projectId
        const { projectId } = req.query
        
        if (projectId) {
          // 验证项目权限
          const projectResult = await db.query(
            'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, userId]
          )

          if (projectResult.rows.length > 0) {
            // 下载视频
            const videoResponse = await fetch(result.videoUrl)
            if (!videoResponse.ok) {
              throw new Error('下载视频失败')
            }
            const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())

            // 保存到 projects/{projectId}/videos/
            const { uploadBuffer } = await import('./services/cosService.js')
            const timestamp = Date.now()
            const cosKey = `projects/${projectId}/videos/first_last_frame_${timestamp}.mp4`
            const uploadResult = await uploadBuffer(videoBuffer, cosKey, 'video/mp4')

            console.log(`✅ 视频已保存到项目文件夹: ${uploadResult.url}`)

            // 保存到 files 表，包含更多元数据
            const metadata = {
              task_id: taskId,
              source: 'first_last_frame_video',
              model: req.query.model || req.body.model || 'volcengine-video-3.0-pro',
              resolution: req.body.resolution || '720p',
              ratio: req.body.ratio || '16:9',
              duration: parseInt(req.body.duration) || 5,
              text: req.body.text || '',
              prompt: req.body.text || '',
              first_frame_url: null, // 状态查询时无法获取，已在生成时保存
              last_frame_url: null, // 状态查询时无法获取，已在生成时保存
            }
            await db.query(
              `INSERT INTO files (project_id, file_type, file_name, cos_key, cos_url, metadata)
               VALUES ($1, 'video', $2, $3, $4, $5)
               ON CONFLICT DO NOTHING`,
              [
                projectId,
                `first_last_frame_${timestamp}.mp4`,
                cosKey,
                uploadResult.url,
                JSON.stringify(metadata)
              ]
            )

            // 返回项目文件夹中的视频URL
            result.videoUrl = uploadResult.url
            
            // 计算并记录积分消耗（超级管理员不记录）
            try {
              // 检查是否为超级管理员
              const userResult = await db.query('SELECT username FROM users WHERE id = $1', [userId])
              const username = userResult.rows[0]?.username || 'unknown'
              const isSuperAdmin = username === 'Chiefavefan'
              
              // 超级管理员不记录积分和费用
              if (!isSuperAdmin) {
                const { calculateVideoGenerationCredit, calculateVolcengineCost } = await import('./services/creditService.js')
                const { logOperation } = await import('./services/authService.js')
              
              const model = req.query.model || req.body.model || 'volcengine-video-3.0-pro'
              const resolution = req.body.resolution || metadata.resolution || '720p'
              const duration = parseInt(req.body.duration) || metadata.duration || 5
              
              // 计算实际成本（元）
              let costInYuan = 0
              if (model === 'volcengine-video-3.0-pro' || model === 'doubao-seedance-3.0-pro') {
                costInYuan = calculateVolcengineCost(resolution, duration)
              }
              
              // 计算积分消耗
              const creditConsumed = calculateVideoGenerationCredit(model, resolution, duration, costInYuan > 0 ? costInYuan : null)
              
              if (creditConsumed > 0) {
                // 记录积分消耗到操作日志，同时保存真实成本到metadata
                await logOperation(
                  userId,
                  username,
                  'video_generation',
                  '首尾帧视频生成',
                  'video',
                  taskId,
                  creditConsumed,
                  'success',
                  null,
                  { model, resolution, duration, creditConsumed, costInYuan: costInYuan > 0 ? costInYuan : null }
                )
                
                console.log(`✅ 已记录积分消耗: ${creditConsumed} 积分 (模型: ${model}, 分辨率: ${resolution}, 时长: ${duration}秒, 实际成本: ${costInYuan > 0 ? costInYuan.toFixed(4) + '元' : '未知'})`)
              }
              } else {
                console.log(`ℹ️ 超级管理员 ${username} 使用模型，跳过积分和费用统计`)
              }
            } catch (creditError) {
              console.error('记录积分消耗失败（不影响主流程）:', creditError)
            }
          }
        }
      } catch (saveError) {
        console.error('保存视频到项目文件夹失败:', saveError)
        // 不阻止返回结果，使用原始URL
      }
    }

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('查询任务状态错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '查询任务状态失败，请稍后重试',
    })
  }
})

// 获取项目的首尾帧视频历史
app.get('/api/projects/:projectId/first-last-frame-videos', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 验证项目是否属于当前用户
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    
    if (projectCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '无权访问该项目',
      })
    }
    
    // 获取所有首尾帧视频（从files表中查找，metadata包含source='first_last_frame_video'）
    const videosResult = await db.query(
      `SELECT f.id, f.cos_url, f.file_name, f.created_at, f.metadata
       FROM files f
       WHERE f.project_id = $1 
         AND f.file_type = 'video'
         AND f.metadata->>'source' = 'first_last_frame_video'
       ORDER BY f.created_at DESC
       LIMIT 100`,
      [projectId]
    )
    
    // 格式化返回数据
    const videos = videosResult.rows.map((file) => {
      const metadata = file.metadata ? (typeof file.metadata === 'string' ? JSON.parse(file.metadata) : file.metadata) : {}
      return {
        id: file.id.toString(),
        taskId: metadata.task_id || file.id.toString(),
        videoUrl: file.cos_url,
        status: 'completed', // 已保存到files表的都是完成的
        firstFrameUrl: metadata.first_frame_url || null,
        lastFrameUrl: metadata.last_frame_url || null,
        model: metadata.model || 'doubao-seedance-1-5-pro-251215',
        resolution: metadata.resolution || '720p',
        ratio: metadata.ratio || '16:9',
        duration: metadata.duration || 5,
        text: metadata.text || metadata.prompt || null,
        createdAt: file.created_at,
      }
    })
    
    res.json({
      success: true,
      data: videos
    })
  } catch (error) {
    console.error('获取首尾帧视频历史失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取首尾帧视频历史失败'
    })
  }
})

// ==================== 视频运动提示词生成 API ====================

// 生成视频运动提示词
app.post('/api/generate-video-motion-prompt', async (req, res) => {
  try {
    const {
      imageUrl,
      scriptContext,
      shotNumber,
      scriptId,
      characterInfo,
      sceneInfo,
    } = req.body

    if (!imageUrl || !scriptContext) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：imageUrl 和 scriptContext',
      })
    }

    console.log('🎬 收到视频运动提示词生成请求:', {
      shotNumber: shotNumber || '未指定',
      scriptId: scriptId || '未指定',
      hasImageUrl: !!imageUrl,
      scriptContextLength: scriptContext.length,
    })

    const result = await generateVideoMotionPrompt({
      imageUrl,
      scriptContext,
      shotNumber: shotNumber || 1,
      scriptId,
      characterInfo,
      sceneInfo,
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('生成视频运动提示词错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '生成视频运动提示词失败',
    })
  }
})

// 检查 Ollama 服务状态
app.get('/api/ollama/health', async (req, res) => {
  try {
    const isHealthy = await ollamaService.checkHealth()
    const modelInfo = getModelInfo()

    res.json({
      success: true,
      data: {
        healthy: isHealthy,
        model: modelInfo.name,
        baseUrl: modelInfo.baseUrl,
        ragEnabled: modelInfo.ragEnabled,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || '检查 Ollama 服务失败',
    })
  }
})

// 存储剧本片段到 RAG 库
app.post('/api/rag/store-script', async (req, res) => {
  try {
    const { scriptId, segments } = req.body

    if (!scriptId || !segments || !Array.isArray(segments)) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：scriptId 和 segments（数组）',
      })
    }

    const result = await ragService.storeScriptSegments(scriptId, segments)

    res.json({
      success: result,
      message: result ? '剧本片段已存储到 RAG 库' : '存储失败',
    })
  } catch (error) {
    console.error('存储剧本片段错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '存储剧本片段失败',
    })
  }
})

// ==================== 视频运动提示词生成 API ====================

// 生成视频运动提示词
app.post('/api/generate-video-motion-prompt', async (req, res) => {
  try {
    const {
      imageUrl,
      scriptContext,
      shotNumber,
      scriptId,
      characterInfo,
      sceneInfo,
    } = req.body

    if (!imageUrl || !scriptContext) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：imageUrl 和 scriptContext',
      })
    }

    console.log('🎬 收到视频运动提示词生成请求:', {
      shotNumber: shotNumber || '未指定',
      scriptId: scriptId || '未指定',
      hasImageUrl: !!imageUrl,
      scriptContextLength: scriptContext.length,
    })

    const result = await generateVideoMotionPrompt({
      imageUrl,
      scriptContext,
      shotNumber: shotNumber || 1,
      scriptId,
      characterInfo,
      sceneInfo,
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('生成视频运动提示词错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '生成视频运动提示词失败',
    })
  }
})

// 检查 Ollama 服务状态
app.get('/api/ollama/health', async (req, res) => {
  try {
    const isHealthy = await ollamaService.checkHealth()
    const modelInfo = getModelInfo()

    res.json({
      success: true,
      data: {
        healthy: isHealthy,
        model: modelInfo.name,
        baseUrl: modelInfo.baseUrl,
        ragEnabled: modelInfo.ragEnabled,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || '检查 Ollama 服务失败',
    })
  }
})

// 存储剧本片段到 RAG 库
app.post('/api/rag/store-script', async (req, res) => {
  try {
    const { scriptId, segments } = req.body

    if (!scriptId || !segments || !Array.isArray(segments)) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：scriptId 和 segments（数组）',
      })
    }

    const result = await ragService.storeScriptSegments(scriptId, segments)

    res.json({
      success: result,
      message: result ? '剧本片段已存储到 RAG 库' : '存储失败',
    })
  } catch (error) {
    console.error('存储剧本片段错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '存储剧本片段失败',
    })
  }
})

// 查询视频生成任务状态
app.get('/api/video-task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params
    const { model = 'doubao-seedance-1-5-pro-251215', projectName, shotId } = req.query
    const userId = req.user?.id

    if (!taskId) {
      return res.status(400).json({ 
        success: false,
        error: '任务ID不能为空' 
      })
    }

    console.log('📊 查询任务状态:', taskId, '模型:', model, 'projectName:', projectName || '未提供', 'shotId:', shotId || '未提供')

    // 查询任务状态（根据模型选择不同的服务）
    const result = await getVideoTaskStatus(taskId, model)

    // 如果视频生成完成，保存到数据库
    if (result.status === 'completed' && result.videoUrl && projectName && shotId) {
      try {
        const pool = await import('./db/connection.js')
        const db = pool.default
        
        // 查找项目ID
        let dbProjectId = null
        if (userId) {
          const projectResult = await db.query(
            'SELECT id FROM projects WHERE (name = $1 OR script_title = $1) AND user_id = $2',
            [projectName, userId]
          )
          if (projectResult.rows.length > 0) {
            dbProjectId = projectResult.rows[0].id
          }
        }
        
        if (dbProjectId) {
          // 从videoUrl提取COS key（假设URL格式为 https://xxx.cos.xxx.com/xxx/xxx.mp4）
          const urlObj = new URL(result.videoUrl)
          const cosKey = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname
          const fileName = cosKey.split('/').pop() || `video_${Date.now()}.mp4`
          
          // 保存到files表
          await db.query(
            `INSERT INTO files (project_id, file_type, file_name, cos_key, cos_url, metadata)
             VALUES ($1, 'video', $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [
              dbProjectId,
              fileName,
              cosKey,
              result.videoUrl,
              JSON.stringify({ shot_id: shotId.toString(), model, task_id: taskId })
            ]
          )
          
          // 同时保存到 generated_assets 表（用于跨设备同步）
          try {
            await db.query(
              `INSERT INTO generated_assets (user_id, project_id, asset_type, asset_name, asset_category, cos_url, cos_key, mime_type, metadata, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               ON CONFLICT DO NOTHING`,
              [
                userId,
                dbProjectId,
                'video',
                fileName,
                'shot',
                result.videoUrl,
                cosKey,
                'video/mp4',
                JSON.stringify({ shot_id: shotId.toString(), model, task_id: taskId }),
                'completed'
              ]
            )
            console.log(`✅ 视频已保存到 generated_assets 表`)
          } catch (genAssetError) {
            console.error(`⚠️ 保存视频到 generated_assets 表失败（不影响主流程）:`, genAssetError)
          }
          
          console.log(`✅ 视频已保存到数据库: ${result.videoUrl}, shotId: ${shotId}`)
          
          // 计算并记录积分消耗（超级管理员不记录）
          try {
            // 检查是否为超级管理员
            const userResult = await db.query('SELECT username FROM users WHERE id = $1', [userId])
            const username = userResult.rows[0]?.username || 'unknown'
            const isSuperAdmin = username === 'Chiefavefan'
            
            // 超级管理员不记录积分和费用
            if (!isSuperAdmin) {
              const { calculateVideoGenerationCredit, calculateVolcengineCost } = await import('./services/creditService.js')
              const { logOperation } = await import('./services/authService.js')
            
            // 从metadata或请求参数中获取模型、分辨率、时长信息
            // 尝试从metadata中解析（如果之前保存过）
            let videoModel = model || 'volcengine-video-3.0-pro'
            let videoResolution = req.query.resolution || '720p'
            let videoDuration = parseInt(req.query.duration) || 5
            
            // 尝试从保存的metadata中获取（如果存在）
            try {
              const metadataResult = await db.query(
                'SELECT metadata FROM files WHERE cos_url = $1 LIMIT 1',
                [result.videoUrl]
              )
              if (metadataResult.rows.length > 0 && metadataResult.rows[0].metadata) {
                const savedMetadata = JSON.parse(metadataResult.rows[0].metadata)
                if (savedMetadata.resolution) videoResolution = savedMetadata.resolution
                if (savedMetadata.duration) videoDuration = parseInt(savedMetadata.duration) || videoDuration
                if (savedMetadata.model) videoModel = savedMetadata.model
              }
            } catch (e) {
              // 如果无法从metadata获取，使用默认值
            }
            
            // 计算实际成本（元）
            let costInYuan = 0
            if (videoModel === 'volcengine-video-3.0-pro' || videoModel === 'doubao-seedance-3.0-pro') {
              costInYuan = calculateVolcengineCost(videoResolution, videoDuration)
            }
            
            // 计算积分消耗
            const creditConsumed = calculateVideoGenerationCredit(videoModel, videoResolution, videoDuration, costInYuan > 0 ? costInYuan : null)
            
            if (creditConsumed > 0) {
              // 记录积分消耗到操作日志，同时保存真实成本到metadata
              await logOperation(
                userId,
                username,
                'video_generation',
                '视频生成',
                'video',
                taskId,
                creditConsumed,
                'success',
                null,
                { model: videoModel, resolution: videoResolution, duration: videoDuration, creditConsumed, costInYuan: costInYuan > 0 ? costInYuan : null, shotId }
              )
              
              console.log(`✅ 已记录积分消耗: ${creditConsumed} 积分 (模型: ${videoModel}, 分辨率: ${videoResolution}, 时长: ${videoDuration}秒, 实际成本: ${costInYuan > 0 ? costInYuan.toFixed(4) + '元' : '未知'})`)
            }
            } else {
              console.log(`ℹ️ 超级管理员 ${username} 使用模型，跳过积分和费用统计`)
            }
          } catch (creditError) {
            console.error('记录积分消耗失败（不影响主流程）:', creditError)
          }
        }
      } catch (dbError) {
        console.error('保存视频到数据库失败:', dbError)
        // 不阻止返回结果，只记录错误
      }
    }

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('查询任务状态错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '查询任务状态失败，请稍后重试',
    })
  }
})

// ==================== Nano Banana Pro 文生图 API ====================

// 文生图/图生图接口 - 支持多种模型（nano-banana-pro 或 midjourney-v7-t2i）
app.post('/api/generate-image', async (req, res) => {
  try {
    const { 
      prompt, 
      model = 'nano-banana-pro', 
      resolution, // 分辨率：2K 或 4K
      aspectRatio = 'auto', 
      size, // 兼容旧参数，如果提供了 resolution 则使用 resolution
      botType = 'MID_JOURNEY',
      referenceImage, // 参考图片（用于图生图）- base64或URL
      referenceImageUrl, // 参考图片URL（用于图生图，与referenceImage二选一）
      projectName, // 项目名称（用于保存到项目文件夹）
    } = req.body

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: '提示词不能为空' 
      })
    }

    // 确定实际使用的分辨率
    let actualSize = size || '1K'
    if (resolution) {
      // 如果提供了 resolution，转换为 size 参数
      actualSize = resolution
    }

    // 确定参考图片（优先使用 referenceImageUrl，其次 referenceImage）
    const imageRef = referenceImageUrl || referenceImage
    const isImageToImage = !!imageRef

    console.log(`🎨 收到${isImageToImage ? '图生图' : '文生图'}请求:`, {
      model,
      prompt: prompt.substring(0, 50) + '...',
      resolution: resolution || actualSize,
      aspectRatio,
      hasReferenceImage: !!imageRef,
    })

    let result
    if (model === 'midjourney-v7-t2i') {
      // 调用 Midjourney API
      // 注意：midjourney 的 2K 需要通过 Upscaler 实现，这里先提交基础图生成任务
      // 后续可以通过 Upscaler API 放大到 2K
      // Midjourney 的宽高比需要在 prompt 中添加 --ar 参数
      // Midjourney 支持垫图（base64Array）
      const base64Array = imageRef ? [imageRef] : []
      result = await generateImageWithMidjourney(prompt, {
        botType,
        aspectRatio, // 传递宽高比，会在 prompt 中添加 --ar 参数
        resolution, // 传递分辨率信息，用于后续 Upscaler 处理
        base64Array, // 传递参考图片（垫图）
      })
    } else if (model === 'flux-2-max' || model === 'flux-2-flex' || model === 'flux-2-pro') {
      // 使用 Flux 模型（支持文生图和图生图）
      result = await generateImageWithFlux(prompt, {
        model,
        aspectRatio,
        resolution: actualSize === '2K' ? '2K' : actualSize === '4K' ? '4K' : '2K',
        referenceImage: imageRef, // 传递参考图片（用于图生图）
        sync: false, // 异步返回
      })
    } else if (model === 'seedream-4-5' || model === 'seedream-4-0') {
      // 使用 Seedream 模型（支持文生图和图生图，同步返回）
      result = await generateImageWithSeedream(prompt, {
        model,
        aspectRatio,
        resolution: actualSize === '2K' ? '2K' : actualSize === '4K' ? '4K' : '2K',
        referenceImage: imageRef, // 传递参考图片（用于图生图，支持多张）
        sequentialImageGeneration: false, // 默认生成单图
      })
    } else {
      // 使用 Nano Banana Pro（支持文生图和图生图）
      // 将 resolution (2K/4K) 转换为 size 参数
      const sizeParam = actualSize === '2K' ? '2K' : actualSize === '4K' ? '4K' : '1K'
      result = await generateImageWithNanoBanana(prompt, {
        aspectRatio,
        size: sizeParam,
        referenceImage: imageRef, // 传递参考图片（用于图生图）
        referenceImageUrl: referenceImageUrl, // 传递参考图片URL
      })
      
      // 如果使用了 302.ai API，保存 provider 信息（resultUrl 通过查询参数传递）
      if (result.provider === '302ai') {
        // 保存 resultUrl 到返回数据中，前端可以通过查询参数传递
        result._resultUrl = result.resultUrl // 临时保存，用于前端传递
      }
    }

    // 如果提供了 projectName，保存到 result 中，以便后续查询任务状态时使用
    if (projectName && result) {
      result._projectName = projectName
    }

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('文生图错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '文生图失败，请稍后重试',
    })
  }
})

// 提交 Midjourney Upscale 任务
app.post('/api/midjourney/upscale', async (req, res) => {
  try {
    const { button, resultUrl } = req.body

    if (!button || (!button.customId && !button.label)) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的按钮信息（customId 或 label）',
      })
    }

    const { submitMidjourneyUpscale } = await import('./services/midjourneyService.js')
    const result = await submitMidjourneyUpscale(button, resultUrl)

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('提交 Midjourney Upscale 任务错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '提交 Upscale 任务失败，请稍后重试',
    })
  }
})

// 查询图片生成任务状态 - 支持多种模型
app.get('/api/image-task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params
    const { model = 'nano-banana-pro', resolution, resultUrl, projectName } = req.query // 从查询参数获取分辨率和 resultUrl

    if (!taskId) {
      return res.status(400).json({ 
        success: false,
        error: '任务ID不能为空' 
      })
    }

    console.log('🔍 查询图片生成任务状态:', taskId, '模型:', model, '分辨率:', resolution, 'resultUrl:', resultUrl ? '已提供' : '未提供', 'projectName:', projectName || '未提供')

    let result
    if (model === 'midjourney-v7-t2i') {
      // 查询 Midjourney 任务状态（如果指定了 2K 分辨率，会自动调用 Upscale）
      result = await getMidjourneyTaskStatus(taskId, { resolution })
    } else if (model === 'flux-2-max' || model === 'flux-2-flex' || model === 'flux-2-pro') {
      // 查询 Flux 任务状态
      result = await getFluxTaskStatus(taskId, model)
    } else if (model === 'seedream-4-5' || model === 'seedream-4-0') {
      // Seedream API 是同步的，不需要查询任务状态
      // 但为了兼容性，仍然提供查询接口
      result = await getSeedreamTaskStatus(taskId, model)
    } else {
      // 默认查询 Nano Banana Pro 任务状态
      // 如果提供了 resultUrl，说明使用了 302.ai API
      result = await getNanoBananaTaskStatus(taskId, resultUrl || null)
    }


    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('查询图片任务状态错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '查询任务状态失败，请稍后重试',
    })
  }
})

// 获取改创图片列表（从COS获取）
app.get('/api/image-recreation/list', authenticateToken, async (req, res) => {
  try {
    // 获取改创图片目录下的所有图片
    // 假设改创图片存储在 images/recreation/ 目录下
    const prefix = 'images/recreation/'
    const files = await listFiles(prefix, 100)
    
    // 过滤出图片文件（jpg, jpeg, png, webp等）
    const imageFiles = files.filter(file => {
      const ext = file.key.split('.').pop()?.toLowerCase()
      return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')
    })

    res.json({
      success: true,
      data: imageFiles,
    })
  } catch (error) {
    console.error('获取改创图片列表错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取图片列表失败，请稍后重试',
    })
  }
})

// 获取融合生图列表（从COS获取）
app.get('/api/fusion-image/list', authenticateToken, async (req, res) => {
  try {
    // 获取融合生图目录下的所有图片
    // 假设融合生图存储在 images/fusion/ 目录下
    const prefix = 'images/fusion/'
    const files = await listFiles(prefix, 100)
    
    // 过滤出图片文件（jpg, jpeg, png, webp等）
    const imageFiles = files.filter(file => {
      const ext = file.key.split('.').pop()?.toLowerCase()
      return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')
    })

    res.json({
      success: true,
      data: imageFiles,
    })
  } catch (error) {
    console.error('获取融合生图列表错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取图片列表失败，请稍后重试',
    })
  }
})

// ==================== 任务管理 API ====================

// 获取所有任务（支持按用户过滤）
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    // 从认证用户中获取 user_id，只返回当前用户的任务
    const userId = req.user?.id || null
    const tasks = await TaskRepository.getAllTasks(userId)
    res.json({
      success: true,
      data: tasks,
    })
  } catch (error) {
    console.error('获取任务列表错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取任务列表失败，请稍后重试',
    })
  }
})

// 获取单个任务
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const task = await TaskRepository.getTaskById(parseInt(id))
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      })
    }

    res.json({
      success: true,
      data: task,
    })
  } catch (error) {
    console.error('获取任务错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取任务失败，请稍后重试',
    })
  }
})

// 创建任务（需要认证，自动关联当前用户）
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const taskData = req.body
    // 从认证用户中获取 user_id，自动关联到任务
    const userId = req.user?.id || null
    const task = await TaskRepository.createTask({
      ...taskData,
      user_id: userId,
    })
    
    res.json({
      success: true,
      data: task,
    })
  } catch (error) {
    console.error('创建任务错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '创建任务失败，请稍后重试',
    })
  }
})

// 更新任务
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    const task = await TaskRepository.updateTask(parseInt(id), updates)
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      })
    }

    res.json({
      success: true,
      data: task,
    })
  } catch (error) {
    console.error('更新任务错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '更新任务失败，请稍后重试',
    })
  }
})

// 删除任务
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const task = await TaskRepository.deleteTask(parseInt(id))
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      })
    }

    res.json({
      success: true,
      message: '任务删除成功',
      data: task,
    })
  } catch (error) {
    console.error('删除任务错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '删除任务失败，请稍后重试',
    })
  }
})

// 更新任务进度
app.patch('/api/tasks/:id/progress', async (req, res) => {
  try {
    const { id } = req.params
    const { progress1, progress2, isCompleted1 } = req.body
    const task = await TaskRepository.updateTaskProgress(
      parseInt(id),
      progress1,
      progress2,
      isCompleted1
    )
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      })
    }

    res.json({
      success: true,
      data: task,
    })
  } catch (error) {
    console.error('更新任务进度错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '更新任务进度失败，请稍后重试',
    })
  }
})

// 切换任务展开状态
app.patch('/api/tasks/:id/toggle-expand', async (req, res) => {
  try {
    const { id } = req.params
    const { is_expanded } = req.body
    
    const task = await TaskRepository.updateTask(parseInt(id), { is_expanded })
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      })
    }

    res.json({
      success: true,
      data: task,
    })
  } catch (error) {
    console.error('切换任务展开状态错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '更新任务状态失败，请稍后重试',
    })
  }
})

// ==================== 用户认证和管理API ====================

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: '用户名和密码不能为空' 
      })
    }

    console.log(`📝 收到登录请求: 用户名=${username}`)
    const result = await AuthService.login(username, password)
    
    if (!result.success) {
      console.log(`❌ 登录失败: ${result.error}`)
      return res.status(401).json({ 
        success: false,
        error: result.error 
      })
    }

    console.log(`✅ 登录成功: ${result.user.username}`)
    res.json({
      success: true,
      token: result.token,
      user: result.user,
    })
  } catch (error) {
    console.error('登录API错误:', error)
    res.status(500).json({ 
      success: false,
      error: '登录失败，请稍后重试' 
    })
  }
})

// 验证token
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  })
})

// 获取所有用户（需要认证）
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await UserService.getAllUsers()
    // 转换字段名从 snake_case 到 camelCase，并确保日期格式正确
    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name || user.username,
      isActive: user.is_active,
      createdAt: user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString(),
      updatedAt: user.updated_at ? new Date(user.updated_at).toISOString() : new Date().toISOString(),
    }))
    res.json({ success: true, users: formattedUsers })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    res.status(500).json({ error: '获取用户列表失败' })
  }
})

// 创建用户（需要认证）
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { username, password, displayName } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    const user = await UserService.createUser(username, password, displayName)
    res.json({ success: true, user })
  } catch (error) {
    console.error('创建用户失败:', error)
    if (error.message === '用户名已存在') {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: '创建用户失败' })
  }
})

// 更新用户（需要认证）
app.put('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)
    const updates = req.body

    const user = await UserService.updateUser(userId, updates)
    res.json({ success: true, user })
  } catch (error) {
    console.error('更新用户失败:', error)
    if (error.message === '用户不存在') {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: '更新用户失败' })
  }
})

// 删除用户（需要认证）
app.delete('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)
    const currentUserId = req.user.id
    const currentUsername = req.user.username
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ error: '请输入密码' })
    }

    const deleted = await UserService.deleteUser(userId, currentUserId, currentUsername, password)

    if (!deleted) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({ success: true, message: '用户已删除' })
  } catch (error) {
    console.error('删除用户失败:', error)
    // 不返回具体错误信息，统一返回"删除用户失败"
    res.status(500).json({ error: '删除用户失败' })
  }
})

// 获取用户操作日志（需要认证）
app.get('/api/users/:userId/logs', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0

    const result = await UserService.getUserOperationLogs(userId, limit, offset)
    res.json({ success: true, ...result })
  } catch (error) {
    console.error('获取用户操作日志失败:', error)
    res.status(500).json({ error: '获取用户操作日志失败' })
  }
})

// 获取用户消耗排名（需要认证）
app.get('/api/analytics/consumption-ranking', authenticateToken, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null
    const showRealCost = req.query.showRealCost === 'true' // 是否显示真实成本

    const ranking = await UserService.getUserConsumptionRanking(startDate, endDate, showRealCost)
    res.json({ success: true, ranking })
  } catch (error) {
    console.error('获取用户消耗排名失败:', error)
    res.status(500).json({ error: '获取用户消耗排名失败' })
  }
})

// 获取每日消耗趋势（需要认证）
app.get('/api/analytics/daily-consumption', authenticateToken, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 默认30天前
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date()

    const trend = await UserService.getDailyConsumptionTrend(startDate, endDate)
    res.json({ success: true, trend })
  } catch (error) {
    console.error('获取每日消耗趋势失败:', error)
    res.status(500).json({ error: '获取每日消耗趋势失败' })
  }
})

// ==================== Suno API 路由 ====================
// 生成音乐
app.post('/api/suno/generate', authenticateToken, async (req, res) => {
  try {
    const result = await SunoService.generateMusic(req.body)
    res.json(result)
  } catch (error) {
    console.error('生成音乐失败:', error)
    res.status(500).json({ 
      success: false,
      error: error.message || '生成音乐失败' 
    })
  }
})

// 获取音乐详情
app.get('/api/suno/music/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const result = await SunoService.getMusicDetails(id)
    
    // 如果音乐生成完成且有音频URL，自动上传到COS
    if (result.success && result.data && result.data.audio_url) {
      const audioUrl = result.data.audio_url
      const userId = req.user.id
      const projectId = req.query.projectId ? parseInt(req.query.projectId) : null
      
      try {
        console.log('🎵 检测到音乐生成完成，开始上传到COS...')
        const uploadResult = await uploadMusicToCOS(audioUrl, {
          title: result.data.title || result.data.prompt || '未命名音乐',
          prompt: result.data.prompt || '',
          provider: 'suno',
          userId,
        })
        
        // 如果上传成功，更新返回的URL为COS URL
        if (uploadResult.uploaded && uploadResult.url) {
          result.data.cos_url = uploadResult.url
          result.data.original_url = audioUrl
          
          // 保存到数据库
          await saveMusicToDatabase({
            cosUrl: uploadResult.url,
            originalUrl: audioUrl,
            title: result.data.title || result.data.prompt || '未命名音乐',
            prompt: result.data.prompt || '',
            provider: 'suno',
            userId,
            projectId,
            cosKey: uploadResult.key,
            size: uploadResult.size,
            contentType: uploadResult.contentType,
          })
        }
      } catch (uploadError) {
        console.warn('⚠️ 上传音乐到COS失败，继续返回原始URL:', uploadError.message)
        // 上传失败不影响主流程，继续返回原始URL
      }
    }
    
    res.json(result)
  } catch (error) {
    console.error('获取音乐详情失败:', error)
    res.status(500).json({ 
      success: false,
      error: error.message || '获取音乐详情失败' 
    })
  }
})

// 生成歌词
app.post('/api/suno/lyrics', authenticateToken, async (req, res) => {
  try {
    const result = await SunoService.generateLyrics(req.body)
    res.json(result)
  } catch (error) {
    console.error('生成歌词失败:', error)
    res.status(500).json({ 
      success: false,
      error: error.message || '生成歌词失败' 
    })
  }
})

// 获取歌词生成详情
app.get('/api/suno/lyrics/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params
    const result = await SunoService.getLyricsDetails(taskId)
    res.json(result)
  } catch (error) {
    console.error('获取歌词详情失败:', error)
    res.status(500).json({ 
      success: false,
      error: error.message || '获取歌词详情失败' 
    })
  }
})

// 获取剩余积分
app.get('/api/suno/credits', authenticateToken, async (req, res) => {
  try {
    const result = await SunoService.getCredits()
    res.json(result)
  } catch (error) {
    console.error('获取积分失败:', error)
    res.status(500).json({ 
      success: false,
      error: error.message || '获取积分失败' 
    })
  }
})

// 获取用户积分余额（支持组内共享和管理员）
app.get('/api/user/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id
    const username = req.user?.username
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    // 检查是否为管理员（超级管理员）
    const isSuperAdmin = username === 'Chiefavefan'
    const isAdmin = username === 'Chiefavefan' || username === 'jubian888'
    
    // 如果是管理员，返回无穷符号
    if (isAdmin) {
      return res.json({
        success: true,
        balance: Infinity,
        isAdmin: true,
        displayBalance: '∞'
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 获取用户所在的所有小组ID
    const userGroupsResult = await db.query(
      'SELECT group_id FROM user_groups WHERE user_id = $1',
      [userId]
    )
    const groupIds = userGroupsResult.rows.map(row => row.group_id)
    
    // 如果用户在小组中，获取小组所有成员的积分余额总和
    if (groupIds.length > 0) {
      // 获取小组所有成员的ID
      const groupMembersResult = await db.query(
        `SELECT DISTINCT user_id 
         FROM user_groups 
         WHERE group_id = ANY($1::integer[])`,
        [groupIds]
      )
      const memberIds = groupMembersResult.rows.map(row => row.user_id)
      
      // 计算小组所有成员的总积分余额（从 Suno API 获取）
      let totalBalance = 0
      try {
        const sunoCredits = await SunoService.getCredits()
        if (sunoCredits.success && sunoCredits.data) {
          // 这里假设每个成员的积分余额相同（共享账户）
          // 实际应该从每个成员的操作日志中计算剩余积分
          // 暂时使用 Suno API 返回的积分作为共享余额
          totalBalance = sunoCredits.data.credits || 0
        }
      } catch (error) {
        console.warn('获取 Suno 积分失败，使用默认值:', error)
        totalBalance = 0
      }
      
      return res.json({
        success: true,
        balance: totalBalance,
        isAdmin: false,
        isGroupShared: true,
        groupIds: groupIds,
        displayBalance: totalBalance.toLocaleString('zh-CN')
      })
    }
    
    // 如果用户不在小组中，获取个人积分余额
    try {
      const sunoCredits = await SunoService.getCredits()
      const balance = sunoCredits.success && sunoCredits.data ? (sunoCredits.data.credits || 0) : 0
      
      return res.json({
        success: true,
        balance: balance,
        isAdmin: false,
        isGroupShared: false,
        displayBalance: balance.toLocaleString('zh-CN')
      })
    } catch (error) {
      console.error('获取个人积分失败:', error)
      return res.json({
        success: true,
        balance: 0,
        isAdmin: false,
        isGroupShared: false,
        displayBalance: '0'
      })
    }
  } catch (error) {
    console.error('获取用户积分余额失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取积分余额失败',
    })
  }
})

// ==================== MusicGPT API 路由 ====================
// 生成音乐（通过MusicGPT）
app.post('/api/musicgpt/generate', authenticateToken, async (req, res) => {
  try {
    const { prompt, secs, projectId } = req.body
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, error: '提示词不能为空' })
    }
    const result = await MusicGptService.generateMusic({ prompt, secs: secs || 10 })
    
    // 如果生成成功且有音频URL，自动上传到COS
    if (result.success && result.data && result.data.audio_url) {
      const audioUrl = result.data.audio_url
      const userId = req.user.id
      
      try {
        console.log('🎵 检测到MusicGPT音乐生成完成，开始上传到COS...')
        const uploadResult = await uploadMusicToCOS(audioUrl, {
          title: prompt.substring(0, 50) || '未命名音乐',
          prompt: prompt,
          provider: 'musicgpt',
          userId,
        })
        
        // 如果上传成功，更新返回的URL为COS URL
        if (uploadResult.uploaded && uploadResult.url) {
          result.data.cos_url = uploadResult.url
          result.data.original_url = audioUrl
          
          // 保存到数据库
          await saveMusicToDatabase({
            cosUrl: uploadResult.url,
            originalUrl: audioUrl,
            title: prompt.substring(0, 50) || '未命名音乐',
            prompt: prompt,
            provider: 'musicgpt',
            userId,
            projectId: projectId ? parseInt(projectId) : null,
            cosKey: uploadResult.key,
            size: uploadResult.size,
            contentType: uploadResult.contentType,
          })
        }
      } catch (uploadError) {
        console.warn('⚠️ 上传音乐到COS失败，继续返回原始URL:', uploadError.message)
        // 上传失败不影响主流程，继续返回原始URL
      }
    }
    
    res.json(result)
  } catch (error) {
    console.error('MusicGPT 音乐生成失败:', error)
    res.status(500).json({ 
      success: false,
      error: error.message || '生成音乐失败' 
    })
  }
})

// 检查 MusicGPT 服务健康状态
app.get('/api/musicgpt/health', authenticateToken, async (req, res) => {
  try {
    const isHealthy = await MusicGptService.checkHealth()
    res.json({ success: isHealthy })
  } catch (error) {
    console.error('检查 MusicGPT 健康状态失败:', error)
    res.json({ success: false })
  }
})

// ==================== IndexTTS2.5 音色创作 API 路由 ====================
// 检查 IndexTTS2.5 服务健康状态
app.get('/api/indextts/health', authenticateToken, async (req, res) => {
  try {
    const isHealthy = await checkIndexTtsHealth()
    res.json({ success: isHealthy })
  } catch (error) {
    console.error('检查 IndexTTS2.5 健康状态失败:', error)
    res.json({ success: false })
  }
})

// 获取可用音色列表
app.get('/api/indextts/voices', authenticateToken, async (req, res) => {
  try {
    const voices = await getVoices()
    res.json({ success: true, voices })
  } catch (error) {
    console.error('获取音色列表失败:', error)
    res.status(500).json({ 
      success: false,
      error: error.message || '获取音色列表失败' 
    })
  }
})

// 生成语音
app.post('/api/indextts/generate', authenticateToken, async (req, res) => {
  try {
    const { text, voiceId, speed, pitch, format } = req.body
    
    if (!text || !text.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: '文本不能为空' 
      })
    }

    const result = await generateSpeech({
      text,
      voiceId: voiceId || 'default',
      speed: speed || 1.0,
      pitch: pitch || 0,
      format: format || 'wav',
    })

    res.json(result)
  } catch (error) {
    console.error('IndexTTS2.5 生成语音失败:', error)
    res.status(500).json({ 
      success: false,
      error: error.message || '生成语音失败' 
    })
  }
})

// 批量生成语音
app.post('/api/indextts/generate-batch', authenticateToken, async (req, res) => {
  try {
    const { texts } = req.body
    
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: '文本数组不能为空' 
      })
    }

    const results = await generateSpeechBatch(texts)
    res.json({ success: true, results })
  } catch (error) {
    console.error('IndexTTS2.5 批量生成语音失败:', error)
    res.status(500).json({ 
      success: false,
      error: error.message || '批量生成语音失败' 
    })
  }
})

// ==================== 剪映小助手API路由 ====================
// 一键导入视频到剪映（创建草稿 + 添加视频 + 保存）
app.post('/api/jianying/import-videos', authenticateToken, async (req, res) => {
  try {
    const {
      projectName,
      videoUrls,
      addToTrack = false, // false: 添加到素材库, true: 添加到轨道
      autoSave = true,
    } = req.body

    if (!projectName || !videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: '项目名称和视频URL列表不能为空'
      })
    }

    const result = await importVideosToJianying({
      projectName,
      videoUrls,
      addToTrack,
      autoSave,
    })

    res.json(result)
  } catch (error) {
    console.error('一键导入视频到剪映失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '一键导入视频失败'
    })
  }
})

// 创建剪映草稿
app.post('/api/jianying/create-draft', authenticateToken, async (req, res) => {
  try {
    const {
      projectName,
      width = 1920,
      height = 1080,
      fps = 30,
    } = req.body

    if (!projectName) {
      return res.status(400).json({
        success: false,
        error: '项目名称不能为空'
      })
    }

    const result = await createDraft({
      projectName,
      width,
      height,
      fps,
    })

    res.json(result)
  } catch (error) {
    console.error('创建剪映草稿失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '创建草稿失败'
    })
  }
})

// 添加视频到草稿
app.post('/api/jianying/add-videos', authenticateToken, async (req, res) => {
  try {
    const {
      draftId,
      videoUrls,
      addToTrack = false,
      startTime = 0,
    } = req.body

    if (!draftId || !videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: '草稿ID和视频URL列表不能为空'
      })
    }

    const result = await addVideosToDraft({
      draftId,
      videoUrls,
      addToTrack,
      startTime,
    })

    res.json(result)
  } catch (error) {
    console.error('添加视频到草稿失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '添加视频失败'
    })
  }
})

// 保存草稿
app.post('/api/jianying/save-draft', authenticateToken, async (req, res) => {
  try {
    const { draftId } = req.body

    if (!draftId) {
      return res.status(400).json({
        success: false,
        error: '草稿ID不能为空'
      })
    }

    const result = await saveDraft(draftId)

    res.json(result)
  } catch (error) {
    console.error('保存草稿失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '保存草稿失败'
    })
  }
})

// 获取草稿文件列表
app.get('/api/jianying/get-draft-files', authenticateToken, async (req, res) => {
  try {
    const { draftId } = req.query

    if (!draftId) {
      return res.status(400).json({
        success: false,
        error: '草稿ID不能为空'
      })
    }

    const result = await getDraftFiles(draftId)

    res.json(result)
  } catch (error) {
    console.error('获取草稿文件列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取文件列表失败'
    })
  }
})

// ==================== 剪映草稿文件生成 API 路由 ====================
// 生成剪映草稿文件（包含音频）
app.post('/api/jianying/generate-draft', authenticateToken, async (req, res) => {
  try {
    const {
      projectName,
      audioUrl,
      text,
      duration,
      width = 1920,
      height = 1080,
    } = req.body

    if (!projectName || !audioUrl) {
      return res.status(400).json({
        success: false,
        error: '项目名称和音频URL不能为空'
      })
    }

    const result = await generateJianyingDraft({
      projectName,
      audioUrl,
      text,
      duration,
      width,
      height,
    })

    res.json(result)
  } catch (error) {
    console.error('生成剪映草稿文件失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '生成剪映草稿文件失败'
    })
  }
})

// ==================== 音乐存储 API 路由 ====================
// 获取用户的音乐列表
app.get('/api/music/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : null
    
    const musicList = await getUserMusicList(userId, projectId)
    
    res.json({
      success: true,
      data: musicList,
    })
  } catch (error) {
    console.error('获取音乐列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取音乐列表失败',
    })
  }
})

// 删除音乐
app.delete('/api/music/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    
    await deleteMusic(parseInt(id), userId)
    
    res.json({
      success: true,
      message: '音乐已删除',
    })
  } catch (error) {
    console.error('删除音乐失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '删除音乐失败',
    })
  }
})

// 上传视频到COS并保存到数据库
app.post('/api/upload-video', authenticateToken, uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传视频文件'
      })
    }

    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }

    const { projectId, fragmentId } = req.body
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: '项目ID不能为空'
      })
    }
    
    // 直接从内存获取文件Buffer
    const videoBuffer = req.file.buffer
    
    // 生成COS路径
    const { generateCosKey } = await import('./services/cosService.js')
    const ext = req.file.originalname.split('.').pop() || 'mp4'
    const fileName = req.file.originalname || `video_${Date.now()}.${ext}`
    const cosKey = generateCosKey('videos', `${Date.now()}_${fileName}`)
    
    // 上传到COS
    const { uploadBuffer } = await import('./services/cosService.js')
    const result = await uploadBuffer(videoBuffer, cosKey, req.file.mimetype)
    
    console.log(`✅ 视频上传成功: ${result.url}`)
    
    // 保存到数据库
    try {
      const pool = await import('./db/connection.js')
      const db = pool.default
      
      // 验证项目是否属于当前用户
      const projectCheck = await db.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      )
      
      if (projectCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '无权访问该项目',
        })
      }
      
      // 准备metadata
      const metadata = {
        source: 'upload',
        uploaded_at: new Date().toISOString(),
      }
      
      // 如果提供了fragmentId，将其作为shot_id保存
      if (fragmentId) {
        // fragmentId可能是shot的ID（数字）或fragment的ID（字符串）
        const shotId = parseInt(fragmentId, 10)
        if (!isNaN(shotId)) {
          metadata.shot_id = shotId.toString()
          
          // 验证shot是否存在且属于该项目
          const shotCheck = await db.query(
            'SELECT id FROM shots WHERE id = $1 AND project_id = $2',
            [shotId, projectId]
          )
          
          if (shotCheck.rows.length === 0) {
            console.warn(`⚠️ Shot ${shotId} 不存在或不属于项目 ${projectId}`)
          } else {
            console.log(`✅ 视频已关联到分镜 ${shotId}`)
          }
        } else {
          metadata.fragment_id = fragmentId
          console.log(`✅ 视频已关联到片段 ${fragmentId}`)
        }
      }
      
      // 保存到files表
      await db.query(
        `INSERT INTO files (project_id, file_type, file_name, file_size, mime_type, cos_key, cos_url, metadata)
         VALUES ($1, 'video', $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [
          projectId,
          fileName,
          req.file.size,
          req.file.mimetype,
          result.key,
          result.url,
          JSON.stringify(metadata)
        ]
      )
      
      console.log(`✅ 视频已保存到数据库: ${result.url}, projectId: ${projectId}, fragmentId: ${fragmentId || '无'}`)
    } catch (dbError) {
      console.error('保存视频到数据库失败:', dbError)
      // 不阻止返回结果，只记录错误
    }
    
    res.json({
      success: true,
      data: {
        url: result.url,
        key: result.key,
        projectId,
        fragmentId,
      }
    })
  } catch (error) {
    console.error('视频上传失败:', error)
    
    res.status(500).json({
      success: false,
      error: error.message || '视频上传失败'
    })
  }
})

// 上传角色图片到COS并保存到数据库（按用户隔离）
app.post('/api/upload-character-image', authenticateToken, uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传图片文件'
      })
    }

    const { projectId, characterId, characterName, projectName } = req.body
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    if (!projectId && !projectName) {
      return res.status(400).json({
        success: false,
        error: '请提供项目ID或项目名称'
      })
    }
    
    // 处理projectId：如果是字符串格式的临时ID，需要查找数据库中的真实ID（按用户过滤）
    let dbProjectId = null
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    if (projectId) {
      // 尝试解析为整数
      const parsedId = parseInt(projectId)
      if (!isNaN(parsedId)) {
        // 验证项目是否存在且属于当前用户
        const projectCheck = await db.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [parsedId, userId])
        if (projectCheck.rows.length > 0) {
          dbProjectId = parsedId
        }
      }
      
      // 如果不是有效的数据库ID，尝试根据项目名称查找（按用户过滤）
      if (!dbProjectId && projectName) {
        const projectByName = await db.query('SELECT id FROM projects WHERE name = $1 AND user_id = $2', [projectName, userId])
        if (projectByName.rows.length > 0) {
          dbProjectId = projectByName.rows[0].id
        }
      }
    } else if (projectName) {
      // 只有项目名称，查找数据库中的ID（按用户过滤）
      // 先尝试精确匹配
      let projectByName = await db.query('SELECT id, name FROM projects WHERE name = $1 AND user_id = $2', [projectName.trim(), userId])
      
      // 如果精确匹配失败，尝试模糊匹配（去除空格）
      if (projectByName.rows.length === 0) {
        projectByName = await db.query(
          'SELECT id, name FROM projects WHERE TRIM(name) = $1 AND user_id = $2',
          [projectName.trim(), userId]
        )
      }
      
      // 如果还是找不到，尝试匹配 script_title
      if (projectByName.rows.length === 0) {
        projectByName = await db.query(
          'SELECT id, name FROM projects WHERE script_title = $1 AND user_id = $2',
          [projectName.trim(), userId]
        )
      }
      
      if (projectByName.rows.length > 0) {
        dbProjectId = projectByName.rows[0].id
        console.log(`✅ 通过项目名称找到项目: "${projectName}" -> ID: ${dbProjectId}, 数据库名称: "${projectByName.rows[0].name}"`)
      } else {
        // 列出所有项目以便调试
        const allProjects = await db.query('SELECT id, name, script_title, user_id FROM projects WHERE user_id = $1', [userId])
        console.log(`❌ 项目查找失败: 项目名称="${projectName}", 用户ID=${userId}`)
        console.log(`   当前用户的所有项目:`, allProjects.rows.map(p => ({ id: p.id, name: p.name, script_title: p.script_title })))
        return res.status(404).json({
          success: false,
          error: `项目不存在，请先创建项目。查找的项目名称: "${projectName}"`
        })
      }
    }
    
    if (!dbProjectId) {
      return res.status(403).json({
        success: false,
        error: '无权访问该项目或项目不存在'
      })
    }

    // 直接从内存获取文件Buffer（不再需要读取本地文件）
    const imageBuffer = req.file.buffer
    
    // 生成COS路径
    const { generateCosKey } = await import('./services/cosService.js')
    const ext = req.file.originalname.split('.').pop() || 'jpg'
    const cosKey = generateCosKey('characters', `character_${characterId || Date.now()}.${ext}`)
    
    // 上传到COS（添加超时和错误处理）
    const { uploadBuffer } = await import('./services/cosService.js')
    console.log(`📤 开始上传角色图片到COS: ${cosKey}, 大小: ${imageBuffer.length} bytes`)
    
    const uploadStartTime = Date.now()
    const uploadResult = await uploadBuffer(imageBuffer, cosKey, req.file.mimetype)
    const uploadDuration = Date.now() - uploadStartTime
    
    console.log(`✅ 角色图片上传到COS成功 (耗时: ${uploadDuration}ms): ${uploadResult.url}`)
    
    // 保存到数据库（使用dbProjectId）
    if (characterId && characterId.startsWith('char_')) {
      // 如果是前端生成的临时ID，需要先查找或创建角色
      const characterNameToUse = characterName || `角色_${Date.now()}`
      
      // 查找是否已存在该角色
      const findResult = await db.query(
        'SELECT id FROM characters WHERE project_id = $1 AND name = $2',
        [dbProjectId, characterNameToUse]
      )
      
      if (findResult.rows.length > 0) {
        // 更新现有角色
        await db.query(
          'UPDATE characters SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [uploadResult.url, findResult.rows[0].id]
        )
        
        res.json({
          success: true,
          data: {
            url: uploadResult.url, // COS URL
            key: uploadResult.key, // COS key
            characterId: findResult.rows[0].id, // 数据库ID
            projectId: dbProjectId, // 项目ID
          }
        })
        
        console.log(`✅ 角色 "${characterNameToUse}" 更新完成:`)
        console.log(`   - COS URL: ${uploadResult.url}`)
        console.log(`   - 数据库ID: ${findResult.rows[0].id}`)
        console.log(`   - 项目ID: ${dbProjectId}`)
      } else {
        // 创建新角色
        const insertResult = await db.query(
          'INSERT INTO characters (project_id, name, image_url) VALUES ($1, $2, $3) RETURNING id',
          [dbProjectId, characterNameToUse, uploadResult.url]
        )
        
        res.json({
          success: true,
          data: {
            url: uploadResult.url, // COS URL
            key: uploadResult.key, // COS key
            characterId: insertResult.rows[0].id, // 数据库ID
            projectId: dbProjectId, // 项目ID
          }
        })
        
        console.log(`✅ 角色 "${characterNameToUse}" 保存完成:`)
        console.log(`   - COS URL: ${uploadResult.url}`)
        console.log(`   - 数据库ID: ${insertResult.rows[0].id}`)
      }
    } else if (characterId) {
      // 如果是数据库ID，直接更新（但需要验证projectId匹配）
      const parsedCharId = parseInt(characterId)
      if (!isNaN(parsedCharId)) {
        // 验证角色是否属于当前项目
        const charCheck = await db.query(
          'SELECT id, project_id FROM characters WHERE id = $1',
          [parsedCharId]
        )
        
        if (charCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '角色不存在',
          })
        }
        
        // 如果角色属于不同的项目，需要更新project_id
        if (charCheck.rows[0].project_id !== dbProjectId) {
          await db.query(
            'UPDATE characters SET project_id = $1, image_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [dbProjectId, uploadResult.url, parsedCharId]
          )
        } else {
          await db.query(
            'UPDATE characters SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [uploadResult.url, parsedCharId]
          )
        }
        
        res.json({
          success: true,
          data: {
            url: uploadResult.url,
            key: uploadResult.key,
            characterId: parsedCharId,
            projectId: dbProjectId,
          }
        })
        
        console.log(`✅ 角色 (ID: ${parsedCharId}) 更新完成:`)
        console.log(`   - COS URL: ${uploadResult.url}`)
        console.log(`   - 项目ID: ${dbProjectId}`)
      } else {
        // 如果不是数字ID，尝试根据名称查找
        const characterNameToUse = characterName || `角色_${Date.now()}`
        const findResult = await db.query(
          'SELECT id FROM characters WHERE project_id = $1 AND name = $2',
          [dbProjectId, characterNameToUse]
        )
        
        if (findResult.rows.length > 0) {
          await db.query(
            'UPDATE characters SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [uploadResult.url, findResult.rows[0].id]
          )
          
          res.json({
            success: true,
            data: {
              url: uploadResult.url,
              key: uploadResult.key,
              characterId: findResult.rows[0].id,
              projectId: dbProjectId,
            }
          })
          
          console.log(`✅ 角色 "${characterNameToUse}" 更新完成:`)
          console.log(`   - COS URL: ${uploadResult.url}`)
          console.log(`   - 数据库ID: ${findResult.rows[0].id}`)
          console.log(`   - 项目ID: ${dbProjectId}`)
        } else {
          // 创建新角色
          const insertResult = await db.query(
            'INSERT INTO characters (project_id, name, image_url) VALUES ($1, $2, $3) RETURNING id',
            [dbProjectId, characterNameToUse, uploadResult.url]
          )
          
          res.json({
            success: true,
            data: {
              url: uploadResult.url,
              key: uploadResult.key,
              characterId: insertResult.rows[0].id,
              projectId: dbProjectId,
            }
          })
          
          console.log(`✅ 角色 "${characterNameToUse}" 创建完成:`)
          console.log(`   - COS URL: ${uploadResult.url}`)
          console.log(`   - 数据库ID: ${insertResult.rows[0].id}`)
          console.log(`   - 项目ID: ${dbProjectId}`)
        }
      }
    } else {
      // 没有characterId，创建新角色
      const characterNameToUse = characterName || `角色_${Date.now()}`
      const insertResult = await db.query(
        'INSERT INTO characters (project_id, name, image_url) VALUES ($1, $2, $3) RETURNING id',
        [dbProjectId, characterNameToUse, uploadResult.url]
      )
      
      res.json({
        success: true,
        data: {
          url: uploadResult.url,
          key: uploadResult.key,
          characterId: insertResult.rows[0].id,
          projectId: dbProjectId,
        }
      })
      
      console.log(`✅ 角色 "${characterNameToUse}" 保存完成:`)
      console.log(`   - COS URL: ${uploadResult.url}`)
      console.log(`   - 数据库ID: ${insertResult.rows[0].id}`)
      console.log(`   - 项目ID: ${dbProjectId}`)
    }
    } catch (error) {
    console.error('角色图片上传失败:', error)
    
    // 使用内存存储，无需清理临时文件
    
    res.status(500).json({
      success: false,
      error: error.message || '角色图片上传失败'
    })
  }
})

// 获取所有项目列表（按用户和小组隔离）
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 获取用户所在的所有小组ID
    const userGroupsResult = await db.query(
      'SELECT group_id FROM user_groups WHERE user_id = $1',
      [userId]
    )
    const groupIds = userGroupsResult.rows.map(row => row.group_id)
    
    // 构建查询：项目属于该用户 OR 项目属于该用户所在的小组
    let query = `
      SELECT DISTINCT p.id, p.name, p.script_title, p.work_style, p.work_background, p.created_at, p.updated_at
      FROM projects p
      WHERE (p.user_id = $1 OR (p.group_id IS NOT NULL AND p.group_id = ANY($2::integer[])))
      ORDER BY p.created_at DESC
    `
    
    const params = groupIds.length > 0 ? [userId, groupIds] : [userId, [null]]
    const result = await db.query(query, params)
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        scriptTitle: row.script_title,
        workStyle: row.work_style,
        workBackground: row.work_background,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    })
  } catch (error) {
    console.error('获取项目列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取项目列表失败'
    })
  }
})

// 创建或更新项目（按用户隔离）
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name, scriptTitle, scriptContent, workStyle, workBackground, analysisResult, segments } = req.body
    const userId = req.user?.id

    if (!name) {
      return res.status(400).json({
        success: false,
        error: '项目名称不能为空',
      })
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }

    const pool = await import('./db/connection.js')
    const db = pool.default

    // 检查项目是否已存在（只检查当前用户的项目）
    const existingProject = await db.query(
      'SELECT id FROM projects WHERE name = $1 AND user_id = $2', 
      [name, userId]
    )

    let project
    if (existingProject.rows.length > 0) {
      // 更新现有项目（确保是当前用户的项目）
      const result = await db.query(
        `UPDATE projects 
         SET script_title = COALESCE($2, script_title),
             script_content = COALESCE($3, script_content),
             work_style = COALESCE($4, work_style),
             work_background = COALESCE($5, work_background),
             analysis_result = COALESCE($6, analysis_result),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $7
         RETURNING *`,
        [
          existingProject.rows[0].id,
          scriptTitle || null,
          scriptContent || null,
          workStyle || null,
          workBackground || null,
          analysisResult ? JSON.stringify(analysisResult) : null,
          userId,
        ]
      )
      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '无权访问该项目',
        })
      }
      project = result.rows[0]
      console.log(`✅ 项目已更新: ${name} (ID: ${project.id}, User: ${userId})`)
      
      // 更新现有项目时，也更新分镜数据
      if (segments && Array.isArray(segments) && segments.length > 0) {
        try {
          console.log(`📝 开始更新分镜数据到数据库，数量: ${segments.length}`)
          // 先删除旧的分镜数据
          await db.query('DELETE FROM shots WHERE project_id = $1', [project.id])
          // 插入新的分镜数据
          for (const seg of segments) {
            await db.query(
              `INSERT INTO shots (project_id, shot_number, description, prompt, segment, style, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [
                project.id,
                seg.shotNumber || 1,
                seg.description || '',
                seg.prompt || '',
                seg.segment || '',
                workStyle || '三维动漫风',
              ]
            )
          }
          console.log(`✅ 分镜数据已更新到数据库，数量: ${segments.length}`)
        } catch (shotsError) {
          console.error('更新分镜数据失败:', shotsError)
          // 不阻止项目更新，只记录错误
        }
      }
      
      // 更新现有项目时，如果文件夹不存在也创建
      try {
        const path = await import('path')
        const os = await import('os')
        const fs = await import('fs')
        const homeDir = os.homedir()
        const projectsFolder = path.join(homeDir, 'Documents', 'AIGC-Projects', name)
        await fs.promises.mkdir(projectsFolder, { recursive: true })
        console.log(`✅ 项目文件夹已确保存在: ${projectsFolder}`)
      } catch (folderError) {
        console.warn(`⚠️ 创建项目文件夹失败（不影响项目更新）:`, folderError.message)
      }
    } else {
      // 创建新项目（自动关联到当前用户或小组）
      // 如果指定了 groupId，项目属于小组；否则属于个人
      const { groupId } = req.body
      
      const result = await db.query(
        `INSERT INTO projects (name, script_title, script_content, work_style, work_background, analysis_result, user_id, group_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          name,
          scriptTitle || null,
          scriptContent || null,
          workStyle || null,
          workBackground || null,
          analysisResult ? JSON.stringify(analysisResult) : null,
          groupId ? null : userId, // 如果属于小组，user_id 为 null
          groupId || null,
        ]
      )
      project = result.rows[0]
      console.log(`✅ 项目已创建: ${name} (ID: ${project.id}, User: ${userId})`)
      
      // 如果有分镜数据，保存到shots表
      if (segments && Array.isArray(segments) && segments.length > 0) {
        try {
          console.log(`📝 开始保存分镜数据到数据库，数量: ${segments.length}`)
          for (const seg of segments) {
            await db.query(
              `INSERT INTO shots (project_id, shot_number, description, prompt, segment, style, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [
                project.id,
                seg.shotNumber || 1,
                seg.description || '',
                seg.prompt || '',
                seg.segment || '',
                workStyle || '三维动漫风',
              ]
            )
          }
          console.log(`✅ 分镜数据已保存到数据库，数量: ${segments.length}`)
        } catch (shotsError) {
          console.error('保存分镜数据失败:', shotsError)
          // 不阻止项目创建，只记录错误
        }
      }
      
      // 自动创建项目文件夹
      try {
        const path = await import('path')
        const os = await import('os')
        const fs = await import('fs')
        const homeDir = os.homedir()
        const projectsFolder = path.join(homeDir, 'Documents', 'AIGC-Projects', name)
        await fs.promises.mkdir(projectsFolder, { recursive: true })
        console.log(`✅ 项目文件夹已创建: ${projectsFolder}`)
      } catch (folderError) {
        console.warn(`⚠️ 创建项目文件夹失败（不影响项目创建）:`, folderError.message)
      }
    }

    res.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        scriptTitle: project.script_title,
        scriptContent: project.script_content,
        workStyle: project.work_style,
        workBackground: project.work_background,
        analysisResult: project.analysis_result,
      },
    })
  } catch (error) {
    console.error('创建/更新项目失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '创建/更新项目失败',
    })
  }
})

// 复制项目（包括所有数据、文件夹内容）
app.post('/api/projects/:projectId/copy', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const { targetProjectId } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }

    const pool = await import('./db/connection.js')
    const db = pool.default

    // 获取源项目信息
    const sourceProject = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [parseInt(projectId), userId]
    )

    if (sourceProject.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '源项目不存在',
      })
    }

    // 获取目标项目信息
    const targetProject = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [parseInt(targetProjectId), userId]
    )

    if (targetProject.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '目标项目不存在',
      })
    }

    const source = sourceProject.rows[0]
    const target = targetProject.rows[0]

    // 复制项目数据：角色、场景、物品
    // 复制角色
    const sourceCharacters = await db.query(
      'SELECT * FROM characters WHERE project_id = $1',
      [source.id]
    )
    for (const char of sourceCharacters.rows) {
      await db.query(
        'INSERT INTO characters (project_id, name, description, image_url) VALUES ($1, $2, $3, $4)',
        [target.id, char.name, char.description, char.image_url]
      )
    }

    // 复制场景
    const sourceScenes = await db.query(
      'SELECT * FROM scenes WHERE project_id = $1',
      [source.id]
    )
    for (const scene of sourceScenes.rows) {
      await db.query(
        'INSERT INTO scenes (project_id, name, description, image_url) VALUES ($1, $2, $3, $4)',
        [target.id, scene.name, scene.description, scene.image_url]
      )
    }

    // 复制物品
    const sourceItems = await db.query(
      'SELECT * FROM items WHERE project_id = $1',
      [source.id]
    )
    for (const item of sourceItems.rows) {
      await db.query(
        'INSERT INTO items (project_id, name, description, image_url) VALUES ($1, $2, $3, $4)',
        [target.id, item.name, item.description, item.image_url]
      )
    }

    // 复制文件夹内容
    try {
      const path = await import('path')
      const os = await import('os')
      const fs = await import('fs')
      const homeDir = os.homedir()
      const sourceFolder = path.join(homeDir, 'Documents', 'AIGC-Projects', source.name)
      const targetFolder = path.join(homeDir, 'Documents', 'AIGC-Projects', target.name)

      // 复制文件夹内容
      const copyFolder = async (src, dest) => {
        await fs.promises.mkdir(dest, { recursive: true })
        const entries = await fs.promises.readdir(src, { withFileTypes: true })
        
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          
          if (entry.isDirectory()) {
            await copyFolder(srcPath, destPath)
          } else {
            await fs.promises.copyFile(srcPath, destPath)
          }
        }
      }

      if (await fs.promises.access(sourceFolder).then(() => true).catch(() => false)) {
        await copyFolder(sourceFolder, targetFolder)
        console.log(`✅ 项目文件夹内容已复制: ${source.name} -> ${target.name}`)
      }
    } catch (folderError) {
      console.warn(`⚠️ 复制项目文件夹失败（不影响数据复制）:`, folderError.message)
    }

    res.json({
      success: true,
      message: `项目已复制到 "${target.name}"`,
    })
  } catch (error) {
    console.error('复制项目失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '复制项目失败',
    })
  }
})

// 移动项目（剪切）
app.post('/api/projects/:projectId/move', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const { targetProjectId } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }

    const pool = await import('./db/connection.js')
    const db = pool.default

    // 获取源项目信息
    const sourceProject = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [parseInt(projectId), userId]
    )

    if (sourceProject.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '源项目不存在',
      })
    }

    // 获取目标项目信息
    const targetProject = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [parseInt(targetProjectId), userId]
    )

    if (targetProject.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '目标项目不存在',
      })
    }

    const source = sourceProject.rows[0]
    const target = targetProject.rows[0]

    // 移动项目数据：更新角色、场景、物品的project_id
    await db.query(
      'UPDATE characters SET project_id = $1 WHERE project_id = $2',
      [target.id, source.id]
    )
    await db.query(
      'UPDATE scenes SET project_id = $1 WHERE project_id = $2',
      [target.id, source.id]
    )
    await db.query(
      'UPDATE items SET project_id = $1 WHERE project_id = $2',
      [target.id, source.id]
    )

    // 移动文件夹内容
    try {
      const path = await import('path')
      const os = await import('os')
      const fs = await import('fs')
      const homeDir = os.homedir()
      const sourceFolder = path.join(homeDir, 'Documents', 'AIGC-Projects', source.name)
      const targetFolder = path.join(homeDir, 'Documents', 'AIGC-Projects', target.name)

      // 移动文件夹内容
      const moveFolder = async (src, dest) => {
        await fs.promises.mkdir(dest, { recursive: true })
        const entries = await fs.promises.readdir(src, { withFileTypes: true })
        
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          
          if (entry.isDirectory()) {
            await moveFolder(srcPath, destPath)
            await fs.promises.rmdir(srcPath)
          } else {
            await fs.promises.rename(srcPath, destPath)
          }
        }
      }

      if (await fs.promises.access(sourceFolder).then(() => true).catch(() => false)) {
        await moveFolder(sourceFolder, targetFolder)
        // 删除源文件夹（如果为空）
        try {
          await fs.promises.rmdir(sourceFolder)
        } catch {
          // 忽略删除失败（可能文件夹不为空）
        }
        console.log(`✅ 项目文件夹内容已移动: ${source.name} -> ${target.name}`)
      }
    } catch (folderError) {
      console.warn(`⚠️ 移动项目文件夹失败（不影响数据移动）:`, folderError.message)
    }

    // 删除源项目
    await db.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [source.id, userId])

    res.json({
      success: true,
      message: `项目已移动到 "${target.name}"`,
    })
  } catch (error) {
    console.error('移动项目失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '移动项目失败',
    })
  }
})

// 更新项目名称
app.put('/api/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const { name } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '项目名称不能为空',
      })
    }

    const pool = await import('./db/connection.js')
    const db = pool.default

    // 先获取旧项目名称（用于重命名文件夹）
    const oldProject = await db.query(
      'SELECT name FROM projects WHERE id = $1 AND user_id = $2',
      [parseInt(projectId), userId]
    )

    if (oldProject.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '项目不存在或无权访问',
      })
    }

    const oldName = oldProject.rows[0].name

    // 更新项目名称
    const result = await db.query(
      `UPDATE projects 
       SET name = $1, script_title = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [name.trim(), parseInt(projectId), userId]
    )

    // 重命名文件夹
    if (oldName !== name.trim()) {
      try {
        const path = await import('path')
        const os = await import('os')
        const fs = await import('fs')
        const homeDir = os.homedir()
        const oldFolder = path.join(homeDir, 'Documents', 'AIGC-Projects', oldName)
        const newFolder = path.join(homeDir, 'Documents', 'AIGC-Projects', name.trim())
        
        // 如果旧文件夹存在，重命名
        try {
          await fs.promises.access(oldFolder)
          await fs.promises.rename(oldFolder, newFolder)
          console.log(`✅ 项目文件夹已重命名: ${oldName} -> ${name.trim()}`)
        } catch {
          // 如果旧文件夹不存在，创建新文件夹
          await fs.promises.mkdir(newFolder, { recursive: true })
          console.log(`✅ 项目文件夹已创建: ${name.trim()}`)
        }
      } catch (folderError) {
        console.warn(`⚠️ 重命名项目文件夹失败（不影响项目重命名）:`, folderError.message)
      }
    }

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        name: result.rows[0].name,
      },
    })
  } catch (error) {
    console.error('更新项目名称失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '更新项目名称失败',
    })
  }
})

// 删除项目
app.delete('/api/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }

    const pool = await import('./db/connection.js')
    const db = pool.default

    // 检查项目是否存在且属于当前用户
    const project = await db.query(
      'SELECT id, name FROM projects WHERE id = $1 AND user_id = $2',
      [parseInt(projectId), userId]
    )

    if (project.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '项目不存在或无权访问',
      })
    }

    const projectName = project.rows[0].name

    // 删除项目相关的所有数据（级联删除）
    // 注意：根据数据库外键约束，可能需要先删除关联数据
    await db.query('DELETE FROM shots WHERE project_id = $1', [parseInt(projectId)])
    await db.query('DELETE FROM characters WHERE project_id = $1', [parseInt(projectId)])
    await db.query('DELETE FROM scenes WHERE project_id = $1', [parseInt(projectId)])
    await db.query('DELETE FROM items WHERE project_id = $1', [parseInt(projectId)])
    
    // 尝试删除 fragments 表数据（如果表存在）
    try {
      await db.query('DELETE FROM fragments WHERE project_id = $1', [parseInt(projectId)])
    } catch (fragmentsError) {
      // 如果 fragments 表不存在，忽略错误（表可能尚未创建）
      if (!fragmentsError.message?.includes('does not exist')) {
        console.warn('删除 fragments 数据时出错（继续删除项目）:', fragmentsError.message)
      }
    }
    
    // 删除项目本身
    await db.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [parseInt(projectId), userId])

    // 尝试删除项目文件夹（如果存在）
    try {
      const path = await import('path')
      const os = await import('os')
      const fs = await import('fs')
      const homeDir = os.homedir()
      const projectFolder = path.join(homeDir, 'Documents', 'AIGC-Projects', projectName)
      
      if (await fs.promises.access(projectFolder).then(() => true).catch(() => false)) {
        await fs.promises.rm(projectFolder, { recursive: true, force: true })
        console.log(`✅ 项目文件夹已删除: ${projectName}`)
      }
    } catch (folderError) {
      console.warn(`⚠️ 删除项目文件夹失败（不影响项目删除）:`, folderError.message)
    }

    res.json({
      success: true,
      message: '项目已删除',
    })
  } catch (error) {
    console.error('删除项目失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '删除项目失败',
    })
  }
})

// 获取项目的COS文件列表
app.get('/api/projects/:projectId/cos-files', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }

    const pool = await import('./db/connection.js')
    const db = pool.default

    // 获取项目信息
    const project = await db.query(
      'SELECT name FROM projects WHERE id = $1 AND user_id = $2',
      [parseInt(projectId), userId]
    )

    if (project.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '项目不存在',
      })
    }

    const { listFiles } = await import('./services/cosService.js')
    
    // 获取所有相关文件
    const prefixes = ['characters/', 'scenes/', 'items/', 'videos/', 'images/']
    const allFiles = []
    
    for (const prefix of prefixes) {
      try {
        const files = await listFiles(prefix, 10000)
        allFiles.push(...files)
      } catch (error) {
        console.warn(`获取 ${prefix} 文件列表失败:`, error)
      }
    }

    res.json({
      success: true,
      data: allFiles,
    })
  } catch (error) {
    console.error('获取COS文件列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取文件列表失败',
    })
  }
})

// 删除COS文件
app.delete('/api/cos/files', authenticateToken, async (req, res) => {
  try {
    const { keys } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要删除的文件key列表',
      })
    }

    const { deleteFiles } = await import('./services/cosService.js')
    await deleteFiles(keys)

    res.json({
      success: true,
      message: `已删除 ${keys.length} 个文件`,
    })
  } catch (error) {
    console.error('删除COS文件失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '删除文件失败',
    })
  }
})

// 清理项目的COS文件
app.post('/api/projects/:projectId/cleanup-cos', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const { keepKeys } = req.body // 可选：需要保留的文件key列表
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }

    const pool = await import('./db/connection.js')
    const db = pool.default

    // 获取项目信息
    const project = await db.query(
      'SELECT name FROM projects WHERE id = $1 AND user_id = $2',
      [parseInt(projectId), userId]
    )

    if (project.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '项目不存在',
      })
    }

    // 获取项目中正在使用的文件（从数据库）
    const [characters, scenes, items] = await Promise.all([
      db.query('SELECT image_url FROM characters WHERE project_id = $1', [parseInt(projectId)]),
      db.query('SELECT image_url FROM scenes WHERE project_id = $1', [parseInt(projectId)]),
      db.query('SELECT image_url FROM items WHERE project_id = $1', [parseInt(projectId)]),
    ])

    // 提取正在使用的COS key（从URL中提取）
    const usedKeys = new Set()
    const extractCosKey = (url) => {
      if (!url) return null
      // 从COS URL中提取key
      const match = url.match(/https?:\/\/[^\/]+\/(.+)/)
      return match ? match[1] : null
    }

    characters.rows.forEach(row => {
      const key = extractCosKey(row.image_url)
      if (key) usedKeys.add(key)
    })
    scenes.rows.forEach(row => {
      const key = extractCosKey(row.image_url)
      if (key) usedKeys.add(key)
    })
    items.rows.forEach(row => {
      const key = extractCosKey(row.image_url)
      if (key) usedKeys.add(key)
    })

    // 合并用户指定的保留文件
    const allKeepKeys = Array.from(usedKeys)
    if (keepKeys && Array.isArray(keepKeys)) {
      keepKeys.forEach(key => allKeepKeys.push(key))
    }

    const { cleanupProjectFiles } = await import('./services/cosService.js')
    const result = await cleanupProjectFiles(project.rows[0].name, allKeepKeys)

    res.json({
      success: true,
      data: result,
      message: `清理完成：删除 ${result.deleted} 个文件，保留 ${result.kept} 个文件`,
    })
  } catch (error) {
    console.error('清理项目COS文件失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '清理文件失败',
    })
  }
})

// 获取项目的所有角色（按用户隔离）
app.get('/api/projects/:projectId/characters', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 验证项目是否属于当前用户
    const parsedProjectId = parseInt(projectId, 10)
    if (isNaN(parsedProjectId)) {
      console.error(`❌ 无效的项目ID: ${projectId}`)
      return res.status(400).json({
        success: false,
        error: '无效的项目ID',
      })
    }
    
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [parsedProjectId, userId]
    )
    
    if (projectCheck.rows.length === 0) {
      console.error(`❌ 项目 ${parsedProjectId} 不存在或无权访问 (用户ID: ${userId})`)
      return res.status(403).json({
        success: false,
        error: '无权访问该项目',
      })
    }
    
    const result = await db.query(
      'SELECT id, name, description, image_url, created_at, updated_at FROM characters WHERE project_id = $1 ORDER BY created_at DESC',
      [parsedProjectId]
    )
    
    console.log(`📋 查询项目 ${parsedProjectId} 的角色，找到 ${result.rows.length} 个`)
    result.rows.forEach((row, index) => {
      console.log(`   角色 ${index + 1}: ID=${row.id}, 名称="${row.name}", 图片URL=${row.image_url || 'null'}`)
    })
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        image: row.image_url,
        image_url: row.image_url, // 同时返回两个字段，确保兼容性
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    })
  } catch (error) {
    console.error('获取角色列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取角色列表失败'
    })
  }
})

// 获取项目场景列表
app.get('/api/projects/:projectId/scenes', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 验证项目是否属于当前用户
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    
    if (projectCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '无权访问该项目',
      })
    }
    
    const result = await db.query(
      'SELECT id, name, description, image_url, created_at, updated_at FROM scenes WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    )
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id.toString(),
        name: row.name,
        description: row.description,
        image: row.image_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    })
  } catch (error) {
    console.error('获取场景列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取场景列表失败'
    })
  }
})

// 获取项目物品列表
app.get('/api/projects/:projectId/items', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 验证项目是否属于当前用户
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    
    if (projectCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '无权访问该项目',
      })
    }
    
    const result = await db.query(
      'SELECT id, name, description, image_url, created_at, updated_at FROM items WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    )
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id.toString(),
        name: row.name,
        description: row.description,
        image: row.image_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    })
  } catch (error) {
    console.error('获取物品列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取物品列表失败'
    })
  }
})

// 创建项目分镜（片段）
app.post('/api/projects/:projectId/shots', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const { shotNumber, description, prompt, segment, style } = req.body
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 验证项目是否属于当前用户
    const parsedProjectId = parseInt(projectId, 10)
    if (isNaN(parsedProjectId)) {
      return res.status(400).json({
        success: false,
        error: '无效的项目ID',
      })
    }
    
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [parsedProjectId, userId]
    )
    
    if (projectCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '无权访问该项目',
      })
    }
    
    // 如果没有指定shot_number，自动分配下一个
    let finalShotNumber = shotNumber
    if (!finalShotNumber) {
      const maxShotResult = await db.query(
        'SELECT MAX(shot_number) as max_shot FROM shots WHERE project_id = $1',
        [parsedProjectId]
      )
      finalShotNumber = (maxShotResult.rows[0]?.max_shot || 0) + 1
    }
    
    const result = await db.query(
      `INSERT INTO shots (project_id, shot_number, description, prompt, segment, style, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, shot_number, description, prompt, segment, style, created_at`,
      [parsedProjectId, finalShotNumber, description || prompt || segment, prompt || description || segment, segment || description || prompt, style || null]
    )
    
    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        shot_number: result.rows[0].shot_number,
        description: result.rows[0].description,
        prompt: result.rows[0].prompt,
        segment: result.rows[0].segment,
        style: result.rows[0].style,
        created_at: result.rows[0].created_at,
      },
    })
  } catch (error) {
    console.error('创建分镜失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '创建分镜失败',
    })
  }
})

// 获取项目分镜列表（包含提示词）
app.get('/api/projects/:projectId/shots', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 验证项目是否属于当前用户
    const parsedProjectId = parseInt(projectId, 10)
    if (isNaN(parsedProjectId)) {
      return res.status(400).json({
        success: false,
        error: '无效的项目ID',
      })
    }
    
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [parsedProjectId, userId]
    )
    
    if (projectCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '无权访问该项目',
      })
    }
    
    const result = await db.query(
      'SELECT id, shot_number, description, prompt, segment, style, scene_description, visual_focus, model, aspect_ratio, quantity, thumbnail_image_url, created_at, updated_at FROM shots WHERE project_id = $1 ORDER BY shot_number ASC',
      [parsedProjectId]
    )
    
    console.log(`📋 查询项目 ${parsedProjectId} 的分镜，找到 ${result.rows.length} 个`)
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        shotNumber: row.shot_number,
        description: row.description || '',
        prompt: row.prompt || '',
        segment: row.segment || '',
        style: row.style || '三维动漫风',
        sceneDescription: row.scene_description || '',
        visualFocus: row.visual_focus || '',
        model: row.model || 'nano-banana-pro',
        aspectRatio: row.aspect_ratio || '16:9',
        quantity: row.quantity || 1,
        thumbnailImage: row.thumbnail_image_url || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    })
  } catch (error) {
    console.error('获取分镜列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取分镜列表失败'
    })
  }
})

// 获取项目片段列表（包含视频）
app.get('/api/projects/:projectId/fragments', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 验证项目是否属于当前用户
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    
    if (projectCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '无权访问该项目',
      })
    }
    
    // 获取所有分镜（shots），每个分镜可能对应一个片段
    // 同时获取关联的视频URL（从fusions或shots表中）
    const shotsResult = await db.query(
      `SELECT s.id, s.shot_number, s.description, s.thumbnail_image_url,
              s.created_at, s.updated_at
       FROM shots s
       WHERE s.project_id = $1
       ORDER BY s.shot_number ASC, s.created_at DESC`,
      [projectId]
    )
    
    // 获取每个分镜的视频URL（从files表中查找video类型的文件）
    const fragments = await Promise.all(
      shotsResult.rows.map(async (shot) => {
        // 查找该分镜关联的视频文件（支持 shot_id 和 fragment_id）
        const videoFiles = await db.query(
          `SELECT f.cos_url, f.file_name, f.created_at
           FROM files f
           WHERE f.project_id = $1 
             AND f.file_type = 'video'
             AND (
               f.metadata->>'shot_id' = $2::text
               OR f.metadata->>'fragment_id' = $2::text
             )
           ORDER BY f.created_at DESC`,
          [projectId, shot.id.toString()]
        )
        
        return {
          id: shot.id.toString(),
          name: `分镜${shot.shot_number}`,
          description: shot.description,
          imageUrl: shot.thumbnail_image_url,
          videoUrls: videoFiles.rows.map(f => f.cos_url),
          createdAt: shot.created_at,
          updatedAt: shot.updated_at,
        }
      })
    )
    
    // 同时获取首尾帧视频（作为特殊片段）
    const firstLastFrameVideos = await db.query(
      `SELECT f.cos_url, f.file_name, f.created_at, f.metadata
       FROM files f
       WHERE f.project_id = $1 
         AND f.file_type = 'video'
         AND f.metadata->>'source' = 'first_last_frame_video'
       ORDER BY f.created_at DESC
       LIMIT 50`,
      [projectId]
    )
    
    // 将首尾帧视频添加到片段列表（如果有）
    if (firstLastFrameVideos.rows.length > 0) {
      const firstLastFrameFragment = {
        id: 'first-last-frame-videos',
        name: '首尾帧生视频',
        description: '首尾帧生成的视频',
        imageUrl: null,
        videoUrls: firstLastFrameVideos.rows.map(f => f.cos_url),
        createdAt: firstLastFrameVideos.rows[0].created_at,
        updatedAt: firstLastFrameVideos.rows[0].created_at,
      }
      fragments.push(firstLastFrameFragment)
    }
    
    res.json({
      success: true,
      data: fragments
    })
  } catch (error) {
    console.error('获取片段列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取片段列表失败'
    })
  }
})

// 删除片段（删除对应的分镜）
app.delete('/api/fragments/:fragmentId', authenticateToken, async (req, res) => {
  try {
    const { fragmentId } = req.params
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 检查分镜是否存在且属于当前用户的项目
    const shot = await db.query(
      `SELECT s.id, s.thumbnail_image_url, p.user_id 
       FROM shots s 
       JOIN projects p ON s.project_id = p.id 
       WHERE s.id = $1 AND p.user_id = $2`,
      [parseInt(fragmentId), userId]
    )
    
    if (shot.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '片段不存在或无权访问',
      })
    }
    
    // 删除关联的视频文件（从 files 表）
    const videoFiles = await db.query(
      `SELECT f.cos_key, f.cos_url
       FROM files f
       WHERE f.project_id = (SELECT project_id FROM shots WHERE id = $1)
         AND f.file_type = 'video'
         AND f.metadata->>'shot_id' = $2::text`,
      [parseInt(fragmentId), fragmentId]
    )
    
    // 删除COS中的视频文件
    if (videoFiles.rows.length > 0) {
      try {
        const { deleteFile } = await import('./services/cosService.js')
        for (const file of videoFiles.rows) {
          if (file.cos_key) {
            await deleteFile(file.cos_key).catch(err => {
              console.warn('删除COS视频文件失败:', err)
            })
          }
        }
      } catch (cosError) {
        console.warn('删除COS文件失败（继续删除数据库记录）:', cosError)
      }
    }
    
    // 删除缩略图（如果存在）
    if (shot.rows[0].thumbnail_image_url) {
      try {
        const { deleteFile } = await import('./services/cosService.js')
        const url = shot.rows[0].thumbnail_image_url
        const match = url.match(/https?:\/\/[^\/]+\/(.+)/)
        if (match) {
          await deleteFile(match[1]).catch(err => {
            console.warn('删除COS缩略图失败:', err)
          })
        }
      } catch (cosError) {
        console.warn('删除COS缩略图失败（继续删除数据库记录）:', cosError)
      }
    }
    
    // 删除关联的视频文件记录
    await db.query(
      `DELETE FROM files 
       WHERE project_id = (SELECT project_id FROM shots WHERE id = $1)
         AND file_type = 'video'
         AND metadata->>'shot_id' = $2::text`,
      [parseInt(fragmentId), fragmentId]
    )
    
    // 删除分镜记录（级联删除会处理关联表）
    await db.query('DELETE FROM shots WHERE id = $1', [parseInt(fragmentId)])
    
    res.json({
      success: true,
      message: '片段已删除',
    })
  } catch (error) {
    console.error('删除片段失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '删除片段失败',
    })
  }
})

// 上传 base64 图片到 COS
app.post('/api/upload-base64-image', authenticateToken, async (req, res) => {
  try {
    const { base64Image } = req.body

    if (!base64Image || !base64Image.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的 base64 图片数据'
      })
    }

    // 解析 base64 数据
    const base64Data = base64Image.split(',')[1]
    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: 'base64 图片数据格式不正确'
      })
    }

    const mimeType = base64Image.match(/data:([^;]+)/)?.[1] || 'image/png'
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // 生成 COS key
    const { generateCosKey } = await import('./services/cosService.js')
    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' :
                mimeType.includes('png') ? 'png' :
                mimeType.includes('gif') ? 'gif' :
                mimeType.includes('webp') ? 'webp' : 'jpg'
    const cosKey = generateCosKey('images', `poster.${ext}`)

    // 上传到 COS
    const { uploadBuffer } = await import('./services/cosService.js')
    const result = await uploadBuffer(imageBuffer, cosKey, mimeType)

    console.log(`✅ Base64 图片上传成功: ${result.url}`)
    console.log(`   图片大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`)

    res.json({
      success: true,
      data: {
        url: result.url,
        key: result.key,
      }
    })
  } catch (error) {
    console.error('❌ Base64 图片上传失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '图片上传失败'
    })
  }
})

// 删除角色
app.delete('/api/characters/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 检查角色是否存在且属于当前用户的项目
    const character = await db.query(
      `SELECT c.id, c.image_url, p.user_id 
       FROM characters c 
       JOIN projects p ON c.project_id = p.id 
       WHERE c.id = $1 AND p.user_id = $2`,
      [parseInt(id), userId]
    )
    
    if (character.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '角色不存在或无权访问',
      })
    }
    
    // 删除COS文件（如果存在）
    if (character.rows[0].image_url) {
      try {
        const { deleteFile } = await import('./services/cosService.js')
        // 从URL中提取COS key
        const url = character.rows[0].image_url
        const match = url.match(/https?:\/\/[^\/]+\/(.+)/)
        if (match) {
          await deleteFile(match[1])
        }
      } catch (cosError) {
        console.warn('删除COS文件失败（继续删除数据库记录）:', cosError)
      }
    }
    
    // 删除数据库记录
    await db.query('DELETE FROM characters WHERE id = $1', [parseInt(id)])
    
    res.json({
      success: true,
      message: '角色已删除',
    })
  } catch (error) {
    console.error('删除角色失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '删除角色失败',
    })
  }
})

// 上传场景图片到COS并保存到数据库
app.post('/api/upload-scene-image', authenticateToken, uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传图片文件'
      })
    }

    const { projectId, sceneId, sceneName, projectName } = req.body
    
    if (!projectId && !projectName) {
      return res.status(400).json({
        success: false,
        error: '请提供项目ID或项目名称'
      })
    }
    
    // 处理projectId：查找数据库中的真实ID
    let dbProjectId = null
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    if (projectId) {
      const parsedId = parseInt(projectId)
      if (!isNaN(parsedId)) {
        const projectCheck = await db.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [parsedId, req.user?.id])
        if (projectCheck.rows.length > 0) {
          dbProjectId = parsedId
        }
      }
      
      if (!dbProjectId && projectName) {
        const projectByName = await db.query('SELECT id FROM projects WHERE name = $1 AND user_id = $2', [projectName, req.user?.id])
        if (projectByName.rows.length > 0) {
          dbProjectId = projectByName.rows[0].id
        }
      }
    } else if (projectName) {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '未登录，请先登录',
        })
      }
      // 先尝试精确匹配
      let projectByName = await db.query('SELECT id, name FROM projects WHERE name = $1 AND user_id = $2', [projectName.trim(), userId])
      
      // 如果精确匹配失败，尝试模糊匹配（去除空格）
      if (projectByName.rows.length === 0) {
        projectByName = await db.query(
          'SELECT id, name FROM projects WHERE TRIM(name) = $1 AND user_id = $2',
          [projectName.trim(), userId]
        )
      }
      
      // 如果还是找不到，尝试匹配 script_title
      if (projectByName.rows.length === 0) {
        projectByName = await db.query(
          'SELECT id, name FROM projects WHERE script_title = $1 AND user_id = $2',
          [projectName.trim(), userId]
        )
      }
      
      if (projectByName.rows.length > 0) {
        dbProjectId = projectByName.rows[0].id
        console.log(`✅ 通过项目名称找到项目: "${projectName}" -> ID: ${dbProjectId}, 数据库名称: "${projectByName.rows[0].name}"`)
      } else {
        // 列出所有项目以便调试
        const allProjects = await db.query('SELECT id, name, script_title, user_id FROM projects WHERE user_id = $1', [userId])
        console.log(`❌ 项目查找失败: 项目名称="${projectName}", 用户ID=${userId}`)
        console.log(`   当前用户的所有项目:`, allProjects.rows.map(p => ({ id: p.id, name: p.name, script_title: p.script_title })))
        return res.status(404).json({
          success: false,
          error: `项目不存在，请先创建项目。查找的项目名称: "${projectName}"`
        })
      }
    }
    
    if (!dbProjectId) {
      return res.status(400).json({
        success: false,
        error: '无法找到对应的项目，请确保项目已创建'
      })
    }

    // 直接从内存获取文件Buffer
    const imageBuffer = req.file.buffer
    
    // 生成COS路径
    const { generateCosKey } = await import('./services/cosService.js')
    const ext = req.file.originalname.split('.').pop() || 'jpg'
    const cosKey = generateCosKey('scenes', `scene_${sceneId || Date.now()}.${ext}`)
    
    // 上传到COS
    const { uploadBuffer } = await import('./services/cosService.js')
    const uploadResult = await uploadBuffer(imageBuffer, cosKey, req.file.mimetype)
    
    console.log(`✅ 场景图片上传到COS成功: ${uploadResult.url}`)
    
    // 保存到数据库的场景名称
    const sceneNameToUse = sceneName || `场景_${Date.now()}`
    
    // 保存到数据库
    // 查找是否已存在该场景
    const findResult = await db.query(
      'SELECT id FROM scenes WHERE project_id = $1 AND name = $2',
      [dbProjectId, sceneNameToUse]
    )
    
    if (findResult.rows.length > 0) {
      // 更新现有场景
      await db.query(
        'UPDATE scenes SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [uploadResult.url, findResult.rows[0].id]
      )
      
      res.json({
        success: true,
        data: {
            url: uploadResult.url, // COS URL
            key: uploadResult.key, // COS key
            sceneId: findResult.rows[0].id, // 数据库ID
            projectId: dbProjectId, // 项目ID
          }
      })
      
        console.log(`✅ 场景 "${sceneNameToUse}" 保存完成:`)
        console.log(`   - COS URL: ${uploadResult.url}`)
        console.log(`   - 数据库ID: ${findResult.rows[0].id}`)
    } else {
      // 创建新场景
      const insertResult = await db.query(
        'INSERT INTO scenes (project_id, name, image_url) VALUES ($1, $2, $3) RETURNING id',
        [dbProjectId, sceneNameToUse, uploadResult.url]
      )
      
      res.json({
        success: true,
        data: {
          url: uploadResult.url, // COS URL
          key: uploadResult.key, // COS key
          sceneId: insertResult.rows[0].id, // 数据库ID
          projectId: dbProjectId, // 项目ID
        }
      })
      
      console.log(`✅ 场景 "${sceneNameToUse}" 保存完成:`)
      console.log(`   - COS URL: ${uploadResult.url}`)
      console.log(`   - 数据库ID: ${insertResult.rows[0].id}`)
    }
  } catch (error) {
    console.error('场景图片上传失败:', error)
    
    // 使用内存存储，无需清理临时文件
    
    res.status(500).json({
      success: false,
      error: error.message || '场景图片上传失败'
    })
  }
})

// 删除场景
app.delete('/api/scenes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 检查场景是否存在且属于当前用户的项目
    const scene = await db.query(
      `SELECT s.id, s.image_url, p.user_id 
       FROM scenes s 
       JOIN projects p ON s.project_id = p.id 
       WHERE s.id = $1 AND p.user_id = $2`,
      [parseInt(id), userId]
    )
    
    if (scene.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '场景不存在或无权访问',
      })
    }
    
    // 删除COS文件（如果存在）
    if (scene.rows[0].image_url) {
      try {
        const { deleteFile } = await import('./services/cosService.js')
        // 从URL中提取COS key
        const url = scene.rows[0].image_url
        const match = url.match(/https?:\/\/[^\/]+\/(.+)/)
        if (match) {
          await deleteFile(match[1])
        }
      } catch (cosError) {
        console.warn('删除COS文件失败（继续删除数据库记录）:', cosError)
      }
    }
    
    // 删除数据库记录
    await db.query('DELETE FROM scenes WHERE id = $1', [parseInt(id)])
    
    res.json({
      success: true,
      message: '场景已删除',
    })
  } catch (error) {
    console.error('删除场景失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '删除场景失败',
    })
  }
})

// 上传物品图片到COS并保存到数据库
app.post('/api/upload-item-image', authenticateToken, uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传图片文件'
      })
    }

    const { projectId, itemId, itemName, projectName } = req.body
    
    if (!projectId && !projectName) {
      return res.status(400).json({
        success: false,
        error: '请提供项目ID或项目名称'
      })
    }
    
    // 处理projectId：查找数据库中的真实ID
    let dbProjectId = null
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    if (projectId) {
      const parsedId = parseInt(projectId)
      if (!isNaN(parsedId)) {
        const projectCheck = await db.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [parsedId, req.user?.id])
        if (projectCheck.rows.length > 0) {
          dbProjectId = parsedId
        }
      }
      
      if (!dbProjectId && projectName) {
        const projectByName = await db.query('SELECT id FROM projects WHERE name = $1 AND user_id = $2', [projectName, req.user?.id])
        if (projectByName.rows.length > 0) {
          dbProjectId = projectByName.rows[0].id
        }
      }
    } else if (projectName) {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '未登录，请先登录',
        })
      }
      // 先尝试精确匹配
      let projectByName = await db.query('SELECT id, name FROM projects WHERE name = $1 AND user_id = $2', [projectName.trim(), userId])
      
      // 如果精确匹配失败，尝试模糊匹配（去除空格）
      if (projectByName.rows.length === 0) {
        projectByName = await db.query(
          'SELECT id, name FROM projects WHERE TRIM(name) = $1 AND user_id = $2',
          [projectName.trim(), userId]
        )
      }
      
      // 如果还是找不到，尝试匹配 script_title
      if (projectByName.rows.length === 0) {
        projectByName = await db.query(
          'SELECT id, name FROM projects WHERE script_title = $1 AND user_id = $2',
          [projectName.trim(), userId]
        )
      }
      
      if (projectByName.rows.length > 0) {
        dbProjectId = projectByName.rows[0].id
        console.log(`✅ 通过项目名称找到项目: "${projectName}" -> ID: ${dbProjectId}, 数据库名称: "${projectByName.rows[0].name}"`)
      } else {
        // 列出所有项目以便调试
        const allProjects = await db.query('SELECT id, name, script_title, user_id FROM projects WHERE user_id = $1', [userId])
        console.log(`❌ 项目查找失败: 项目名称="${projectName}", 用户ID=${userId}`)
        console.log(`   当前用户的所有项目:`, allProjects.rows.map(p => ({ id: p.id, name: p.name, script_title: p.script_title })))
        return res.status(404).json({
          success: false,
          error: `项目不存在，请先创建项目。查找的项目名称: "${projectName}"`
        })
      }
    }
    
    if (!dbProjectId) {
      return res.status(400).json({
        success: false,
        error: '无法找到对应的项目，请确保项目已创建'
      })
    }

    // 直接从内存获取文件Buffer
    const imageBuffer = req.file.buffer
    
    // 生成COS路径
    const { generateCosKey } = await import('./services/cosService.js')
    const ext = req.file.originalname.split('.').pop() || 'jpg'
    const cosKey = generateCosKey('items', `item_${itemId || Date.now()}.${ext}`)
    
    // 上传到COS
    const { uploadBuffer } = await import('./services/cosService.js')
    const uploadResult = await uploadBuffer(imageBuffer, cosKey, req.file.mimetype)
    
    console.log(`✅ 物品图片上传到COS成功: ${uploadResult.url}`)
    
    // 保存到数据库（itemNameToUse已在上面定义）
    
    // 查找是否已存在该物品
    const findResult = await db.query(
      'SELECT id FROM items WHERE project_id = $1 AND name = $2',
      [dbProjectId, itemNameToUse]
    )
    
    if (findResult.rows.length > 0) {
      // 更新现有物品
      await db.query(
        'UPDATE items SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [uploadResult.url, findResult.rows[0].id]
      )
      
      res.json({
        success: true,
        data: {
            url: uploadResult.url, // COS URL
            key: uploadResult.key, // COS key
            itemId: findResult.rows[0].id, // 数据库ID
            projectId: dbProjectId, // 项目ID
          }
      })
      
        console.log(`✅ 物品 "${itemNameToUse}" 保存完成:`)
        console.log(`   - COS URL: ${uploadResult.url}`)
        console.log(`   - 数据库ID: ${findResult.rows[0].id}`)
    } else {
      // 创建新物品
      const insertResult = await db.query(
        'INSERT INTO items (project_id, name, image_url) VALUES ($1, $2, $3) RETURNING id',
        [dbProjectId, itemNameToUse, uploadResult.url]
      )
      
      res.json({
        success: true,
        data: {
          url: uploadResult.url, // COS URL
          key: uploadResult.key, // COS key
          itemId: insertResult.rows[0].id, // 数据库ID
          projectId: dbProjectId, // 项目ID
        }
      })
      
      console.log(`✅ 物品 "${itemNameToUse}" 保存完成:`)
      console.log(`   - COS URL: ${uploadResult.url}`)
      console.log(`   - 数据库ID: ${insertResult.rows[0].id}`)
    }
  } catch (error) {
    console.error('物品图片上传失败:', error)
    
    // 使用内存存储，无需清理临时文件
    
    res.status(500).json({
      success: false,
      error: error.message || '物品图片上传失败'
    })
  }
})

// 删除物品
app.delete('/api/items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }
    
    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 检查物品是否存在且属于当前用户的项目
    const item = await db.query(
      `SELECT i.id, i.image_url, p.user_id 
       FROM items i 
       JOIN projects p ON i.project_id = p.id 
       WHERE i.id = $1 AND p.user_id = $2`,
      [parseInt(id), userId]
    )
    
    if (item.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '物品不存在或无权访问',
      })
    }
    
    // 删除COS文件（如果存在）
    if (item.rows[0].image_url) {
      try {
        const { deleteFile } = await import('./services/cosService.js')
        // 从URL中提取COS key
        const url = item.rows[0].image_url
        const match = url.match(/https?:\/\/[^\/]+\/(.+)/)
        if (match) {
          await deleteFile(match[1])
        }
      } catch (cosError) {
        console.warn('删除COS文件失败（继续删除数据库记录）:', cosError)
      }
    }
    
    // 删除数据库记录
    await db.query('DELETE FROM items WHERE id = $1', [parseInt(id)])
    
    res.json({
      success: true,
      message: '物品已删除',
    })
  } catch (error) {
    console.error('删除物品失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '删除物品失败',
    })
  }
})

// 上传 base64 图片到 COS（用于场景和物品）
app.post('/api/upload-asset-base64-image', authenticateToken, async (req, res) => {
  try {
    const { base64Image, assetType, assetName, projectName } = req.body

    if (!base64Image || !base64Image.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的 base64 图片数据'
      })
    }

    if (!assetType || !['character', 'scene', 'item'].includes(assetType)) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的资产类型（character/scene/item）'
      })
    }

    if (!projectName) {
      return res.status(400).json({
        success: false,
        error: '请提供项目名称'
      })
    }

    // 解析 base64 数据
    const base64Data = base64Image.split(',')[1]
    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: 'base64 图片数据格式不正确'
      })
    }

    const mimeType = base64Image.match(/data:([^;]+)/)?.[1] || 'image/png'
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // 查找项目ID（按用户过滤）
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }

    const pool = await import('./db/connection.js')
    const db = pool.default
    
    // 先尝试精确匹配
    let projectResult = await db.query('SELECT id FROM projects WHERE name = $1 AND user_id = $2', [projectName, userId])
    
    // 如果精确匹配失败，尝试模糊匹配（去除空格）
    if (projectResult.rows.length === 0) {
      projectResult = await db.query(
        'SELECT id FROM projects WHERE TRIM(name) = $1 AND user_id = $2',
        [projectName.trim(), userId]
      )
    }
    
    // 如果还是找不到，尝试匹配 script_title
    if (projectResult.rows.length === 0) {
      projectResult = await db.query(
        'SELECT id FROM projects WHERE script_title = $1 AND user_id = $2',
        [projectName.trim(), userId]
      )
    }
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `项目不存在，请先创建项目。查找的项目名称: "${projectName}"`
      })
    }

    const dbProjectId = projectResult.rows[0].id

    // 生成 COS key
    const { generateCosKey } = await import('./services/cosService.js')
    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' :
                mimeType.includes('png') ? 'png' :
                mimeType.includes('gif') ? 'gif' :
                mimeType.includes('webp') ? 'webp' : 'jpg'
    const cosKey = generateCosKey(assetType === 'character' ? 'characters' : assetType === 'scene' ? 'scenes' : 'items', 
                                   `${assetType}_${Date.now()}.${ext}`)

    // 上传到 COS
    const { uploadBuffer } = await import('./services/cosService.js')
    const uploadResult = await uploadBuffer(imageBuffer, cosKey, mimeType)

    console.log(`✅ ${assetType} 图片上传到COS成功: ${uploadResult.url}`)

    // 保存到数据库的资产名称
    const assetNameToUse = assetName || `${assetType}_${Date.now()}`

    // 保存到数据库
    const tableName = assetType === 'character' ? 'characters' : assetType === 'scene' ? 'scenes' : 'items'
    const idColumn = assetType === 'character' ? 'characterId' : assetType === 'scene' ? 'sceneId' : 'itemId'

    // 查找是否已存在
    const findResult = await db.query(
      `SELECT id FROM ${tableName} WHERE project_id = $1 AND name = $2`,
      [dbProjectId, assetNameToUse]
    )

    let assetId
    if (findResult.rows.length > 0) {
      // 更新现有资产
      await db.query(
        `UPDATE ${tableName} SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [uploadResult.url, findResult.rows[0].id]
      )
      assetId = findResult.rows[0].id
      console.log(`✅ ${assetType} 数据库记录已更新: ID=${assetId}, URL=${uploadResult.url}`)
    } else {
      // 创建新资产
      const insertResult = await db.query(
        `INSERT INTO ${tableName} (project_id, name, image_url) VALUES ($1, $2, $3) RETURNING id`,
        [dbProjectId, assetNameToUse, uploadResult.url]
      )
      assetId = insertResult.rows[0].id
      console.log(`✅ ${assetType} 数据库记录已创建: ID=${assetId}, URL=${uploadResult.url}`)
    }

    // 同时保存到 generated_assets 表（用于跨设备同步）
    try {
      const assetCategory = assetType === 'character' ? 'character' : assetType === 'scene' ? 'scene' : 'item'
      await db.query(
        `INSERT INTO generated_assets (user_id, project_id, asset_type, asset_name, asset_category, cos_url, cos_key, mime_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [
          userId,
          dbProjectId,
          'image',
          assetNameToUse,
          assetCategory,
          uploadResult.url,
          uploadResult.key,
          mimeType,
          'completed'
        ]
      )
      console.log(`✅ ${assetType} 已保存到 generated_assets 表`)
    } catch (genAssetError) {
      console.error(`⚠️ 保存到 generated_assets 表失败（不影响主流程）:`, genAssetError)
      // 不阻止主流程，只记录错误
    }

    res.json({
      success: true,
      data: {
        url: uploadResult.url, // COS URL（永久保存）
        key: uploadResult.key, // COS key
        [idColumn]: assetId, // 数据库ID
        projectId: dbProjectId, // 项目ID
      }
    })
    
    console.log(`✅ ${assetType} "${assetNameToUse}" 保存完成:`)
    console.log(`   - COS URL: ${uploadResult.url}`)
    console.log(`   - 数据库ID: ${assetId}`)
  } catch (error) {
    console.error(`❌ ${req.body.assetType || '资产'} 图片上传失败:`, error)
    res.status(500).json({
      success: false,
      error: error.message || '图片上传失败'
    })
  }
})

// 获取用户的所有生成资产（用于跨设备同步）
app.get('/api/generated-assets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      })
    }

    const { projectId, assetType, assetCategory } = req.query
    
    const pool = await import('./db/connection.js')
    const db = pool.default

    let query = 'SELECT * FROM generated_assets WHERE user_id = $1'
    const params = [userId]

    if (projectId) {
      query += ' AND project_id = $' + (params.length + 1)
      params.push(parseInt(projectId))
    }

    if (assetType) {
      query += ' AND asset_type = $' + (params.length + 1)
      params.push(assetType)
    }

    if (assetCategory) {
      query += ' AND asset_category = $' + (params.length + 1)
      params.push(assetCategory)
    }

    query += ' ORDER BY created_at DESC'

    const result = await db.query(query, params)

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        assetType: row.asset_type,
        assetName: row.asset_name,
        assetCategory: row.asset_category,
        cosUrl: row.cos_url,
        cosKey: row.cos_key,
        thumbnailUrl: row.thumbnail_url,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        model: row.model,
        prompt: row.prompt,
        metadata: row.metadata,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    })
  } catch (error) {
    console.error('获取生成资产列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取生成资产列表失败'
    })
  }
})

// 打开Photoshop应用
app.post('/api/open-photoshop', authenticateToken, async (req, res) => {
  try {
    const { 
      paths = [], 
      autoCreateProject = false,
      autoImportPoster = false,
      posterUrl = '',
      projectName = '新项目'
    } = req.body

    // 获取系统信息
    const os = await import('os')
    const fs = await import('fs')
    const path = await import('path')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    const homeDir = os.homedir()
    const desktopPath = path.join(homeDir, 'Desktop')
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    
    // 构建完整的路径列表（按优先级排序）
    const allPaths = [
      // 0. 环境变量中配置的路径（最高优先级）
      ...(process.env.PHOTOSHOP_PATH ? [process.env.PHOTOSHOP_PATH] : []),
      
      // 1. 桌面快捷方式（最常见）
      path.join(desktopPath, 'Adobe Photoshop.lnk'),
      path.join(desktopPath, 'Adobe Photoshop 2025.lnk'),
      path.join(desktopPath, 'Photoshop.lnk'),
      path.join(desktopPath, 'PS.lnk'),
      
      // 2. 桌面可执行文件
      path.join(desktopPath, 'Adobe Photoshop.exe'),
      path.join(desktopPath, 'Photoshop.exe'),
      
      // 3. 用户传入的路径
      ...paths,
      
      // 4. 常见安装路径（Program Files）
      path.join(programFiles, 'Adobe', 'Adobe Photoshop 2025', 'Photoshop.exe'),
      path.join(programFiles, 'Adobe', 'Adobe Photoshop 2024', 'Photoshop.exe'),
      path.join(programFiles, 'Adobe', 'Adobe Photoshop 2023', 'Photoshop.exe'),
      path.join(programFiles, 'Adobe', 'Adobe Photoshop 2022', 'Photoshop.exe'),
      path.join(programFiles, 'Adobe', 'Adobe Photoshop 2021', 'Photoshop.exe'),
      path.join(programFiles, 'Adobe', 'Adobe Photoshop CC 2019', 'Photoshop.exe'),
      path.join(programFiles, 'Adobe', 'Adobe Photoshop CC 2020', 'Photoshop.exe'),
      path.join(programFilesX86, 'Adobe', 'Adobe Photoshop 2025', 'Photoshop.exe'),
      path.join(programFilesX86, 'Adobe', 'Adobe Photoshop 2024', 'Photoshop.exe'),
      path.join(programFilesX86, 'Adobe', 'Adobe Photoshop 2023', 'Photoshop.exe'),
    ]

    console.log('🔍 开始查找Photoshop应用，尝试路径数量:', allPaths.length)

    // 尝试打开每个路径
    for (const filePath of allPaths) {
      try {
        // 检查文件是否存在
        if (fs.existsSync(filePath)) {
          console.log(`✅ 找到Photoshop: ${filePath}`)
          
          let command
          if (filePath.endsWith('.lnk')) {
            // 快捷方式使用 start 命令打开（Windows）
            command = `start "" "${filePath}"`
          } else if (filePath.endsWith('.exe')) {
            // exe文件直接执行
            command = `"${filePath}"`
          } else {
            // 其他文件类型，尝试用默认程序打开
            command = `start "" "${filePath}"`
          }
          
          // 执行命令（不等待结果，立即返回）
          exec(command, (error) => {
            if (error) {
              console.error(`❌ 执行命令失败: ${command}`, error.message)
            } else {
              console.log(`✅ 成功执行命令: ${command}`)
            }
          })
          
          // 如果启用了自动新建项目和导入海报图，执行自动化操作
          if (autoCreateProject && autoImportPoster && posterUrl) {
            console.log(`📦 准备自动新建项目并导入海报图到Photoshop`)
            console.log(`📋 项目名称: ${projectName}`)
            console.log(`🖼️ 海报图URL: ${posterUrl.substring(0, 100)}...`)
            
            // 延迟执行自动化，等待 Photoshop 启动
            // 注意：Photoshop 启动可能需要更长时间，特别是第一次启动
            setTimeout(async () => {
              try {
                const { createAndImport } = await import('./services/photoshopAutomationService.js')
                const result = await createAndImport({
                  projectName,
                  imageUrl: posterUrl,
                  width: 1920,
                  height: 1080,
                  resolution: 72
                })
                console.log('✅ Photoshop 自动化执行成功:', result)
              } catch (error) {
                console.error('❌ Photoshop 自动化执行失败:', error)
                console.error('❌ 错误堆栈:', error.stack)
              }
            }, 8000) // 增加延迟到 8 秒，确保 Photoshop 完全启动
          }
          
          // 立即返回成功，不等待执行结果
          return res.json({
            success: true,
            message: autoCreateProject && autoImportPoster && posterUrl
              ? '正在打开Photoshop并导入海报图...'
              : '正在打开Photoshop...',
            path: filePath
          })
        }
      } catch (error) {
        // 继续尝试下一个路径
        continue
      }
    }

    // 如果所有路径都失败了，尝试通过Windows注册表查找
    try {
      console.log('🔍 尝试通过注册表查找Photoshop...')
      try {
        const { stdout } = await execAsync(
          'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "Adobe Photoshop" 2>nul'
        )
        
        if (stdout) {
          console.log('📋 注册表查询结果（HKCU）:', stdout.substring(0, 300))
          const installLocationMatch = stdout.match(/InstallLocation\s+REG_SZ\s+(.+)/i)
          if (installLocationMatch) {
            const installPath = installLocationMatch[1].trim()
            const exePath = path.join(installPath, 'Photoshop.exe')
            if (fs.existsSync(exePath)) {
              exec(`"${exePath}"`, () => {})
              return res.json({
                success: true,
                message: '正在打开Photoshop...',
                path: exePath
              })
            }
          }
        }
      } catch (e) {
        console.log('⚠️ HKCU注册表查询失败:', e.message)
      }
    } catch (regError) {
      console.log('⚠️ 注册表查询失败:', regError.message)
    }

    // 尝试通过PowerShell查找已安装的应用
    try {
      console.log('🔍 尝试通过PowerShell查找Photoshop...')
      const { stdout } = await execAsync(
        'powershell -Command "Get-StartApps | Where-Object {$_.Name -like \'*Photoshop*\' -or $_.Name -like \'*Adobe*Photoshop*\'} | Select-Object -First 1 -ExpandProperty AppID"'
      )
      
      if (stdout && stdout.trim()) {
        const appId = stdout.trim()
        console.log('✅ 找到Photoshop应用ID:', appId)
        exec(`start "" "shell:AppsFolder\\${appId}"`, () => {})
        return res.json({
          success: true,
          message: '正在打开Photoshop...',
          path: appId
        })
      }
    } catch (psError) {
      console.log('⚠️ PowerShell查询失败:', psError.message)
    }

    // 如果所有方法都失败了
    res.status(404).json({
      success: false,
      error: '无法自动打开Photoshop，请手动打开应用。\n\n提示：\n1. 确保Photoshop已安装\n2. 可以在桌面创建Photoshop快捷方式\n3. 或在.env文件中配置PHOTOSHOP_PATH路径'
    })
  } catch (error) {
    console.error('❌ 打开Photoshop失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '打开Photoshop失败，请手动打开应用'
    })
  }
})

// 打开剪映应用
app.post('/api/open-jianying', authenticateToken, async (req, res) => {
  try {
    const { 
      paths = [], 
      autoCreateProject = false,
      autoImportVideos = false,
      videoUrls = [],
      projectName = '新项目'
    } = req.body

    // 获取系统信息
    const os = await import('os')
    const fs = await import('fs')
    const path = await import('path')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    const homeDir = os.homedir()
    const desktopPath = path.join(homeDir, 'Desktop')
    const appDataLocal = path.join(homeDir, 'AppData', 'Local')
    const appDataRoaming = path.join(homeDir, 'AppData', 'Roaming')
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    
    // 构建完整的路径列表（按优先级排序）
    const allPaths = [
      // 0. 环境变量中配置的路径（最高优先级）
      ...(process.env.JIANYING_PATH ? [process.env.JIANYING_PATH] : []),
      
      // 1. 桌面快捷方式（最常见）
      path.join(desktopPath, '剪映.lnk'),
      path.join(desktopPath, 'JianyingPro.lnk'),
      path.join(desktopPath, '剪映专业版.lnk'),
      path.join(desktopPath, 'CapCut.lnk'),
      
      // 2. 桌面可执行文件
      path.join(desktopPath, '剪映.exe'),
      path.join(desktopPath, 'JianyingPro.exe'),
      path.join(desktopPath, 'CapCut.exe'),
      
      // 3. 桌面文件夹中的可执行文件
      path.join(desktopPath, '剪映', 'JianyingPro.exe'),
      path.join(desktopPath, 'JianyingPro', 'JianyingPro.exe'),
      path.join(desktopPath, 'CapCut', 'CapCut.exe'),
      
      // 4. 用户传入的路径
      ...paths,
      
      // 5. 常见安装路径（AppData\Local）
      path.join(appDataLocal, 'JianyingPro', 'JianyingPro.exe'),
      path.join(appDataLocal, 'CapCut', 'CapCut.exe'),
      path.join(appDataLocal, '剪映', 'JianyingPro.exe'),
      
      // 6. Program Files
      path.join(programFiles, 'JianyingPro', 'JianyingPro.exe'),
      path.join(programFiles, 'CapCut', 'CapCut.exe'),
      path.join(programFiles, '剪映', 'JianyingPro.exe'),
      path.join(programFilesX86, 'JianyingPro', 'JianyingPro.exe'),
      path.join(programFilesX86, 'CapCut', 'CapCut.exe'),
    ]

    console.log('🔍 开始查找剪映应用，尝试路径数量:', allPaths.length)

    // 尝试打开每个路径
    for (const filePath of allPaths) {
      try {
        // 检查文件是否存在
        if (fs.existsSync(filePath)) {
          console.log(`✅ 找到剪映: ${filePath}`)
          
          let command
          if (filePath.endsWith('.lnk')) {
            // 快捷方式使用 start 命令打开（Windows）
            command = `start "" "${filePath}"`
          } else if (filePath.endsWith('.exe')) {
            // exe文件直接执行
            command = `"${filePath}"`
          } else {
            // 其他文件类型，尝试用默认程序打开
            command = `start "" "${filePath}"`
          }
          
          // 执行命令（不等待结果，立即返回）
          exec(command, (error) => {
            if (error) {
              console.error(`❌ 执行命令失败: ${command}`, error.message)
            } else {
              console.log(`✅ 成功执行命令: ${command}`)
            }
          })
          
          // 如果启用了自动新建项目和导入视频，执行自动化操作
          if (autoCreateProject && autoImportVideos && videoUrls.length > 0) {
            console.log(`📦 准备自动新建项目并导入 ${videoUrls.length} 个视频到剪映`)
            console.log(`📋 项目名称: ${projectName}`)
            console.log(`📹 视频URL列表:`, videoUrls.slice(0, 3), videoUrls.length > 3 ? '...' : '')
            
            // 延迟执行自动化，等待剪映启动
            setTimeout(async () => {
              try {
                // 方案1: 使用UI自动化（自动点击"开始创作"）
                try {
                  const { clickStartCreationAndImportVideos } = await import('./services/jianyingUIAutomationService.js')
                  const result = await clickStartCreationAndImportVideos({
                    videoUrls,
                    projectName,
                  })
                  console.log('✅ 剪映UI自动化执行成功:', result)
                } catch (uiError) {
                  console.warn('⚠️ UI自动化失败，尝试使用API方案:', uiError.message)
                  
                  // 方案2: 备选方案 - 使用API方案（创建草稿并导入视频）
                  try {
                    const { autoStartCreationAndImportVideos } = await import('./services/jianyingUIAutomationService.js')
                    const result = await autoStartCreationAndImportVideos({
                      videoUrls,
                      projectName,
                    })
                    console.log('✅ 剪映API自动化执行成功:', result)
                  } catch (apiError) {
                    console.error('❌ API方案也失败:', apiError.message)
                  }
                }
              } catch (error) {
                console.error('❌ 剪映自动化执行失败:', error)
              }
            }, 5000) // 等待 5 秒让剪映启动
          }
          
          // 立即返回成功，不等待执行结果
          return res.json({
            success: true,
            message: autoCreateProject && autoImportVideos && videoUrls.length > 0 
              ? `正在打开剪映并导入 ${videoUrls.length} 个视频...`
              : '正在打开剪映...',
            path: filePath
          })
        }
      } catch (error) {
        // 继续尝试下一个路径
        continue
      }
    }

    // 如果所有路径都失败了，尝试通过Windows注册表查找
    try {
      console.log('🔍 尝试通过注册表查找剪映...')
      // 查询注册表中的剪映安装路径
      try {
        const { stdout } = await execAsync(
          'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "JianyingPro" 2>nul'
        )
        
        if (stdout) {
          console.log('📋 注册表查询结果（HKCU）:', stdout.substring(0, 300))
          // 尝试从注册表输出中提取InstallLocation
          const installLocationMatch = stdout.match(/InstallLocation\s+REG_SZ\s+(.+)/i)
          if (installLocationMatch) {
            const installPath = installLocationMatch[1].trim()
            const exePath = path.join(installPath, 'JianyingPro.exe')
            if (fs.existsSync(exePath)) {
              exec(`"${exePath}"`, () => {})
              return res.json({
                success: true,
                message: '正在打开剪映...',
                path: exePath
              })
            }
          }
        }
      } catch (e) {
        console.log('⚠️ HKCU注册表查询失败:', e.message)
      }
      
      // 尝试查询HKLM（需要管理员权限）
      try {
        const { stdout } = await execAsync(
          'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "JianyingPro" 2>nul'
        )
        
        if (stdout) {
          console.log('📋 注册表查询结果（HKLM）:', stdout.substring(0, 300))
          const installLocationMatch = stdout.match(/InstallLocation\s+REG_SZ\s+(.+)/i)
          if (installLocationMatch) {
            const installPath = installLocationMatch[1].trim()
            const exePath = path.join(installPath, 'JianyingPro.exe')
            if (fs.existsSync(exePath)) {
              exec(`"${exePath}"`, () => {})
              return res.json({
                success: true,
                message: '正在打开剪映...',
                path: exePath
              })
            }
          }
        }
      } catch (e) {
        console.log('⚠️ HKLM注册表查询失败（可能需要管理员权限）:', e.message)
      }
    } catch (regError) {
      console.log('⚠️ 注册表查询失败:', regError.message)
    }

    // 尝试通过PowerShell查找已安装的应用
    try {
      console.log('🔍 尝试通过PowerShell查找剪映...')
      const { stdout } = await execAsync(
        'powershell -Command "Get-StartApps | Where-Object {$_.Name -like \'*剪映*\' -or $_.Name -like \'*Jianying*\' -or $_.Name -like \'*CapCut*\'} | Select-Object -First 1 -ExpandProperty AppID"'
      )
      
      if (stdout && stdout.trim()) {
        const appId = stdout.trim()
        console.log('✅ 找到剪映应用ID:', appId)
        // 使用应用ID启动
        exec(`start "" "shell:AppsFolder\\${appId}"`, () => {})
        return res.json({
          success: true,
          message: '正在打开剪映...',
          path: appId
        })
      }
    } catch (psError) {
      console.log('⚠️ PowerShell查询失败:', psError.message)
    }

    // 最后尝试：使用Windows的"开始"菜单搜索
    try {
      console.log('🔍 尝试通过Windows搜索打开剪映...')
      // 尝试直接启动（Windows会自动搜索）
      exec('start "" "剪映"', () => {})
      // 等待一下，看是否成功
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (searchError) {
      console.log('⚠️ Windows搜索打开失败:', searchError.message)
    }

    // 如果所有方法都失败了
    res.status(404).json({
      success: false,
      error: '无法自动打开剪映，请手动打开应用。\n\n提示：\n1. 确保剪映已安装\n2. 可以在桌面创建剪映快捷方式\n3. 或手动打开剪映应用'
    })
  } catch (error) {
    console.error('❌ 打开剪映失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '打开剪映失败，请手动打开应用'
    })
  }
})

// 导出视频到桌面
app.post('/api/export-videos-to-desktop', authenticateToken, async (req, res) => {
  try {
    const { videoUrls, scriptName } = req.body

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的视频URL列表'
      })
    }

    if (!scriptName || typeof scriptName !== 'string' || scriptName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '请提供有效的剧本名称'
      })
    }

    const path = await import('path')
    const os = await import('os')
    const fs = await import('fs')
    const https = await import('https')
    const http = await import('http')
    const { promisify } = await import('util')

    const mkdir = promisify(fs.mkdir)
    const stat = promisify(fs.stat)
    const rename = promisify(fs.rename)
    const access = promisify(fs.access)

    // 获取桌面路径
    const desktopPath = path.join(os.homedir(), 'Desktop')
    
    // 检查桌面路径是否存在
    try {
      await access(desktopPath)
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: '无法访问桌面文件夹'
      })
    }

    // 准备文件夹名称（带书名号）
    const folderNameWithBrackets = `《${scriptName.trim()}》`
    const folderNameWithoutBrackets = scriptName.trim()
    const targetFolderPath = path.join(desktopPath, folderNameWithBrackets)

    // 检查是否存在不带书名号的文件夹
    const folderPathWithoutBrackets = path.join(desktopPath, folderNameWithoutBrackets)
    let folderExistsWithoutBrackets = false
    try {
      const stats = await stat(folderPathWithoutBrackets)
      if (stats.isDirectory()) {
        folderExistsWithoutBrackets = true
      }
    } catch (error) {
      // 文件夹不存在，继续
    }

    // 检查是否存在带书名号的文件夹
    let folderExistsWithBrackets = false
    try {
      const stats = await stat(targetFolderPath)
      if (stats.isDirectory()) {
        folderExistsWithBrackets = true
      }
    } catch (error) {
      // 文件夹不存在，继续
    }

    // 如果存在不带书名号的文件夹，重命名为带书名号的
    if (folderExistsWithoutBrackets && !folderExistsWithBrackets) {
      try {
        await rename(folderPathWithoutBrackets, targetFolderPath)
        console.log(`✅ 文件夹已重命名: ${folderNameWithoutBrackets} -> ${folderNameWithBrackets}`)
      } catch (error) {
        console.error('❌ 重命名文件夹失败:', error)
        return res.status(500).json({
          success: false,
          error: `重命名文件夹失败: ${error.message}`
        })
      }
    } else if (!folderExistsWithBrackets && !folderExistsWithoutBrackets) {
      // 如果两个都不存在，创建带书名号的文件夹
      try {
        await mkdir(targetFolderPath, { recursive: true })
        console.log(`✅ 创建文件夹: ${folderNameWithBrackets}`)
      } catch (error) {
        console.error('❌ 创建文件夹失败:', error)
        return res.status(500).json({
          success: false,
          error: `创建文件夹失败: ${error.message}`
        })
      }
    }

    // 下载视频文件
    const downloadVideo = (videoUrl, savePath) => {
      return new Promise((resolve, reject) => {
        const protocol = videoUrl.startsWith('https:') ? https : http
        
        const file = fs.createWriteStream(savePath)
        
        protocol.get(videoUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`下载失败: HTTP ${response.statusCode}`))
            return
          }
          
          response.pipe(file)
          
          file.on('finish', () => {
            file.close()
            resolve(savePath)
          })
        }).on('error', (error) => {
          fs.unlink(savePath, () => {}) // 删除失败的文件
          reject(error)
        })
      })
    }

    const downloadedFiles = []
    const errors = []

    for (let i = 0; i < videoUrls.length; i++) {
      const videoUrl = videoUrls[i]
      try {
        // 确定文件扩展名
        let ext = 'mp4'
        if (videoUrl.includes('.mp4')) ext = 'mp4'
        else if (videoUrl.includes('.mov')) ext = 'mov'
        else if (videoUrl.includes('.avi')) ext = 'avi'
        else if (videoUrl.includes('.webm')) ext = 'webm'
        
        // 生成文件名（使用序号和时间戳）
        const fileName = `分镜${i + 1}_${Date.now()}.${ext}`
        const filePath = path.join(targetFolderPath, fileName)

        console.log(`📥 下载视频 ${i + 1}/${videoUrls.length}: ${fileName}`)
        await downloadVideo(videoUrl, filePath)
        
        // 验证文件是否存在且大小大于0
        if (!fs.existsSync(filePath)) {
          throw new Error('视频文件下载后不存在')
        }
        
        const stats = await stat(filePath)
        if (stats.size === 0) {
          throw new Error('视频文件大小为0，下载可能失败')
        }
        
        downloadedFiles.push({
          fileName,
          filePath,
          size: stats.size
        })
        
        console.log(`✅ 视频 ${i + 1} 下载成功: ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
      } catch (error) {
        console.error(`❌ 下载视频 ${i + 1} 失败:`, error.message)
        errors.push({
          index: i + 1,
          url: videoUrl.substring(0, 50) + '...',
          error: error.message
        })
      }
    }

    if (downloadedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        error: '所有视频下载失败',
        errors
      })
    }

    res.json({
      success: true,
      message: `成功导出 ${downloadedFiles.length} 个视频到桌面文件夹"${folderNameWithBrackets}"`,
      folderPath: targetFolderPath,
      folderName: folderNameWithBrackets,
      downloadedFiles: downloadedFiles.map(f => ({
        fileName: f.fileName,
        size: f.size
      })),
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('❌ 导出视频到桌面失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '导出视频到桌面失败'
    })
  }
})

// 导出图片到桌面
app.post('/api/export-images-to-desktop', authenticateToken, async (req, res) => {
  try {
    const { imageUrls, scriptName } = req.body

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的图片URL列表'
      })
    }

    if (!scriptName || typeof scriptName !== 'string' || scriptName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '请提供有效的剧本名称'
      })
    }

    const path = await import('path')
    const os = await import('os')
    const fs = await import('fs')
    const https = await import('https')
    const http = await import('http')
    const { promisify } = await import('util')
    const stream = await import('stream')
    const pipeline = promisify(stream.pipeline)

    // 获取桌面路径
    const desktopPath = path.join(os.homedir(), 'Desktop')
    
    // 准备文件夹名称（带书名号）
    const folderNameWithBrackets = `《${scriptName.trim()}》`
    const folderNameWithoutBrackets = scriptName.trim()
    const targetFolderPath = path.join(desktopPath, folderNameWithBrackets)

    // 检查是否存在不带书名号的文件夹
    const folderPathWithoutBrackets = path.join(desktopPath, folderNameWithoutBrackets)
    let folderExistsWithoutBrackets = false
    try {
      const stats = await fs.promises.stat(folderPathWithoutBrackets)
      if (stats.isDirectory()) {
        folderExistsWithoutBrackets = true
      }
    } catch (error) {
      // 文件夹不存在，继续
    }

    // 检查是否存在带书名号的文件夹
    let folderExistsWithBrackets = false
    try {
      const stats = await fs.promises.stat(targetFolderPath)
      if (stats.isDirectory()) {
        folderExistsWithBrackets = true
      }
    } catch (error) {
      // 文件夹不存在，继续
    }

    // 如果存在不带书名号的文件夹，重命名为带书名号的
    if (folderExistsWithoutBrackets && !folderExistsWithBrackets) {
      try {
        await fs.promises.rename(folderPathWithoutBrackets, targetFolderPath)
        console.log(`✅ 文件夹已重命名: ${folderNameWithoutBrackets} -> ${folderNameWithBrackets}`)
      } catch (error) {
        console.error('❌ 重命名文件夹失败:', error)
        return res.status(500).json({
          success: false,
          error: `重命名文件夹失败: ${error.message}`
        })
      }
    } else if (!folderExistsWithBrackets && !folderExistsWithoutBrackets) {
      // 如果两个都不存在，创建带书名号的文件夹
      try {
        await fs.promises.mkdir(targetFolderPath, { recursive: true })
        console.log(`✅ 创建文件夹: ${folderNameWithBrackets}`)
      } catch (error) {
        console.error('❌ 创建文件夹失败:', error)
        return res.status(500).json({
          success: false,
          error: `创建文件夹失败: ${error.message}`
        })
      }
    }

    const downloadedFiles = []
    const errors = []

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      try {
        // 确定文件扩展名
        let ext = 'png'
        if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) ext = 'jpg'
        else if (imageUrl.includes('.png')) ext = 'png'
        else if (imageUrl.includes('.webp')) ext = 'webp'
        else if (imageUrl.includes('.gif')) ext = 'gif'
        
        // 生成文件名（使用序号和时间戳）
        const fileName = `分镜图片_${i + 1}_${Date.now()}.${ext}`
        const filePath = path.join(targetFolderPath, fileName)

        console.log(`📥 下载图片 ${i + 1}/${imageUrls.length}: ${fileName}`)
        
        const protocol = imageUrl.startsWith('https:') ? https : http
        const response = await new Promise((resolve, reject) => {
          protocol.get(imageUrl, resolve).on('error', reject)
        })

        if (response.statusCode !== 200) {
          throw new Error(`HTTP Status Code: ${response.statusCode}`)
        }

        await pipeline(response, fs.createWriteStream(filePath))
        
        // 验证文件是否存在且大小大于0
        if (!fs.existsSync(filePath)) {
          throw new Error('图片文件下载后不存在')
        }
        
        const stats = await fs.promises.stat(filePath)
        if (stats.size === 0) {
          throw new Error('图片文件大小为0，下载可能失败')
        }
        
        downloadedFiles.push({
          fileName,
          size: stats.size
        })
        
        console.log(`✅ 图片 ${i + 1} 下载成功: ${fileName} (${(stats.size / 1024).toFixed(2)} KB)`)
      } catch (error) {
        console.error(`❌ 下载图片 ${i + 1} 失败:`, error.message)
        errors.push({
          index: i + 1,
          url: imageUrl.substring(0, 50) + '...',
          error: error.message
        })
      }
    }

    if (downloadedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        error: '所有图片下载失败',
        errors
      })
    }

    res.json({
      success: true,
      message: `成功导出 ${downloadedFiles.length} 张图片到桌面文件夹"${folderNameWithBrackets}"`,
      folderPath: targetFolderPath,
      folderName: folderNameWithBrackets,
      downloadedFiles,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('❌ 导出图片到桌面失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '导出图片到桌面失败'
    })
  }
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err)
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误',
  })
})

// 启动服务器前，测试数据库连接
async function startServer() {
  try {
    // 测试数据库连接
    console.log('🔍 检查数据库连接...')
    const dbConnected = await testConnection()
    
    if (dbConnected) {
      console.log('✅ 数据库连接正常')
      // 初始化默认管理员用户
      try {
        await initDefaultUsers()
      } catch (error) {
        console.warn('⚠️  初始化默认用户失败:', error.message)
        console.warn('💡 提示：可以手动运行 node server/db/initDefaultUsers.js 来初始化用户')
      }
    } else {
      console.warn('⚠️  数据库连接失败，部分功能可能不可用')
      console.warn('💡 提示：请检查 DATABASE_URL 环境变量配置')
    }
  } catch (error) {
    console.warn('⚠️  数据库连接检查失败:', error.message)
    console.warn('💡 提示：请确保已安装PostgreSQL并配置正确的连接信息')
  }

  // ==================== 小组管理 API ====================

  // 获取所有小组列表
  app.get('/api/groups', authenticateToken, async (req, res) => {
    try {
      const pool = await import('./db/connection.js')
      const db = pool.default
      
      const result = await db.query(`
        SELECT 
          g.id,
          g.name,
          g.description,
          g.created_by,
          u.username as creator_username,
          g.created_at,
          g.updated_at,
          COUNT(DISTINCT ug.user_id) as member_count
        FROM groups g
        LEFT JOIN users u ON g.created_by = u.id
        LEFT JOIN user_groups ug ON g.id = ug.group_id
        GROUP BY g.id, g.name, g.description, g.created_by, u.username, g.created_at, g.updated_at
        ORDER BY g.created_at DESC
      `)
      
      res.json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('获取小组列表失败:', error)
      res.status(500).json({
        success: false,
        error: error.message || '获取小组列表失败'
      })
    }
  })

  // 创建小组
  app.post('/api/groups', authenticateToken, async (req, res) => {
    try {
      const { name, description } = req.body
      const userId = req.user?.id
      
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: '小组名称不能为空'
        })
      }
      
      const pool = await import('./db/connection.js')
      const db = pool.default
      
      // 检查小组名称是否已存在
      const existing = await db.query('SELECT id FROM groups WHERE name = $1', [name.trim()])
      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '小组名称已存在'
        })
      }
      
      // 创建小组
      const result = await db.query(
        'INSERT INTO groups (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
        [name.trim(), description || null, userId]
      )
      
      const group = result.rows[0]
      
      // 自动将创建者添加到小组（作为组长）
      await db.query(
        'INSERT INTO user_groups (user_id, group_id, role) VALUES ($1, $2, $3)',
        [userId, group.id, 'owner']
      )
      
      res.json({
        success: true,
        data: group
      })
    } catch (error) {
      console.error('创建小组失败:', error)
      res.status(500).json({
        success: false,
        error: error.message || '创建小组失败'
      })
    }
  })

  // 获取小组详情（包括成员列表）
  app.get('/api/groups/:groupId', authenticateToken, async (req, res) => {
    try {
      const { groupId } = req.params
      const pool = await import('./db/connection.js')
      const db = pool.default
      
      // 获取小组信息
      const groupResult = await db.query(`
        SELECT 
          g.*,
          u.username as creator_username
        FROM groups g
        LEFT JOIN users u ON g.created_by = u.id
        WHERE g.id = $1
      `, [groupId])
      
      if (groupResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '小组不存在'
        })
      }
      
      // 获取小组成员
      const membersResult = await db.query(`
        SELECT 
          ug.user_id,
          ug.role,
          ug.joined_at,
          u.username,
          u.display_name
        FROM user_groups ug
        JOIN users u ON ug.user_id = u.id
        WHERE ug.group_id = $1
        ORDER BY ug.joined_at ASC
      `, [groupId])
      
      res.json({
        success: true,
        data: {
          ...groupResult.rows[0],
          members: membersResult.rows
        }
      })
    } catch (error) {
      console.error('获取小组详情失败:', error)
      res.status(500).json({
        success: false,
        error: error.message || '获取小组详情失败'
      })
    }
  })

  // 添加用户到小组
  app.post('/api/groups/:groupId/members', authenticateToken, async (req, res) => {
    try {
      const { groupId } = req.params
      const { userId } = req.body
      const currentUserId = req.user?.id
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: '用户ID不能为空'
        })
      }
      
      const pool = await import('./db/connection.js')
      const db = pool.default
      
      // 检查当前用户是否有权限（必须是小组的组长或管理员）
      const userGroup = await db.query(
        'SELECT role FROM user_groups WHERE user_id = $1 AND group_id = $2',
        [currentUserId, groupId]
      )
      
      if (userGroup.rows.length === 0 || userGroup.rows[0].role !== 'owner') {
        // 检查是否是超级管理员
        const currentUser = await db.query('SELECT username FROM users WHERE id = $1', [currentUserId])
        if (currentUser.rows.length === 0 || currentUser.rows[0].username !== 'Chiefavefan') {
          return res.status(403).json({
            success: false,
            error: '无权操作，只有组长或超级管理员可以添加成员'
          })
        }
      }
      
      // 检查用户是否已在小组中
      const existing = await db.query(
        'SELECT id FROM user_groups WHERE user_id = $1 AND group_id = $2',
        [userId, groupId]
      )
      
      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '用户已在该小组中'
        })
      }
      
      // 添加用户到小组
      await db.query(
        'INSERT INTO user_groups (user_id, group_id, role) VALUES ($1, $2, $3)',
        [userId, groupId, 'member']
      )
      
      res.json({
        success: true,
        message: '用户已添加到小组'
      })
    } catch (error) {
      console.error('添加用户到小组失败:', error)
      res.status(500).json({
        success: false,
        error: error.message || '添加用户到小组失败'
      })
    }
  })

  // 从小组移除用户
  app.delete('/api/groups/:groupId/members/:userId', authenticateToken, async (req, res) => {
    try {
      const { groupId, userId } = req.params
      const currentUserId = req.user?.id
      
      const pool = await import('./db/connection.js')
      const db = pool.default
      
      // 检查当前用户是否有权限
      const userGroup = await db.query(
        'SELECT role FROM user_groups WHERE user_id = $1 AND group_id = $2',
        [currentUserId, groupId]
      )
      
      if (userGroup.rows.length === 0 || userGroup.rows[0].role !== 'owner') {
        // 检查是否是超级管理员
        const currentUser = await db.query('SELECT username FROM users WHERE id = $1', [currentUserId])
        if (currentUser.rows.length === 0 || currentUser.rows[0].username !== 'Chiefavefan') {
          return res.status(403).json({
            success: false,
            error: '无权操作，只有组长或超级管理员可以移除成员'
          })
        }
      }
      
      // 不能移除组长
      const targetUser = await db.query(
        'SELECT role FROM user_groups WHERE user_id = $1 AND group_id = $2',
        [userId, groupId]
      )
      
      if (targetUser.rows.length > 0 && targetUser.rows[0].role === 'owner') {
        return res.status(400).json({
          success: false,
          error: '不能移除组长'
        })
      }
      
      // 从小组移除用户
      await db.query(
        'DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2',
        [userId, groupId]
      )
      
      res.json({
        success: true,
        message: '用户已从小组移除'
      })
    } catch (error) {
      console.error('从小组移除用户失败:', error)
      res.status(500).json({
        success: false,
        error: error.message || '从小组移除用户失败'
      })
    }
  })

  // 更新小组信息（管理员或组长）
  app.put('/api/groups/:groupId', authenticateToken, async (req, res) => {
    try {
      const { groupId } = req.params
      const { name, description } = req.body
      const currentUserId = req.user?.id
      
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: '小组名称不能为空'
        })
      }
      
      const pool = await import('./db/connection.js')
      const db = pool.default
      
      // 检查小组是否存在
      const groupResult = await db.query('SELECT * FROM groups WHERE id = $1', [groupId])
      if (groupResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '小组不存在'
        })
      }
      
      // 检查当前用户是否有权限（必须是管理员或组长）
      const currentUser = await db.query('SELECT username FROM users WHERE id = $1', [currentUserId])
      const isSuperAdmin = currentUser.rows.length > 0 && currentUser.rows[0].username === 'Chiefavefan'
      const isAdmin = isSuperAdmin || (currentUser.rows.length > 0 && currentUser.rows[0].username === 'jubian888')
      
      if (!isAdmin) {
        // 检查是否是组长
        const userGroup = await db.query(
          'SELECT role FROM user_groups WHERE user_id = $1 AND group_id = $2',
          [currentUserId, groupId]
        )
        if (userGroup.rows.length === 0 || userGroup.rows[0].role !== 'owner') {
          return res.status(403).json({
            success: false,
            error: '无权操作，只有管理员或组长可以编辑小组'
          })
        }
      }
      
      // 检查小组名称是否已被其他小组使用
      const existing = await db.query('SELECT id FROM groups WHERE name = $1 AND id != $2', [name.trim(), groupId])
      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '小组名称已存在'
        })
      }
      
      // 更新小组信息
      const result = await db.query(
        'UPDATE groups SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [name.trim(), description || null, groupId]
      )
      
      res.json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('更新小组失败:', error)
      res.status(500).json({
        success: false,
        error: error.message || '更新小组失败'
      })
    }
  })

  // 删除小组
  app.delete('/api/groups/:groupId', authenticateToken, async (req, res) => {
    try {
      const { groupId } = req.params
      const currentUserId = req.user?.id
      
      const pool = await import('./db/connection.js')
      const db = pool.default
      
      // 检查当前用户是否有权限（必须是小组的创建者或超级管理员）
      const group = await db.query('SELECT created_by FROM groups WHERE id = $1', [groupId])
      
      if (group.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '小组不存在'
        })
      }
      
      const currentUser = await db.query('SELECT username FROM users WHERE id = $1', [currentUserId])
      if (currentUser.rows.length === 0 || 
          (group.rows[0].created_by !== currentUserId && currentUser.rows[0].username !== 'Chiefavefan')) {
        return res.status(403).json({
          success: false,
          error: '无权删除该小组'
        })
      }
      
      // 删除小组（会自动删除关联的 user_groups 记录，但不会删除项目）
      await db.query('DELETE FROM groups WHERE id = $1', [groupId])
      
      res.json({
        success: true,
        message: '小组已删除'
      })
    } catch (error) {
      console.error('删除小组失败:', error)
      res.status(500).json({
        success: false,
        error: error.message || '删除小组失败'
      })
    }
  })

  // 获取用户所在的小组
  app.get('/api/users/:userId/groups', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.params
      const pool = await import('./db/connection.js')
      const db = pool.default
      
      const result = await db.query(`
        SELECT 
          g.id,
          g.name,
          g.description,
          ug.role,
          ug.joined_at
        FROM user_groups ug
        JOIN groups g ON ug.group_id = g.id
        WHERE ug.user_id = $1
        ORDER BY ug.joined_at ASC
      `, [userId])
      
      res.json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('获取用户小组列表失败:', error)
      res.status(500).json({
        success: false,
        error: error.message || '获取用户小组列表失败'
      })
    }
  })

  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
    console.log(`📝 剧本分析服务已启动`)
    console.log(`📹 图生视频服务已启动 (默认模型: doubao-seedance-1-5-pro-251215)`)
    console.log(`🎨 文生图服务已启动 (模型: nano-banana-pro, midjourney-v7-t2i)`)
    console.log(`🎵 Suno音乐生成API已启动`)
    console.log(`🎤 IndexTTS2.5音色创作API已启动`)
    console.log(`🗄️  任务管理API已启动`)
    console.log(`👤 用户认证和管理API已启动`)
    console.log(`👥 小组管理API已启动`)
    console.log(`\n💡 提示：`)
    console.log(`   - 初始化数据库: npm run init-db`)
    console.log(`   - 检查环境变量: npm run check-env`)
  })
}

startServer()

