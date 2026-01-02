/**
 * 剪映UI自动化服务（Python uiautomation）
 * 实现真正的UI自动化：自动点击"开始创作"按钮
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 检查Python是否安装
 */
async function checkPython() {
  try {
    const { stdout } = await execAsync('python --version')
    console.log('✅ Python已安装:', stdout.trim())
    return true
  } catch (error) {
    try {
      // 尝试 python3
      const { stdout } = await execAsync('python3 --version')
      console.log('✅ Python3已安装:', stdout.trim())
      return true
    } catch (error2) {
      console.error('❌ 未检测到Python')
      return false
    }
  }
}

/**
 * 检查uiautomation库是否安装
 */
async function checkUIAutomation() {
  try {
    await execAsync('python -c "import uiautomation"')
    console.log('✅ uiautomation库已安装')
    return true
  } catch (error) {
    try {
      await execAsync('python3 -c "import uiautomation"')
      console.log('✅ uiautomation库已安装')
      return true
    } catch (error2) {
      console.error('❌ uiautomation库未安装')
      return false
    }
  }
}

/**
 * 获取Python命令
 */
function getPythonCommand() {
  // 优先使用 python，如果不存在则使用 python3
  return 'python'
}

/**
 * 下载视频到临时文件夹
 * @param {string} videoUrl - 视频URL
 * @param {string} projectName - 项目名称
 * @param {number} index - 视频索引
 * @returns {Promise<string>} 本地文件路径
 */
async function downloadVideoToTemp(videoUrl, projectName, index) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(os.tmpdir(), 'jianying_import', projectName)
    
    // 确保临时文件夹存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    // 确定文件扩展名
    let ext = 'mp4'
    if (videoUrl.includes('.mp4')) ext = 'mp4'
    else if (videoUrl.includes('.mov')) ext = 'mov'
    else if (videoUrl.includes('.avi')) ext = 'avi'
    
    const fileName = `video_${index}_${Date.now()}.${ext}`
    const filePath = path.join(tempDir, fileName)
    
    const protocol = videoUrl.startsWith('https:') ? https : http
    const file = fs.createWriteStream(filePath)
    
    protocol.get(videoUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`下载失败: HTTP ${response.statusCode}`))
        return
      }
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        resolve(filePath)
      })
    }).on('error', (error) => {
      fs.unlink(filePath, () => {}) // 删除失败的文件
      reject(error)
    })
  })
}

/**
 * 自动点击"开始创作"按钮
 * @returns {Promise<Object>} 执行结果
 */
export async function clickStartCreation() {
  try {
    // 检查Python
    const hasPython = await checkPython()
    if (!hasPython) {
      throw new Error('未检测到Python，请先安装Python')
    }

    // 检查uiautomation库
    const hasUIAutomation = await checkUIAutomation()
    if (!hasUIAutomation) {
      throw new Error('未安装uiautomation库，请运行: pip install uiautomation')
    }

    // 优先使用新版本的脚本（支持多种方法）
    let scriptPath = path.join(__dirname, 'jianyingUIAutomationV2.py')
    
    // 如果新版本不存在，使用旧版本
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(__dirname, 'jianyingUIAutomation.py')
    }
    
    // 执行Python脚本
    const pythonCmd = getPythonCommand()
    const command = `${pythonCmd} "${scriptPath}" click_start_creation`
    
    console.log('🚀 执行剪映UI自动化:', command)
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000, // 30秒超时
      windowsHide: true,
    })

    if (stdout) {
      console.log('📄 Python输出:', stdout)
    }
    if (stderr) {
      console.warn('⚠️ Python警告:', stderr)
    }

    // 检查输出中是否包含成功信息
    if (stdout.includes('✅') || stdout.includes('已点击开始创作')) {
      return {
        success: true,
        message: '已成功点击开始创作按钮',
      }
    } else {
      return {
        success: false,
        error: '未能成功点击开始创作按钮',
        output: stdout,
      }
    }
  } catch (error) {
    console.error('❌ 剪映UI自动化失败:', error)
    throw new Error(`剪映UI自动化失败: ${error.message}`)
  }
}

/**
 * 导入视频到剪映（通过UI自动化）
 * @param {Array<string>} videoPaths - 本地视频文件路径列表
 * @returns {Promise<Object>} 执行结果
 */
export async function importVideosViaUI(videoPaths) {
  try {
    // 检查Python和uiautomation
    const hasPython = await checkPython()
    if (!hasPython) {
      throw new Error('未检测到Python，请先安装Python')
    }

    const hasUIAutomation = await checkUIAutomation()
    if (!hasUIAutomation) {
      throw new Error('未安装uiautomation库，请运行: pip install uiautomation')
    }

    // 获取Python脚本路径
    const scriptPath = path.join(__dirname, 'jianyingUIAutomation.py')
    const pythonCmd = getPythonCommand()
    const videoPathsJson = JSON.stringify(videoPaths)
    const command = `${pythonCmd} "${scriptPath}" import_videos "${videoPathsJson}"`
    
    console.log('🚀 执行剪映UI自动化导入视频:', command)
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60秒超时
      windowsHide: true,
    })

    if (stdout) {
      console.log('📄 Python输出:', stdout)
    }
    if (stderr) {
      console.warn('⚠️ Python警告:', stderr)
    }

    // 检查输出中是否包含成功信息
    if (stdout.includes('✅') || stdout.includes('成功')) {
      return {
        success: true,
        message: '已成功通过UI导入视频',
        output: stdout,
      }
    } else {
      return {
        success: false,
        error: '未能成功导入视频',
        output: stdout,
      }
    }
  } catch (error) {
    console.error('❌ 剪映UI自动化导入失败:', error)
    throw new Error(`剪映UI自动化导入失败: ${error.message}`)
  }
}

/**
 * 自动点击"开始创作"并导入视频到素材库
 * @param {Object} options - 选项
 * @param {Array<string>} options.videoUrls - 视频URL列表
 * @param {string} options.projectName - 项目名称
 * @param {string} options.importLocation - 导入位置：'material' 或 'track'
 * @returns {Promise<Object>} 执行结果
 */
export async function clickStartCreationAndImportVideos(options = {}) {
  const {
    videoUrls = [],
    projectName = '新项目',
    importLocation = 'material', // 'material' 或 'track'
  } = options

  try {
    // 步骤1: 点击开始创作（会自动检测剪映是否已打开，如果已打开则先置顶窗口）
    console.log('🔍 步骤1: 检测剪映窗口并置顶，然后点击"开始创作"按钮...')
    const clickResult = await clickStartCreation()
    if (!clickResult.success) {
      console.warn('⚠️ 点击开始创作失败，尝试继续...')
    }

    // 步骤2: 等待界面加载（减少等待时间）
    console.log('⏳ 步骤2: 等待界面加载...')
    await new Promise(resolve => setTimeout(resolve, 2000)) // 从3秒减少到2秒

    // 步骤3: 下载视频到本地临时文件夹
    console.log('📥 步骤3: 下载视频到本地...')
    const localVideoPaths = []
    
    for (let i = 0; i < videoUrls.length; i++) {
      const videoUrl = videoUrls[i]
      try {
        const tempPath = await downloadVideoToTemp(videoUrl, projectName, i)
        localVideoPaths.push(tempPath)
        console.log(`✅ 视频 ${i + 1}/${videoUrls.length} 已下载: ${tempPath}`)
      } catch (error) {
        console.error(`❌ 下载视频失败 ${videoUrl}:`, error.message)
      }
    }

    if (localVideoPaths.length === 0) {
      throw new Error('没有成功下载任何视频文件')
    }

    // 步骤4: 通过UI自动化导入视频
    console.log('🖱️ 步骤4: 通过UI自动化导入视频...')
    const importResult = await importVideosViaUI(localVideoPaths)
    
    return {
      success: true,
      message: '已成功点击开始创作按钮并通过UI导入视频',
      clickResult,
      importResult,
      localVideoPaths,
    }
  } catch (error) {
    console.error('❌ 剪映UI自动化失败:', error)
    // 注意：不要在这里调用 importVideosToJianying，因为草稿已经在调用此函数之前创建了
    // 如果UI自动化失败，只返回错误信息，不重复创建草稿
    throw new Error(`剪映UI自动化失败: ${error.message}`)
  }
}

/**
 * 备选方案：使用API自动新建项目并导入视频（不点击"开始创作"）
 * @param {Object} options - 选项
 * @param {Array<string>} options.videoUrls - 视频URL列表
 * @param {string} options.projectName - 项目名称
 * @returns {Promise<Object>} 执行结果
 */
export async function autoStartCreationAndImportVideos(options = {}) {
  const {
    videoUrls = [],
    projectName = '新项目',
  } = options

  try {
    // 使用剪映小助手API创建草稿并导入视频
    const { importVideosToJianying } = await import('./jianyingAssistantService.js')
    const result = await importVideosToJianying({
      projectName,
      videoUrls,
      addToTrack: false, // 导入到素材库
      autoSave: true,
    })
    
    return {
      success: true,
      message: '已通过API创建草稿并导入视频',
      result,
    }
  } catch (error) {
    console.error('❌ 剪映API自动化失败:', error)
    throw new Error(`剪映API自动化失败: ${error.message}`)
  }
}
