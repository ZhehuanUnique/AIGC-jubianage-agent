import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Loader2, Share2, Download, MoreVertical, Heart, ThumbsUp, Edit, Sparkles, Zap } from 'lucide-react'
import { alertSuccess, alertError } from '../utils/alert'
import { generateFirstLastFrameVideo, getFirstLastFrameVideoStatus, getFirstLastFrameVideos, toggleFirstLastFrameVideoLike, toggleFirstLastFrameVideoFavorite, createVideoProcessingTask } from '../services/api'
import { calculateVideoGenerationCredit } from '../utils/creditCalculator'
import { getUserSettings } from '../services/settingsService'
import UiverseDropdown from '../components/UiverseDropdown'

interface VideoTask {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  errorMessage?: string
  firstFrameUrl: string
  lastFrameUrl?: string
  model: string
  resolution: string
  ratio: string
  duration: number
  text?: string
  createdAt: string
  isLiked?: boolean
  isFavorited?: boolean
}

function FirstLastFrameVideo() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [enterKeySubmit, setEnterKeySubmit] = useState(false)
  
  // 加载设置
  useEffect(() => {
    const settings = getUserSettings()
    setEnterKeySubmit(settings.workflow?.enterKeySubmit || false)
  }, [])
  
  const [firstFrameFile, setFirstFrameFile] = useState<File | null>(null)
  const [lastFrameFile, setLastFrameFile] = useState<File | null>(null)
  const [firstFramePreview, setFirstFramePreview] = useState<string | null>(null)
  const [lastFramePreview, setLastFramePreview] = useState<string | null>(null)
  const [frameAspectRatio, setFrameAspectRatio] = useState<'16:9' | '9:16' | 'other' | null>(null) // 图片宽高比（用于判断标准比例）
  const [frameImageInfo, setFrameImageInfo] = useState<{ width: number; height: number } | null>(null) // 图片尺寸信息（用于动态计算容器尺寸）
  
  // 支持的模型列表（所有图生视频模型）
  const supportedModels = [
    { value: 'veo3.1', label: 'Veo3.1', supportsFirstLastFrame: false },
    { value: 'veo3.1-pro', label: 'Veo3.1 Pro', supportsFirstLastFrame: false },
    { value: 'viduq2-turbo', label: 'Vidu Q2 Turbo', supportsFirstLastFrame: false },
    { value: 'viduq2-pro', label: 'Vidu Q2 Pro', supportsFirstLastFrame: false },
    { value: 'volcengine-video-3.0-pro', label: '即梦AI-视频生成3.0 Pro', supportsFirstLastFrame: false },
    { value: 'doubao-seedance-1-5-pro-251215', label: '豆包Seedance 1.5 Pro', supportsFirstLastFrame: true },
    { value: 'minimax-hailuo-02', label: 'MiniMax Hailuo-02', supportsFirstLastFrame: true },
    { value: 'minimax-hailuo-2.3', label: 'MiniMax Hailuo-2.3', supportsFirstLastFrame: true },
    { value: 'minimax-hailuo-2.3-fast', label: 'MiniMax Hailuo-2.3-fast', supportsFirstLastFrame: true },
    { value: 'kling-2.6', label: 'Kling-2.6', supportsFirstLastFrame: true },
    { value: 'kling-o1', label: 'Kling-O1', supportsFirstLastFrame: true },
  ]
  const [selectedModel, setSelectedModel] = useState<string>('veo3.1')
  const [videoVersion, setVideoVersion] = useState<'3.0pro'>('3.0pro') // 保留用于显示
  
  // 检查当前选择的模型是否支持首尾帧
  const currentModelSupportsFirstLastFrame = supportedModels.find(m => m.value === selectedModel)?.supportsFirstLastFrame || false
  
  // 当模型不支持首尾帧时，清空尾帧
  useEffect(() => {
    if (!currentModelSupportsFirstLastFrame && (lastFrameFile || lastFramePreview)) {
      setLastFrameFile(null)
      setLastFramePreview(null)
      if (lastFrameInputRef.current) {
        lastFrameInputRef.current.value = ''
      }
    }
  }, [selectedModel, currentModelSupportsFirstLastFrame])
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')
  const [duration, setDuration] = useState(5)
  const [prompt, setPrompt] = useState('')
  
  // 计算当前配置的积分消耗
  const estimatedCredit = useMemo(() => {
    return calculateVideoGenerationCredit('volcengine-video-3.0-pro', resolution, duration)
  }, [resolution, duration])

  // 计算输入框高度（根据图片高度自动调整）
  const textareaHeight = useMemo(() => {
    if (!frameImageInfo && !frameAspectRatio) {
      return '100px' // 默认高度
    }

    let imageWidth: number
    let imageHeight: number

    if (frameAspectRatio === '16:9') {
      imageWidth = 128 // w-32 = 128px
      imageHeight = imageWidth / (16 / 9) // 72px
    } else if (frameAspectRatio === '9:16') {
      imageWidth = 64 // w-16 = 64px
      imageHeight = imageWidth / (9 / 16) // 113.78px
    } else if (frameImageInfo) {
      // other 比例，根据实际图片尺寸计算
      const calculatedWidth = Math.min(128, Math.max(64, frameImageInfo.width * 0.1))
      imageWidth = calculatedWidth
      imageHeight = calculatedWidth * (frameImageInfo.height / frameImageInfo.width)
    } else {
      return '100px' // 默认高度
    }

    // 返回高度，确保最小高度为 100px
    return `${Math.max(100, Math.round(imageHeight))}px`
  }, [frameAspectRatio, frameImageInfo])
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [tasks, setTasks] = useState<VideoTask[]>([])
  const [allTasks, setAllTasks] = useState<VideoTask[]>([]) // 存储所有任务（未筛选）
  const allTasksRef = useRef<VideoTask[]>([]) // 用于在异步函数中获取最新的任务列表
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true) // 标记是否为首次加载
  const [hoveredFrame, setHoveredFrame] = useState<'first' | 'last' | null>(null)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isBottomBarCollapsed, setIsBottomBarCollapsed] = useState(false) // 默认展开，不收缩
  const [isBottomBarHovered, setIsBottomBarHovered] = useState(false)
  const [isBottomEdgeHovered, setIsBottomEdgeHovered] = useState(false)
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null)
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const [showMenuForVideo, setShowMenuForVideo] = useState<string | null>(null)
  
  // 筛选状态
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'quarter' | 'custom'>('all')
  const [videoFilter, setVideoFilter] = useState<'all' | 'personal' | 'group'>('all')
  const [operationFilter, setOperationFilter] = useState<'all' | 'ultra_hd' | 'favorite' | 'liked'>('all')
  const [showTimeDropdown, setShowTimeDropdown] = useState(false)
  const [showVideoDropdown, setShowVideoDropdown] = useState(false)
  const [showOperationDropdown, setShowOperationDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  
  const firstFrameInputRef = useRef<HTMLInputElement>(null)
  const lastFrameInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const polledTasksRef = useRef<Set<string>>(new Set())
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bottomBarHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bottomEdgeHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 应用筛选逻辑
  const applyFilters = (allTasksList: VideoTask[]) => {
    let filtered = [...allTasksList]

    // 时间范围筛选
    if (timeFilter !== 'all') {
      const now = new Date()
      let cutoffDate: Date

      switch (timeFilter) {
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'quarter':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          cutoffDate = new Date(0)
      }

      filtered = filtered.filter(video => {
        const videoDate = new Date(video.createdAt)
        return videoDate >= cutoffDate
      })
    }

    // 操作类型筛选（目前只支持前端筛选，后端暂不支持）
    if (operationFilter !== 'all') {
      // 注意：这里需要后端支持 is_ultra_hd, is_favorite, is_liked 字段
      // 暂时跳过，因为当前数据结构中没有这些字段
    }

    setTasks(filtered)
  }

  // 加载历史任务（支持静默模式，优化首次加载）
  const loadHistory = async (silent: boolean = false) => {
    if (!projectId) return
    
    // 首次加载时，先尝试从缓存加载，提升用户体验
    if (isInitialLoad && !silent) {
      const storageKey = `first_last_frame_videos_${projectId}`
      const cachedVideos = localStorage.getItem(storageKey)
      if (cachedVideos) {
        try {
          const parsed = JSON.parse(cachedVideos)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const videoTasks: VideoTask[] = parsed.map((v: any) => ({
              id: v.taskId || v.id,
              status: v.status || 'pending',
              videoUrl: v.videoUrl,
              firstFrameUrl: v.firstFrameUrl || '',
              lastFrameUrl: v.lastFrameUrl,
              model: v.model || 'volcengine-video-3.0-pro',
              resolution: v.resolution || '720p',
              ratio: v.ratio || '16:9',
              duration: v.duration || 5,
              text: v.text,
              createdAt: v.createdAt || new Date().toISOString(),
            }))
            setAllTasks(videoTasks)
            allTasksRef.current = videoTasks
            applyFilters(videoTasks)
            setIsLoading(true) // 显示加载状态，但已有数据展示
          }
        } catch (e) {
          console.warn('解析缓存视频失败:', e)
        }
      }
    }
    
    // 只在首次加载或非静默模式时显示加载状态
    if (isInitialLoad || !silent) {
      setIsLoading(true)
    }
    
    try {
      const numericProjectId = parseInt(projectId, 10)
      if (!isNaN(numericProjectId)) {
        // 保存当前本地任务（可能包含刚添加但数据库还没有的任务）
        // 使用ref获取最新值，避免闭包问题
        const currentLocalTasks = allTasksRef.current
        
        const videos = await getFirstLastFrameVideos(numericProjectId)
        // 转换为VideoTask格式
        const dbVideoTasks: VideoTask[] = videos.map(v => ({
          id: v.taskId,
          status: v.status as 'pending' | 'processing' | 'completed' | 'failed',
          videoUrl: v.videoUrl,
          firstFrameUrl: v.firstFrameUrl || '',
          lastFrameUrl: v.lastFrameUrl || undefined,
          model: v.model,
          resolution: v.resolution,
          ratio: v.ratio,
          duration: v.duration,
          text: v.text || undefined,
          createdAt: v.createdAt,
          isLiked: v.isLiked || false,
          isFavorited: v.isFavorited || false,
        }))
        
        // 合并本地任务和数据库任务：保留本地新添加的任务（如果数据库还没有）
        const dbTaskIds = new Set(dbVideoTasks.map(t => t.id))
        const localOnlyTasks = currentLocalTasks.filter(t => !dbTaskIds.has(t.id))
        
        // 合并：本地独有的任务 + 数据库任务（按创建时间排序）
        // 使用Map去重，确保每个taskId只出现一次（优先使用数据库中的数据）
        const taskMap = new Map<string, VideoTask>()
        
        // 先添加数据库任务
        dbVideoTasks.forEach(task => {
          taskMap.set(task.id, task)
        })
        
        // 再添加本地独有的任务
        localOnlyTasks.forEach(task => {
          if (!taskMap.has(task.id)) {
            taskMap.set(task.id, task)
          }
        })
        
        // 转换为数组并按时间排序
        const mergedTasks = Array.from(taskMap.values()).sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime()
          const timeB = new Date(b.createdAt).getTime()
          return timeB - timeA // 最新的在前
        })
        
        // 保存到缓存
        const storageKey = `first_last_frame_videos_${projectId}`
        localStorage.setItem(storageKey, JSON.stringify(videos))
        
        // 保存合并后的任务
        setAllTasks(mergedTasks)
        allTasksRef.current = mergedTasks // 同步更新ref
        
        // 应用筛选
        applyFilters(mergedTasks)
        
        // 首次加载完成后，标记为非首次加载
        if (isInitialLoad) {
          setIsInitialLoad(false)
        }
      }
    } catch (error) {
      console.error('加载历史失败:', error)
      // 即使失败也保留本地任务，不覆盖
      if (allTasksRef.current.length === 0) {
        setAllTasks([])
        allTasksRef.current = []
        setTasks([])
      }
      if (isInitialLoad) {
        setIsInitialLoad(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 同步allTasks到ref，确保异步函数中能获取最新值
  useEffect(() => {
    allTasksRef.current = allTasks
  }, [allTasks])

  // 当筛选条件改变时，重新应用筛选
  useEffect(() => {
    applyFilters(allTasks)
  }, [timeFilter, videoFilter, operationFilter])

  useEffect(() => {
    loadHistory()
    
    // 滚动处理 - 参考Vue项目，使用 useRef 避免闭包问题
    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        // 使用 document.activeElement 检查输入框是否聚焦
        const activeElement = document.activeElement
        const isInputActive = activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'INPUT'
        
        // 如果输入框聚焦或底部栏被悬停，不自动收缩
        if (isInputActive || isBottomBarHovered || isBottomEdgeHovered) {
          return
        }
        
        const scrollY = window.scrollY
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        const distanceFromBottom = documentHeight - (scrollY + windowHeight)
        
        // 不再自动收缩，保持展开状态
        // if (distanceFromBottom > 100) {
        //   setIsBottomBarCollapsed(true)
        // }
      }, 100) // 防抖时间100ms，参考Vue项目
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // 初始状态：保持展开，不再自动收缩
    // setTimeout(() => {
    //   const scrollY = window.scrollY
    //   const windowHeight = window.innerHeight
    //   const documentHeight = document.documentElement.scrollHeight
    //   const distanceFromBottom = documentHeight - (scrollY + windowHeight)
    //   
    //   // 如果不在底部附近（超过100px），默认收缩
    //   if (distanceFromBottom > 100) {
    //     setIsBottomBarCollapsed(true)
    //   }
    // }, 200)
    
    // 点击外部关闭下拉菜单
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.relative')) {
        setShowTimeDropdown(false)
        setShowVideoDropdown(false)
        setShowOperationDropdown(false)
        setShowModelDropdown(false)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('click', handleClickOutside)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      polledTasksRef.current.clear()
    }
  }, []) // 移除依赖项，避免频繁重新绑定

  // 使用即梦AI-视频生成3.0pro（火山引擎）

  // 处理首帧上传
  const triggerFirstFrameUpload = () => {
    firstFrameInputRef.current?.click()
  }

  // 检测图片宽高比
  const detectImageAspectRatio = (imageUrl: string): Promise<'16:9' | '9:16' | 'other'> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const width = img.width
        const height = img.height
        const ratio = width / height
        
        // 16:9 ≈ 1.778, 允许一定误差 (±0.05)
        if (Math.abs(ratio - 16/9) < 0.05) {
          resolve('16:9')
        }
        // 9:16 ≈ 0.5625, 允许一定误差 (±0.05)
        else if (Math.abs(ratio - 9/16) < 0.05) {
          resolve('9:16')
        }
        else {
          resolve('other')
        }
      }
      img.onerror = () => {
        resolve('other') // 如果加载失败，默认使用 other
      }
      img.src = imageUrl
    })
  }

  const handleFirstFrame = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alertError('请上传图片文件', '文件类型错误')
        return
      }
      setFirstFrameFile(file)
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string
        setFirstFramePreview(imageUrl)
        
        // 检测图片宽高比
        const aspectRatio = await detectImageAspectRatio(imageUrl)
        setFrameAspectRatio(aspectRatio)
        
        // 获取图片尺寸信息
        const img = new Image()
        img.onload = () => {
          setFrameImageInfo({ width: img.width, height: img.height })
        }
        img.src = imageUrl
      }
      reader.readAsDataURL(file)
    }
  }

  // 处理尾帧上传
  const triggerLastFrameUpload = () => {
    lastFrameInputRef.current?.click()
  }

  const handleLastFrame = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alertError('请上传图片文件', '文件类型错误')
        return
      }
      setLastFrameFile(file)
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string
        setLastFramePreview(imageUrl)
        
        // 如果首帧已存在，保持首帧的宽高比；否则检测尾帧的宽高比
        if (!firstFramePreview) {
          const aspectRatio = await detectImageAspectRatio(imageUrl)
          setFrameAspectRatio(aspectRatio)
          
          // 获取图片尺寸信息
          const img = new Image()
          img.onload = () => {
            setFrameImageInfo({ width: img.width, height: img.height })
          }
          img.src = imageUrl
        }
        // 如果首帧已存在，尾帧使用首帧的宽高比（不重新检测）
      }
      reader.readAsDataURL(file)
    }
  }

  const clearFirstFrame = () => {
    setFirstFrameFile(null)
    setFirstFramePreview(null)
    setFrameAspectRatio(null)
    setFrameImageInfo(null)
    if (firstFrameInputRef.current) {
      firstFrameInputRef.current.value = ''
    }
  }

  const clearLastFrame = () => {
    setLastFrameFile(null)
    setLastFramePreview(null)
    // 如果清空尾帧但还有首帧，保持首帧的宽高比
    if (!firstFramePreview) {
      setFrameAspectRatio(null)
      setFrameImageInfo(null)
    }
    if (lastFrameInputRef.current) {
      lastFrameInputRef.current.value = ''
    }
  }

  // 生成视频
  const generateVideo = async () => {
    if (!prompt.trim()) {
      alertError('请输入视频描述', '缺少提示词')
      return
    }

    if (!firstFrameFile) {
      alertError('请上传首帧图片', '缺少文件')
      return
    }

    if (!projectId) {
      alertError('项目ID不存在', '错误')
      return
    }

    setIsGenerating(true)
    try {
      const formData = new FormData()
      formData.append('firstFrame', firstFrameFile)
      // 尾帧是可选的，只有在模型支持首尾帧时才添加
      if (lastFrameFile && currentModelSupportsFirstLastFrame) {
        formData.append('lastFrame', lastFrameFile)
      }
      formData.append('projectId', projectId)
      formData.append('model', selectedModel)
      formData.append('resolution', resolution)
      formData.append('ratio', '16:9')
      formData.append('duration', duration.toString())
      if (prompt.trim()) {
        formData.append('text', prompt.trim())
      }

      const result = await generateFirstLastFrameVideo(formData)

      if (result.success && result.data?.taskId) {
        // 移除输入框聚焦状态，恢复样式
        setIsInputFocused(false)
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
          activeElement.blur()
        }
        
        // 立即创建新任务并添加到本地状态（不等待数据库查询）
        const newTask: VideoTask = {
          id: result.data.taskId,
          status: 'pending',
          firstFrameUrl: firstFramePreview || '',
          lastFrameUrl: lastFramePreview || undefined,
          model: selectedModel,
          resolution,
          ratio: '16:9',
          duration,
          text: prompt.trim() || undefined,
          createdAt: new Date().toISOString(),
        }
        
        // 立即添加到本地状态，让用户立即看到
        setAllTasks(prev => {
          const updated = [newTask, ...prev]
          allTasksRef.current = updated // 同步更新ref
          // 同时更新筛选后的列表
          applyFilters(updated)
          return updated
        })
        
        // 清空输入
        setPrompt('')
        setFirstFrameFile(null)
        setLastFrameFile(null)
        setFirstFramePreview(null)
        setLastFramePreview(null)
        setFrameAspectRatio(null)
        setFrameImageInfo(null)
        
        // 后台刷新历史记录（静默模式，不显示加载状态），确保数据同步
        setTimeout(() => {
          loadHistory(true)
        }, 1000) // 延迟1秒，确保数据库已保存
        
        // 开始轮询任务状态
        pollTaskStatus(result.data.taskId)
      } else {
        alertError(result.error || '生成失败', '错误')
      }
    } catch (error) {
      console.error('生成视频失败:', error)
      alertError(error instanceof Error ? error.message : '生成失败，请稍后重试', '错误')
    } finally {
      setIsGenerating(false)
    }
  }

  // Enter键提交功能（全局监听，当按钮可用时）
  useEffect(() => {
    if (!enterKeySubmit) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框、文本域或模态框中，不触发（让textarea的onKeyDown处理）
      const activeElement = document.activeElement
      if (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.closest('[role="dialog"]') ||
        activeElement?.closest('.modal')
      ) {
        return
      }
      
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault()
        // 检查按钮是否可用（和按钮的disabled条件一致）
        if (prompt.trim() && firstFrameFile && !isGenerating) {
          generateVideo()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enterKeySubmit, prompt, firstFrameFile, isGenerating])

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    if (!projectId) return
    
    // 检查是否已经在轮询这个任务
    if (polledTasksRef.current.has(taskId)) {
      console.warn(`任务 ${taskId} 已经在轮询中，跳过重复轮询`)
      return
    }
    polledTasksRef.current.add(taskId)
    
    // 如果已经有轮询在运行，先停止它（但保留已轮询的任务记录）
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await getFirstLastFrameVideoStatus(taskId, projectId, selectedModel)
        if (result.success && result.data) {
          const task = result.data
          
          setTasks(prev => prev.map(t => 
            t.id === taskId 
              ? { ...t, status: task.status as any, videoUrl: task.videoUrl, errorMessage: task.errorMessage }
              : t
          ))

          if (task && (task.status === 'completed' || task.status === 'failed')) {
            clearInterval(pollIntervalRef.current!)
            pollIntervalRef.current = null
            polledTasksRef.current.delete(taskId)
            if (task.status === 'completed') {
              // 刷新历史记录（静默模式）
              loadHistory(true)
              
              // 注意：shot的创建和视频保存已经在后端处理，这里不需要重复创建
              // 只需要通知片段管理页面刷新
              if (projectId) {
                try {
                  const numericProjectId = parseInt(projectId, 10)
                  if (!isNaN(numericProjectId)) {
                    // 通知片段管理页面刷新
                    window.dispatchEvent(new CustomEvent('fragment-updated', { detail: { projectId: numericProjectId } }))
                  }
                } catch (error) {
                  console.error('通知片段管理页面刷新失败（不影响主流程）:', error)
                }
              }
            } else if (task) {
              alertError(`视频生成失败: ${task.errorMessage || '未知错误'}`, '失败')
            }
          }
        } else {
          console.error('查询任务状态失败:', result.error)
          clearInterval(pollIntervalRef.current!)
          pollIntervalRef.current = null
          polledTasksRef.current.delete(taskId)
        }
      } catch (error) {
        console.error('轮询任务状态异常:', error)
        clearInterval(pollIntervalRef.current!)
        pollIntervalRef.current = null
        polledTasksRef.current.delete(taskId)
      }
    }, 5000) // 每5秒轮询一次
  }

  // 底部边缘悬停处理 - 参考Vue项目
  const handleBottomEdgeHover = (isHovering: boolean) => {
    // 不再自动收缩，保持展开状态
    // if (bottomEdgeHoverTimeoutRef.current) {
    //   clearTimeout(bottomEdgeHoverTimeoutRef.current)
    // }
    // 
    // setIsBottomEdgeHovered(isHovering)
    // 
    // if (isHovering) {
    //   // 鼠标靠近底部边缘时，立即展开悬浮窗口
    //   setIsBottomBarCollapsed(false)
    // } else {
    //   // 延迟检查是否需要收缩
    //   bottomEdgeHoverTimeoutRef.current = setTimeout(() => {
    //     // 如果输入框没有焦点且鼠标不在悬浮窗口上，则收缩
    //     if (!isInputFocused && !isBottomBarHovered) {
    //       setIsBottomBarCollapsed(true)
    //     }
    //   }, 300) // 延迟300ms，参考Vue项目
    // }
  }

  // 底部悬浮栏悬停处理 - 参考Vue项目
  const handleBottomBarHover = (isHovering: boolean) => {
    // 不再自动收缩，保持展开状态
    // if (bottomBarHoverTimeoutRef.current) {
    //   clearTimeout(bottomBarHoverTimeoutRef.current)
    // }
    // 
    // setIsBottomBarHovered(isHovering)
    // 
    // if (isHovering) {
    //   // 鼠标悬停在悬浮窗口上时，保持展开
    //   setIsBottomBarCollapsed(false)
    // } else {
    //   // 延迟检查是否需要收缩
    //   bottomBarHoverTimeoutRef.current = setTimeout(() => {
    //     // 如果输入框没有焦点且鼠标不在底部边缘，则收缩
    //     if (!isInputFocused && !isBottomEdgeHovered) {
    //       setIsBottomBarCollapsed(true)
    //     }
    //   }, 300) // 延迟300ms，参考Vue项目
    // }
  }

  // 输入框焦点处理 - 参考Vue项目
  const handleInputFocus = () => {
    setIsInputFocused(true)
    setIsBottomBarCollapsed(false)
  }

  const handleInputBlur = () => {
    setIsInputFocused(false)
    // 不再自动收缩，保持展开状态
    // setTimeout(() => {
    //   if (!isBottomBarHovered && !isBottomEdgeHovered) {
    //     const scrollY = window.scrollY
    //     const windowHeight = window.innerHeight
    //     const documentHeight = document.documentElement.scrollHeight
    //     const distanceFromBottom = documentHeight - (scrollY + windowHeight)
    //     
    //     if (distanceFromBottom > 100) {
    //       setIsBottomBarCollapsed(true)
    //     }
    //   }
    // }, 200) // 延迟200ms，参考Vue项目
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '等待中',
      processing: '生成中',
      completed: '已完成',
      failed: '生成失败'
    }
    return statusMap[status] || status
  }

  // 获取估算进度
  const getEstimatedProgress = (task: VideoTask): number => {
    if (task.status === 'completed') return 100
    if (task.status === 'failed') return 0
    
    if (!task.createdAt) return 10
    
    try {
      const createdTime = new Date(task.createdAt).getTime()
      const now = Date.now()
      const elapsedMinutes = (now - createdTime) / 60000
      
      if (elapsedMinutes < 1) {
        return Math.min(40, 10 + (elapsedMinutes / 1) * 30)
      } else if (elapsedMinutes < 2) {
        return Math.min(70, 40 + ((elapsedMinutes - 1) / 1) * 30)
      } else if (elapsedMinutes < 3) {
        return Math.min(95, 70 + ((elapsedMinutes - 2) / 1) * 25)
      } else {
        return 95
      }
    } catch (error) {
      return 10
    }
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* 顶部导航栏（参考Vue代码，但不包含logo和"剧变时代"） */}
      <nav className="bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 right-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 左侧：返回按钮 */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (projectId) {
                    navigate(`/project/${projectId}/fragments`)
                  } else {
                    navigate(-1)
                  }
                }}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                返回
              </button>
            </div>
            
            {/* 右侧：日期和筛选下拉菜单 */}
            <div className="flex items-center gap-2">
              {/* 日期显示（黄色框） */}
              <div className="px-4 py-2 bg-yellow-100 border-2 border-yellow-300 rounded-lg">
                <span className="text-sm font-semibold text-gray-800">
                  {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                </span>
              </div>
              {/* 时间筛选 */}
              <UiverseDropdown
                label="时间"
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'week', label: '最近一周' },
                  { value: 'month', label: '最近一个月' },
                  { value: 'quarter', label: '最近三个月' },
                ]}
                selectedValue={timeFilter}
                onSelect={(value) => {
                  setTimeFilter(value as 'all' | 'week' | 'month' | 'quarter')
                  setShowTimeDropdown(false)
                  setShowVideoDropdown(false)
                  setShowOperationDropdown(false)
                }}
                isActive={timeFilter !== 'all'}
              />
              
              {/* 视频筛选 */}
              <UiverseDropdown
                label="视频"
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'group', label: '小组' },
                  { value: 'personal', label: '个人' },
                ]}
                selectedValue={videoFilter}
                onSelect={(value) => {
                  setVideoFilter(value as 'all' | 'personal' | 'group')
                  setShowTimeDropdown(false)
                  setShowVideoDropdown(false)
                  setShowOperationDropdown(false)
                }}
                isActive={videoFilter !== 'all'}
              />
              
              {/* 操作类型筛选 */}
              <UiverseDropdown
                label="操作类型"
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'ultra_hd', label: '已超清' },
                  { value: 'favorite', label: '已收藏' },
                  { value: 'liked', label: '已点赞' },
                ]}
                selectedValue={operationFilter}
                onSelect={(value) => {
                  setOperationFilter(value as 'all' | 'ultra_hd' | 'favorite' | 'liked')
                  setShowTimeDropdown(false)
                  setShowVideoDropdown(false)
                  setShowOperationDropdown(false)
                }}
                isActive={operationFilter !== 'all'}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* 历史视频区域（全屏滚动，从导航栏下方开始） */}
      <div className="pb-[600px] pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 历史视频网格 - 参考Vue项目，只在首次加载且没有视频时显示加载状态 */}
          {isLoading && isInitialLoad && tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-gray-500 mt-4">加载中...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">暂无历史视频</p>
            </div>
          ) : (
            (() => {
              // 获取日期显示文本（今天/昨天/具体日期）
              const getDateLabel = (date: Date): string => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                
                const yesterday = new Date(today)
                yesterday.setDate(yesterday.getDate() - 1)
                
                const taskDate = new Date(date)
                taskDate.setHours(0, 0, 0, 0)
                
                if (taskDate.getTime() === today.getTime()) {
                  return '今天'
                } else if (taskDate.getTime() === yesterday.getTime()) {
                  return '昨天'
                } else {
                  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
                }
              }

              // 按日期分组任务
              const groupedTasks = tasks.reduce((groups, task) => {
                const date = new Date(task.createdAt)
                const dateKey = getDateLabel(date)
                
                if (!groups[dateKey]) {
                  groups[dateKey] = []
                }
                groups[dateKey].push(task)
                return groups
              }, {} as Record<string, VideoTask[]>)

              // 按日期排序（最新的在前）
              // 特殊处理：今天和昨天始终在最前面
              const sortedDates = Object.keys(groupedTasks).sort((a, b) => {
                // 今天和昨天优先
                if (a === '今天') return -1
                if (b === '今天') return 1
                if (a === '昨天') return -1
                if (b === '昨天') return 1
                
                // 其他日期按时间排序
                const dateA = new Date(groupedTasks[a][0].createdAt).getTime()
                const dateB = new Date(groupedTasks[b][0].createdAt).getTime()
                return dateB - dateA
              })

              return (
                <div className="space-y-8">
                  {sortedDates.map((dateKey) => (
                    <div key={dateKey} className="space-y-4">
                      {/* 日期标题 */}
                      <h3 className="text-lg font-semibold text-gray-800">{dateKey}</h3>
                      
                      {/* 该日期的视频网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {groupedTasks[dateKey].map((task) => (
                <div
                  key={task.id}
                  className="group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all"
                  style={{ overflow: 'visible' }}
                  onMouseEnter={() => {
                    setHoveredVideoId(task.id)
                    const video = videoRefs.current.get(task.id)
                    if (video) {
                      video.play().catch(() => {})
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredVideoId(null)
                    const video = videoRefs.current.get(task.id)
                    if (video) {
                      video.pause()
                      video.currentTime = 0
                    }
                  }}
                >
                  {/* 视频容器 */}
                  <div 
                    className="relative aspect-video bg-gray-100 rounded-t-xl overflow-hidden"
                    style={task.status !== 'completed' && task.firstFrameUrl ? {
                      backgroundImage: `url(${task.firstFrameUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    } : {}}
                  >
                    {task.videoUrl && task.status === 'completed' ? (
                      <video
                        ref={(el) => {
                          if (el) {
                            videoRefs.current.set(task.id, el)
                          } else {
                            videoRefs.current.delete(task.id)
                          }
                        }}
                        src={task.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        preload="metadata"
                      />
                    ) : task.firstFrameUrl ? (
                      <img
                        src={task.firstFrameUrl}
                        alt="首帧"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Upload className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* 状态覆盖层 */}
                    {task.status !== 'completed' && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-center text-white px-4 w-full">
                          {(task.status === 'processing' || task.status === 'pending') && (
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                          )}
                          <p className="text-sm font-medium mb-2">{getStatusText(task.status)}</p>
                          {/* 进度条 */}
                          {(task.status === 'processing' || task.status === 'pending') && (
                            <div className="w-full max-w-xs mx-auto mb-2">
                              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${getEstimatedProgress(task)}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-300 mt-1">{Math.round(getEstimatedProgress(task))}%</p>
                            </div>
                          )}
                          {task.status === 'failed' && task.errorMessage && (
                            <p className="text-xs text-gray-300 mt-1">{task.errorMessage}</p>
                          )}
                        </div>
                      </div>
                    )}

                              {/* 悬停时的控制栏 - 图2样式 */}
                              {hoveredVideoId === task.id && task.status === 'completed' && (
                                <>
                                  {/* 顶部控制栏 */}
                                  <div className="absolute top-2 right-2 flex items-center gap-2 z-20">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // 上传到社区
                                        alertSuccess('上传到社区功能开发中', '提示')
                                      }}
                                      className="p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition-all"
                                      title="上传到社区"
                                    >
                                      <Share2 size={18} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // 下载视频
                                        if (task.videoUrl) {
                                          const link = document.createElement('a')
                                          link.href = task.videoUrl
                                          link.download = `video_${task.id}.mp4`
                                          link.click()
                                          alertSuccess('视频下载已开始', '下载成功')
                                        }
                                      }}
                                      className="p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition-all"
                                      title="下载"
                                    >
                                      <Download size={18} />
                                    </button>
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setShowMenuForVideo(showMenuForVideo === task.id ? null : task.id)
                                        }}
                                        className="p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition-all"
                                        title="更多选项"
                                      >
                                        <MoreVertical size={18} />
                                      </button>
                                      {showMenuForVideo === task.id && (
                                        <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30">
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation()
                                              try {
                                                const result = await toggleFirstLastFrameVideoFavorite(task.id)
                                                // 更新任务状态
                                                setAllTasks(prev => prev.map(t => 
                                                  t.id === task.id ? { ...t, isFavorited: result.isFavorited } : t
                                                ))
                                                setTasks(prev => prev.map(t => 
                                                  t.id === task.id ? { ...t, isFavorited: result.isFavorited } : t
                                                ))
                                                setShowMenuForVideo(null)
                                              } catch (error) {
                                                console.error('收藏失败:', error)
                                                alertError(error instanceof Error ? error.message : '收藏失败，请稍后重试', '操作失败')
                                              }
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                          >
                                            <Heart size={16} className={task.isFavorited ? 'fill-red-500 text-red-500' : ''} />
                                            <span>收藏</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        try {
                                          const result = await toggleFirstLastFrameVideoLike(task.id)
                                          // 更新任务状态
                                          setAllTasks(prev => prev.map(t => 
                                            t.id === task.id ? { ...t, isLiked: result.isLiked } : t
                                          ))
                                          setTasks(prev => prev.map(t => 
                                            t.id === task.id ? { ...t, isLiked: result.isLiked } : t
                                          ))
                                        } catch (error) {
                                          console.error('点赞失败:', error)
                                          alertError(error instanceof Error ? error.message : '点赞失败，请稍后重试', '操作失败')
                                        }
                                      }}
                                      className={`p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition-all ${
                                        task.isLiked ? 'bg-red-500 bg-opacity-80' : ''
                                      }`}
                                      title="点赞"
                                    >
                                      <ThumbsUp size={18} className={task.isLiked ? 'fill-white' : ''} />
                                    </button>
                                  </div>

                                  {/* 底部控制栏 */}
                                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20">
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        try {
                                          await createVideoProcessingTask({
                                            videoTaskId: task.id,
                                            processingType: 'frame_interpolation'
                                          })
                                          alertSuccess('补帧任务已创建，请稍后查看结果', '任务创建成功')
                                        } catch (error) {
                                          console.error('创建补帧任务失败:', error)
                                          alertError(error instanceof Error ? error.message : '创建补帧任务失败，请稍后重试', '操作失败')
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg text-sm transition-all flex items-center gap-2"
                                      title="补帧"
                                    >
                                      <Sparkles size={16} />
                                      <span>补帧</span>
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        try {
                                          await createVideoProcessingTask({
                                            videoTaskId: task.id,
                                            processingType: 'super_resolution'
                                          })
                                          alertSuccess('超分辨率任务已创建，请稍后查看结果', '任务创建成功')
                                        } catch (error) {
                                          console.error('创建超分辨率任务失败:', error)
                                          alertError(error instanceof Error ? error.message : '创建超分辨率任务失败，请稍后重试', '操作失败')
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg text-sm transition-all flex items-center gap-2"
                                      title="超分辨率"
                                    >
                                      <Zap size={16} />
                                      <span>超分辨率</span>
                                    </button>
                                  </div>
                                </>
                              )}
                  </div>
                  
                  {/* 视频信息 */}
                  <div className="p-3">
                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">{task.text || '无描述'}</p>
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>视频 {videoVersion} | {task.duration}s | {task.resolution}</span>
                              </div>
                              {/* 操作按钮 */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // 重新编辑：填充提示词、首帧和尾帧
                                    setPrompt(task.text || '')
                                    // 如果有首帧URL，需要转换为File对象或直接使用URL
                                    if (task.firstFrameUrl) {
                                      // 从URL加载图片并转换为File
                                      fetch(task.firstFrameUrl)
                                        .then(res => res.blob())
                                        .then(blob => {
                                          const file = new File([blob], 'first-frame.jpg', { type: 'image/jpeg' })
                                          setFirstFrameFile(file)
                                          setFirstFramePreview(task.firstFrameUrl)
                                        })
                                        .catch(err => {
                                          console.error('加载首帧失败:', err)
                                          setFirstFramePreview(task.firstFrameUrl)
                                        })
                                    }
                                    // 如果有尾帧URL
                                    if (task.lastFrameUrl) {
                                      fetch(task.lastFrameUrl)
                                        .then(res => res.blob())
                                        .then(blob => {
                                          const file = new File([blob], 'last-frame.jpg', { type: 'image/jpeg' })
                                          setLastFrameFile(file)
                                          setLastFramePreview(task.lastFrameUrl!)
                                        })
                                        .catch(err => {
                                          console.error('加载尾帧失败:', err)
                                          setLastFramePreview(task.lastFrameUrl!)
                                        })
                                    }
                                    // 设置模型和分辨率
                                    setSelectedModel(task.model)
                                    setResolution(task.resolution as '720p' | '1080p')
                                    setDuration(task.duration)
                                    // 滚动到底部输入区域
                                    setTimeout(() => {
                                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                                    }, 100)
                                    alertSuccess('已填充到输入框', '重新编辑')
                                  }}
                                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors flex items-center gap-1"
                                >
                                  <Edit size={14} />
                                  <span>重新编辑</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    alertSuccess('再次生成功能开发中', '提示')
                                  }}
                                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                                >
                                  再次生成
                                </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
                    </div>
                  ))}
                </div>
              )
            })()
          )}
        </div>
      </div>

      {/* 底部边缘触发区域 - 已禁用，保持展开状态 */}
      {/* <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
          isBottomBarCollapsed ? 'h-16' : 'h-4'
        }`}
        onMouseEnter={() => handleBottomEdgeHover(true)}
        onMouseLeave={() => handleBottomEdgeHover(false)}
        onClick={() => {
          setIsBottomBarCollapsed(false)
        }}
      >
        {isBottomBarCollapsed && (
          <div className="h-full flex items-end justify-center pb-1">
            <div className="bg-white/95 backdrop-blur-sm rounded-t-lg shadow-md border-t border-x border-gray-200 px-2 py-1.5 cursor-pointer hover:bg-white transition-all hover:shadow-lg">
              <svg className="w-3 h-3 text-gray-400 hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </div>
        )}
      </div> */}

      {/* 底部悬浮输入区域 - 始终保持展开 */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        onMouseEnter={() => handleBottomBarHover(true)}
        onMouseLeave={() => handleBottomBarHover(false)}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-t-2xl shadow-lg border-t border-x border-gray-200 p-6">
            {/* 主要内容区域：首尾帧上传（左）和提示词输入（右） */}
            <div className="flex items-start gap-6 mb-4">
              {/* 左侧：首尾帧上传块（横向排列） */}
              <div className="flex-shrink-0 flex items-center gap-3">
                {/* 首帧卡片 */}
                <div
                  className="relative cursor-pointer group"
                  onMouseEnter={() => setHoveredFrame('first')}
                  onMouseLeave={() => setHoveredFrame(null)}
                  onClick={triggerFirstFrameUpload}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFirstFrame}
                    className="hidden"
                    ref={firstFrameInputRef}
                  />
                  <div
                    className={`relative bg-gray-50 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
                      hoveredFrame === 'first' ? 'border-blue-500 shadow-lg transform scale-105' : 'border-gray-300'
                    } ${firstFramePreview ? 'border-blue-500 bg-white' : ''} ${
                      // 根据宽高比动态调整尺寸
                      frameAspectRatio === '16:9' ? 'w-32 aspect-video' : 
                      frameAspectRatio === '9:16' ? 'w-16 aspect-[9/16]' : 
                      frameImageInfo ? '' : 'w-24 h-24'
                    }`}
                    style={frameImageInfo && frameAspectRatio === 'other' ? {
                      width: `${Math.min(128, Math.max(64, frameImageInfo.width * 0.1))}px`,
                      aspectRatio: `${frameImageInfo.width}/${frameImageInfo.height}`
                    } : undefined}
                  >
                    {firstFramePreview ? (
                      <img
                        src={firstFramePreview}
                        alt="首帧"
                        className={`absolute inset-0 w-full h-full rounded-xl ${
                          frameAspectRatio === 'other' ? 'object-cover object-top' : 'object-cover'
                        }`}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center z-10">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-1">
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">首帧</span>
                      </div>
                    )}
                    {firstFramePreview && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          clearFirstFrame()
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 z-20"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* 横向双箭头连接符 - 只在支持首尾帧时显示 */}
                {currentModelSupportsFirstLastFrame && (
                  <div className="flex items-center justify-center px-2">
                    <img 
                      src="/bidirectional arrow.png" 
                      alt="双向箭头" 
                      className="w-8 h-6 object-contain"
                      onError={(e) => {
                        // 如果图片加载失败，使用备用SVG
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const fallback = document.createElement('div')
                        fallback.innerHTML = `
                          <svg class="w-8 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 16" stroke-width="2">
                            <path d="M2 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M6 8h12" stroke-linecap="round" />
                            <path d="M22 12l-4-4 4-4" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M18 8H6" stroke-linecap="round" />
                    </svg>
                        `
                        target.parentElement?.appendChild(fallback.firstChild as Node)
                      }}
                    />
                  </div>
                )}

                {/* 尾帧卡片 - 只在支持首尾帧时显示 */}
                {currentModelSupportsFirstLastFrame && (
                  <div
                    className="relative cursor-pointer group"
                    onMouseEnter={() => setHoveredFrame('last')}
                    onMouseLeave={() => setHoveredFrame(null)}
                    onClick={triggerLastFrameUpload}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLastFrame}
                      className="hidden"
                      ref={lastFrameInputRef}
                    />
                    <div
                      className={`relative bg-gray-50 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
                        hoveredFrame === 'last' 
                          ? 'border-blue-500 shadow-lg transform scale-105' 
                          : 'border-gray-300'
                      } ${lastFramePreview ? 'border-blue-500 bg-white' : ''} ${
                        // 根据宽高比动态调整尺寸（与首帧保持一致）
                        frameAspectRatio === '16:9' ? 'w-32 aspect-video' : 
                        frameAspectRatio === '9:16' ? 'w-16 aspect-[9/16]' : 
                        frameImageInfo ? '' : 'w-24 h-24'
                      }`}
                      style={frameImageInfo && frameAspectRatio === 'other' ? {
                        width: `${Math.min(128, Math.max(64, frameImageInfo.width * 0.1))}px`,
                        aspectRatio: `${frameImageInfo.width}/${frameImageInfo.height}`
                      } : undefined}
                    >
                      {lastFramePreview ? (
                        <img
                          src={lastFramePreview}
                          alt="尾帧"
                          className={`absolute inset-0 w-full h-full rounded-xl ${
                            frameAspectRatio === 'other' ? 'object-cover object-top' : 'object-cover'
                          }`}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center z-10">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-1">
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <span className="text-xs text-gray-600 font-medium">尾帧</span>
                        </div>
                      )}
                      {lastFramePreview && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            clearLastFrame()
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 z-20"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 右侧：提示词输入框 */}
              <div className="flex-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="输入文字,描述你想创作的画面内容、运动方式等。例如:一个3D形象的小男孩,在公园滑滑板。"
                  className={`w-full bg-transparent border-none outline-none resize-none text-gray-700 placeholder-gray-400 transition-all text-base leading-relaxed ${
                    isInputFocused ? 'ring-2 ring-blue-500 rounded-lg' : ''
                  }`}
                  style={{
                    minHeight: textareaHeight,
                    height: textareaHeight
                  }}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={(e) => {
                    if (enterKeySubmit) {
                      // 如果开启了Enter键提交，Ctrl+Enter换行，Enter提交
                      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                        e.preventDefault()
                        // 检查必要信息是否已输入（和按钮的disabled条件一致）
                        if (prompt.trim() && firstFrameFile && !isGenerating) {
                          generateVideo()
                        }
                      }
                      // Ctrl+Enter 或 Cmd+Enter 允许换行（不阻止默认行为）
                    } else {
                      // 如果未开启，保持原有行为：Enter提交，Shift+Enter换行
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (prompt.trim() && firstFrameFile && !isGenerating) {
                        generateVideo()
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* 控制栏 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                {/* 模型选择 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">模型:</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowModelDropdown(!showModelDropdown)
                      }}
                      className="px-3 py-1.5 pr-8 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 shadow-sm cursor-pointer outline-none hover:border-purple-500 min-w-[180px] text-left flex items-center justify-between"
                    >
                      <span>{supportedModels.find(m => m.value === selectedModel)?.label || '选择模型'}</span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showModelDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowModelDropdown(false)}
                        />
                        <div className="absolute bottom-full left-0 mb-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
                      {supportedModels.map((model) => (
                            <button
                              key={model.value}
                              type="button"
                              onClick={() => {
                                setSelectedModel(model.value)
                                setShowModelDropdown(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                selectedModel === model.value
                                  ? 'bg-blue-50 text-blue-600 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{model.label}</span>
                                {selectedModel === model.value && (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* 分辨率选择 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">分辨率:</span>
                  <button
                    onClick={() => setResolution('720p')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      resolution === '720p'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    720P
                  </button>
                  <button
                    onClick={() => setResolution('1080p')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      resolution === '1080p'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    1080P
                  </button>
                </div>
                
                {/* 时长选择 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDuration(5)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      duration === 5
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    5秒
                  </button>
                  <button
                    onClick={() => setDuration(10)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      duration === 10
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    10秒
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* 积分消耗显示 */}
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  <span className="font-medium">预计消耗:</span>
                  <span className="text-blue-600 font-bold">{estimatedCredit}</span>
                  <span>积分</span>
                </div>
                
                <button
                  type="button"
                  onClick={generateVideo}
                  disabled={!prompt.trim() || isGenerating || !firstFrameFile}
                  className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all flex items-center gap-2 ${
                    (!prompt.trim() || isGenerating || !firstFrameFile) && 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      生成视频
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FirstLastFrameVideo
