import { useState, useEffect, useRef } from 'react'
import { X, Upload, Loader2, Trash2 } from 'lucide-react'
import { alert } from '../utils/alert'
import { generateImage, getImageTaskStatus, GenerateImageRequest, ImageTaskStatus, uploadAssetImage, getProjectItems, getProjects, getGeneratedAssets } from '../services/api'

interface CreateItemModalProps {
  onClose: () => void
  onItemSelect?: (item: { id: string; name: string; image?: string }) => void // 选择物品时的回调
  projectName?: string // 项目名称，用于保存到项目文件夹
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

interface ItemTask {
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

function CreateItemModal({ onClose, onItemSelect, projectName }: CreateItemModalProps) {
  // 从 sessionStorage 获取项目名称（如果没有通过props传递）
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(projectName || null)
  
  useEffect(() => {
    if (!currentProjectName) {
      try {
        const savedScriptTitle = sessionStorage.getItem('scriptInput_scriptTitle')
        if (savedScriptTitle) {
          setCurrentProjectName(savedScriptTitle)
        }
      } catch (error) {
        console.warn('⚠️ 获取项目名称失败:', error)
      }
    }
  }, [])
  const [leftVisible, setLeftVisible] = useState(false)
  const [rightVisible, setRightVisible] = useState(false)
  const [generationMode, setGenerationMode] = useState<'model' | 'upload'>('model')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedResolution, setSelectedResolution] = useState<'1K' | '2K' | '4K' | null>(null)
  const [itemName, setItemName] = useState('')
  const [description, setDescription] = useState('')
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const referenceImageInputRef = useRef<HTMLInputElement>(null)
  
  // 任务列表：生成中的任务
  const [generatingTasks, setGeneratingTasks] = useState<ItemTask[]>([])
  // 已完成的任务（显示在"确定使用物品"中）
  const [completedItems, setCompletedItems] = useState<ItemTask[]>([])
  
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

  // 从数据库加载已生成的物品
  const loadCompletedItems = async () => {
    if (!currentProjectName) {
      console.log('⚠️ 无法加载物品：缺少项目名称')
      return
    }
    
    try {
      console.log(`🔍 开始加载物品，项目名称: "${currentProjectName}"`)
      
      // 先获取项目列表，找到对应的项目ID
      const token = localStorage.getItem('token')
      if (!token) {
        console.warn('⚠️ 无法加载物品：缺少token')
        return
      }
      
      const projectsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (projectsResponse.ok) {
        const projectsResult = await projectsResponse.json()
        console.log('📋 获取到的项目列表:', projectsResult)
        
        if (projectsResult.success && projectsResult.data) {
          // 查找匹配的项目（通过name或script_title）
          const project = projectsResult.data.find((p: any) => 
            p.name === currentProjectName || p.script_title === currentProjectName
          )
          
          console.log(`🔍 查找项目匹配结果:`, {
            currentProjectName,
            foundProject: project ? { id: project?.id, name: project?.name, script_title: project?.script_title } : null,
            allProjects: projectsResult.data.map((p: any) => ({ id: p.id, name: p.name, script_title: p.script_title }))
          })
          
          if (project && project.id) {
            // 优先从 generated_assets 表加载（包含所有生成和上传的资产）
            try {
              const generatedAssets = await getGeneratedAssets({
                projectId: project.id,
                assetCategory: 'item'
              })
              
              if (generatedAssets && generatedAssets.length > 0) {
                const completedTasks: ItemTask[] = generatedAssets.map((asset) => ({
                  id: `item_${asset.id}`,
                  name: asset.assetName,
                  taskId: `completed_${asset.id}`,
                  status: 'completed' as const,
                  progress: 100,
                  imageUrl: asset.cosUrl || undefined,
                  model: asset.model || 'completed',
                  resolution: 'N/A',
                  prompt: asset.prompt || '',
                  createdAt: new Date(asset.createdAt).getTime(),
                }))
                setCompletedItems(completedTasks)
                console.log(`✅ 从 generated_assets 表加载了 ${completedTasks.length} 个已生成的物品:`, completedTasks.map(t => ({ name: t.name, imageUrl: t.imageUrl })))
                return
              }
            } catch (genAssetError) {
              console.warn('⚠️ 从 generated_assets 表加载失败，尝试从 items 表加载:', genAssetError)
            }
            
            // 如果 generated_assets 表没有数据，从 items 表加载（兼容旧数据）
            const items = await getProjectItems(project.id)
            console.log(`📦 从数据库获取到的物品:`, items)
            
            // 转换为ItemTask格式并添加到completedItems
            // 即使items为空数组，也要更新列表（清空已完成的物品）
            const completedTasks: ItemTask[] = (items || []).map((item) => ({
              id: `item_${item.id}`,
              name: item.name,
              taskId: `completed_${item.id}`,
              status: 'completed' as const,
              progress: 100,
              imageUrl: item.image || item.image_url || undefined,
              model: 'completed',
              resolution: 'N/A',
              prompt: '',
              createdAt: Date.now(),
            }))
            setCompletedItems(completedTasks)
            console.log(`✅ 从 items 表加载了 ${completedTasks.length} 个已生成的物品:`, completedTasks.map(t => ({ name: t.name, imageUrl: t.imageUrl })))
          } else {
            console.warn(`⚠️ 未找到匹配的项目: "${currentProjectName}"`)
          }
        }
      } else {
        console.error('❌ 获取项目列表失败:', projectsResponse.status, projectsResponse.statusText)
      }
    } catch (error) {
      console.error('❌ 加载已生成物品失败:', error)
    }
  }

  // 初始加载和定期刷新
  useEffect(() => {
    // 立即加载一次
    loadCompletedItems()
    
    // 设置定期刷新（每3秒刷新一次）
    const refreshInterval = setInterval(() => {
      loadCompletedItems()
    }, 3000)
    
    // 监听物品上传事件
    const handleItemUploaded = () => {
      console.log('📢 收到物品上传事件，延迟500ms后刷新')
      // 延迟500ms确保数据库已保存
      setTimeout(() => {
        loadCompletedItems()
      }, 500)
    }
    
    window.addEventListener('item-uploaded', handleItemUploaded)
    
    // 清理函数
    return () => {
      clearInterval(refreshInterval)
      window.removeEventListener('item-uploaded', handleItemUploaded)
    }
  }, [currentProjectName])

  useEffect(() => {
    setLeftVisible(true)
    setTimeout(() => {
      setRightVisible(true)
    }, 200)
    
    // 清理函数：组件卸载时清除所有轮询定时器
    return () => {
      pollingTimersRef.current.forEach((timer) => {
        clearInterval(timer)
      })
      pollingTimersRef.current.clear()
    }
  }, [])

  const handleClose = () => {
    setRightVisible(false)
    setTimeout(() => {
      setLeftVisible(false)
      setTimeout(() => {
        // 清理所有轮询定时器
        pollingTimersRef.current.forEach((timer) => {
          clearInterval(timer)
        })
        pollingTimersRef.current.clear()
        onClose()
      }, 300)
    }, 200)
  }

  // 检查是否可以提交任务
  const canSubmit = (): boolean => {
    if (!itemName.trim()) return false
    
    if (generationMode === 'model') {
      if (!selectedModel || !selectedResolution || !description.trim()) return false
    } else {
      if (!uploadedImage) return false
    }
    
    return true
  }

  // 提交任务
  const handleSubmitTask = async () => {
    if (!canSubmit()) {
      alert('请填写所有必填项', 'warning')
      return
    }

    // 立即显示成功提示，不等待API调用完成
    alert('任务已提交，正在生成中...', 'success')

    try {
      let taskId: string
      let imageUrl: string | undefined

      if (generationMode === 'model') {
        // 通过模型生成
        const request: GenerateImageRequest = {
          prompt: description,
          model: selectedModel as any,
          resolution: selectedResolution === '1K' ? undefined : (selectedResolution as '2K' | '4K'),
          size: selectedResolution === '1K' ? '1K' : undefined,
        }

        // 如果有参考图，添加到请求中
        if (referenceImage) {
          request.referenceImage = referenceImage
        }

        const result = await generateImage(request)
        taskId = result.taskId
        
        // 检查是否是同步模型（Seedream）
        const isSyncModel = selectedModel === 'seedream-4-5' || selectedModel === 'seedream-4-0'
        
        console.log('✅ 图片生成任务已提交:', {
          taskId,
          status: result.status,
          model: selectedModel,
          resolution: selectedResolution,
          isSyncModel,
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

      // 检查是否是同步模型（用于后续处理）
      const isSyncModel = generationMode === 'model' && (selectedModel === 'seedream-4-5' || selectedModel === 'seedream-4-0')

      // 创建任务对象
      const task: ItemTask = {
        id: `task_${Date.now()}`,
        name: itemName,
        taskId,
        status: imageUrl ? 'completed' : 'generating',
        progress: imageUrl ? 100 : (isSyncModel ? 20 : 10), // 同步模型初始进度20%
        imageUrl,
        model: selectedModel || 'upload',
        resolution: selectedResolution || 'N/A',
        prompt: description,
        createdAt: Date.now(),
      }

      // 添加到生成中任务列表（即使已完成也要先显示在生成中，让用户看到）
      console.log('📝 添加任务到生成中列表:', {
        taskId: task.id,
        name: task.name,
        status: task.status,
        progress: task.progress,
        model: task.model,
      })
      setGeneratingTasks((prev) => {
        const newTasks = [...prev, task]
        console.log('📋 当前生成中任务列表:', newTasks.map(t => ({
          id: t.id,
          name: t.name,
          status: t.status,
          progress: t.progress,
        })))
        return newTasks
      })

      // 如果已经完成（上传模式），直接移动到已完成列表并保存
      if (imageUrl && generationMode === 'upload') {
        setTimeout(() => {
          setGeneratingTasks((prev) => prev.filter((t) => t.id !== task.id))
          setCompletedItems((prev) => [...prev, task])
          
          // 自动保存到数据库和项目文件夹
          if (currentProjectName && imageUrl) {
            saveItemToDatabase(task).catch((error) => {
              console.error('保存物品到数据库失败:', error)
            })
          }
        }, 500)
      } else if (imageUrl && isSyncModel) {
        // 同步模型直接返回图片：先显示进度模拟，然后完成
        simulateSyncModelProgress(task, true) // true表示已有图片
      } else if (isSyncModel) {
        // 同步模型：模拟进度显示
        simulateSyncModelProgress(task, false)
      } else {
        // 异步模型：开始轮询任务状态
        startPollingTask(task)
      }

      // 重置表单
      setItemName('')
      setDescription('')
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

  // 模拟同步模型的进度（Seedream等）
  const simulateSyncModelProgress = (task: ItemTask, hasImage: boolean = false) => {
    console.log('🎬 开始模拟同步模型进度:', {
      taskId: task.id,
      taskName: task.name,
      hasImage,
      initialProgress: 20,
    })
    
    let progress = 20
    // 立即更新一次，确保任务显示在列表中
    setGeneratingTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, progress: 20, status: 'generating' as const } : t
      )
    )
    
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15 + 5 // 每次增加5-20%
      if (progress >= 95) {
        progress = 95
        clearInterval(progressInterval)
        
        // 延迟一点后查询实际结果或使用已有图片
        setTimeout(async () => {
          try {
            let finalImageUrl = task.imageUrl
            
            // 如果还没有图片，查询任务状态
            if (!finalImageUrl) {
              const status = await getImageTaskStatus(
                task.taskId,
                task.model as any,
                task.resolution === '2K' ? '2K' : task.resolution === '4K' ? '4K' : undefined
              )
              
              if (status.status === 'completed' && status.imageUrl) {
                finalImageUrl = status.imageUrl
              } else {
                // 如果还没完成，继续轮询
                startPollingTask(task)
                return
              }
            }
            
            // 有图片了，完成任务
            if (finalImageUrl) {
              const completedTask = {
                ...task,
                status: 'completed' as const,
                progress: 100,
                imageUrl: finalImageUrl,
              }
              
              // 自动保存到数据库
              if (currentProjectName && finalImageUrl) {
                saveItemToDatabase(completedTask).catch((error) => {
                  console.error('保存物品到数据库失败:', error)
                })
              }
              
              // 从生成中列表移除
              setGeneratingTasks((prev) => prev.filter((t) => t.id !== task.id))
              // 添加到已完成列表
              setCompletedItems((prev) => [...prev, completedTask])
            } else {
              // 如果还没完成，继续轮询
              startPollingTask(task)
            }
          } catch (error) {
            console.error('查询同步模型任务状态失败:', error)
            // 继续轮询
            startPollingTask(task)
          }
        }, hasImage ? 1000 : 2000) // 如果已有图片，延迟短一点
      } else {
        // 更新进度
        const currentProgress = Math.min(progress, 95)
        console.log(`📊 更新任务进度: ${task.name} -> ${currentProgress}%`)
        setGeneratingTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, progress: currentProgress, status: 'generating' as const } : t
          )
        )
      }
    }, 200) // 每200ms更新一次进度，让进度更快更流畅
    
    // 保存定时器以便清理
    pollingTimersRef.current.set(task.id, progressInterval as any)
  }

  // 开始轮询任务状态
  const startPollingTask = (task: ItemTask) => {
    // 如果任务已经完成，不需要轮询
    if (task.status === 'completed') {
      return
    }

    console.log('🔄 开始轮询任务:', {
      taskId: task.id,
      taskName: task.name,
      model: task.model,
    })
    
    // 立即更新一次，确保任务显示在列表中
    setGeneratingTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, progress: Math.max(t.progress || 10, 10), status: 'generating' as const } : t
      )
    )

    const poll = async () => {
      try {
        console.log(`🔍 轮询任务状态: taskId=${task.taskId}, model=${task.model}, resolution=${task.resolution}`)
        
        const status = await getImageTaskStatus(
          task.taskId,
          task.model as any,
          task.resolution === '2K' ? '2K' : task.resolution === '4K' ? '4K' : undefined
        )

        console.log(`📊 任务状态更新:`, {
          taskId: task.taskId,
          status: status.status,
          progress: status.progress,
          hasImage: !!status.imageUrl,
        })

        // 更新任务状态，确保进度至少是当前值或新值
        setGeneratingTasks((prev) =>
          prev.map((t) => {
            if (t.id === task.id) {
              // 确保进度不会倒退，如果新进度为0但任务状态是processing，使用估算进度
              let newProgress = status.progress || 0
              
              // 如果状态是processing但进度为0，根据轮询次数估算进度
              if ((status.status === 'processing' || status.status === 'pending' || !status.status) && newProgress === 0) {
                // 如果当前进度也是0，给一个小的初始进度
                if (t.progress === 0) {
                  newProgress = 10
                } else {
                  // 保持当前进度，不倒退，或者稍微增加
                  newProgress = Math.min(Math.max(t.progress || 0, 10) + 5, 90)
                }
              } else if (status.progress !== undefined && status.progress > 0) {
                // 如果API返回了有效进度，使用API的进度
                newProgress = status.progress
              } else if (t.progress > 0) {
                // 如果API没有返回进度但之前有进度，保持或稍微增加
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
            saveItemToDatabase(completedTask).catch((error) => {
              console.error('保存物品到数据库失败:', error)
              // 即使保存失败，也继续显示在列表中
            })
          }

          // 从生成中列表移除
          setGeneratingTasks((prev) => prev.filter((t) => t.id !== task.id))
          // 添加到已完成列表
          setCompletedItems((prev) => [...prev, completedTask])

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
        console.error(`❌ 轮询任务 ${task.taskId} 状态失败:`, error)
        
        // 如果错误持续发生，可能需要标记为失败
        // 但先继续轮询，因为可能是临时网络问题
        // 更新任务状态，显示错误但不停止轮询
        setGeneratingTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  progress: t.progress || 10, // 保持当前进度或给一个默认值
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

  // 保存物品到数据库和项目文件夹
  const saveItemToDatabase = async (task: ItemTask) => {
    if (!currentProjectName || !task.imageUrl) {
      console.warn('⚠️ 无法保存物品：缺少项目名称或图片URL')
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
      const result = await uploadAssetImage({
        base64Image: imageData,
        assetType: 'items',
        assetName: task.name,
        projectName: currentProjectName,
      })

      console.log(`✅ 物品 "${task.name}" 已保存到项目 "${currentProjectName}"`, result)
      
      // 保存成功后，立即刷新列表
      setTimeout(() => {
        loadCompletedItems()
      }, 500)
    } catch (error) {
      console.error('保存物品失败:', error)
      throw error
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={handleClose}>
      {/* 左侧窗口 - 新建物品 */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2/3 bg-white border-r border-purple-500 overflow-y-auto transition-transform duration-300 ${
          leftVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">新建物品</h2>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* 物品名称 */}
            <div>
              <label className="block text-sm mb-2">
                <span className="text-red-500">*</span> 物品名称
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="请输入物品名称"
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
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                    generationMode === 'model'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-500'
                  }`}
                >
                  通过模型生成物品
                </button>
                <button
                  onClick={() => {
                    setGenerationMode('upload')
                    setSelectedModel(null)
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

            {/* 选择模型 - 仅在"通过模型生成物品"时显示 */}
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

            {/* 描述 - 仅在"通过模型生成物品"时显示 */}
            {generationMode === 'model' && (
              <div>
                <label className="block text-sm mb-2">
                  <span className="text-red-500">*</span> 描述
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="对物品内容进行详细描述"
                  rows={6}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
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
                      if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
                        alert('请上传 JPG、JPEG 或 PNG 格式的图片', 'warning')
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        setUploadedImage(event.target?.result as string)
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
                >
                  {uploadedImage ? (
                    <div className="space-y-2">
                      <img
                        src={uploadedImage}
                        alt="上传的图片"
                        className="max-w-full max-h-48 mx-auto rounded-lg"
                      />
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

            {/* 上传参考图 - 仅在"通过模型生成物品"时显示 */}
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
                      <p className="text-gray-600 text-sm">点击更换图片</p>
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
                提交任务 (消耗10积分)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧窗口 - 物品生成任务列表 */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-1/3 bg-white border-l border-purple-500 overflow-y-auto transition-transform duration-300 ${
          rightVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">物品生成任务列表</h2>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* 物品预生成 */}
            <div>
              <h3 className="text-sm font-medium mb-4">物品预生成</h3>
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

            {/* 确定使用物品 */}
            <div>
              <h3 className="text-sm font-medium mb-4">确定使用物品</h3>
              {completedItems.length === 0 ? (
                <div className="bg-white border border-gray-300 rounded-lg p-12 text-center">
                  <div className="text-gray-500 text-sm">暂无数据</div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {completedItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-purple-500 transition-colors"
                        onClick={() => {
                          if (onItemSelect) {
                            onItemSelect({
                              id: item.id,
                              name: item.name,
                              image: item.imageUrl,
                            })
                            onClose()
                          }
                        }}
                      >
                        <div className="aspect-square bg-gray-700 flex items-center justify-center overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-purple-600 flex items-center justify-center text-white text-xs">
                              {item.name}
                            </div>
                          )}
                        </div>
                        <div className="p-2 text-center text-xs">{item.name}</div>
                      </div>
                    ))}
                  </div>
                  {completedItems.length > 4 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <button className="px-2 py-1 text-gray-600">上一页</button>
                      <span className="text-gray-600 text-sm">1 / {Math.ceil(completedItems.length / 4)}</span>
                      <button className="px-2 py-1 text-gray-600">下一页</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateItemModal
