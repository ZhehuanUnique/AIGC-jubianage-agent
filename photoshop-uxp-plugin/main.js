/**
 * AIGC Photoshop 自动化插件
 * 功能：创建新文档、导入图片到最上层图层
 */

const { app } = require('photoshop')
const { batchPlay } = require('photoshop').action
const http = require('http')

// 本地 HTTP 服务器配置
const SERVER_PORT = 3003
const SERVER_HOST = 'localhost'

// 启动本地 HTTP 服务器，监听来自后端的命令
let server = null

/**
 * 创建新文档
 * @param {string} projectName - 项目名称
 * @param {number} width - 宽度（默认 1920）
 * @param {number} height - 高度（默认 1080）
 * @param {number} resolution - 分辨率（默认 72）
 */
async function createNewDocument(projectName = '新项目', width = 1920, height = 1080, resolution = 72) {
  try {
    console.log(`📄 创建新文档: ${projectName} (${width}x${height})`)
    
    const doc = await app.documents.add({
      width: width,
      height: height,
      resolution: resolution,
      name: projectName,
      mode: 'RGBColorMode',
      fill: 'white'
    })
    
    console.log(`✅ 文档创建成功: ${doc.name}`)
    return { success: true, documentId: doc.id, documentName: doc.name }
  } catch (error) {
    console.error('❌ 创建文档失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 导入图片到最上层图层
 * @param {string} imageUrl - 图片 URL（支持本地路径或 HTTP URL）
 */
async function importImageToTopLayer(imageUrl) {
  try {
    console.log(`🖼️ 导入图片: ${imageUrl}`)
    
    // 检查是否有打开的文档
    if (app.documents.length === 0) {
      return { success: false, error: '没有打开的文档，请先创建文档' }
    }
    
    const activeDoc = app.activeDocument
    if (!activeDoc) {
      return { success: false, error: '没有活动文档' }
    }
    
    // 下载图片（如果是 HTTP URL）
    let localImagePath = imageUrl
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // 注意：UXP 插件中不能直接使用 Node.js 的 http/https 模块下载文件
      // 需要使用 fetch API 和 FileSystem API
      try {
        const response = await fetch(imageUrl)
        if (!response.ok) {
          throw new Error(`下载图片失败: ${response.statusText}`)
        }
        
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // 保存到临时文件
        const fs = require('uxp').storage.localFileSystem
        const tempFolder = await fs.getTemporaryFolder()
        const tempFile = await tempFolder.createFile('imported_image.jpg', { overwrite: true })
        await tempFile.write(uint8Array, { format: 'binary' })
        
        localImagePath = tempFile.nativePath
        console.log(`📥 图片已下载到: ${localImagePath}`)
      } catch (downloadError) {
        console.error('❌ 下载图片失败:', downloadError)
        return { success: false, error: `下载图片失败: ${downloadError.message}` }
      }
    }
    
    // 打开图片文件
    const file = await require('uxp').storage.localFileSystem.getFileForReading(localImagePath)
    if (!file) {
      return { success: false, error: '无法读取图片文件' }
    }
    
    // 使用 batchPlay 导入图片
    // 注意：UXP 中导入图片需要使用不同的方法
    try {
      // 方法1：使用 app.open() 打开图片，然后复制到目标文档
      const imageDoc = await app.open(file)
      
      // 选择全部
      await batchPlay([
        {
          _obj: 'selectAll',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }]
        }
      ], {})
      
      // 复制
      await batchPlay([
        {
          _obj: 'copy',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }]
        }
      ], {})
      
      // 切换到目标文档
      activeDoc.activate()
      
      // 粘贴到新图层（最上层）
      await batchPlay([
        {
          _obj: 'paste',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }]
        }
      ], {})
      
      // 关闭图片文档
      imageDoc.close()
      
      console.log(`✅ 图片已导入到最上层图层`)
      return { success: true, message: '图片已成功导入到最上层图层' }
    } catch (importError) {
      console.error('❌ 导入图片失败:', importError)
      return { success: false, error: `导入图片失败: ${importError.message}` }
    }
  } catch (error) {
    console.error('❌ 导入图片失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 处理自动化命令
 * @param {Object} command - 命令对象
 */
async function handleAutomationCommand(command) {
  try {
    console.log('📨 收到自动化命令:', command)
    
    const { action, params } = command
    
    switch (action) {
      case 'createDocument':
        return await createNewDocument(
          params.projectName,
          params.width,
          params.height,
          params.resolution
        )
      
      case 'importImage':
        return await importImageToTopLayer(params.imageUrl)
      
      case 'createAndImport':
        // 先创建文档，再导入图片
        const createResult = await createNewDocument(
          params.projectName,
          params.width,
          params.height,
          params.resolution
        )
        if (!createResult.success) {
          return createResult
        }
        
        const importResult = await importImageToTopLayer(params.imageUrl)
        return {
          success: importResult.success,
          createDocument: createResult,
          importImage: importResult
        }
      
      default:
        return { success: false, error: `未知命令: ${action}` }
    }
  } catch (error) {
    console.error('❌ 处理命令失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 启动本地 HTTP 服务器
 */
function startLocalServer() {
  if (server) {
    console.log('⚠️ 服务器已在运行')
    return
  }
  
  server = http.createServer(async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }
    
    if (req.method === 'POST' && req.url === '/automation') {
      let body = ''
      
      req.on('data', chunk => {
        body += chunk.toString()
      })
      
      req.on('end', async () => {
        try {
          const command = JSON.parse(body)
          const result = await handleAutomationCommand(command)
          
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(result))
        } catch (error) {
          console.error('❌ 处理请求失败:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: error.message }))
        }
      })
    } else if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, status: 'running' }))
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: 'Not Found' }))
    }
  })
  
  server.listen(SERVER_PORT, SERVER_HOST, () => {
    console.log(`✅ 本地 HTTP 服务器已启动: http://${SERVER_HOST}:${SERVER_PORT}`)
  })
  
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`⚠️ 端口 ${SERVER_PORT} 已被占用，服务器可能已在运行`)
    } else {
      console.error('❌ 服务器错误:', error)
    }
  })
}

/**
 * 停止本地 HTTP 服务器
 */
function stopLocalServer() {
  if (server) {
    server.close(() => {
      console.log('🛑 本地 HTTP 服务器已停止')
      server = null
    })
  }
}

// 插件启动时启动服务器
startLocalServer()

// 插件关闭时停止服务器
module.exports = {
  createNewDocument,
  importImageToTopLayer,
  handleAutomationCommand,
  startLocalServer,
  stopLocalServer
}




