import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Play, Pause, Volume2, VolumeX, Maximize, X, ChevronsRight, Upload, Trash2 } from 'lucide-react'
import { getProject } from '../services/projectStorage'
import { alertError, alertInfo, alertSuccess, alertWarning } from '../utils/alert'
import { uploadVideo, importVideosToJianying, getProjectFragments } from '../services/api'
import { AuthService } from '../services/auth'
import { getUserSettings } from '../services/settingsService'

function VideoReview() {
  const { projectId, fragmentId } = useParams()
  const navigate = useNavigate()
  const [annotation, setAnnotation] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [annotationFilter, setAnnotationFilter] = useState<'待批注' | '已批注' | '全部'>('待批注')
  const [isDanmakuEnabled, setIsDanmakuEnabled] = useState(true)
  const [currentTime, setCurrentTime] = useState(75.0) // 秒（支持小数，更精确）
  const [duration, setDuration] = useState(148.0) // 秒（支持小数，更精确）
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [cosVideoUrl, setCosVideoUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [annotations, setAnnotations] = useState([
    {
      id: '1',
      user: '田爱',
      avatar: 'T',
      time: '2025/11/25 22:06:25',
      content: '测试导演批注~',
      timestamp: '00:04:11',
      replies: 1,
      type: '已批注' as const,
    },
    {
      id: '2',
      user: '田爱',
      avatar: 'T',
      time: '2025/11/25 22:06:39',
      content: '@田爱 测试分镜师回复',
      timestamp: '',
      replies: 0,
      type: '已批注' as const,
    },
  ])
  const [danmakus, setDanmakus] = useState<Array<{ id: string; content: string; time: number }>>([])
  const [fragments, setFragments] = useState<Array<{ id: string; name: string }>>([])
  const [currentFragmentIndex, setCurrentFragmentIndex] = useState(0)
  const [currentUser, setCurrentUser] = useState<{ username: string; displayName: string } | null>(null)

  // 加载当前用户信息
  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setCurrentUser(user)
  }, [])

  // 检查用户权限
  const isSuperAdmin = currentUser?.username === 'Chiefavefan'
  const isAdmin = currentUser?.username === 'Chiefavefan' || currentUser?.username === 'jubian888'
  
  // 检查是否可以删除批注
  const canDeleteAnnotation = (annotation: typeof annotations[0]): boolean => {
    if (!currentUser) return false
    
    // 管理员可以删除所有批注
    if (isAdmin) {
      return true
    }
    
    // 普通用户只能删除自己的批注
    // 通过用户名或显示名称匹配
    return annotation.user === currentUser.displayName || annotation.user === currentUser.username
  }

  // 将时间戳字符串转换为秒数（如 "00:04:11" -> 251）
  const timestampToSeconds = (timestamp: string): number => {
    if (!timestamp) return -1
    const parts = timestamp.split(':').map(Number)
    if (parts.length === 2) {
      // MM:SS格式
      return parts[0] * 60 + parts[1]
    } else if (parts.length === 3) {
      // HH:MM:SS格式
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    return -1
  }

  // 删除批注
  const handleDeleteAnnotation = (annotationId: string) => {
    const annotation = annotations.find(a => a.id === annotationId)
    if (!annotation) return

    // 检查权限
    if (!canDeleteAnnotation(annotation)) {
      alertError('您没有权限删除此批注', '权限不足')
      return
    }

    // 确认删除
    if (!window.confirm('确定要删除这条批注吗？删除后对应的弹幕也会被删除。')) {
      return
    }

    // 删除批注
    setAnnotations(prev => prev.filter(a => a.id !== annotationId))

    // 删除对应的弹幕（优先通过ID匹配，如果ID不匹配则通过时间戳匹配）
    setDanmakus(prev => prev.filter(d => {
      // 如果弹幕ID与批注ID相同，直接删除
      if (d.id === annotationId) {
        return false
      }
      
      // 如果时间戳存在，通过时间戳匹配（允许1秒误差）
      if (annotation.timestamp) {
        const annotationTime = timestampToSeconds(annotation.timestamp)
        if (annotationTime >= 0 && Math.abs(d.time - annotationTime) <= 1) {
          return false
        }
      }
      
      return true
    }))

    alertSuccess('批注已删除', '删除成功')
  }

  // 加载项目名称、片段列表和当前片段的视频
  useEffect(() => {
    const loadFragmentData = async () => {
      if (!projectId) return
      
      const project = getProject(projectId)
      if (project) {
        setProjectName(project.name)
      }
      
      try {
        // 从API获取片段列表
        const token = AuthService.getToken()
        if (!token) return
        
        // 使用API函数获取片段列表
        const fragmentsData = await getProjectFragments(parseInt(projectId, 10))
        
        if (fragmentsData && fragmentsData.length > 0) {
          const fragmentsList = fragmentsData.map((f: any) => ({
            id: f.id,
            name: f.name || `分镜${f.id}`,
          }))
          setFragments(fragmentsList)
          
          // 找到当前片段
          if (fragmentId) {
            const index = fragmentsData.findIndex((f: any) => f.id === fragmentId)
            if (index !== -1) {
              setCurrentFragmentIndex(index)
              
              // 获取当前片段的视频
              const currentFragment = fragmentsData[index]
              if (currentFragment && currentFragment.videoUrls && currentFragment.videoUrls.length > 0) {
                // 使用最新的视频URL
                const latestVideoUrl = currentFragment.videoUrls[0]
                setVideoUrl(latestVideoUrl)
                setCosVideoUrl(latestVideoUrl)
                console.log('✅ 已加载片段视频:', latestVideoUrl)
              }
            }
          }
        }
      } catch (error) {
        console.error('加载片段数据失败:', error)
      }
    }
    
    loadFragmentData()
  }, [projectId, fragmentId])

  // 格式化时间（显示为 MM:SS，但内部计算支持小数）
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // 收集所有生成的视频URL（包括上传的视频）
  const collectVideoUrls = (): string[] => {
    const videoUrls: string[] = []
    
    try {
      // 1. 从 sessionStorage 获取 fusions 数据（生成的视频）
      const savedFusions = sessionStorage.getItem('imageFusion_fusions')
      if (savedFusions) {
        const fusions = JSON.parse(savedFusions)
        // 收集所有已完成的视频URL
        fusions.forEach((fusion: any) => {
          if (fusion.videoUrls && Array.isArray(fusion.videoUrls)) {
            fusion.videoUrls.forEach((url: string) => {
              if (url && !videoUrls.includes(url)) {
                videoUrls.push(url)
              }
            })
          }
        })
      }
    } catch (error) {
      console.warn('获取生成的视频URL失败:', error)
    }

    // 2. 添加当前页面上传的视频（如果有）
    if (cosVideoUrl && !videoUrls.includes(cosVideoUrl)) {
      videoUrls.push(cosVideoUrl)
    } else if (videoUrl && videoUrl.startsWith('http') && !videoUrls.includes(videoUrl)) {
      // 如果cosVideoUrl不存在，但videoUrl是HTTP链接，也添加
      videoUrls.push(videoUrl)
    }

    return videoUrls
  }

  // 一键导入并打开剪映（使用剪映小助手API + UI自动化）
  const [isImporting, setIsImporting] = useState(false)
  const handleImportToJianying = async () => {
    // 防止重复点击
    if (isImporting) {
      alertWarning('正在导入中，请勿重复点击', '提示')
      return
    }

    try {
      setIsImporting(true)
      const videoUrls = collectVideoUrls()
      
      if (videoUrls.length === 0) {
        alertWarning('没有找到可导入的视频，请先生成视频或上传视频', '提示')
        return
      }

      // 从设置中获取导入位置
      const settings = getUserSettings()
      const addToTrack = settings.jianying.importLocation === 'track'

      // 统计视频来源
      const hasUploadedVideo = cosVideoUrl || (videoUrl && videoUrl.startsWith('http'))
      const generatedCount = videoUrls.length - (hasUploadedVideo ? 1 : 0)
      const uploadedCount = hasUploadedVideo ? 1 : 0

      const result = await importVideosToJianying({
        projectName: projectName || '新项目',
        videoUrls,
        addToTrack, // 根据设置决定导入位置
        autoSave: true,
      })

      if (result.success) {
        const locationText = addToTrack ? '时间轴轨道' : '素材库'
        let message = `✅ 成功导入 ${result.added_count || videoUrls.length} 个视频到剪映${locationText}！\n\n`
        
        if (generatedCount > 0 && uploadedCount > 0) {
          message += `其中：生成视频 ${generatedCount} 个，上传视频 ${uploadedCount} 个\n\n`
        } else if (uploadedCount > 0) {
          message += `（包含当前审片页面上传的视频）\n\n`
        }
        
        // 检查是否自动打开了剪映
        if (result.openResult?.success) {
          message += `🚀 剪映应用已自动打开！\n\n`
        } else {
          message += `⚠️ 请手动打开剪映应用\n\n`
        }
        
        // 优先显示本地路径
        if (result.draft_path) {
          message += `📁 草稿已保存到本地：\n${result.draft_path}\n\n`
          message += `📝 在剪映的"本地草稿"列表中找到项目："${projectName || '新项目'}"\n`
          message += `   点击打开即可，视频已在${addToTrack ? '时间轴轨道' : '素材库'}中\n\n`
          message += `💡 提示：如果剪映已打开，可能需要刷新或重新打开剪映才能看到新草稿`
        } else if (result.draft_url) {
          message += `📋 草稿ID: ${result.draft_id}\n`
          message += `🌐 草稿URL: ${result.draft_url}\n\n`
          if (result.openResult?.success) {
            message += `✅ 已尝试通过浏览器打开草稿URL，剪映可能会自动处理\n\n`
          } else {
            message += `📝 打开方式：\n`
            message += `1. 在浏览器中打开上述URL\n`
            message += `2. 或使用剪映小助手工具导入\n`
          }
        } else {
          message += `📋 草稿ID: ${result.draft_id}\n`
          message += `⚠️ 提示：草稿已创建，但未保存到本地。请通过草稿URL访问。`
        }
        
        alertSuccess(message, '导入成功')
      } else {
        alertError(result.error || '导入失败', '导入失败')
      }
    } catch (error) {
      console.error('导入视频到剪映失败:', error)
      alertError(error instanceof Error ? error.message : '导入失败，请稍后重试', '错误')
    } finally {
      setIsImporting(false)
    }
  }


  // 提交批注
  const handleSubmitAnnotation = () => {
    if (!annotation.trim()) return

    // 获取当前登录用户的显示名称
    const currentUser = AuthService.getCurrentUser()
    const displayName = currentUser?.displayName || currentUser?.username || '当前用户'
    const userInitial = displayName.charAt(0).toUpperCase()

    const annotationId = Date.now().toString()
    const newAnnotation = {
      id: annotationId,
      user: displayName,
      avatar: userInitial,
      time: new Date().toLocaleString('zh-CN'),
      content: annotation,
      timestamp: formatTime(currentTime),
      replies: 0,
      type: '已批注' as const,
    }

    // 添加到批注列表
    setAnnotations(prev => [newAnnotation, ...prev])

    // 添加弹幕（关联批注ID，方便后续删除）
    if (isDanmakuEnabled) {
      setDanmakus(prev => [...prev, {
        id: annotationId, // 使用相同的ID，方便关联删除
        content: annotation,
        time: currentTime,
      }])
    }

    // 清空输入框
    setAnnotation('')
  }

  // 点击进度条调整进度（支持更精确的时间定位，不四舍五入到整数）
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    // 保留2位小数，提供更精确的时间定位
    const newTime = Math.round((percentage * duration) * 100) / 100
    setCurrentTime(newTime)
    
    // 如果视频元素存在，更新播放进度
    if (videoRef.current && videoUrl) {
      videoRef.current.currentTime = newTime
    }
  }

  // 切换全屏
  const handleToggleFullscreen = () => {
    if (!videoRef.current) return
    
    const element = videoRef.current
    if (!isFullscreen) {
      if (element.requestFullscreen) {
        element.requestFullscreen()
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen()
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen()
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  // 调整音量
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100
      // 如果音量大于0，取消静音
      if (newVolume > 0 && isMuted) {
        setIsMuted(false)
        videoRef.current.muted = false
      }
    }
  }

  // 切换静音
  const handleToggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted
      setIsMuted(newMuted)
      videoRef.current.muted = newMuted
    }
  }

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果用户在输入框中，不处理快捷键
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // 如果没有视频，不处理快捷键
      if (!videoUrl || !videoRef.current) {
        return
      }

      switch (e.code) {
        case 'Space': // 空格键：播放/暂停
          // 优先处理空格键，阻止默认行为和事件冒泡
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          if (isPlaying) {
            videoRef.current.pause()
            setIsPlaying(false)
          } else {
            videoRef.current.play()
            setIsPlaying(true)
          }
          return false // 额外确保阻止默认行为
        case 'ArrowLeft': // 左方向键：后退0.5秒
          e.preventDefault()
          if (videoRef.current) {
            const newTime = Math.max(0, videoRef.current.currentTime - 0.5)
            videoRef.current.currentTime = newTime
            setCurrentTime(Math.round(newTime * 100) / 100)
          }
          break
        case 'ArrowRight': // 右方向键：前进0.5秒
          e.preventDefault()
          if (videoRef.current) {
            const maxTime = videoRef.current.duration || duration
            const newTime = Math.min(maxTime, videoRef.current.currentTime + 0.5)
            videoRef.current.currentTime = newTime
            setCurrentTime(Math.round(newTime * 100) / 100)
          }
          break
        case 'ArrowUp': // 上方向键：增加音量
          e.preventDefault()
          if (videoRef.current) {
            const currentVol = volume
            const newVolume = Math.min(100, currentVol + 10)
            setVolume(newVolume)
            videoRef.current.volume = newVolume / 100
            // 如果音量大于0，取消静音
            if (newVolume > 0 && isMuted) {
              setIsMuted(false)
              videoRef.current.muted = false
            }
          }
          break
        case 'ArrowDown': // 下方向键：减少音量
          e.preventDefault()
          if (videoRef.current) {
            const currentVol = volume
            const newVolume = Math.max(0, currentVol - 10)
            setVolume(newVolume)
            videoRef.current.volume = newVolume / 100
            // 如果音量为0，自动静音
            if (newVolume === 0) {
              setIsMuted(true)
              videoRef.current.muted = true
            }
          }
          break
        case 'KeyF': // F键：全屏
          e.preventDefault()
          handleToggleFullscreen()
          break
        case 'KeyM': // M键：静音/取消静音
          e.preventDefault()
          handleToggleMute()
          break
        case 'Escape': // ESC键：退出全屏
          if (isFullscreen) {
            e.preventDefault()
            if (document.exitFullscreen) {
              document.exitFullscreen()
            } else if ((document as any).webkitExitFullscreen) {
              (document as any).webkitExitFullscreen()
            } else if ((document as any).mozCancelFullScreen) {
              (document as any).mozCancelFullScreen()
            } else if ((document as any).msExitFullscreen) {
              (document as any).msExitFullscreen()
            }
            setIsFullscreen(false)
          }
          break
      }
    }

    // 使用 capture 模式确保优先捕获事件，并设置 passive: false 以允许 preventDefault
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [videoUrl, isPlaying, isFullscreen, isMuted, volume, duration])

  // 过滤批注
  const filteredAnnotations = annotationFilter === '全部' 
    ? annotations 
    : annotations.filter(a => a.type === annotationFilter)

  // 处理视频上传
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('video/')) {
      alertError('请上传视频文件', '文件类型错误')
      return
    }

    // 重置视频状态
    setCurrentTime(0)
    setDuration(0)
    
    // 创建本地URL用于预览
    const localUrl = URL.createObjectURL(file)
    setVideoUrl(localUrl)
    setVideoFile(file)
    
    // 设置视频时长（保留小数，更精确）
    try {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        try {
          // 保留2位小数，提供更精确的时长
          const videoDuration = Math.round(video.duration * 100) / 100
          setDuration(videoDuration)
          // 确保当前时间为0
          setCurrentTime(0)
        } catch (error) {
          console.error('获取视频时长错误:', error)
        }
      }
      video.onerror = () => {
        console.error('视频元数据加载失败')
        // 如果无法加载元数据，设置默认时长
        setDuration(0)
        setCurrentTime(0)
      }
      video.src = localUrl
    } catch (error) {
      console.error('创建视频元素错误:', error)
      // 如果创建视频元素失败，仍然设置URL，让video元素自己处理
    }

    // 上传到COS
    try {
      setIsUploading(true)
      setUploadProgress(0)
      
      const result = await uploadVideo(
        file,
        projectId || undefined,
        fragmentId || undefined,
        (progress) => {
          setUploadProgress(progress)
        }
      )
      
      // 使用COS的URL替换本地URL
      if (result && result.url) {
        // 先释放本地URL
        try {
          URL.revokeObjectURL(localUrl)
        } catch (err) {
          console.warn('释放本地URL失败:', err)
        }
        
        // 然后设置新的URL（使用setTimeout确保状态更新不会冲突）
        setTimeout(() => {
          try {
            setCosVideoUrl(result.url)
            setVideoUrl(result.url)
            console.log('✅ 视频上传成功，URL已更新:', result.url)
            
            // 触发片段更新事件，通知片段管理页面刷新
            if (projectId) {
              const event = new CustomEvent('fragment-updated', {
                detail: { projectId: parseInt(projectId, 10) }
              })
              window.dispatchEvent(event)
              console.log('📢 已触发片段更新事件')
            }
          } catch (err) {
            console.error('设置视频URL失败:', err)
            // 如果设置失败，恢复本地URL
            const newLocalUrl = URL.createObjectURL(file)
            setVideoUrl(newLocalUrl)
          }
        }, 100)
      } else {
        console.error('上传结果中没有URL:', result)
        alertError('上传成功但未返回视频URL', '上传失败')
      }
      
      // 不显示上传成功弹窗，静默上传
    } catch (error) {
      console.error('视频上传失败:', error)
      alertError(error instanceof Error ? error.message : '视频上传失败，请稍后重试', '上传失败')
      // 上传失败时仍使用本地URL预览（不释放）
    } finally {
      // 确保进度条关闭，即使有错误
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 500) // 延迟500ms关闭，确保用户能看到100%的完成状态
    }
  }

  // 点击上传区域
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // 切换到下一集
  const handleNextEpisode = () => {
    if (fragments.length === 0) return
    
    const nextIndex = (currentFragmentIndex + 1) % fragments.length
    const nextFragment = fragments[nextIndex]
    
    if (nextFragment && projectId) {
      // 重置播放状态
      setCurrentTime(0)
      setIsPlaying(false)
      // 清空当前批注和弹幕（可选，根据需求决定）
      // setAnnotations([])
      // setDanmakus([])
      
      // 导航到下一集
      navigate(`/project/${projectId}/fragments/${nextFragment.id}/review`, { replace: true })
      
      // 开始播放
      setTimeout(() => {
        setIsPlaying(true)
      }, 100)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* 顶部导航 */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/project/${projectId}/fragments`)}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            返回
          </button>
          {projectName && (
            <div className="text-gray-900 font-medium text-lg">
              {projectName}
          </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">审片</h1>
          <div className="flex items-center gap-2">
            <select 
              value={annotationFilter}
              onChange={(e) => setAnnotationFilter(e.target.value as '待批注' | '已批注' | '全部')}
              className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg"
            >
              <option value="待批注">待批注</option>
              <option value="已批注">已批注</option>
              <option value="全部">全部</option>
            </select>
            <button 
              onClick={handleImportToJianying}
              disabled={isImporting}
              className={`px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 ${
                isImporting 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-purple-700'
              }`}
              title={isImporting 
                ? '正在导入中，请稍候...' 
                : '一键导入所有视频到剪映并自动打开剪映应用（包括生成的视频和上传的视频）'}
            >
              <RefreshCw size={18} className={isImporting ? 'animate-spin' : ''} />
              {isImporting ? '导入中...' : '一键导入并打开剪映'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* 左侧视频区域 */}
        <div className="flex-1 flex flex-col p-6">
          {/* 视频播放器 */}
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
            {videoUrl ? (
              <>
                {/* 视频播放 */}
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={(e) => {
                    try {
                      const video = e.currentTarget
                      // 只在视频已加载元数据时更新（避免显示错误的时间）
                      if (video.duration && video.duration > 0) {
                        // 保留2位小数，提供更精确的时间跟踪
                        setCurrentTime(Math.round(video.currentTime * 100) / 100)
                      }
                    } catch (error) {
                      console.error('视频时间更新错误:', error)
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    try {
                      const video = e.currentTarget
                      // 保留2位小数，提供更精确的时长
                      const videoDuration = Math.round(video.duration * 100) / 100
                      setDuration(videoDuration)
                      // 确保当前时间为0
                      setCurrentTime(0)
                      // 如果视频元素存在，重置播放位置
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0
                      }
                    } catch (error) {
                      console.error('视频元数据加载错误:', error)
                    }
                  }}
                  onPlay={() => {
                    try {
                      setIsPlaying(true)
                    } catch (error) {
                      console.error('视频播放错误:', error)
                    }
                  }}
                  onPause={() => {
                    try {
                      setIsPlaying(false)
                    } catch (error) {
                      console.error('视频暂停错误:', error)
                    }
                  }}
                  onError={(e) => {
                    console.error('视频加载错误:', e)
                    alertError('视频加载失败，请检查视频文件是否有效', '视频错误')
                    // 清空视频URL，回到上传状态
                    setVideoUrl(null)
                    setCosVideoUrl(null)
                    if (videoFile) {
                      // 释放本地URL
                      try {
                        URL.revokeObjectURL(videoFile.name)
                      } catch (err) {
                        // 忽略释放错误
                      }
                    }
                    setVideoFile(null)
                  }}
                />
                
                {/* 上传进度覆盖层 */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                    <div className="bg-white rounded-lg p-6 w-80">
                      <h3 className="text-lg font-semibold mb-4 text-center">上传视频到COS</h3>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div 
                          className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-center text-sm text-gray-600">{uploadProgress}%</p>
                    </div>
                  </div>
                )}
                
                {/* 弹幕显示区域 */}
                {isDanmakuEnabled && !isUploading && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {danmakus
                      .filter(danmaku => Math.abs(danmaku.time - currentTime) < 2) // 显示当前时间前后2秒的弹幕
                      .map((danmaku, index) => (
                        <div
                          key={danmaku.id}
                          className="absolute text-white text-sm font-medium px-3 py-1 bg-black bg-opacity-50 rounded whitespace-nowrap"
                          style={{
                            top: `${20 + (index % 10) * 8}%`,
                            left: '100%',
                            animation: `danmaku-move 10s linear forwards`,
                            animationDelay: `${index * 0.1}s`,
                          }}
                        >
                          {danmaku.content}
                        </div>
                      ))}
                  </div>
                )}
              </>
            ) : (
              /* 上传区域 */
              <div 
                onClick={handleUploadClick}
                className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity relative"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Upload size={40} className="text-white" />
                  </div>
                  <p className="text-white text-lg font-medium mb-2">点击上传视频</p>
                  <p className="text-white text-sm opacity-80">支持 MP4、AVI、MOV 等格式</p>
                </div>
              </div>
            )}
          </div>
          
          <style>{`
            @keyframes danmaku-move {
              from {
                left: 100%;
              }
              to {
                left: -100%;
              }
            }
          `}</style>

          {/* 播放控制 */}
          <div className="flex flex-col gap-2 mb-4">
            {/* 上传进度条 - 仅在上传时显示 */}
            {isUploading && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">上传中</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full relative overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-12 text-right">{uploadProgress}%</span>
              </div>
            )}
            
            {/* 播放控制栏 */}
            <div className="flex items-center gap-4">
            <button
                onClick={() => {
                  if (videoRef.current) {
                    if (isPlaying) {
                      videoRef.current.pause()
                    } else {
                      videoRef.current.play()
                    }
                  }
                  setIsPlaying(!isPlaying)
                }}
                disabled={!videoUrl}
                className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
              <button 
                onClick={handleNextEpisode}
                className="w-10 h-10 rounded-full bg-gray-50 border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                title="切换为下一集"
              >
                <ChevronsRight size={18} />
            </button>
              <span className="text-sm text-gray-600">{duration > 0 ? formatTime(currentTime) : '00:00'}</span>
              <div 
                ref={progressBarRef}
                onClick={handleProgressClick}
                className={`flex-1 h-2 bg-gray-300 rounded-full relative ${
                  duration > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div 
                  className="h-full bg-purple-600 rounded-full transition-all" 
                  style={{ 
                    width: duration > 0 ? `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%` : '0%'
                  }}
                ></div>
            </div>
              <span className="text-sm text-gray-600">{duration > 0 ? formatTime(duration) : '00:00'}</span>
              <button 
                onClick={() => setIsDanmakuEnabled(!isDanmakuEnabled)}
                className={`px-3 py-1 rounded text-sm border ${
                  isDanmakuEnabled 
                    ? 'bg-gray-50 border-gray-300' 
                    : 'bg-gray-200 border-gray-400 line-through'
                }`}
              >
                弹
              </button>
              <button 
                onClick={handleToggleFullscreen}
                className="w-10 h-10 rounded-full bg-gray-50 border border-gray-300 flex items-center justify-center hover:bg-gray-100"
              >
              <Maximize size={18} />
            </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMute}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                  title={isMuted ? '取消静音' : '静音'}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 批注输入 */}
          <div className="space-y-2">
            <textarea
              value={annotation}
              onChange={(e) => setAnnotation(e.target.value)}
              placeholder="请输入批注内容..."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{annotation.length}/1000</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setAnnotation('')}
                  className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  清空
                </button>
                <button 
                  onClick={handleSubmitAnnotation}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  提交
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧批注列表 */}
        <div className="w-80 border-l border-gray-200 p-6 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">批注列表</h3>
          <div className="space-y-4">
            {filteredAnnotations.map((item) => (
              <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm">
                    {item.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.user}</span>
                      <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{item.time}</span>
                        {canDeleteAnnotation(item) && (
                          <button
                            onClick={() => handleDeleteAnnotation(item.id)}
                            className="text-red-500 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                            title="删除批注"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{item.content}</p>
                    {item.timestamp && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <span>{item.timestamp}</span>
                        {item.replies > 0 && (
                          <span>{item.replies}条回复</span>
                        )}
                      </div>
                    )}
                    <button className="text-xs text-purple-400 hover:text-purple-300">
                      回复
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoReview
