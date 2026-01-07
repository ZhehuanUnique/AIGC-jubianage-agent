import { useState, useEffect, useRef } from 'react'
import { X, Upload, Loader2, Trash2, Eye } from 'lucide-react'
import { alert } from '../utils/alert'
import { generateImage, getImageTaskStatus, GenerateImageRequest, ImageTaskStatus, uploadAssetImage } from '../services/api'

interface CreateSceneModalProps {
  onClose: () => void
  onSceneSelect?: (scene: { id: string; name: string; image?: string }) => void // 选择场景时的回调
  projectName?: string // 项目名称，用于保存到项目文件夹
}

interface SceneTask {
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

function CreateSceneModal({ onClose, onSceneSelect, projectName }: CreateSceneModalProps) {
  // 从 sessionStorage 获取项目名称（如果没有通过props传递）
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(projectName || null)
  
  useEffect(() => {
    if (projectName) {
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
  const [selectedResolution, setSelectedResolution] = useState<'1K' | '2K' | '4K' | null>(null)
  const [sceneName, setSceneName] = useState('')
  const [description, setDescription] = useState('')
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const referenceImageInputRef = useRef<HTMLInputElement>(null)
  
  // 任务列表：生成中的任务
  const [generatingTasks, setGeneratingTasks] = useState<SceneTask[]>([])
  // 已完成的任务（显示在"确定使用场景"中）
  const [completedScenes, setCompletedScenes] = useState<SceneTask[]>([])
  // 选中的场景ID
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  
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

  // 检查模型是否支持图生图（垫图）
  const supportsImageToImage = (modelId: string | null): boolean => {
    if (!modelId) return false
    
    const supportedModels = [
      'nano-banana-pro',
      'seedream-4-0',
      'seedream-4-5',
      'flux-2-max',
      'flux-2-flex',
      'flux-2-pro',
    ]
    
    return supportedModels.includes(modelId)
  }

  // 当模型改变时，自动选择第一个支持的分辨率，并清除不支持图生图模型的垫图
  useEffect(() => {
    if (selectedModel) {
      const supportedResolutions = getSupportedResolutions(selectedModel)
      if (supportedResolutions.length > 0 && !supportedResolutions.includes(selectedResolution as any)) {
        setSelectedResolution(supportedResolutions[0])
      }
      
      // 如果新模型不支持图生图，清除已上传的垫图
      if (!supportsImageToImage(selectedModel) && referenceImage) {
        setReferenceImage(null)
        if (referenceImageInputRef.current) {
          referenceImageInputRef.current.value = ''
        }
      }
    } else {
      setSelectedResolution(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel])

  useEffect(() => {
    setLeftVisible(true)
    setTimeout(() => {
      setRightVisible(true)
    }, 200)
  }, [])

  const handleClose = () => {
    setRightVisible(false)
    setTimeout(() => {
      setLeftVisible(false)
      setTimeout(() => {
        onClose()
      }, 300)
    }, 200)
  }

  // 检查是否可以提交
  const canSubmit = (): boolean => {
    if (!sceneName.trim()) return false
    
    if (generationMode === 'model') {
      // 模型生成模式：需要选择模型和分辨率
      return selectedModel !== null && selectedResolution !== null
    } else {
      // 上传模式：需要上传图片
      return uploadedImage !== null
    }
  }

  // 提交任务
  const handleSubmitTask = async () => {
    if (!canSubmit()) {
      alert('请填写完整信息', 'warning')
      return
    }

    try {
      if (generationMode === 'model') {
        // 通过模型生成场景
        if (!selectedModel || !selectedResolution || !sceneName.trim()) {
          alert('请填写完整信息', 'warning')
          return
        }

        // 构建提示词
        let prompt = description.trim()
        if (referenceImage) {
          // 如果有参考图，添加到提示词中
          prompt = `${prompt} [参考图: ${referenceImage}]`
        }

        // 调用图片生成API
        const request: GenerateImageRequest = {
          prompt: prompt || sceneName,
          model: selectedModel,
          resolution: selectedResolution,
          projectName: currentProjectName || undefined,
          assetName: sceneName.trim(),
          assetCategory: 'scene',
        }

        const result = await generateImage(request)
        
        if (result.success && result.taskId) {
          // 创建任务对象
          const newTask: SceneTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: sceneName.trim(),
            taskId: result.taskId,
            status: 'generating',
            progress: 0,
            imageUrl: null,
          }

          // 添加到生成中任务列表
          setGeneratingTasks(prev => [...prev, newTask])

          // 开始轮询任务状态
          startPollingTaskStatus(newTask.id, result.taskId)

          // 清空表单
          setSceneName('')
          setDescription('')
          setReferenceImage(null)
          setSelectedModel(null)
          setSelectedResolution(null)

          // 移除成功弹窗，任务已提交
        } else {
          alert(result.error || '提交任务失败', 'error')
        }
      } else {
        // 上传图片模式
        if (!uploadedImage || !sceneName.trim()) {
          alert('请上传图片并填写场景名称', 'warning')
          return
        }

        // 直接使用 base64 图片数据上传
        const result = await uploadAssetImage({
          base64Image: uploadedImage,
          assetType: 'scenes',
          assetName: sceneName.trim(),
          projectName: currentProjectName || undefined,
        })

        if (result && result.url) {
          // 创建已完成场景对象
          const newScene: SceneTask = {
            id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: sceneName.trim(),
            taskId: '',
            status: 'completed',
            progress: 100,
            imageUrl: result.url,
          }

          // 添加到已完成场景列表
          setCompletedScenes(prev => [newScene, ...prev])

          // 清空表单
          setSceneName('')
          setUploadedImage(null)

          // 移除成功弹窗，上传成功后自动添加到已完成列表
        } else {
          alert('上传失败', 'error')
        }
      }
    } catch (error) {
      console.error('提交任务失败:', error)
      alert(error instanceof Error ? error.message : '提交任务失败，请稍后重试', 'error')
    }
  }

  // 轮询任务状态
  const startPollingTaskStatus = (taskId: string, imageTaskId: string) => {
    const poll = async () => {
      try {
        const statusResult = await getImageTaskStatus(imageTaskId)
        
        if (statusResult.success && statusResult.data) {
          const taskData = statusResult.data
          
          // 更新任务状态
          setGeneratingTasks(prev => prev.map(task => {
            if (task.id === taskId) {
              const updatedTask: SceneTask = {
                ...task,
                status: taskData.status as 'generating' | 'completed' | 'failed',
                progress: taskData.progress || 0,
                imageUrl: taskData.imageUrl || null,
              }

              // 如果任务完成，移动到已完成列表并保存到数据库
              if (taskData.status === 'completed' && taskData.imageUrl) {
                const completedTask = {
                  ...updatedTask,
                  status: 'completed' as const,
                  progress: 100,
                  imageUrl: taskData.imageUrl,
                }
                
                // 自动保存到数据库和项目文件夹
                if (currentProjectName && taskData.imageUrl) {
                  saveSceneToDatabase(completedTask).catch((error) => {
                    console.error('保存场景到数据库失败:', error)
                  })
                }
                
                setTimeout(() => {
                  setGeneratingTasks(prevTasks => prevTasks.filter(t => t.id !== taskId))
                  setCompletedScenes(prev => [completedTask, ...prev])
                }, 500)
                return completedTask
              }

              return updatedTask
            }
            return task
          }))

          // 如果任务还在进行中，继续轮询
          if (taskData.status === 'generating' || taskData.status === 'pending') {
            const timer = setTimeout(poll, 3000) // 每3秒轮询一次
            pollingTimersRef.current.set(taskId, timer)
          } else {
            // 任务完成或失败，停止轮询
            pollingTimersRef.current.delete(taskId)
          }
        } else {
          // 查询失败，停止轮询
          pollingTimersRef.current.delete(taskId)
          setGeneratingTasks(prev => prev.map(task => 
            task.id === taskId ? { ...task, status: 'failed' } : task
          ))
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error)
        pollingTimersRef.current.delete(taskId)
        setGeneratingTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: 'failed' } : task
        ))
      }
    }

    // 立即开始第一次轮询
    const timer = setTimeout(poll, 1000)
    pollingTimersRef.current.set(taskId, timer)
  }

  // 保存场景到数据库和项目文件夹
  const saveSceneToDatabase = async (task: SceneTask) => {
    if (!task.imageUrl) {
      console.warn('⚠️ 无法保存场景：缺少图片URL')
      alert('无法保存场景：缺少图片URL', 'error')
      return
    }
    
    if (!currentProjectName) {
      console.warn('⚠️ 无法保存场景：缺少项目名称')
      alert('请提供项目名称', 'error')
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
        assetType: 'scenes',
        assetName: task.name,
        projectName: currentProjectName,
      })

      console.log(`✅ 场景 "${task.name}" 已保存到项目 "${currentProjectName}"`)
      
      // 触发自定义事件，通知页面刷新
      window.dispatchEvent(new CustomEvent('scene-uploaded', { detail: { sceneName: task.name } }))
    } catch (error) {
      console.error('保存场景失败:', error)
      throw error
    }
  }

  // 清理轮询定时器
  useEffect(() => {
    return () => {
      pollingTimersRef.current.forEach(timer => clearTimeout(timer))
      pollingTimersRef.current.clear()
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={handleClose}>
      {/* 左侧窗口 - 创建场景 */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2/3 bg-white border-r border-purple-500 overflow-y-auto transition-transform duration-300 ${
          leftVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">创建场景</h2>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* 场景名称 */}
            <div>
              <label className="block text-sm mb-2">
                <span className="text-red-500">*</span> 场景名称
              </label>
              <input
                type="text"
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                placeholder="请输入场景名称"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>

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
                  通过模型生成场景
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
                  自己上传场景图片
                </button>
              </div>
            </div>

            {/* 选择模型 - 仅在"通过模型生成场景"时显示 */}
            {generationMode === 'model' && (
              <>
                <div>
                  <label className="block text-sm mb-2">
                    <span className="text-red-500">*</span> 选择模型
                  </label>
                  <div className="grid grid-cols-7 gap-4">
                    {IMAGE_MODELS.map((model) => {
                      const logoPath = getModelLogo(model.id)
                      return (
                        <div key={model.id} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => setSelectedModel(model.id)}
                            className={`relative w-full rounded-lg overflow-hidden transition-all ${
                            selectedModel === model.id
                                ? 'ring-2 ring-purple-600 ring-offset-2'
                                : 'hover:ring-2 hover:ring-purple-300 hover:ring-offset-1'
                          }`}
                            style={{ aspectRatio: '16/9' }}
                        >
                            {logoPath ? (
                            <img
                              src={logoPath}
                              alt={model.name}
                                className="w-full h-full object-cover"
                              onError={(e) => {
                                  // 如果图片加载失败，显示占位符
                                e.currentTarget.style.display = 'none'
                                  const parent = e.currentTarget.parentElement
                                  if (parent && !parent.querySelector('.placeholder')) {
                                    const placeholder = document.createElement('div')
                                    placeholder.className = 'placeholder w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs'
                                    placeholder.textContent = model.name
                                    parent.appendChild(placeholder)
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                                {model.name}
                              </div>
                            )}
                            {selectedModel === model.id && (
                              <div className="absolute inset-0 bg-purple-600 bg-opacity-20 flex items-center justify-center">
                                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                        </button>
                          <span className="text-xs text-center mt-1 text-gray-700 leading-tight">{model.name}</span>
                        </div>
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

            {/* 上传图片 - 仅在"自己上传场景图片"时显示 */}
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
                      
                      // 自动识别文件名并填入场景名称（如果场景名称为空）
                      if (!sceneName.trim()) {
                        const fileName = file.name
                        // 去掉扩展名
                        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
                        // 如果文件名看起来像标准命名（不包含特殊字符，长度合理），自动填入
                        if (nameWithoutExt && 
                            nameWithoutExt.length <= 50 && 
                            /^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/.test(nameWithoutExt)) {
                          setSceneName(nameWithoutExt.trim())
                        }
                      }
                      
                      // 读取文件并转换为 base64
                      // 优化：压缩图片以减少卡顿
                      const maxSize = 2 * 1024 * 1024 // 2MB
                      if (file.size > maxSize) {
                        // 如果图片太大，压缩它
                        const canvas = document.createElement('canvas')
                        const ctx = canvas.getContext('2d')
                        const img = new Image()
                        
                        img.onload = () => {
                          // 计算压缩后的尺寸（保持宽高比，最大宽度1920）
                          const maxWidth = 1920
                          const ratio = Math.min(maxWidth / img.width, 1)
                          canvas.width = img.width * ratio
                          canvas.height = img.height * ratio
                          
                          // 绘制并压缩
                          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
                          canvas.toBlob((blob) => {
                            if (blob) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                setUploadedImage(event.target?.result as string)
                              }
                              reader.readAsDataURL(blob)
                            }
                          }, 'image/jpeg', 0.85) // 85%质量
                        }
                        img.src = URL.createObjectURL(file)
                      } else {
                        // 图片不大，直接读取
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          setUploadedImage(event.target?.result as string)
                        }
                        reader.readAsDataURL(file)
                      }
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
                          aspectRatio: '16/9',
                          maxWidth: '500px'
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

            {/* 描述 - 仅在"通过模型生成场景"时显示 */}
            {generationMode === 'model' && (
              <div>
                <label className="block text-sm mb-2">
                  <span className="text-red-500">*</span> 描述
                </label>
                <div className="mb-2">
                  <button className="px-4 py-1 bg-purple-600 text-white rounded text-sm">一键填入提示词框架</button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="从多角度对场景进行详细描述，如空间、时间、天气、标志性物品、背景元素、整体环境、时代、主题、艺术风格、画面视角等角度"
                  rows={8}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            )}

            {/* 图生图 - 仅在"通过模型生成场景"且模型支持图生图时显示 */}
            {generationMode === 'model' && supportsImageToImage(selectedModel) && (
              <div>
                <label className="block text-sm mb-2">图生图</label>
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
                  className="border-2 border-dashed border-yellow-400 rounded-lg p-8 text-center cursor-pointer hover:border-yellow-500 transition-colors"
                >
                  {referenceImage ? (
                    <div className="space-y-2">
                      <img
                        src={referenceImage}
                        alt="垫图"
                        className="max-w-full max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-gray-600 text-sm">点击更换图片</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto mb-2 text-gray-600" size={32} />
                      <p className="text-gray-600 text-sm">上传垫图（图生图）</p>
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
                {generationMode === 'model' ? '提交任务 (消耗10积分)' : '确定'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧窗口 - 场景生成任务列表 */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-1/3 bg-white border-l border-purple-500 overflow-y-auto transition-transform duration-300 ${
          rightVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">场景生成任务列表</h2>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* 场景预生成 */}
            <div>
              <h3 className="text-sm font-medium mb-4">场景预生成</h3>
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

            {/* 确定使用场景 */}
            <div>
              <h3 className="text-sm font-medium mb-4">确定使用场景</h3>
              {completedScenes.length === 0 ? (
                <div className="bg-white border border-gray-300 rounded-lg p-12 text-center">
                  <div className="text-gray-500 text-sm">暂无数据</div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {completedScenes.map((scene) => (
                      <div
                        key={scene.id}
                        className={`bg-white border-2 rounded-lg overflow-hidden cursor-pointer transition-all relative ${
                          selectedSceneId === scene.id
                            ? 'border-green-500 shadow-lg'
                            : 'border-gray-300 hover:border-purple-500'
                        }`}
                        onClick={async () => {
                          // 设置选中状态
                          setSelectedSceneId(scene.id)
                          
                          // 确保场景已保存到数据库（如果taskId不是以'scene_'开头且不为空，说明是生成的，需要保存）
                          if (currentProjectName && scene.imageUrl && !scene.taskId.startsWith('scene_') && scene.taskId !== '') {
                            // 如果还没有保存（通过taskId判断），先保存
                            try {
                              await saveSceneToDatabase(scene)
                            } catch (error) {
                              console.error('保存场景失败:', error)
                              alert('保存场景失败，请稍后重试', 'error')
                              return
                            }
                          }
                          
                          // 立即调用回调，不延迟
                          if (onSceneSelect) {
                            onSceneSelect({
                              id: scene.id,
                              name: scene.name,
                              image: scene.imageUrl,
                            })
                            onClose()
                          }
                        }}
                      >
                        <div className="aspect-square bg-gray-700 flex items-center justify-center overflow-hidden relative">
                          {scene.imageUrl ? (
                            <img
                              src={scene.imageUrl}
                              alt={scene.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-purple-600 flex items-center justify-center text-white text-xs">
                              {scene.name}
                            </div>
                          )}
                          {/* 选中标记 - 绿色圆圈白色对号 */}
                          {selectedSceneId === scene.id && (
                            <div className="absolute bottom-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg z-10">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="p-2 text-center text-xs">{scene.name}</div>
                      </div>
                    ))}
                  </div>
                  {completedScenes.length > 4 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <button className="px-2 py-1 text-gray-600">‹</button>
                      <span className="text-gray-600 text-sm">1 / {Math.ceil(completedScenes.length / 4)}</span>
                      <button className="px-2 py-1 text-gray-600">›</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

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

export default CreateSceneModal
