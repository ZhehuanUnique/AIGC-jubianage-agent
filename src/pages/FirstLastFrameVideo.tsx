import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { ArrowLeft, Upload, Loader2, X } from 'lucide-react'
import { alertSuccess, alertError } from '../utils/alert'
import { generateFirstLastFrameVideo, getFirstLastFrameVideoStatus, getFirstLastFrameVideos } from '../services/api'
import { calculateVideoGenerationCredit } from '../utils/creditCalculator'

interface VideoTask {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  errorMessage?: string
  firstFrameUrl: string
  lastFrameUrl: string
  model: string
  resolution: string
  ratio: string
  duration: number
  text?: string
  createdAt: string
}

function FirstLastFrameVideo() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  
  const [firstFrameFile, setFirstFrameFile] = useState<File | null>(null)
  const [lastFrameFile, setLastFrameFile] = useState<File | null>(null)
  const [firstFramePreview, setFirstFramePreview] = useState<string | null>(null)
  const [lastFramePreview, setLastFramePreview] = useState<string | null>(null)
  
  const [videoVersion, setVideoVersion] = useState<'3.0pro'>('3.0pro')
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')
  const [duration, setDuration] = useState(5)
  const [prompt, setPrompt] = useState('')
  
  // 计算当前配置的积分消耗
  const estimatedCredit = useMemo(() => {
    return calculateVideoGenerationCredit('volcengine-video-3.0-pro', resolution, duration)
  }, [resolution, duration])
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [tasks, setTasks] = useState<VideoTask[]>([])
  const [allTasks, setAllTasks] = useState<VideoTask[]>([]) // 存储所有任务（未筛选）
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true) // 标记是否为首次加载
  const [hoveredFrame, setHoveredFrame] = useState<'first' | 'last' | null>(null)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isBottomBarCollapsed, setIsBottomBarCollapsed] = useState(true) // 默认收缩，参考Vue项目
  const [isBottomBarHovered, setIsBottomBarHovered] = useState(false)
  const [isBottomEdgeHovered, setIsBottomEdgeHovered] = useState(false)
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null)
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  
  // 筛选状态
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'quarter' | 'custom'>('all')
  const [videoFilter, setVideoFilter] = useState<'all' | 'personal' | 'group'>('all')
  const [operationFilter, setOperationFilter] = useState<'all' | 'ultra_hd' | 'favorite' | 'liked'>('all')
  const [showTimeDropdown, setShowTimeDropdown] = useState(false)
  const [showVideoDropdown, setShowVideoDropdown] = useState(false)
  const [showOperationDropdown, setShowOperationDropdown] = useState(false)
  
  const firstFrameInputRef = useRef<HTMLInputElement>(null)
  const lastFrameInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bottomBarHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bottomEdgeHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // 加载历史任务（支持静默模式）
  const loadHistory = async (silent: boolean = false) => {
    if (!projectId) return
    
    // 只在首次加载或非静默模式时显示加载状态
    if (isInitialLoad || !silent) {
      setIsLoading(true)
    }
    
    try {
      const numericProjectId = parseInt(projectId, 10)
      if (!isNaN(numericProjectId)) {
        const videos = await getFirstLastFrameVideos(numericProjectId)
        // 转换为VideoTask格式
        const videoTasks: VideoTask[] = videos.map(v => ({
          id: v.taskId,
          status: v.status as 'pending' | 'processing' | 'completed' | 'failed',
          videoUrl: v.videoUrl,
          firstFrameUrl: v.firstFrameUrl || '',
          lastFrameUrl: v.lastFrameUrl,
          model: v.model,
          resolution: v.resolution,
          ratio: v.ratio,
          duration: v.duration,
          text: v.text,
          createdAt: v.createdAt,
        }))
        
        // 保存所有任务
        setAllTasks(videoTasks)
        
        // 应用筛选
        applyFilters(videoTasks)
        
        // 首次加载完成后，标记为非首次加载
        if (isInitialLoad) {
          setIsInitialLoad(false)
        }
      }
    } catch (error) {
      console.error('加载历史失败:', error)
      // 即使失败也设置空数组，显示"暂无历史视频"而不是错误
      setAllTasks([])
      setTasks([])
      if (isInitialLoad) {
        setIsInitialLoad(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

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
        
        // 如果不在底部附近（距离底部超过100px），则收缩 - 参考Vue项目
        if (distanceFromBottom > 100) {
          setIsBottomBarCollapsed(true)
        }
      }, 100) // 防抖时间100ms，参考Vue项目
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // 初始状态：默认收缩
    setTimeout(() => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const distanceFromBottom = documentHeight - (scrollY + windowHeight)
      
      // 如果不在底部附近（超过100px），默认收缩
      if (distanceFromBottom > 100) {
        setIsBottomBarCollapsed(true)
      }
    }, 200)
    
    // 点击外部关闭下拉菜单
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.relative')) {
        setShowTimeDropdown(false)
        setShowVideoDropdown(false)
        setShowOperationDropdown(false)
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
      }
    }
  }, []) // 移除依赖项，避免频繁重新绑定

  // 使用即梦AI-视频生成3.0pro（火山引擎）

  // 处理首帧上传
  const triggerFirstFrameUpload = () => {
    firstFrameInputRef.current?.click()
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
      reader.onload = (e) => {
        setFirstFramePreview(e.target?.result as string)
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
      reader.onload = (e) => {
        setLastFramePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearFirstFrame = () => {
    setFirstFrameFile(null)
    setFirstFramePreview(null)
    if (firstFrameInputRef.current) {
      firstFrameInputRef.current.value = ''
    }
  }

  const clearLastFrame = () => {
    setLastFrameFile(null)
    setLastFramePreview(null)
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
      // 尾帧是可选的，如果有就添加
      if (lastFrameFile) {
        formData.append('lastFrame', lastFrameFile)
      }
      formData.append('projectId', projectId)
      formData.append('model', 'volcengine-video-3.0-pro')
      formData.append('resolution', resolution)
      formData.append('ratio', '16:9')
      formData.append('duration', duration.toString())
      if (prompt.trim()) {
        formData.append('text', prompt.trim())
      }

      const result = await generateFirstLastFrameVideo(formData)

      if (result.success && result.data?.taskId) {
        alertSuccess('视频生成任务已提交', '成功')
        
        const newTask: VideoTask = {
          id: result.data.taskId,
          status: 'pending',
          firstFrameUrl: firstFramePreview || '',
          lastFrameUrl: lastFramePreview || undefined,
          model: 'volcengine-video-3.0-pro',
          resolution,
          ratio: '16:9',
          duration,
          text: prompt.trim() || undefined,
          createdAt: new Date().toISOString(),
        }
        setTasks(prev => [newTask, ...prev])
        
        // 清空输入
        setPrompt('')
        setFirstFrameFile(null)
        setLastFrameFile(null)
        setFirstFramePreview(null)
        setLastFramePreview(null)
        
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

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    if (!projectId) return
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await getFirstLastFrameVideoStatus(taskId, projectId, 'volcengine-video-3.0-pro')
        if (result.success) {
          const task = result.data
          
          setTasks(prev => prev.map(t => 
            t.id === taskId 
              ? { ...t, status: task.status as any, videoUrl: task.videoUrl, errorMessage: task.errorMessage }
              : t
          ))

          if (task.status === 'completed' || task.status === 'failed') {
            clearInterval(pollIntervalRef.current!)
            pollIntervalRef.current = null
            if (task.status === 'completed') {
              alertSuccess('视频生成完成', '成功')
            } else {
              alertError(`视频生成失败: ${task.errorMessage || '未知错误'}`, '失败')
            }
          }
        } else {
          console.error('查询任务状态失败:', result.error)
          clearInterval(pollIntervalRef.current!)
          pollIntervalRef.current = null
        }
      } catch (error) {
        console.error('轮询任务状态异常:', error)
        clearInterval(pollIntervalRef.current!)
        pollIntervalRef.current = null
      }
    }, 5000) // 每5秒轮询一次
  }

  // 底部边缘悬停处理 - 参考Vue项目
  const handleBottomEdgeHover = (isHovering: boolean) => {
    if (bottomEdgeHoverTimeoutRef.current) {
      clearTimeout(bottomEdgeHoverTimeoutRef.current)
    }
    
    setIsBottomEdgeHovered(isHovering)
    
    if (isHovering) {
      // 鼠标靠近底部边缘时，立即展开悬浮窗口
      setIsBottomBarCollapsed(false)
    } else {
      // 延迟检查是否需要收缩
      bottomEdgeHoverTimeoutRef.current = setTimeout(() => {
        // 如果输入框没有焦点且鼠标不在悬浮窗口上，则收缩
        if (!isInputFocused && !isBottomBarHovered) {
          setIsBottomBarCollapsed(true)
        }
      }, 300) // 延迟300ms，参考Vue项目
    }
  }

  // 底部悬浮栏悬停处理 - 参考Vue项目
  const handleBottomBarHover = (isHovering: boolean) => {
    if (bottomBarHoverTimeoutRef.current) {
      clearTimeout(bottomBarHoverTimeoutRef.current)
    }
    
    setIsBottomBarHovered(isHovering)
    
    if (isHovering) {
      // 鼠标悬停在悬浮窗口上时，保持展开
      setIsBottomBarCollapsed(false)
    } else {
      // 延迟检查是否需要收缩
      bottomBarHoverTimeoutRef.current = setTimeout(() => {
        // 如果输入框没有焦点且鼠标不在底部边缘，则收缩
        if (!isInputFocused && !isBottomEdgeHovered) {
          setIsBottomBarCollapsed(true)
        }
      }, 300) // 延迟300ms，参考Vue项目
    }
  }

  // 输入框焦点处理 - 参考Vue项目
  const handleInputFocus = () => {
    setIsInputFocused(true)
    setIsBottomBarCollapsed(false)
  }

  const handleInputBlur = () => {
    setIsInputFocused(false)
    // 失去焦点后，如果不在底部附近且鼠标不在悬浮区域，则收缩
    setTimeout(() => {
      if (!isBottomBarHovered && !isBottomEdgeHovered) {
        const scrollY = window.scrollY
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        const distanceFromBottom = documentHeight - (scrollY + windowHeight)
        
        if (distanceFromBottom > 100) {
          setIsBottomBarCollapsed(true)
        }
      }
    }, 200) // 延迟200ms，参考Vue项目
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
      <SidebarNavigation activeTab="fragments" />
      
      {/* 历史视频区域（全屏滚动） */}
      <div className="pb-[600px] pt-8 ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 顶部：标题和筛选 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">今天</h2>
            
            {/* 筛选下拉菜单 */}
            <div className="flex items-center gap-2">
              {/* 时间筛选 */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowTimeDropdown(!showTimeDropdown)
                    setShowVideoDropdown(false)
                    setShowOperationDropdown(false)
                  }}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                >
                  时间
                  <svg className={`w-4 h-4 transition-transform ${showTimeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showTimeDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
                    <div className="text-xs font-semibold text-gray-700 mb-2 px-2">选择时间范围</div>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setTimeFilter('all')
                          setShowTimeDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 flex items-center justify-between ${
                          timeFilter === 'all' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        全部
                        {timeFilter === 'all' && (
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setTimeFilter('week')
                          setShowTimeDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                          timeFilter === 'week' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        最近一周
                      </button>
                      <button
                        onClick={() => {
                          setTimeFilter('month')
                          setShowTimeDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                          timeFilter === 'month' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        最近一个月
                      </button>
                      <button
                        onClick={() => {
                          setTimeFilter('quarter')
                          setShowTimeDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                          timeFilter === 'quarter' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        最近三个月
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 视频筛选 */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowVideoDropdown(!showVideoDropdown)
                    setShowTimeDropdown(false)
                    setShowOperationDropdown(false)
                  }}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                >
                  视频
                  <svg className={`w-4 h-4 transition-transform ${showVideoDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showVideoDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50" onClick={(e) => e.stopPropagation()}>
                    <div className="text-xs font-semibold text-gray-700 mb-2 px-2">选择视频类型</div>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setVideoFilter('all')
                          setShowVideoDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 flex items-center justify-between ${
                          videoFilter === 'all' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        全部
                        {videoFilter === 'all' && (
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setVideoFilter('group')
                          setShowVideoDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                          videoFilter === 'group' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        小组
                      </button>
                      <button
                        onClick={() => {
                          setVideoFilter('personal')
                          setShowVideoDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                          videoFilter === 'personal' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        个人
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 操作类型筛选 */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowOperationDropdown(!showOperationDropdown)
                    setShowTimeDropdown(false)
                    setShowVideoDropdown(false)
                  }}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                >
                  操作类型
                  <svg className={`w-4 h-4 transition-transform ${showOperationDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showOperationDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50" onClick={(e) => e.stopPropagation()}>
                    <div className="text-xs font-semibold text-gray-700 mb-2 px-2">选择操作类型</div>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setOperationFilter('all')
                          setShowOperationDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 flex items-center justify-between ${
                          operationFilter === 'all' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        全部
                        {operationFilter === 'all' && (
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setOperationFilter('ultra_hd')
                          setShowOperationDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                          operationFilter === 'ultra_hd' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        已超清
                      </button>
                      <button
                        onClick={() => {
                          setOperationFilter('favorite')
                          setShowOperationDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                          operationFilter === 'favorite' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        已收藏
                      </button>
                      <button
                        onClick={() => {
                          setOperationFilter('liked')
                          setShowOperationDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                          operationFilter === 'liked' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        已点赞
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tasks.map((task) => (
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
                  </div>
                  
                  {/* 视频信息 */}
                  <div className="p-3">
                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">{task.text || '无描述'}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>视频 {videoVersion} | {task.duration}s | {task.resolution}</span>
                      <span>{new Date(task.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 底部边缘触发区域 */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
          isBottomBarCollapsed ? 'h-16' : 'h-4'
        }`}
        onMouseEnter={() => handleBottomEdgeHover(true)}
        onMouseLeave={() => handleBottomEdgeHover(false)}
        onClick={() => {
          setIsBottomBarCollapsed(false)
        }}
      >
        {/* 收缩时显示提示条 */}
        {isBottomBarCollapsed && (
          <div className="h-full flex items-end justify-center pb-1">
            <div className="bg-white/95 backdrop-blur-sm rounded-t-lg shadow-md border-t border-x border-gray-200 px-2 py-1.5 cursor-pointer hover:bg-white transition-all hover:shadow-lg">
              <svg className="w-3 h-3 text-gray-400 hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* 底部悬浮输入区域 */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-in-out ${
          isBottomBarCollapsed ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
        onMouseEnter={() => handleBottomBarHover(true)}
        onMouseLeave={() => handleBottomBarHover(false)}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 ml-64">
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
                    className={`relative w-24 h-24 bg-gray-50 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
                      hoveredFrame === 'first' ? 'border-blue-500 shadow-lg transform scale-105' : 'border-gray-300',
                      firstFramePreview ? 'border-blue-500 bg-white' : ''
                    }`}
                  >
                    {firstFramePreview ? (
                      <img
                        src={firstFramePreview}
                        alt="首帧"
                        className="absolute inset-0 w-full h-full object-cover rounded-xl"
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

                {/* 横向双箭头连接符 */}
                <div className="flex items-center justify-center px-2">
                  <svg className="w-5 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 12" strokeWidth="1.5">
                    <path d="M3 6l3-3m0 6l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 6h12" strokeLinecap="round" />
                    <path d="M18 6l3-3m0 6l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* 尾帧卡片 */}
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
                    className={`relative w-24 h-24 bg-gray-50 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
                      hoveredFrame === 'last' ? 'border-blue-500 shadow-lg transform scale-105' : 'border-gray-300',
                      lastFramePreview ? 'border-blue-500 bg-white' : ''
                    }`}
                  >
                    {lastFramePreview ? (
                      <img
                        src={lastFramePreview}
                        alt="尾帧"
                        className="absolute inset-0 w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center z-10">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-1">
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">尾帧<span className="text-gray-400">（可选）</span></span>
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
              </div>

              {/* 右侧：提示词输入框 */}
              <div className="flex-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="输入文字,描述你想创作的画面内容、运动方式等。例如:一个3D形象的小男孩,在公园滑滑板。"
                  className={`w-full bg-transparent border-none outline-none resize-none text-gray-700 placeholder-gray-400 transition-all min-h-[100px] text-base leading-relaxed ${
                    isInputFocused ? 'ring-2 ring-blue-500 rounded-lg' : ''
                  }`}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            </div>

            {/* 控制栏 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                {/* 版本选择 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">版本:</span>
                  <button
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm cursor-default"
                  >
                    3.0pro
                  </button>
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
