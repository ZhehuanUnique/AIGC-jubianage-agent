import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, Upload, Loader2 } from 'lucide-react'
import { analyzeScriptText, analyzeScriptFile, segmentScript, checkRAGScript, createOrUpdateProject, createTask } from '../services/api'
import { createProject } from '../services/projectStorage'

function ScriptInput() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as any
  
  // 从 sessionStorage 或 location.state 恢复数据
  const [scriptTitle, setScriptTitle] = useState(() => {
    // 优先使用 location.state
    if (state?.scriptTitle) {
      return state.scriptTitle
    }
    // 尝试从 sessionStorage 恢复
    try {
      const saved = sessionStorage.getItem('scriptInput_scriptTitle')
      if (saved) {
        return saved
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 scriptTitle 失败:', error)
    }
    return ''
  })
  
  const [workStyle, setWorkStyle] = useState(() => {
    if (state?.workStyle) {
      return state.workStyle
    }
    try {
      const saved = sessionStorage.getItem('scriptInput_workStyle')
      if (saved) {
        return saved
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 workStyle 失败:', error)
    }
    return '真人电影风格'
  })
  
  const [workBackground, setWorkBackground] = useState(() => {
    if (state?.workBackground) {
      return state.workBackground
    }
    try {
      const saved = sessionStorage.getItem('scriptInput_workBackground')
      if (saved) {
        return saved
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 workBackground 失败:', error)
    }
    return '现代'
  })
  
  const [scriptContent, setScriptContent] = useState(() => {
    if (state?.scriptContent) {
      return state.scriptContent
    }
    try {
      const saved = sessionStorage.getItem('scriptInput_scriptContent')
      if (saved) {
        return saved
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 scriptContent 失败:', error)
    }
    return ''
  })
  
  const [showStyleDropdown, setShowStyleDropdown] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 保存所有数据到 sessionStorage 的辅助函数
  const saveAllData = () => {
    try {
      if (scriptTitle) {
        sessionStorage.setItem('scriptInput_scriptTitle', scriptTitle)
      }
      if (workStyle) {
        sessionStorage.setItem('scriptInput_workStyle', workStyle)
      }
      if (workBackground) {
        sessionStorage.setItem('scriptInput_workBackground', workBackground)
      }
      if (scriptContent) {
        sessionStorage.setItem('scriptInput_scriptContent', scriptContent)
      }
      console.log('✅ 已保存剧本数据到 sessionStorage')
    } catch (error) {
      console.warn('⚠️ 保存数据到 sessionStorage 失败:', error)
    }
  }

  // 当数据变化时，保存到 sessionStorage
  useEffect(() => {
    saveAllData()
  }, [scriptTitle, workStyle, workBackground, scriptContent])

  const styles = ['真人电影风格', '2d动漫风', '3d动漫风']

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.docx')) {
      setError('请上传 .docx 格式的文件')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      // 调用API分析文件，使用 qwen-max 模型
      const result = await analyzeScriptFile(file, 'qwen-max', workStyle, workBackground)
      
      // 如果返回了剧本内容，填充到文本框
      if (result.scriptContent) {
        setScriptContent(result.scriptContent)
      }

      // 如果没有标题，使用文件名
      const finalTitle = scriptTitle || file.name.replace('.docx', '')
      if (!scriptTitle) {
        setScriptTitle(finalTitle)
      }

      // 调用切分接口，使用 qwen-max 生成详细的分镜提示词
      const segmentResult = await segmentScript({
        scriptContent: result.scriptContent,
        scriptTitle: finalTitle,
        model: 'qwen-max', // 使用 qwen-max 获得最佳效果
        generatePrompts: true, // 生成分镜提示词
        workStyle, // 传递作品风格
        workBackground, // 传递作品背景
      })

      console.log('📝 切分结果:', segmentResult)
      console.log('📝 片段数量:', segmentResult.segments?.length || 0)

      // 创建或更新项目
      createProject(finalTitle, result)
      
      // 跳转到资产详情页面
      navigate('/asset-details', {
        state: {
          analysisResult: result,
          segments: segmentResult.segments,
          scriptTitle: finalTitle,
          workStyle,
          workBackground,
        },
      })
    } catch (err) {
      console.error('文件分析错误:', err)
      setIsAnalyzing(false)
      
      // 检查是否是网络错误（后端服务未启动）
      if (err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('网络错误') || err.message.includes('无法连接'))) {
        setError('无法连接到后端服务，请提醒管理员启动后端服务')
      } else {
        setError(err instanceof Error ? err.message : '文件分析失败，请稍后重试')
      }
      
      // 重置文件输入
      e.target.value = ''
    }
  }

  // 生成模拟分析结果（用于后端不可用时）
  const generateMockAnalysis = (content: string) => {
    // 简单的关键词提取作为模拟
    const characters: string[] = []
    const scenes: string[] = []
    const items: string[] = []

    // 提取常见角色名称模式
    const characterPatterns = /[傅苏李王张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程魏苏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤][\u4e00-\u9fa5]{1,2}/g
    const foundCharacters = content.match(characterPatterns)
    if (foundCharacters) {
      characters.push(...Array.from(new Set(foundCharacters)).slice(0, 10))
    }

    // 提取场景关键词
    const sceneKeywords = ['医院', '公司', '咖啡厅', '家', '办公室', '诊室', '走廊', '门口', '街道']
    sceneKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        scenes.push(keyword)
      }
    })

    // 提取物品关键词
    const itemKeywords = ['药', '咖啡', '手机', '文件', '桌子', '椅子', '门', '窗']
    itemKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        items.push(keyword)
      }
    })

    return {
      characters: characters.map(name => ({ name })),
      scenes: scenes.map(name => ({ name })),
      items: items.map(name => ({ name })),
    }
  }

  const handleSubmit = async () => {
    // 验证必填项
    if (!scriptTitle || !scriptContent) {
      setError('请填写剧本标题和剧本内容')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    // 在开始分析之前就创建任务，这样用户可以在任务列表中立即看到
    // 设置 isCompleted1: true 以便任务立即显示在列表中（即使还在分析中）
    let taskId: number | undefined
    try {
      const task = await createTask({
        title: scriptTitle,
        description: `剧本: ${scriptTitle}`,
        progress1: 10, // 初始进度为10%，表示正在分析中
        progress2: 0,
        isCompleted1: true, // 设置为true，让任务立即显示在列表中
        mode: 'image',
      })
      taskId = task.id
      console.log('✅ 任务已创建（分析前）:', task)
      // 保存任务ID到sessionStorage，供后续步骤使用
      sessionStorage.setItem('current_task_id', task.id.toString())
      // 触发任务创建事件，通知任务列表页面刷新
      window.dispatchEvent(new CustomEvent('task-created'))
    } catch (error) {
      console.error('创建任务失败:', error)
      // 继续执行，不阻塞流程
    }

    try {
      // 生成 scriptId（使用剧本标题的拼音或英文，去除特殊字符）
      const scriptId = scriptTitle
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]/g, '') // 移除特殊字符，保留中文、英文、数字
        .replace(/\s+/g, '') // 移除空格
        .substring(0, 50) // 限制长度

      // 检查 RAG 库中是否存在同名剧本
      let ragScriptId: string | null = null
      try {
        const ragCheck = await checkRAGScript(scriptId)
        if (ragCheck.exists) {
          ragScriptId = scriptId
          console.log(`✅ 在 RAG 库中找到同名剧本: ${scriptId}`)
        } else {
          console.log(`ℹ️ RAG 库中未找到同名剧本: ${scriptId}`)
        }
      } catch (ragError) {
        console.warn('⚠️ 检查 RAG 库失败，继续流程:', ragError)
        // RAG 检查失败不影响主流程
      }

      // 并行调用API分析剧本和切分剧本，都使用 qwen-max 模型
      const [analysisResult, segmentResult] = await Promise.all([
        analyzeScriptText({
          scriptContent,
          scriptTitle,
          model: 'qwen-max', // 使用 qwen-max 获得最佳效果
          workStyle, // 传递作品风格
          workBackground, // 传递作品背景
        }),
        segmentScript({
          scriptContent,
          scriptTitle,
          model: 'qwen-max', // 使用 qwen-max 获得最佳效果
          generatePrompts: true, // 生成分镜提示词
          workStyle, // 传递作品风格
          workBackground, // 传递作品背景
        }),
      ])

      // 创建或更新项目到数据库
      let projectId: number | undefined
      try {
        const project = await createOrUpdateProject({
          name: scriptTitle,
          scriptTitle: scriptTitle,
          scriptContent: scriptContent,
          workStyle: workStyle,
          workBackground: workBackground,
          analysisResult: analysisResult,
          segments: segmentResult.segments, // 保存分镜数据
        })
        projectId = project.id
        console.log('✅ 项目已保存到数据库:', project)
        console.log('✅ 分镜数据已保存，数量:', segmentResult.segments?.length || 0)
      } catch (error) {
        console.error('保存项目到数据库失败:', error)
        // 继续执行，不阻塞流程
      }

      // 更新任务：关联项目ID，标记第一步完成，更新进度
      if (taskId) {
        try {
          await updateTask(taskId, {
            project_id: projectId, // 使用 project_id 而不是 projectId
            progress1: 20, // 第一步完成，进度20%
            isCompleted1: true, // 标记第一步已完成
          })
          console.log('✅ 任务已更新（分析后）:', taskId)
        } catch (error) {
          console.error('更新任务失败:', error)
          // 继续执行，不阻塞流程
        }
      }

      // 创建或更新项目（本地存储，保持兼容性）
      createProject(scriptTitle, analysisResult)
      
      // 保存 scriptId 到 sessionStorage
      if (ragScriptId) {
        try {
          sessionStorage.setItem('current_scriptId', ragScriptId)
          console.log(`✅ 已保存 scriptId 到 sessionStorage: ${ragScriptId}`)
        } catch (error) {
          console.warn('⚠️ 保存 scriptId 失败:', error)
        }
      }
      
      // 跳转到资产详情页面
      navigate('/asset-details', {
        state: {
          analysisResult,
          segments: segmentResult.segments,
          scriptTitle,
          workStyle,
          workBackground,
          scriptId: ragScriptId, // 传递 scriptId，如果有的话
        },
      })
    } catch (err) {
      console.error('剧本分析错误:', err)
      setIsAnalyzing(false)
      
      // 检查是否是网络错误（后端服务未启动）
      if (err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('网络错误') || err.message.includes('无法连接'))) {
        setError('无法连接到后端服务，请提醒管理员启动后端服务')
      } else {
        setError(err instanceof Error ? err.message : '剧本分析失败，请稍后重试')
      }
    }
  }

  return (
    <div className="h-screen bg-white text-gray-900 overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 导航栏 */}
        <div className="flex items-center gap-4 px-4 py-2 flex-shrink-0">
          <button
            onClick={() => navigate('/tasks')}
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-pink-500 flex items-center justify-center text-xs font-bold">1</span>
              <span className="border-b-2 border-pink-500">输入剧本(一整集)</span>
            </div>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                saveAllData()
                // 尝试从 sessionStorage 恢复必要数据
                let segmentsData = null
                let analysisResultData = null
                try {
                  const savedSegments = sessionStorage.getItem('assetDetails_segments') || sessionStorage.getItem('shotManagement_segments')
                  if (savedSegments) {
                    segmentsData = JSON.parse(savedSegments)
                  }
                  // 尝试恢复分析结果（如果有）
                  const savedAnalysis = sessionStorage.getItem('assetDetails_analysisResult')
                  if (savedAnalysis) {
                    analysisResultData = JSON.parse(savedAnalysis)
                  }
                } catch (error) {
                  console.warn('⚠️ 恢复数据失败:', error)
                }
                navigate('/asset-details', {
                  state: {
                    segments: segmentsData,
                    analysisResult: analysisResultData,
                    scriptTitle,
                    workStyle,
                    workBackground,
                    scriptContent,
                  }
                })
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">2</span>
              <span>资产详情</span>
            </button>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                saveAllData()
                // 尝试从 sessionStorage 恢复必要数据
                let segmentsData = null
                let shotsData = null
                try {
                  const savedSegments = sessionStorage.getItem('shotManagement_segments')
                  if (savedSegments) {
                    segmentsData = JSON.parse(savedSegments)
                  }
                  const savedShots = sessionStorage.getItem('shotManagement_shots')
                  if (savedShots) {
                    shotsData = JSON.parse(savedShots)
                  }
                } catch (error) {
                  console.warn('⚠️ 恢复数据失败:', error)
                }
                navigate('/shot-management', {
                  state: {
                    segments: segmentsData,
                    shots: shotsData,
                    scriptTitle,
                    workStyle,
                    workBackground,
                  }
                })
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">3</span>
              <span>分镜管理</span>
            </button>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                saveAllData()
                navigate('/image-fusion')
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">4</span>
              <span>融图管理</span>
            </button>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                saveAllData()
                navigate('/video-editing')
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">5</span>
              <span>视频编辑</span>
            </button>
          </div>
        </div>

        {/* 表单内容 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-4xl mx-auto space-y-6">
          {/* 剧本标题 */}
          <div>
            <label className="block text-sm mb-2">
              剧本标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={scriptTitle}
              onChange={(e) => setScriptTitle(e.target.value)}
              placeholder="请填写剧本标题"
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* 作品风格 */}
          <div>
            <label className="block text-sm mb-2">作品风格</label>
            <div className="relative">
              <button
                onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg flex items-center justify-between hover:border-purple-500"
              >
                <span>{workStyle}</span>
                <span className="text-gray-600 pointer-events-none">▼</span>
              </button>
              {showStyleDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg overflow-hidden">
                  {styles.map((style) => (
                    <button
                      key={style}
                      onClick={() => {
                        setWorkStyle(style)
                        setShowStyleDropdown(false)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      {style}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 作品背景 */}
          <div>
            <label className="block text-sm mb-2">
              作品背景 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={workBackground}
                onChange={(e) => setWorkBackground(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 appearance-none pr-10"
              >
                <option value="古代">古代</option>
                <option value="现代">现代</option>
                <option value="未来">未来</option>
                <option value="中古世纪">中古世纪</option>
                <option value="异世界穿越">异世界穿越</option>
                <option value="末世">末世</option>
              </select>
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none">▼</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              提示：作品背景会影响后续步骤的场景、物品、融图提示词和视频提示词的生成风格
            </p>
          </div>

          {/* 剧本内容 */}
          <div className="relative">
            <label className="block text-sm mb-2">
              剧本内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              placeholder="请整理好一整集的完整剧本,直接填入"
              rows={12}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
            />
            {/* 字数提示移到右上角 */}
            <div className="absolute top-8 right-2">
              <span className="text-gray-600 text-xs">
                {scriptContent.length}
              </span>
            </div>
          </div>

          {/* 上传文件 */}
          <div className="-mt-2">
            <div className="relative">
              <input
                type="file"
                accept=".docx"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={isAnalyzing}
              />
              <label
                htmlFor="file-upload"
                className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 ${
                  isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload size={20} />
                <span>{isAnalyzing ? '分析中...' : '上传docx文件'}</span>
              </label>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isAnalyzing}
              className={`px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all flex items-center gap-2 ${
                isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isAnalyzing && <Loader2 size={20} className="animate-spin" />}
              {isAnalyzing ? '分析中...' : '提交至下一步'}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScriptInput
