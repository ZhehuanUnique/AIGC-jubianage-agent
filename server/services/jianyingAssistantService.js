/**
 * 剪映小助手API服务
 * 用于调用剪映小助手API，实现视频导入、草稿创建等功能
 * API文档：https://docs.jcaigc.cn
 * 
 * 主要接口：
 * - create_draft: https://docs.jcaigc.cn/docs/create_draft.html
 * - add_videos: https://docs.jcaigc.cn/docs/add_videos.html
 * - save_draft: https://docs.jcaigc.cn/docs/save_draft.html
 */

const JIANYING_API_BASE_URL = process.env.JIANYING_API_BASE_URL || 'https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1'
const JIANYING_API_KEY = process.env.JIANYING_API_KEY || ''

/**
 * 创建剪映草稿
 * API文档：https://docs.jcaigc.cn/docs/create_draft.html
 * @param {Object} options - 选项
 * @param {number} options.width - 画布宽度（默认1920）
 * @param {number} options.height - 画布高度（默认1080）
 * @returns {Promise<Object>} 创建结果，包含draft_id和draft_url
 */
export async function createDraft(options = {}) {
  const {
    width = 1920,
    height = 1080,
  } = options

  try {
    console.log('📝 调用剪映小助手API创建草稿:', {
      width,
      height,
      apiBaseUrl: JIANYING_API_BASE_URL,
      hasApiKey: !!JIANYING_API_KEY,
    })

    // 检查 fetch 是否可用（Node.js 18+ 支持原生 fetch）
    if (typeof fetch === 'undefined') {
      throw new Error('fetch 不可用，请使用 Node.js 18+ 或安装 node-fetch')
    }

    // 根据文档，请求参数格式为：{ "width": 1920, "height": 1080 }
    let response
    try {
      response = await fetch(`${JIANYING_API_BASE_URL}/create_draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(JIANYING_API_KEY ? { 'Authorization': `Bearer ${JIANYING_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          width,
          height,
        }),
      })
    } catch (fetchError) {
      // 处理网络错误
      console.error('❌ 网络请求失败:', {
        error: fetchError.message,
        url: `${JIANYING_API_BASE_URL}/create_draft`,
        type: fetchError.name,
      })
      
      // 提供更友好的错误信息
      if (fetchError.message.includes('fetch failed') || 
          fetchError.message.includes('ECONNREFUSED') ||
          fetchError.message.includes('ENOTFOUND')) {
        throw new Error(`无法连接到剪映小助手API (${JIANYING_API_BASE_URL})。请检查网络连接或API服务是否可用。`)
      }
      throw fetchError
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`
      console.error('❌ 创建草稿API响应错误:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        url: `${JIANYING_API_BASE_URL}/create_draft`,
      })
      throw new Error(errorMessage)
    }

    const data = await response.json()
    console.log('✅ 剪映草稿创建成功:', data)

    // 从 draft_url 中提取 draft_id
    // draft_url 格式：https://cm.jcaigc.cn/openapi/v1/get_draft?draft_id=2025092811473036584258
    let draftId = null
    if (data.draft_url) {
      const draftIdMatch = data.draft_url.match(/draft_id=([^&]+)/)
      if (draftIdMatch) {
        draftId = draftIdMatch[1]
      }
    }

    return {
      success: true,
      draft_id: draftId,
      draft_url: data.draft_url,
      tip_url: data.tip_url,
      message: '草稿创建成功',
    }
  } catch (error) {
    console.error('❌ 创建剪映草稿失败:', {
      error: error.message,
      stack: error.stack,
      apiBaseUrl: JIANYING_API_BASE_URL,
    })
    throw new Error(`创建剪映草稿失败: ${error.message}`)
  }
}

/**
 * 添加视频到草稿
 * @param {Object} options - 选项
 * @param {string} options.draftId - 草稿ID
 * @param {Array<string>} options.videoUrls - 视频URL列表
 * @param {boolean} options.addToTrack - 是否添加到轨道（默认false，添加到素材库）
 * @param {number} options.startTime - 开始时间（毫秒，仅当addToTrack为true时有效）
 * @returns {Promise<Object>} 添加结果
 */
export async function addVideosToDraft(options = {}) {
  const {
    draftId,
    videoUrls = [],
    addToTrack = false,
    startTime = 0,
  } = options

  if (!draftId) {
    throw new Error('草稿ID不能为空')
  }

  if (!Array.isArray(videoUrls) || videoUrls.length === 0) {
    throw new Error('视频URL列表不能为空')
  }

  try {
    console.log('📹 调用剪映小助手API添加视频:', {
      draftId,
      videoCount: videoUrls.length,
      addToTrack,
      startTime,
    })

    const response = await fetch(`${JIANYING_API_BASE_URL}/add_videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(JIANYING_API_KEY ? { 'Authorization': `Bearer ${JIANYING_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        draft_id: draftId,
        videos: videoUrls.map((url, index) => ({
          url: url,
          name: `视频_${index + 1}`,
          add_to_track: addToTrack,
          start_time: addToTrack ? startTime + (index * 5000) : undefined, // 每个视频间隔5秒
        })),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ 视频添加成功:', data)

    return {
      success: true,
      added_count: videoUrls.length,
      message: `成功添加 ${videoUrls.length} 个视频${addToTrack ? '到轨道' : '到素材库'}`,
    }
  } catch (error) {
    console.error('❌ 添加视频失败:', error)
    throw new Error(`添加视频失败: ${error.message}`)
  }
}

/**
 * 保存草稿
 * @param {string} draftId - 草稿ID
 * @returns {Promise<Object>} 保存结果
 */
export async function saveDraft(draftId) {
  if (!draftId) {
    throw new Error('草稿ID不能为空')
  }

  try {
    console.log('💾 调用剪映小助手API保存草稿:', { draftId })

    const response = await fetch(`${JIANYING_API_BASE_URL}/save_draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(JIANYING_API_KEY ? { 'Authorization': `Bearer ${JIANYING_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        draft_id: draftId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ 草稿保存成功:', data)

    return {
      success: true,
      draft_path: data.draft_path,
      message: '草稿保存成功',
    }
  } catch (error) {
    console.error('❌ 保存草稿失败:', error)
    throw new Error(`保存草稿失败: ${error.message}`)
  }
}

// 执行锁，防止重复调用
let isImporting = false
let lastImportTime = 0
const IMPORT_COOLDOWN = 5000 // 5秒冷却时间

/**
 * 一键导入视频到剪映
 * @param {Object} options - 选项
 * @param {string} options.projectName - 项目名称
 * @param {Array<string>} options.videoUrls - 视频URL列表
 * @param {boolean} options.addToTrack - 是否添加到轨道（默认false，添加到素材库）
 * @param {boolean} options.autoSave - 是否自动保存草稿（默认true）
 * @returns {Promise<Object>} 导入结果
 */
export async function importVideosToJianying(options = {}) {
  const {
    projectName = '新项目',
    videoUrls = [],
    addToTrack = false,
    autoSave = true,
  } = options

  if (!Array.isArray(videoUrls) || videoUrls.length === 0) {
    throw new Error('视频URL列表不能为空')
  }

  // 检查是否正在执行
  const now = Date.now()
  if (isImporting) {
    const timeSinceLastImport = now - lastImportTime
    if (timeSinceLastImport < IMPORT_COOLDOWN) {
      console.warn('⚠️ 导入操作正在进行中，跳过重复调用')
      throw new Error(`导入操作正在进行中，请等待 ${Math.ceil((IMPORT_COOLDOWN - timeSinceLastImport) / 1000)} 秒后再试`)
    }
  }

  // 设置执行锁
  isImporting = true
  lastImportTime = now

  try {
    console.log('🎬 开始一键导入视频到剪映:', {
      projectName,
      videoCount: videoUrls.length,
      addToTrack,
      autoSave,
    })

    // 步骤1：创建草稿
    // 注意：create_draft API 不需要 projectName，只需要 width 和 height
    const draftResult = await createDraft({
      width: 1920,
      height: 1080,
    })

    if (!draftResult.success || !draftResult.draft_id) {
      throw new Error('创建草稿失败')
    }

    const draftId = draftResult.draft_id

    // 步骤2：添加视频
    const addResult = await addVideosToDraft({
      draftId,
      videoUrls,
      addToTrack,
    })

    if (!addResult.success) {
      throw new Error('添加视频失败')
    }

    // 步骤3：保存草稿（如果启用）
    let saveResult = null
    let localDraftPath = null
    
    if (autoSave) {
      try {
        // 先尝试通过 API 保存
        saveResult = await saveDraft(draftId)
        localDraftPath = saveResult?.draft_path
      } catch (saveError) {
        console.warn('⚠️ API保存草稿失败，尝试生成本地草稿文件:', saveError.message)
      }
      
      // 如果 API 保存失败或没有返回本地路径，生成本地草稿文件
      if (!localDraftPath) {
        try {
          const { generateLocalDraftWithVideos } = await import('./jianyingLocalDraftService.js')
          const localDraftResult = await generateLocalDraftWithVideos({
            projectName,
            videoUrls,
            addToTrack,
            width: 1920,
            height: 1080,
          })
          localDraftPath = localDraftResult.draftPath
          console.log('✅ 本地草稿文件已生成:', localDraftPath)
        } catch (localDraftError) {
          console.error('❌ 生成本地草稿文件失败:', localDraftError)
          // 继续执行，至少云端草稿已创建
        }
      }
    }

    // 步骤4：检查剪映是否已打开，如果未打开则打开，然后使用UI自动化导入视频
    let openResult = null
    try {
      console.log('🚀 检查剪映是否已打开...')
      
      // 先检查剪映是否已打开（通过Python脚本）
      let isJianyingRunning = false
      try {
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)
        const path = await import('path')
        
        const scriptPath = path.join(__dirname, 'jianyingUIAutomationV2.py')
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
        
        // 检查剪映是否运行（使用脚本的 check_running 命令）
        const checkCommand = `${pythonCmd} "${scriptPath}" check_running`
        
        try {
          const { stdout } = await execAsync(checkCommand, {
            timeout: 5000,
            windowsHide: true,
          })
          isJianyingRunning = stdout.trim().includes('RUNNING')
          console.log(`📊 剪映运行状态: ${isJianyingRunning ? '已打开' : '未打开'}`)
        } catch (checkError) {
          console.warn('⚠️ 检查剪映状态失败，假设未打开:', checkError.message)
          isJianyingRunning = false
        }
      } catch (error) {
        console.warn('⚠️ 检查剪映状态时出错，假设未打开:', error.message)
        isJianyingRunning = false
      }
      
      // 如果剪映未打开，则打开它
      if (!isJianyingRunning) {
        console.log('🚀 剪映未打开，正在启动...')
        const { exec } = await import('child_process')
        const os = await import('os')
        const fs = await import('fs')
        const path = await import('path')
        
        const homeDir = os.homedir()
        const desktopPath = path.join(homeDir, 'Desktop')
        
        const jianyingPaths = [
          ...(process.env.JIANYING_PATH ? [process.env.JIANYING_PATH] : []),
          path.join(desktopPath, '剪映.lnk'),
          path.join(desktopPath, 'JianyingPro.lnk'),
          path.join(desktopPath, '剪映专业版.lnk'),
          path.join(desktopPath, 'CapCut.lnk'),
          path.join(homeDir, 'AppData', 'Local', 'JianyingPro', 'JianyingPro.exe'),
        ]
        
        let jianyingPath = null
        for (const filePath of jianyingPaths) {
          if (fs.existsSync(filePath)) {
            jianyingPath = filePath
            break
          }
        }
        
        if (jianyingPath) {
          let command
          if (jianyingPath.endsWith('.lnk')) {
            command = `start "" "${jianyingPath}"`
          } else {
            command = `"${jianyingPath}"`
          }
          
          // 立即打开剪映，不等待
          exec(command, (error) => {
            if (error) {
              console.error('❌ 打开剪映失败:', error.message)
            } else {
              console.log('✅ 剪映应用已启动')
            }
          })
        }
      } else {
        console.log('✅ 剪映已打开，立即置顶窗口...')
        // 如果剪映已打开，立即置顶窗口（不等待，异步执行）
        try {
          const { exec } = await import('child_process')
          const path = await import('path')
          
          const scriptPath = path.join(__dirname, 'jianyingUIAutomationV2.py')
          const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
          
          // 立即置顶窗口（异步执行，不阻塞）
          const bringToFrontCommand = `${pythonCmd} "${scriptPath}" bring_to_front`
          exec(bringToFrontCommand, {
            timeout: 15000,  // 增加到15秒超时
            windowsHide: false,  // 显示窗口，便于调试
          }, (error, stdout, stderr) => {
            if (error) {
              console.warn('⚠️ 置顶窗口失败:', error.message)
              if (stderr) {
                console.warn('   错误输出:', stderr)
              }
            } else {
              console.log('✅ 剪映窗口已置顶')
              if (stdout) {
                console.log('   输出:', stdout.trim())
              }
            }
          })
        } catch (error) {
          console.warn('⚠️ 置顶窗口时出错:', error.message)
        }
      }
      
      // 使用UI自动化导入视频并置顶窗口（无论剪映是否已打开，都会先置顶）
      console.log('🚀 使用UI自动化方案导入视频并置顶窗口...')
      const { clickStartCreationAndImportVideos } = await import('./jianyingUIAutomationService.js')
      
      // 延迟执行UI自动化
      // 如果剪映已打开，等待时间可以短一些；如果未打开，等待时间长一些
      // 注意：即使剪映已打开，也需要等待一下，确保置顶操作完成
      const waitTime = isJianyingRunning ? 1000 : 3000  // 已打开时等待1秒，确保置顶完成
      console.log(`⏳ 等待 ${waitTime / 1000} 秒后执行UI自动化（确保窗口已置顶）...`)
      
      // 使用标志防止重复执行
      let uiAutomationExecuted = false
      const uiAutomationTimer = setTimeout(async () => {
        if (uiAutomationExecuted) {
          console.log('⚠️ UI自动化已执行，跳过重复调用')
          return
        }
        uiAutomationExecuted = true
        
        try {
          console.log('🎬 开始执行UI自动化：置顶窗口 -> 点击开始创作 -> 导入视频')
          
          const uiResult = await clickStartCreationAndImportVideos({
            videoUrls,
            projectName,
            importLocation: addToTrack ? 'track' : 'material', // 'material' 或 'track'
          })
          
          console.log('✅ UI自动化执行成功:', uiResult)
        } catch (uiError) {
          console.warn('⚠️ UI自动化失败:', uiError.message)
          console.log('💡 提示：已通过API创建草稿，可以在剪映中手动打开草稿')
          console.log('💡 提示：如果剪映已打开，请手动点击"开始创作"按钮')
        }
      }, waitTime) // 根据剪映是否已打开调整等待时间
      
      // 清理定时器（如果需要）
      // 注意：这里不清理，让定时器正常执行
      
      // 立即返回，不等待UI自动化完成
      openResult = {
        success: true,
        method: 'ui_automation',
        message: '正在通过UI自动化打开剪映并导入视频到素材库/时间轴...',
      }
    } catch (openError) {
      console.warn('⚠️ UI自动化初始化失败:', openError.message)
      openResult = {
        success: false,
        error: openError.message,
      }
    }

    return {
      success: true,
      draft_id: draftId,
      draft_url: draftResult.draft_url,
      draft_path: localDraftPath || saveResult?.draft_path,
      added_count: addResult.added_count,
      openResult,
      message: `成功导入 ${videoUrls.length} 个视频${addToTrack ? '到轨道' : '到素材库'}，${openResult?.success ? '剪映已自动打开' : '请手动打开剪映'}`,
    }
  } catch (error) {
    console.error('❌ 一键导入视频失败:', error)
    throw new Error(`一键导入视频失败: ${error.message}`)
  } finally {
    // 释放执行锁
    setTimeout(() => {
      isImporting = false
    }, IMPORT_COOLDOWN)
  }
}

/**
 * 获取草稿文件列表
 * @param {string} draftId - 草稿ID
 * @returns {Promise<Object>} 文件列表
 */
export async function getDraftFiles(draftId) {
  if (!draftId) {
    throw new Error('草稿ID不能为空')
  }

  try {
    console.log('📋 获取草稿文件列表:', { draftId })

    const response = await fetch(`${JIANYING_API_BASE_URL}/get_draft?draft_id=${draftId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(JIANYING_API_KEY ? { 'Authorization': `Bearer ${JIANYING_API_KEY}` } : {}),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ 获取草稿文件列表成功:', data)

    return {
      success: true,
      files: data.files || [],
      message: '获取文件列表成功',
    }
  } catch (error) {
    console.error('❌ 获取草稿文件列表失败:', error)
    throw new Error(`获取草稿文件列表失败: ${error.message}`)
  }
}

