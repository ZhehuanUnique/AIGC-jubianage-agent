/**
 * AIGC Photoshop 自动化 ExtendScript
 * 功能：创建新文档、导入图片到最上层图层
 * 
 * 使用方法：
 * 1. 在 Photoshop 中：文件 → 脚本 → 浏览 → 选择此文件
 * 2. 或通过命令行：photoshop.exe -script "path/to/automation.jsx"
 */

// 主函数
function main() {
  try {
    $.writeln('🚀 ExtendScript 开始执行...')
    $.writeln('   Photoshop 版本: ' + app.version)
    $.writeln('   文档数量: ' + app.documents.length)
    
    // 从命令行参数或文件读取配置
    var config = getConfig()
    
    if (!config) {
      var errorMsg = '❌ 未提供配置参数\n\n请通过后端 API 调用此脚本\n\n'
      errorMsg += '配置文件路径: ' + Folder.temp.fsName + '/ps_automation_config.json'
      alert(errorMsg)
      $.writeln('❌ 配置为空，退出')
      return
    }
    
    $.writeln('📋 开始执行操作: ' + config.action)
    
    if (config.action === 'createDocument') {
      $.writeln('📄 创建新文档...')
      createNewDocument(config.params)
      $.writeln('✅ 文档创建成功')
    } else if (config.action === 'importImage') {
      $.writeln('🖼️ 导入图片...')
      importImageToTopLayer(config.params)
      $.writeln('✅ 图片导入成功')
    } else if (config.action === 'createAndImport') {
      $.writeln('📄 创建新文档...')
      createNewDocument(config.params)
      $.writeln('🖼️ 导入图片...')
      importImageToTopLayer(config.params)
      $.writeln('✅ 创建并导入成功')
    } else {
      alert('❌ 未知操作: ' + config.action)
      $.writeln('❌ 未知操作: ' + config.action)
    }
    
    $.writeln('✅ ExtendScript 执行完成')
  } catch (error) {
    var errorMsg = '❌ 执行失败: ' + error.message
    if (error.line) {
      errorMsg += '\n行号: ' + error.line
    }
    alert(errorMsg)
    $.writeln('❌ 执行失败: ' + error.message)
    $.writeln('   错误堆栈: ' + error.toString())
  }
}

/**
 * 从文件读取配置
 */
function getConfig() {
  try {
    // 尝试从临时文件读取配置
    var tempFolder = Folder.temp
    var configFilePath = tempFolder.fsName + '/ps_automation_config.json'
    var configFile = new File(configFilePath)
    
    // 调试信息
    $.writeln('🔍 查找配置文件: ' + configFilePath)
    $.writeln('   文件是否存在: ' + configFile.exists)
    
    if (configFile.exists) {
      configFile.open('r')
      var configText = configFile.read()
      configFile.close()
      
      $.writeln('📄 配置文件内容长度: ' + configText.length)
      $.writeln('📄 配置文件内容: ' + configText.substring(0, 200))
      
      // ExtendScript 不支持 JSON.parse，需要手动解析
      var config = parseJSON(configText)
      if (config) {
        $.writeln('✅ 配置解析成功')
        $.writeln('   操作: ' + config.action)
      } else {
        $.writeln('⚠️ 配置解析失败')
      }
      return config
    } else {
      $.writeln('❌ 配置文件不存在')
    }
  } catch (error) {
    $.writeln('❌ 读取配置失败: ' + error.message)
    $.writeln('   错误堆栈: ' + error.toString())
  }
  
  return null
}

/**
 * 简单的 JSON 解析（ExtendScript 不支持 JSON.parse）
 */
function parseJSON(jsonText) {
  // 移除注释和空白
  jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
  
  // 简单的 JSON 解析（仅支持基本格式）
  var config = {}
  
  // 提取 action
  var actionMatch = jsonText.match(/"action"\s*:\s*"([^"]+)"/)
  if (actionMatch) {
    config.action = actionMatch[1]
  }
  
  // 提取 params
  var paramsMatch = jsonText.match(/"params"\s*:\s*\{([^}]+)\}/)
  if (paramsMatch) {
    config.params = {}
    
    // 提取 projectName
    var projectNameMatch = paramsMatch[1].match(/"projectName"\s*:\s*"([^"]+)"/)
    if (projectNameMatch) {
      config.params.projectName = projectNameMatch[1]
    }
    
    // 提取 width
    var widthMatch = paramsMatch[1].match(/"width"\s*:\s*(\d+)/)
    if (widthMatch) {
      config.params.width = parseInt(widthMatch[1])
    }
    
    // 提取 height
    var heightMatch = paramsMatch[1].match(/"height"\s*:\s*(\d+)/)
    if (heightMatch) {
      config.params.height = parseInt(heightMatch[1])
    }
    
    // 提取 resolution
    var resolutionMatch = paramsMatch[1].match(/"resolution"\s*:\s*(\d+)/)
    if (resolutionMatch) {
      config.params.resolution = parseInt(resolutionMatch[1])
    }
    
    // 提取 imageUrl
    var imageUrlMatch = paramsMatch[1].match(/"imageUrl"\s*:\s*"([^"]+)"/)
    if (imageUrlMatch) {
      config.params.imageUrl = imageUrlMatch[1]
    }
  }
  
  return config
}

/**
 * 创建新文档
 */
function createNewDocument(params) {
  var projectName = params.projectName || '新项目'
  var width = params.width || 1920
  var height = params.height || 1080
  var resolution = params.resolution || 72
  
  try {
    $.writeln('   项目名称: ' + projectName)
    $.writeln('   尺寸: ' + width + 'x' + height)
    $.writeln('   分辨率: ' + resolution)
    
    var doc = app.documents.add(
      UnitValue(width + ' px'),
      UnitValue(height + ' px'),
      resolution,
      projectName,
      NewDocumentMode.RGB,
      DocumentFill.WHITE
    )
    
    app.activeDocument = doc
    $.writeln('✅ 文档创建成功，ID: ' + doc.id)
    return doc
  } catch (error) {
    $.writeln('❌ 创建文档失败: ' + error.message)
    throw new Error('创建文档失败: ' + error.message)
  }
}

/**
 * 导入图片到最上层图层
 */
function importImageToTopLayer(params) {
  var imageUrl = params.imageUrl
  
  // 确保 imageUrl 是字符串类型
  if (!imageUrl) {
    throw new Error('图片 URL 不能为空')
  }
  
  // ExtendScript 不支持 toString()，需要手动转换
  var imageUrlStr = String(imageUrl)
  
  try {
    $.writeln('   图片路径: ' + imageUrlStr)
    
    // 检查是否有打开的文档
    if (app.documents.length === 0) {
      throw new Error('没有打开的文档，请先创建文档')
    }
    
    var activeDoc = app.activeDocument
    $.writeln('   当前活动文档: ' + activeDoc.name)
    
    // 处理 URL 或本地路径
    // ExtendScript 不支持 startsWith，使用 indexOf 代替
    var imageFile = null
    var isHttpUrl = (imageUrlStr.indexOf('http://') === 0) || (imageUrlStr.indexOf('https://') === 0)
    
    if (isHttpUrl) {
      // HTTP URL：需要先下载（这里假设后端已经下载到本地）
      // 或者使用 File 对象直接打开（如果 Photoshop 支持）
      // 注意：ExtendScript 不能直接下载 HTTP 文件，需要后端先下载
      throw new Error('ExtendScript 不支持直接打开 HTTP URL，请使用本地路径。后端应该已经下载到本地。')
    } else {
      // 本地路径
      imageFile = new File(imageUrlStr)
      
      $.writeln('   检查文件是否存在: ' + imageFile.exists)
      if (!imageFile.exists) {
        throw new Error('图片文件不存在: ' + imageUrlStr)
      }
    }
    
    $.writeln('   打开图片文件...')
    // 打开图片文件
    var imageDoc = app.open(imageFile)
    $.writeln('   图片文档已打开: ' + imageDoc.name)
    
    $.writeln('   选择全部...')
    // 选择全部
    imageDoc.selection.selectAll()
    
    $.writeln('   复制...')
    // 复制
    imageDoc.selection.copy()
    
    $.writeln('   切换到目标文档...')
    // 切换到目标文档
    app.activeDocument = activeDoc
    
    $.writeln('   粘贴到新图层...')
    // 粘贴到新图层（最上层）
    activeDoc.paste()
    
    $.writeln('   关闭图片文档...')
    // 关闭图片文档
    imageDoc.close(SaveOptions.DONOTSAVECHANGES)
    
    $.writeln('✅ 图片导入成功，当前图层数: ' + activeDoc.layers.length)
    return true
  } catch (error) {
    $.writeln('❌ 导入图片失败: ' + error.message)
    if (error.line) {
      $.writeln('   错误行号: ' + error.line)
    }
    throw new Error('导入图片失败: ' + error.message)
  }
}

// 执行主函数
main()

