import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { analyzeScript } from './services/scriptAnalyzer.js'
import { parseDocx } from './utils/docxParser.js'
import { generateVideoFromImage, getVideoTaskStatus } from './services/imageToVideoService.js'
import { segmentScript } from './services/scriptSegmenter.js'
import { TaskRepository } from './db/taskRepository.js'
import { testConnection } from './db/connection.js'
import { generateImageWithNanoBanana, getNanoBananaTaskStatus } from './services/nanoBananaService.js'
import { generateImageWithMidjourney, getMidjourneyTaskStatus } from './services/midjourneyService.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, readFileSync } from 'fs'

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log('✅ .env 文件已加载:', envPath)
} else {
  console.warn('⚠️  .env 文件不存在:', envPath)
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

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 配置文件上传 - docx文件
const uploadDocx = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
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
  dest: 'uploads/images/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只支持图片格式'))
    }
  },
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' })
})

// 剧本分析接口 - 文本输入
app.post('/api/analyze-script', async (req, res) => {
  try {
    const { scriptContent, scriptTitle, model } = req.body

    if (!scriptContent || scriptContent.trim().length === 0) {
      return res.status(400).json({ error: '剧本内容不能为空' })
    }

    // 分析剧本，使用指定的模型（默认 qwen-max）
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

    // 解析docx文件
    const scriptContent = await parseDocx(req.file.path)
    
    if (!scriptContent || scriptContent.trim().length === 0) {
      return res.status(400).json({ error: '文件内容为空或无法解析' })
    }

    // 分析剧本，使用 qwen-max 模型
    const model = req.body.model || 'qwen-max'
    const result = await analyzeScript(scriptContent, req.file.originalname.replace('.docx', ''), model)

    // 清理上传的文件
    const fs = await import('fs')
    fs.unlinkSync(req.file.path)

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
      const fs = await import('fs')
      try {
        fs.unlinkSync(req.file.path)
      } catch (e) {
        // 忽略删除错误
      }
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
    const { scriptContent, scriptTitle, model = 'qwen-max', generatePrompts = true } = req.body

    if (!scriptContent || scriptContent.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: '剧本内容不能为空' 
      })
    }

    console.log('📝 收到剧本切分请求，长度:', scriptContent.length, '字符')
    console.log('📝 使用模型:', model, '生成提示词:', generatePrompts)

    // 切分剧本并生成分镜提示词
    const segments = await segmentScript(scriptContent, scriptTitle, model, generatePrompts)

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
    const { model = 'wan2.2-i2v-flash', resolution = '480p', duration = 5, text = '', ratio = 'adaptive' } = req.body

    // 检查是否有上传的图片文件
    let imageUrl
    if (req.file) {
      // 读取图片文件并转换为base64
      const imageBuffer = readFileSync(req.file.path)
      const imageBase64 = imageBuffer.toString('base64')
      const imageMimeType = req.file.mimetype
      imageUrl = `data:${imageMimeType};base64,${imageBase64}`
      
      // 清理上传的文件
      const fs = await import('fs')
      fs.unlinkSync(req.file.path)
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
      imageUrlType: imageUrl ? (imageUrl.startsWith('data:') ? 'base64' : imageUrl.startsWith('http') ? 'http' : 'unknown') : 'none',
      imageUrlPreview: imageUrl ? (imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : '')) : 'none',
    })

    // 调用图生视频API
    const result = await generateVideoFromImage(imageUrl, {
      model,
      resolution,
      duration: parseInt(duration),
      text, // 文本提示词（用于 doubao-seedance-1-5-pro-251215）
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
      const fs = await import('fs')
      try {
        fs.unlinkSync(req.file.path)
      } catch (e) {
        // 忽略删除错误
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || '图生视频失败，请稍后重试',
    })
  }
})

// 查询视频生成任务状态
app.get('/api/video-task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params
    const { model = 'wan2.2-i2v-flash' } = req.query

    if (!taskId) {
      return res.status(400).json({ 
        success: false,
        error: '任务ID不能为空' 
      })
    }

    console.log('📊 查询任务状态:', taskId, '模型:', model)

    // 查询任务状态（根据模型选择不同的服务）
    const result = await getVideoTaskStatus(taskId, model)

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

// 文生图接口 - 支持多种模型（nano-banana-pro 或 midjourney-v7-t2i）
app.post('/api/generate-image', async (req, res) => {
  try {
    const { 
      prompt, 
      model = 'nano-banana-pro', 
      resolution, // 分辨率：2K 或 4K
      aspectRatio = 'auto', 
      size, // 兼容旧参数，如果提供了 resolution 则使用 resolution
      botType = 'MID_JOURNEY' 
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

    console.log('🎨 收到文生图请求:', {
      model,
      prompt: prompt.substring(0, 50) + '...',
      resolution: resolution || actualSize,
      aspectRatio,
    })

    let result
    if (model === 'midjourney-v7-t2i') {
      // 调用 Midjourney API
      // 注意：midjourney 的 2K 需要通过 Upscaler 实现，这里先提交基础图生成任务
      // 后续可以通过 Upscaler API 放大到 2K
      // Midjourney 的宽高比需要在 prompt 中添加 --ar 参数
      result = await generateImageWithMidjourney(prompt, {
        botType,
        aspectRatio, // 传递宽高比，会在 prompt 中添加 --ar 参数
        resolution, // 传递分辨率信息，用于后续 Upscaler 处理
      })
    } else {
      // 使用 Nano Banana Pro
      // 将 resolution (2K/4K) 转换为 size 参数
      const sizeParam = actualSize === '2K' ? '2K' : actualSize === '4K' ? '4K' : '1K'
      result = await generateImageWithNanoBanana(prompt, {
        aspectRatio,
        size: sizeParam,
      })
      
      // 如果使用了 302.ai API，保存 provider 信息（resultUrl 通过查询参数传递）
      if (result.provider === '302ai') {
        // 保存 resultUrl 到返回数据中，前端可以通过查询参数传递
        result._resultUrl = result.resultUrl // 临时保存，用于前端传递
      }
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

// 查询图片生成任务状态 - 支持多种模型
app.get('/api/image-task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params
    const { model = 'nano-banana-pro', resolution, resultUrl } = req.query // 从查询参数获取分辨率和 resultUrl

    if (!taskId) {
      return res.status(400).json({ 
        success: false,
        error: '任务ID不能为空' 
      })
    }

    console.log('🔍 查询图片生成任务状态:', taskId, '模型:', model, '分辨率:', resolution, 'resultUrl:', resultUrl ? '已提供' : '未提供')

    let result
    if (model === 'midjourney-v7-t2i') {
      // 查询 Midjourney 任务状态（如果指定了 2K 分辨率，会自动调用 Upscale）
      result = await getMidjourneyTaskStatus(taskId, { resolution })
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

// ==================== 任务管理 API ====================

// 获取所有任务
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await TaskRepository.getAllTasks()
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

// 创建任务
app.post('/api/tasks', async (req, res) => {
  try {
    const taskData = req.body
    const task = await TaskRepository.createTask(taskData)
    
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
    } else {
      console.warn('⚠️  数据库连接失败，部分功能可能不可用')
      console.warn('💡 提示：请检查 DATABASE_URL 环境变量配置')
    }
  } catch (error) {
    console.warn('⚠️  数据库连接检查失败:', error.message)
    console.warn('💡 提示：请确保已安装PostgreSQL并配置正确的连接信息')
  }

  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
    console.log(`📝 剧本分析服务已启动`)
    console.log(`📹 图生视频服务已启动 (模型: wan2.2-i2v-flash)`)
    console.log(`🎨 文生图服务已启动 (模型: nano-banana-pro, midjourney-v7-t2i)`)
    console.log(`🗄️  任务管理API已启动`)
    console.log(`\n💡 提示：`)
    console.log(`   - 初始化数据库: npm run init-db`)
    console.log(`   - 检查环境变量: npm run check-env`)
  })
}

startServer()

