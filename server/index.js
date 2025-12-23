import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { analyzeScript } from './services/scriptAnalyzer.js'
import { parseDocx } from './utils/docxParser.js'
import { generateVideoFromImage, getVideoTaskStatus } from './services/imageToVideoService.js'
import { segmentScript } from './services/scriptSegmenter.js'
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
    const { scriptContent, scriptTitle } = req.body

    if (!scriptContent || scriptContent.trim().length === 0) {
      return res.status(400).json({ error: '剧本内容不能为空' })
    }

    // 分析剧本
    const result = await analyzeScript(scriptContent, scriptTitle)

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

    // 分析剧本
    const result = await analyzeScript(scriptContent, req.file.originalname.replace('.docx', ''))

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

// 剧本切分接口 - 将剧本切分为多个片段
app.post('/api/segment-script', async (req, res) => {
  try {
    const { scriptContent, scriptTitle } = req.body

    if (!scriptContent || scriptContent.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: '剧本内容不能为空' 
      })
    }

    console.log('📝 收到剧本切分请求，长度:', scriptContent.length, '字符')

    // 切分剧本
    const segments = await segmentScript(scriptContent, scriptTitle)

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
    const { model = 'wan2.2-i2v-flash', resolution = '480p', duration = 5 } = req.body

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
    })

    // 调用图生视频API
    const result = await generateVideoFromImage(imageUrl, {
      model,
      resolution,
      duration: parseInt(duration),
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

    if (!taskId) {
      return res.status(400).json({ 
        success: false,
        error: '任务ID不能为空' 
      })
    }

    console.log('📊 查询任务状态:', taskId)

    // 查询任务状态
    const result = await getVideoTaskStatus(taskId)

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

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err)
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
  console.log(`📝 剧本分析服务已启动`)
  console.log(`📹 图生视频服务已启动 (模型: wan2.2-i2v-flash)`)
})

