import { useState, useEffect, useRef } from 'react'
import { X, Upload, HelpCircle, Loader2, Trash2, Eye } from 'lucide-react'
import { getAllProjects } from '../services/projectStorage'
import { alert, alertError, alertInfo } from '../utils/alert'
import { generateImage, getImageTaskStatus, GenerateImageRequest, ImageTaskStatus, uploadAssetImage } from '../services/api'

interface CreateCharacterModalProps {
  onClose: () => void
  projectName?: string // 项目名称，用于检查是否有同名项目
  alwaysShowRightPanel?: boolean // 是否始终显示右侧面板（用于角色管理页面）
  onCharacterSelect?: (character: { id: string; name: string; image?: string }) => void // 选择角色时的回调
}

interface CharacterTask {
  id: string
  name: string
  taskId: string
  status: 'generating' | 'completed' | 'failed'
  progress: number
  imageUrl?: string
  model: string
  resolution: string
  prompt: string
  createdAt: number
}

// 获取模型的 logo 路径
const getModelLogo = (modelId: string): string => {
  switch (modelId) {
    case 'nano-banana-pro':
      return '/models_logo/nano-banana.png'
    case 'midjourney-v7-t2i':
      return '/models_logo/midjourney.png'
    case 'flux-2-max':
    case 'flux-2-flex':
    case 'flux-2-pro':
      return '/models_logo/flux.png'
    case 'seedream-4-5':
    case 'seedream-4-0':
      return '/models_logo/jimeng.png'
    default:
      return ''
  }
}

// 已接入的图片生成模型
const IMAGE_MODELS = [
  { id: 'nano-banana-pro', name: 'Nano Banana Pro' },
  { id: 'midjourney-v7-t2i', name: 'Midjourney v7' },
  { id: 'flux-2-max', name: 'Flux-2-Max' },
  { id: 'flux-2-flex', name: 'Flux-2-Flex' },
  { id: 'flux-2-pro', name: 'Flux-2-Pro' },
  { id: 'seedream-4-5', name: 'Seedream 4.5' },
  { id: 'seedream-4-0', name: 'Seedream 4.0' },
]

function CreateCharacterModal({ onClose, projectName, alwaysShowRightPanel = false, onCharacterSelect }: CreateCharacterModalProps) {
  // 从 sessionStorage 获取项目名称（如果没有通过props传递）
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(projectName || null)
  
  useEffect(() => {
    if (!currentProjectName && projectName) {
      setCurrentProjectName(projectName)
    } else if (!currentProjectName) {
      try {
        const savedScriptTitle = sessionStorage.getItem('scriptInput_scriptTitle')
        if (savedScriptTitle) {
          setCurrentProjectName(savedScriptTitle)
        }
      } catch (error) {
        console.warn('⚠️ 获取项目名称失败:', error)
      }
    }
  }, [projectName])

  const [leftVisible, setLeftVisible] = useState(false)
  const [rightVisible, setRightVisible] = useState(false)
  const [generationMode, setGenerationMode] = useState<'model' | 'upload'>('model')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [hasExistingProject, setHasExistingProject] = useState(false)
  const [projectCharacters, setProjectCharacters] = useState<Array<{ id: string; name: string; image?: string }>>([])
  const [description, setDescription] = useState('')
  const [characterName, setCharacterName] = useState('')
  const [gender, setGender] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedResolution, setSelectedResolution] = useState<'1K' | '2K' | '4K' | null>(null)
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const referenceImageInputRef = useRef<HTMLInputElement>(null)
  
  // 任务列表：生成中的任务
  const [generatingTasks, setGeneratingTasks] = useState<CharacterTask[]>([])
  // 已完成的任务（显示在"确定使用角色"中）
  const [completedCharacters, setCompletedCharacters] = useState<CharacterTask[]>([])
  
  // 轮询任务状态的定时器
  const pollingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // 获取模型支持的分辨率列表
  const getSupportedResolutions = (modelId: string | null): Array<'1K' | '2K' | '4K'> => {
    if (!modelId) return []
    
    switch (modelId) {
      case 'nano-banana-pro':
        return ['1K', '2K', '4K']
      case 'midjourney-v7-t2i':
        return ['2K'] // Midjourney 只支持2K（通过Upscaler）
      case 'flux-2-max':
      case 'flux-2-flex':
      case 'flux-2-pro':
        return ['2K', '4K']
      case 'seedream-4-5':
        return ['2K', '4K']
      case 'seedream-4-0':
        return ['1K', '2K', '4K']
      default:
        return ['2K'] // 默认支持2K
    }
  }

  // 当模型改变时，自动选择第一个支持的分辨率
  useEffect(() => {
    if (selectedModel) {
      const supportedResolutions = getSupportedResolutions(selectedModel)
      if (supportedResolutions.length > 0 && !supportedResolutions.includes(selectedResolution as any)) {
        setSelectedResolution(supportedResolutions[0])
      }
    } else {
      setSelectedResolution(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel])

  // 检查是否有同名项目并加载角色（仅在非 alwaysShowRightPanel 模式下）
  useEffect(() => {
    if (!alwaysShowRightPanel && projectName) {
      const projects = getAllProjects()
      const existingProject = projects.find(p => p.name === projectName)
      if (existingProject) {
        setHasExistingProject(true)
        // 加载项目的角色
        if (existingProject.characters && existingProject.characters.length > 0) {
          setProjectCharacters(existingProject.characters)
        } else {
          setProjectCharacters([])
        }
      } else {
        setHasExistingProject(false)
        setProjectCharacters([])
      }
    } else if (alwaysShowRightPanel) {
      // 如果始终显示右侧面板，则设置为 true
      setHasExistingProject(true)
      // 尝试加载当前项目的角色（用于角色管理页面）
      // 如果有projectId，加载该项目的角色；否则加载所有项目的角色
      const projects = getAllProjects()
      const allCharacters: Array<{ id: string; name: string; image?: string }> = []
      projects.forEach(project => {
        if (project.characters && project.characters.length > 0) {
          allCharacters.push(...project.characters)
        }
      })
      setProjectCharacters(allCharacters)
    }
  }, [projectName, alwaysShowRightPanel])

  useEffect(() => {
    // 左侧窗口从左往右弹出
    setLeftVisible(true)
    // 如果有同名项目或始终显示右侧面板，右侧窗口延迟从右往左弹出
    if (hasExistingProject || alwaysShowRightPanel) {
      setTimeout(() => {
        setRightVisible(true)
      }, 200)
    }
  }, [hasExistingProject, alwaysShowRightPanel])

  const handleClose = () => {
    // 清理所有轮询定时器
    pollingTimersRef.current.forEach((timer) => clearInterval(timer))
    pollingTimersRef.current.clear()
    
    setRightVisible(false)
    setTimeout(() => {
      setLeftVisible(false)
      setTimeout(() => {
        onClose()
      }, 300)
    }, 200)
  }

  // 构建包含性别和年龄段的基础提示词前缀
  const buildBasePrompt = (userDescription: string = '') => {
    let baseParts: string[] = []
    
    // 添加性别信息
    if (gender) {
      baseParts.push(gender)
    }
    
    // 添加年龄段信息
    if (ageRange) {
      baseParts.push(ageRange)
    }
    
    // 构建基础前缀
    let basePrefix = ''
    if (baseParts.length > 0) {
      basePrefix = `${baseParts.join('，')}，`
    }
    
    // 如果用户有输入描述，移除可能已经包含的性别和年龄段信息
    let cleanDescription = userDescription.trim()
    if (cleanDescription) {
      // 移除开头的性别和年龄段信息（如果存在）
      cleanDescription = cleanDescription.replace(/^(男|女)[，,。.]?\s*/, '')
      cleanDescription = cleanDescription.replace(/^(少年|青年|中年|老年)[，,。.]?\s*/, '')
      cleanDescription = cleanDescription.replace(/^(男|女)[，,。.]?\s*(少年|青年|中年|老年)[，,。.]?\s*/, '')
      cleanDescription = cleanDescription.replace(/^(少年|青年|中年|老年)[，,。.]?\s*(男|女)[，,。.]?\s*/, '')
    }
    
    // 组合基础前缀和用户描述
    return basePrefix + cleanDescription
  }

  // 注意：不在useEffect中自动更新描述，避免与用户输入冲突
  // 性别和年龄段信息会在提交时自动添加到提示词开头

  // 检查是否可以提交任务
  const canSubmit = (): boolean => {
    if (!characterName.trim()) return false
    
    if (generationMode === 'model') {
      if (!gender || !ageRange || !selectedModel || !selectedResolution || !description.trim()) return false
    } else {
      if (!uploadedImage) return false
    }
    
    return true
  }

  // 处理提交任务
  const handleSubmitTask = async () => {
    if (!canSubmit()) {
      alert('请填写所有必填项', 'warning')
      return
    }

    try {
      let taskId: string
      let imageUrl: string | undefined

      if (generationMode === 'model') {
        // 构建最终提示词：确保包含性别、年龄段和9:16比例信息
        let finalPrompt = buildBasePrompt(description)
        
        // 移除可能存在的旧的比例信息
        finalPrompt = finalPrompt.replace(/\s*[，,。.]?\s*(图片比例|aspect ratio|比例)[：:]\s*9[：:]16\s*/gi, '').trim()
        
        // 添加9:16比例信息
        if (finalPrompt) {
          finalPrompt = `${finalPrompt}，图片比例：9:16`
        } else {
          const parts: string[] = []
          if (gender) parts.push(gender)
          if (ageRange) parts.push(ageRange)
          if (parts.length > 0) {
            finalPrompt = `${parts.join('，')}，图片比例：9:16`
          } else {
            finalPrompt = '图片比例：9:16'
          }
        }

        // 通过模型生成
        const request: GenerateImageRequest = {
          prompt: finalPrompt,
          model: selectedModel as any,
          aspectRatio: '9:16', // 固定为9:16
          resolution: selectedResolution === '1K' ? undefined : (selectedResolution as '2K' | '4K'),
          size: selectedResolution === '1K' ? '1K' : undefined,
        }

        // 如果有参考图，添加到请求中
        if (referenceImage) {
          request.referenceImage = referenceImage
        }

        const result = await generateImage(request)
        taskId = result.taskId
        
        console.log('✅ 角色图片生成任务已提交:', {
          taskId,
          status: result.status,
          model: selectedModel,
          resolution: selectedResolution,
        })

        // 如果是 Seedream 等同步模型，可能直接返回图片
        if (result.status === 'completed' && (result as any).imageUrl) {
          imageUrl = (result as any).imageUrl
          console.log('✅ 同步模型直接返回图片:', imageUrl)
        }
      } else {
        // 上传图片模式：直接使用上传的图片
        taskId = `upload_${Date.now()}`
        imageUrl = uploadedImage || undefined
      }

      // 创建任务对象
      const task: CharacterTask = {
        id: `task_${Date.now()}`,
        name: characterName,
        taskId,
        status: imageUrl ? 'completed' : 'generating',
        progress: imageUrl ? 100 : 10, // 初始进度设为10%
        imageUrl,
        model: selectedModel || 'upload',
        resolution: selectedResolution || 'N/A',
        prompt: description,
        createdAt: Date.now(),
      }

      // 添加到生成中任务列表
      setGeneratingTasks((prev) => [...prev, task])

      // 如果已经完成（上传模式），直接移动到已完成列表并保存
      if (imageUrl) {
        setTimeout(() => {
          setGeneratingTasks((prev) => prev.filter((t) => t.id !== task.id))
          setCompletedCharacters((prev) => [...prev, task])
          
          // 自动保存到数据库和项目文件夹
          if (currentProjectName && imageUrl) {
            saveCharacterToDatabase(task).catch((error) => {
              console.error('保存角色到数据库失败:', error)
            })
          }
        }, 500)
        
        // 上传图片模式：不显示提示框，静默完成
      } else {
        // 开始轮询任务状态
        startPollingTask(task)
        
        // 模型生成模式：显示提示框
        alert('任务已提交，正在生成中...', 'success')
      }

      // 重置表单
      setCharacterName('')
      setDescription('')
      setGender('')
      setAgeRange('')
      setReferenceImage(null)
      setUploadedImage(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (referenceImageInputRef.current) {
        referenceImageInputRef.current.value = ''
      }
    } catch (error) {
      console.error('提交任务失败:', error)
      alert(error instanceof Error ? error.message : '提交任务失败，请稍后重试', 'error')
    }
  }

  // 开始轮询任务状态
  const startPollingTask = (task: CharacterTask) => {
    // 如果任务已经完成，不需要轮询
    if (task.status === 'completed') {
      return
    }

    const poll = async () => {
      try {
        console.log(`🔍 轮询角色任务状态: taskId=${task.taskId}, model=${task.model}, resolution=${task.resolution}`)
        
        const status = await getImageTaskStatus(
          task.taskId,
          task.model as any,
          task.resolution === '2K' ? '2K' : task.resolution === '4K' ? '4K' : undefined
        )

        console.log(`📊 角色任务状态更新:`, {
          taskId: task.taskId,
          status: status.status,
          progress: status.progress,
          hasImage: !!status.imageUrl,
        })

        // 更新任务状态，确保进度至少是当前值或新值
        setGeneratingTasks((prev) =>
          prev.map((t) => {
            if (t.id === task.id) {
              // 确保进度不会倒退
              let newProgress = status.progress || 0
              
              if ((status.status === 'processing' || status.status === 'pending' || !status.status) && newProgress === 0) {
                if (t.progress === 0) {
                  newProgress = 10
                } else {
                  newProgress = Math.min(Math.max(t.progress || 0, 10) + 5, 90)
                }
              } else if (status.progress !== undefined && status.progress > 0) {
                newProgress = status.progress
              } else if (t.progress > 0) {
                newProgress = Math.min(t.progress + 5, 90)
              }
              
              return {
                ...t,
                status: status.status === 'completed' ? 'completed' : status.status === 'failed' ? 'failed' : 'generating',
                progress: newProgress,
                imageUrl: status.imageUrl || t.imageUrl,
              }
            }
            return t
          })
        )

        // 如果任务完成，移动到已完成列表并保存到数据库
        if (status.status === 'completed' && status.imageUrl) {
          const completedTask = {
            ...task,
            status: 'completed' as const,
            progress: 100,
            imageUrl: status.imageUrl,
          }

          // 自动保存到数据库和项目文件夹
          if (currentProjectName && status.imageUrl) {
            saveCharacterToDatabase(completedTask).catch((error) => {
              console.error('保存角色到数据库失败:', error)
            })
          }

          // 从生成中列表移除
          setGeneratingTasks((prev) => prev.filter((t) => t.id !== task.id))
          // 添加到已完成列表
          setCompletedCharacters((prev) => [...prev, completedTask])

          // 清除轮询定时器
          const timer = pollingTimersRef.current.get(task.id)
          if (timer) {
            clearInterval(timer)
            pollingTimersRef.current.delete(task.id)
          }
        } else if (status.status === 'failed') {
          // 任务失败，更新状态并清除轮询定时器
          setGeneratingTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? { ...t, status: 'failed' as const, progress: 0 }
                : t
            )
          )
          
          const timer = pollingTimersRef.current.get(task.id)
          if (timer) {
            clearInterval(timer)
            pollingTimersRef.current.delete(task.id)
          }
        }
      } catch (error) {
        console.error(`❌ 轮询角色任务 ${task.taskId} 状态失败:`, error)
        
        // 更新任务状态，显示错误但不停止轮询
        setGeneratingTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  progress: t.progress || 10,
                }
              : t
          )
        )
      }
    }

    // 立即执行一次
    poll()

    // 设置定时轮询（每3秒轮询一次）
    const timer = setInterval(poll, 3000)
    pollingTimersRef.current.set(task.id, timer)
  }

  // 保存角色到数据库和项目文件夹
  const saveCharacterToDatabase = async (task: CharacterTask) => {
    if (!currentProjectName || !task.imageUrl) {
      console.warn('⚠️ 无法保存角色：缺少项目名称或图片URL')
      return
    }

    try {
      // 如果图片是URL，需要先转换为base64
      let imageData = task.imageUrl
      if (task.imageUrl.startsWith('http://') || task.imageUrl.startsWith('https://')) {
        // 下载图片并转换为base64
        const response = await fetch(task.imageUrl)
        const blob = await response.blob()
        const reader = new FileReader()
        imageData = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      }

      // 上传到COS并保存到数据库
      await uploadAssetImage({
        base64Image: imageData,
        assetType: 'character',
        assetName: task.name,
        projectName: currentProjectName,
      })

      console.log(`✅ 角色 "${task.name}" 已保存到项目 "${currentProjectName}"`)
    } catch (error) {
      console.error('保存角色失败:', error)
      throw error
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={handleClose}>
      {/* 左侧窗口 - 创建角色 */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2/3 bg-white border-r border-purple-500 overflow-y-auto transition-transform duration-300 ${
          leftVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">新建角色</h2>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* 角色名称 */}
            <div>
              <label className="block text-sm mb-2">
                <span className="text-red-500">*</span> 角色名称
              </label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="请输入角色名称"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* 性别 - 仅在"通过模型生成角色"时显示 */}
            {generationMode === 'model' && (
              <div>
                <label className="block text-sm mb-2">
                  <span className="text-red-500">*</span> 性别
                </label>
                <select 
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value)
                    // 性别变化时，自动更新描述
                    if (description) {
                      const updated = buildBasePrompt(description)
                      const hasRatio = /9[：:]16|aspect.*9[：:]16|比例.*9[：:]16/i.test(updated)
                      if (!hasRatio && updated.trim()) {
                        const final = updated.replace(/\s*[，,。.]?\s*(图片比例|aspect ratio|比例)[：:]\s*9[：:]16\s*/gi, '').trim()
                        setDescription(final ? `${final}，图片比例：9:16` : updated)
                      } else {
                        setDescription(updated)
                      }
                    }
                  }}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value="">请选择</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
            )}

            {/* 年龄段 - 仅在"通过模型生成角色"时显示 */}
            {generationMode === 'model' && (
              <div>
                <label className="block text-sm mb-2">
                  <span className="text-red-500">*</span> 年龄段
                </label>
                <select 
                  value={ageRange}
                  onChange={(e) => {
                    setAgeRange(e.target.value)
                    // 年龄段变化时，自动更新描述
                    if (description) {
                      const updated = buildBasePrompt(description)
                      const hasRatio = /9[：:]16|aspect.*9[：:]16|比例.*9[：:]16/i.test(updated)
                      if (!hasRatio && updated.trim()) {
                        const final = updated.replace(/\s*[，,。.]?\s*(图片比例|aspect ratio|比例)[：:]\s*9[：:]16\s*/gi, '').trim()
                        setDescription(final ? `${final}，图片比例：9:16` : updated)
                      } else {
                        setDescription(updated)
                      }
                    }
                  }}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value="">请选择</option>
                  <option value="少年">少年</option>
                  <option value="青年">青年</option>
                  <option value="中年">中年</option>
                  <option value="老年">老年</option>
                </select>
              </div>
            )}

            {/* 生成方式 */}
            <div>
              <label className="block text-sm mb-2">
                <span className="text-red-500">*</span> 生成方式
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setGenerationMode('model')
                    setUploadedImage(null) // 切换到模型生成时，清除上传的图片
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                    generationMode === 'model'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-500'
                  }`}
                >
                  通过模型生成角色
                </button>
                <button
                  onClick={() => {
                    setGenerationMode('upload')
                    setSelectedModel(null) // 切换到上传图片时，清除选中的模型
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                    generationMode === 'upload'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-500'
                  }`}
                >
                  自己上传图片
                </button>
              </div>
            </div>

            {/* 选择模型 - 仅在"通过模型生成角色"时显示 */}
            {generationMode === 'model' && (
              <>
                <div>
                  <label className="block text-sm mb-2">
                    <span className="text-red-500">*</span> 选择模型
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {IMAGE_MODELS.map((model) => {
                      const logoPath = getModelLogo(model.id)
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => setSelectedModel(model.id)}
                          className={`flex flex-col items-center justify-center px-2 py-3 rounded-lg text-sm font-medium transition-all w-full ${
                            selectedModel === model.id
                              ? 'bg-purple-600 text-white border-2 border-purple-600'
                              : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-500 hover:bg-purple-50'
                          }`}
                        >
                          {logoPath && (
                            <img
                              src={logoPath}
                              alt={model.name}
                              className="w-12 h-12 object-contain mb-2"
                              onError={(e) => {
                                // 如果图片加载失败，隐藏图片
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          )}
                          <span className="text-xs text-center leading-tight">{model.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 分辨率选择 - 仅在选择了模型后显示 */}
                {selectedModel && (
                  <div>
                    <label className="block text-sm mb-2">
                      <span className="text-red-500">*</span> 分辨率
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {getSupportedResolutions(selectedModel).map((resolution) => (
                        <button
                          key={resolution}
                          type="button"
                          onClick={() => setSelectedResolution(resolution)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedResolution === resolution
                              ? 'bg-purple-600 text-white border-2 border-purple-600'
                              : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-500 hover:bg-purple-50'
                          }`}
                        >
                          {resolution}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 上传图片 - 仅在"自己上传图片"时显示 */}
            {generationMode === 'upload' && (
              <div>
                <label className="block text-sm mb-2">
                  <span className="text-red-500">*</span> 上传图片
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      // 验证文件类型
                      if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
                        alert('请上传 JPG、JPEG 或 PNG 格式的图片', 'warning')
                        return
                      }
                      
                      // 自动识别文件名并填入角色名称（如果角色名称为空）
                      if (!characterName.trim()) {
                        const fileName = file.name
                        // 去掉扩展名
                        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
                        // 如果文件名看起来像标准命名（不包含特殊字符，长度合理），自动填入
                        if (nameWithoutExt && 
                            nameWithoutExt.length <= 50 && 
                            /^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/.test(nameWithoutExt)) {
                          setCharacterName(nameWithoutExt.trim())
                        }
                      }
                      
                      // 读取文件并转换为 base64
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        setUploadedImage(event.target?.result as string)
                        // 上传成功，不显示提示框
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-purple-500 transition-colors"
                >
                  {uploadedImage ? (
                    <div className="space-y-2">
                      <div 
                        className="relative mx-auto rounded-lg overflow-hidden"
                        style={{ 
                          width: '100%',
                          aspectRatio: '9/16',
                          maxWidth: '300px'
                        }}
                        onMouseEnter={(e) => {
                          // 鼠标悬停时显示眼睛图标
                          const eyeIcon = e.currentTarget.querySelector('.preview-eye-icon')
                          if (eyeIcon) {
                            eyeIcon.classList.remove('opacity-0')
                            eyeIcon.classList.add('opacity-100')
                          }
                        }}
                        onMouseLeave={(e) => {
                          // 鼠标离开时隐藏眼睛图标
                          const eyeIcon = e.currentTarget.querySelector('.preview-eye-icon')
                          if (eyeIcon) {
                            eyeIcon.classList.remove('opacity-100')
                            eyeIcon.classList.add('opacity-0')
                          }
                        }}
                      >
                        <img
                          src={uploadedImage}
                          alt="上传的图片"
                          className="w-full h-full object-cover"
                        />
                        {/* 眼睛图标 - 鼠标悬停时显示 */}
                        <div
                          className="preview-eye-icon absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 transition-opacity duration-200 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation() // 阻止触发文件选择
                            setPreviewImage(uploadedImage)
                          }}
                        >
                          <Eye className="text-white" size={32} />
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">点击更换图片</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto mb-2 text-gray-600" size={32} />
                      <p className="text-gray-600 text-sm">点击上传图片</p>
                      <p className="text-gray-500 text-xs mt-1">支持JPG / JPEG / PNG格式</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 描述 - 仅在"通过模型生成角色"时显示 */}
            {generationMode === 'model' && (
              <div>
                <label className="block text-sm mb-2">
                  <span className="text-red-500">*</span> 描述
                  <span className="text-gray-500 text-xs ml-2">(图片比例固定为9:16)</span>
                </label>
                <div className="mb-2">
                  <button 
                    onClick={() => {
                      // 构建包含性别和年龄段的默认提示词
                      let defaultPrompt = ''
                      if (gender || ageRange) {
                        const parts: string[] = []
                        if (gender) parts.push(gender)
                        if (ageRange) parts.push(ageRange)
                        defaultPrompt = `${parts.join('，')}，`
                      }
                      defaultPrompt += `从多角度对角色进行详细描述，如身份、体型、身高、发型、发色、脸型、眼睛颜色、肤色、服装、饰品、鞋子等角度。图片比例：9:16`
                      setDescription(defaultPrompt)
                    }}
                    className="px-4 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                  >
                    一键填入提示词框架
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => {
                    let newValue = e.target.value
                    // 自动确保提示词中包含9:16比例信息
                    // 如果用户输入的内容中没有"9:16"或"9：16"，自动在末尾添加
                    const hasRatio = /9[：:]16|aspect.*9[：:]16|比例.*9[：:]16/i.test(newValue)
                    if (!hasRatio && newValue.trim()) {
                      // 移除之前可能添加的比例信息，然后重新添加
                      newValue = newValue.replace(/\s*[，,。.]?\s*(图片比例|aspect ratio|比例)[：:]\s*9[：:]16\s*/gi, '').trim()
                      if (newValue) {
                        newValue = `${newValue}，图片比例：9:16`
                      }
                    }
                    setDescription(newValue)
                  }}
                  onBlur={(e) => {
                    // 当用户离开输入框时，如果已选择性别和年龄段，确保它们出现在描述开头
                    let newValue = e.target.value.trim()
                    if (newValue && (gender || ageRange)) {
                      // 使用buildBasePrompt函数来确保性别和年龄段在开头
                      const updated = buildBasePrompt(newValue)
                      // 确保包含9:16比例
                      const hasRatio = /9[：:]16|aspect.*9[：:]16|比例.*9[：:]16/i.test(updated)
                      if (!hasRatio && updated.trim()) {
                        const final = updated.replace(/\s*[，,。.]?\s*(图片比例|aspect ratio|比例)[：:]\s*9[：:]16\s*/gi, '').trim()
                        setDescription(final ? `${final}，图片比例：9:16` : updated)
                      } else {
                        setDescription(updated)
                      }
                    }
                  }}
                  placeholder="从多角度对角色进行详细描述，如身份、体型、身高、发型、发色、脸型、眼睛颜色、肤色、服装、饰品、鞋子等角度。图片比例：9:16"
                  rows={6}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  提示：图片比例已固定为9:16，无需手动修改
                </p>
              </div>
            )}

            {/* 上传参考图 - 仅在"通过模型生成角色"时显示 */}
            {generationMode === 'model' && (
              <div>
                <label className="block text-sm mb-2">上传参考图</label>
                <input
                  ref={referenceImageInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
                        alert('请上传 JPG、JPEG 或 PNG 格式的图片', 'warning')
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        setReferenceImage(event.target?.result as string)
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <div
                  onClick={() => referenceImageInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
                >
                  {referenceImage ? (
                    <div className="space-y-2">
                      <img
                        src={referenceImage}
                        alt="参考图"
                        className="max-w-full max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-gray-600 text-sm">点击更换参考图</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto mb-2 text-gray-600" size={32} />
                      <p className="text-gray-600 text-sm">上传参考图</p>
                      <p className="text-gray-500 text-xs mt-1">支持JPG / JPEG / PNG格式</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end">
              <button 
                onClick={handleSubmitTask}
                disabled={!canSubmit()}
                className={`px-8 py-3 rounded-lg transition-all ${
                  canSubmit()
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {generationMode === 'model' ? '提交任务 (消耗10积分)' : '提交任务'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧窗口 - 角色生成任务列表（在存在同名项目或始终显示时显示） */}
      {(hasExistingProject || alwaysShowRightPanel) && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-1/3 bg-white border-l border-purple-500 overflow-y-auto transition-transform duration-300 ${
            rightVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">角色生成任务列表</h2>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* 角色预生成 */}
            <div>
              <h3 className="text-sm font-medium mb-4">角色预生成</h3>
              {generatingTasks.length === 0 ? (
                <div className="bg-white border border-gray-300 rounded-lg p-12 text-center">
                  <div className="text-gray-500 text-sm">暂无数据</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {generatingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white border border-gray-300 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{task.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {task.status === 'generating' ? `${task.progress}%` : task.status === 'failed' ? '失败' : '完成'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // 停止轮询
                              const timer = pollingTimersRef.current.get(task.id)
                              if (timer) {
                                clearInterval(timer)
                                pollingTimersRef.current.delete(task.id)
                              }
                              // 从任务列表中移除
                              setGeneratingTasks(generatingTasks.filter(t => t.id !== task.id))
                            }}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="删除任务"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      {task.status === 'generating' && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      )}
                      {task.status === 'generating' && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>生成中...</span>
                        </div>
                      )}
                      {task.status === 'failed' && (
                        <div className="text-xs text-red-500">生成失败，请重试</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 确定使用角色 */}
            <div>
              <h3 className="text-sm font-medium mb-4">确定使用角色</h3>
              {completedCharacters.length === 0 && projectCharacters.length === 0 ? (
                <div className="bg-white border border-gray-300 rounded-lg p-12 text-center">
                  <div className="text-gray-500 text-sm">暂无数据</div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* 显示新生成的角色 */}
                    {completedCharacters.map((character) => (
                      <div
                        key={character.id}
                        className="bg-white border border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-purple-500 transition-colors"
                        onClick={() => {
                          if (onCharacterSelect) {
                            onCharacterSelect({
                              id: character.id,
                              name: character.name,
                              image: character.imageUrl,
                            })
                            onClose()
                          }
                        }}
                      >
                        <div className="aspect-square bg-gray-700 flex items-center justify-center overflow-hidden">
                          {character.imageUrl ? (
                            <img
                              src={character.imageUrl}
                              alt={character.name}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white">
                              {character.name[0]}
                            </div>
                          )}
                        </div>
                        <div className="p-2 text-center text-xs">{character.name}</div>
                      </div>
                    ))}
                    {/* 显示项目中的已有角色 */}
                    {projectCharacters.map((character) => (
                      <div 
                        key={character.id} 
                        className="bg-white border border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-purple-500 transition-colors"
                        onClick={() => {
                          if (onCharacterSelect) {
                            onCharacterSelect(character)
                            onClose()
                          }
                        }}
                      >
                        <div className="aspect-square bg-gray-700 flex items-center justify-center overflow-hidden">
                          {character.image ? (
                            <img
                              src={character.image}
                              alt={character.name}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white">
                              {character.name[0]}
                            </div>
                          )}
                        </div>
                        <div className="p-2 text-center text-xs">{character.name}</div>
                      </div>
                    ))}
                  </div>
                  {(completedCharacters.length + projectCharacters.length) > 4 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <button className="px-2 py-1 text-gray-600">上一页</button>
                      <span className="text-gray-600 text-sm">1 / {Math.ceil((completedCharacters.length + projectCharacters.length) / 4)}</span>
                      <button className="px-2 py-1 text-gray-600">下一页</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 图片预览模态框 - 全屏黑色背景，右上角有X */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          {/* 关闭按钮 - 右上角 */}
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 border border-white border-opacity-30 text-white flex items-center justify-center transition-all z-10"
          >
            <X size={24} />
          </button>
          
          {/* 图片容器 - 居中，最大尺寸限制 */}
          <div 
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="预览图片"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateCharacterModal
