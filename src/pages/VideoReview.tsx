import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Play, Pause, Volume2, VolumeX, Maximize, X, ChevronsRight, Upload, Trash2 } from 'lucide-react'
import { getProject } from '../services/projectStorage'
import { alertError, alertInfo, alertSuccess, alertWarning } from '../utils/alert'
import { uploadVideo, importVideosToJianying, getProjectFragments, deleteAnnotation, getAnnotations, createAnnotation } from '../services/api'
import { AuthService } from '../services/auth'
import { getUserSettings, updateUserSettings } from '../services/settingsService'
import HamsterLoader from '../components/HamsterLoader'

function VideoReview() {
  const { projectId, fragmentId } = useParams()
  const navigate = useNavigate()
  const [annotation, setAnnotation] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [annotationFilter, setAnnotationFilter] = useState<'待批注' | '已批注' | '全部'>('全部')
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
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null) // 视频第一帧（乐观更新）
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [annotations, setAnnotations] = useState<Array<{
    id: string
    user: string
    avatar: string
    time: string
    content: string
    timestamp: string
    replies: number
    type: '待批注' | '已批注'
    timestampSeconds?: number
  }>>([])
  const [danmakus, setDanmakus] = useState<Array<{ id: string; content: string; time: number }>>([])
  const [fragments, setFragments] = useState<Array<{ id: string; name: string; videoUrls?: string[] }>>([])
  const [currentFragmentIndex, setCurrentFragmentIndex] = useState(0)
  const [currentUser, setCurrentUser] = useState<{ username: string; displayName: string } | null>(null)
  const [mode, setMode] = useState<'preview' | 'review'>('review') // 预览/审片模式，默认审片
  const [videoAspectRatios, setVideoAspectRatios] = useState<Map<string, number>>(new Map()) // 存储每个视频的宽高比

  // 加载当前用户信息和默认模式
  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setCurrentUser(user)
    
    // 从设置中读取默认模式，默认为审片模式
    const settings = getUserSettings()
    setMode(settings.videoReview?.defaultMode || 'review')
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
  const handleDeleteAnnotation = async (annotationId: string) => {
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

    // 调用后端API删除批注
    if (projectId) {
      try {
        await deleteAnnotation(parseInt(projectId, 10), annotationId)
        
        // 删除成功，更新前端状态
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
        
        // 重新加载批注列表，确保数据同步
        if (fragmentId) {
          try {
            const annotationsData = await getAnnotations(parseInt(projectId, 10), fragmentId)
            if (annotationsData) {
              setAnnotations(annotationsData)
              
              // 同时更新弹幕列表
              const danmakusData = annotationsData
                .filter(a => a.timestampSeconds !== null && a.timestampSeconds !== undefined)
                .map(a => ({
                  id: a.id,
                  content: a.content,
                  time: a.timestampSeconds || 0,
                }))
              setDanmakus(danmakusData)
            }
          } catch (error) {
            console.error('重新加载批注列表失败:', error)
          }
        }
      } catch (error) {
        console.error('删除批注失败:', error)
        alertError(error instanceof Error ? error.message : '删除批注失败，请稍后重试', '删除失败')
      }
    } else {
      // 如果没有projectId，只在前端删除（兼容旧数据）
      setAnnotations(prev => prev.filter(a => a.id !== annotationId))
      setDanmakus(prev => prev.filter(d => d.id !== annotationId))
      alertSuccess('批注已删除', '删除成功')
    }
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
            videoUrls: f.videoUrls || [],
          }))
          setFragments(fragmentsList)
          
          // 找到当前片段
          if (fragmentId) {
            const index = fragmentsData.findIndex((f: any) => String(f.id) === String(fragmentId))
            if (index !== -1) {
              setCurrentFragmentIndex(index)
              
              // 获取当前片段的视频
              const currentFragment = fragmentsData[index]
              console.log('📦 当前片段数据:', currentFragment)
              if (currentFragment && currentFragment.videoUrls && currentFragment.videoUrls.length > 0) {
                // 使用最新的视频URL
                const latestVideoUrl = currentFragment.videoUrls[0]
                setVideoUrl(latestVideoUrl)
                setCosVideoUrl(latestVideoUrl)
                setIsVideoLoading(true) // 设置加载状态
                console.log('✅ 已加载片段视频:', latestVideoUrl)
                
                // 乐观更新：立即提取视频第一帧作为占位符
                extractVideoThumbnail(latestVideoUrl)
              } else {
                // 如果没有视频，清空缩略图
                console.log('⚠️ 当前片段没有视频')
                setVideoThumbnail(null)
              }
              
              // 加载批注列表
              try {
                const annotationsData = await getAnnotations(parseInt(projectId, 10), fragmentId)
                if (annotationsData && annotationsData.length > 0) {
                  setAnnotations(annotationsData)
                  
                  // 同时加载弹幕
                  const danmakusData = annotationsData
                    .filter(a => a.timestampSeconds !== null && a.timestampSeconds !== undefined)
                    .map(a => ({
                      id: a.id,
                      content: a.content,
                      time: a.timestampSeconds || 0,
                    }))
                  setDanmakus(danmakusData)
                }
              } catch (error) {
                console.error('加载批注列表失败:', error)
                // 如果加载失败，保持默认的批注列表（兼容旧数据）
              }
            } else {
              console.log('⚠️ 未找到片段，fragmentId:', fragmentId, '可用片段:', fragmentsData.map((f: any) => f.id))
            }
          }
        }
      } catch (error) {
        console.error('加载片段数据失败:', error)
      }
    }
    
    loadFragmentData()
  }, [projectId, fragmentId])

  // 提取视频第一帧作为缩略图（乐观更新）
  const extractVideoThumbnail = (videoUrl: string) => {
    if (!videoUrl) {
      setVideoThumbnail(null)
      return
    }

    // 创建一个隐藏的video元素来提取第一帧
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    
    video.onloadedmetadata = () => {
      // 设置到第一帧（0秒）
      video.currentTime = 0.1 // 稍微偏移一点，确保能获取到帧
    }
    
    video.onseeked = () => {
      try {
        // 创建canvas来绘制视频帧
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 1920
        canvas.height = video.videoHeight || 1080
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          // 将canvas转换为base64图片
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
          setVideoThumbnail(thumbnail)
          console.log('✅ 已提取视频第一帧作为占位符')
        }
      } catch (error) {
        console.error('提取视频第一帧失败:', error)
        setVideoThumbnail(null)
      }
    }
    
    video.onerror = () => {
      console.error('视频加载失败，无法提取第一帧')
      setVideoThumbnail(null)
    }
    
    video.src = videoUrl
  }

  // 视频加载后自动播放（仅在预览模式下）
  useEffect(() => {
    if (videoRef.current && videoUrl && mode === 'preview') {
      // 延迟一点确保视频已加载
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch((error) => {
            console.warn('自动播放失败（可能需要用户交互）:', error)
          })
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [videoUrl, mode])

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
  const handleSubmitAnnotation = async () => {
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
      timestampSeconds: currentTime,
    }

    // 先乐观更新UI
    setAnnotations(prev => [newAnnotation, ...prev])

    // 添加弹幕（关联批注ID，方便后续删除）
    if (isDanmakuEnabled) {
      setDanmakus(prev => [...prev, {
        id: annotationId,
        content: annotation,
        time: currentTime,
      }])
    }

    // 清空输入框
    const annotationContent = annotation
    setAnnotation('')

    // 保存到后端
    if (projectId && fragmentId) {
      try {
        const savedAnnotation = await createAnnotation(
          parseInt(projectId, 10),
          fragmentId,
          annotationContent,
          currentTime
        )
        
        // 更新本地批注ID为后端返回的ID
        setAnnotations(prev => prev.map(a => 
          a.id === annotationId 
            ? { ...a, id: savedAnnotation.id }
            : a
        ))
        
        // 更新弹幕ID
        setDanmakus(prev => prev.map(d =>
          d.id === annotationId
            ? { ...d, id: savedAnnotation.id }
            : d
        ))
        
        // 不显示成功提示，静默完成
      } catch (error) {
        console.error('保存批注失败:', error)
        // 保存失败时回滚UI
        setAnnotations(prev => prev.filter(a => a.id !== annotationId))
        setDanmakus(prev => prev.filter(d => d.id !== annotationId))
        alertError(error instanceof Error ? error.message : '发送批注失败，请稍后重试', '发送失败')
      }
    }
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
      <div className="border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/project/${projectId}/fragments`)}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg active:bg-purple-700 sm:hover:bg-purple-700 flex items-center gap-1.5 sm:gap-2 touch-manipulation text-sm sm:text-base"
          >
            <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
            返回
          </button>
          {projectName && (
            <div className="text-gray-900 font-medium text-base sm:text-lg truncate flex-1 sm:flex-none">
              {projectName}
          </div>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-none">
            <button
              onClick={() => {
                const newMode = mode === 'preview' ? 'review' : 'preview'
                setMode(newMode)
                updateUserSettings({ videoReview: { defaultMode: newMode } })
              }}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                mode === 'preview'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200 sm:hover:bg-gray-200'
              }`}
            >
              预览
            </button>
            <span className="text-gray-400 text-xs sm:text-sm">/</span>
            <button
              onClick={() => {
                const newMode = mode === 'review' ? 'preview' : 'review'
                setMode(newMode)
                updateUserSettings({ videoReview: { defaultMode: newMode } })
              }}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                mode === 'review'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200 sm:hover:bg-gray-200'
              }`}
            >
              审片
            </button>
          </div>
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

      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        {/* 左侧视频区域 */}
        <div className="flex-1 flex flex-col p-3 sm:p-6 order-2 lg:order-1">
          {/* 视频播放器 */}
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
            {videoUrl ? (
              <>
                {/* 视频加载状态 - 使用新的加载动画 */}
                {isVideoLoading && (
                  <div className="absolute inset-0 bg-white flex items-center justify-center z-20">
                    <div className="text-center">
                      <div className="video-loading-bounce"></div>
                      <p className="text-gray-600 text-lg font-medium mt-8">视频加载中...</p>
                    </div>
                  </div>
                )}
                {/* 视频播放 */}
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                    onLoadStart={() => {
                      setIsVideoLoading(true)
                      // 设置超时，如果10秒内视频还没加载完成，停止加载状态
                      setTimeout(() => {
                        setIsVideoLoading(false)
                      }, 10000)
                    }}
                    onCanPlay={() => {
                      setIsVideoLoading(false)
                    }}
                    onLoadedData={() => {
                      setIsVideoLoading(false)
                    }}
                    onCanPlayThrough={() => {
                      setIsVideoLoading(false)
                    }}
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
                      setIsVideoLoading(false)
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
              /* 上传区域 - 使用仓鼠加载动画 */
              <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                {/* 仓鼠加载动画 */}
                <div className="mb-8">
                  <HamsterLoader size={14} />
                </div>
                <p className="text-gray-500 text-sm mb-6">等待上传视频...</p>
                {/* 渐变上传按钮 */}
                <button
                  onClick={handleUploadClick}
                  className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg"
                >
                  <Upload size={20} />
                  <span>上传视频</span>
                </button>
                <p className="text-gray-400 text-xs mt-3">支持 MP4、AVI、MOV 等格式</p>
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
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
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
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-600 flex items-center justify-center active:bg-purple-700 sm:hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {isPlaying ? <Pause size={18} className="sm:w-5 sm:h-5" /> : <Play size={18} className="sm:w-5 sm:h-5" />}
            </button>
              <button 
                onClick={handleNextEpisode}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-50 border border-gray-300 flex items-center justify-center active:bg-gray-100 sm:hover:bg-gray-100 touch-manipulation"
                title="切换为下一集"
              >
                <ChevronsRight size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">{videoUrl && duration > 0 ? formatTime(currentTime) : '00:00'}</span>
              <div 
                ref={progressBarRef}
                onClick={handleProgressClick}
                className={`flex-1 h-2 sm:h-2.5 bg-gray-300 rounded-full relative touch-manipulation ${
                  videoUrl && duration > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div 
                  className="h-full bg-purple-600 rounded-full transition-all" 
                  style={{ 
                    width: videoUrl && duration > 0 ? `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%` : '0%'
                  }}
                ></div>
            </div>
              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">{videoUrl && duration > 0 ? formatTime(duration) : '00:00'}</span>
              <button 
                onClick={() => setIsDanmakuEnabled(!isDanmakuEnabled)}
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm border touch-manipulation ${
                  isDanmakuEnabled 
                    ? 'bg-gray-50 border-gray-300' 
                    : 'bg-gray-200 border-gray-400 line-through'
                }`}
              >
                弹
              </button>
              <button 
                onClick={handleToggleFullscreen}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-50 border border-gray-300 flex items-center justify-center active:bg-gray-100 sm:hover:bg-gray-100 touch-manipulation"
              >
              <Maximize size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={handleToggleMute}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center active:bg-gray-100 sm:hover:bg-gray-100 rounded transition-colors touch-manipulation"
                  title={isMuted ? '取消静音' : '静音'}
                >
                  {isMuted ? <VolumeX size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Volume2 size={16} className="sm:w-[18px] sm:h-[18px]" />}
            </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer touch-manipulation"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：预览模式下显示视频列表，审片模式下显示批注列表 */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 p-3 sm:p-6 overflow-y-auto order-1 lg:order-2 max-h-[40vh] lg:max-h-none flex flex-col">
          {mode === 'preview' ? (
            <>
              <h3 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4">视频列表</h3>
              <div className="space-y-2 sm:space-y-3">
                {fragments.map((fragment, index) => (
                  <div
                    key={fragment.id}
                    onClick={() => {
                      setCurrentFragmentIndex(index)
                      if (fragment.videoUrls && fragment.videoUrls.length > 0) {
                        const latestVideoUrl = fragment.videoUrls[0]
                        setVideoUrl(latestVideoUrl)
                        setCosVideoUrl(latestVideoUrl)
                        navigate(`/project/${projectId}/fragments/${fragment.id}/review`, { replace: true })
                      }
                    }}
                    className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-colors touch-manipulation ${
                      index === currentFragmentIndex
                        ? 'bg-purple-50 border-2 border-purple-600'
                        : 'bg-gray-50 border border-gray-200 active:bg-gray-100 sm:hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      {fragment.videoUrls && fragment.videoUrls.length > 0 ? (() => {
                        const videoUrl = fragment.videoUrls[0]
                        const aspectRatio = videoAspectRatios.get(videoUrl) || 16/9 // 默认16:9
                        const isPortrait = aspectRatio < 1
                        return (
                          <div 
                            className={`relative bg-gray-200 rounded overflow-hidden flex-shrink-0 ${
                              isPortrait 
                                ? 'w-12 h-20 sm:w-14 sm:h-24' // 9:16 竖屏
                                : 'w-20 h-14 sm:w-24 sm:h-16'  // 16:9 横屏
                            }`}
                          >
                            <video
                              src={videoUrl}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                              onLoadedMetadata={(e) => {
                                const video = e.currentTarget
                                const ratio = video.videoWidth / video.videoHeight
                                setVideoAspectRatios(prev => new Map(prev).set(videoUrl, ratio))
                              }}
                            />
                          </div>
                        )
                      })() : (
                        <div className="relative w-20 h-14 sm:w-24 sm:h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                          <Play className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{fragment.name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                          {fragment.videoUrls?.length || 0} 个视频
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {fragments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">暂无视频</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4">批注列表</h3>
              <div className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
            {filteredAnnotations.map((item) => (
              <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3 mb-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs sm:text-sm flex-shrink-0">
                    {item.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-xs sm:text-sm font-medium truncate">{item.user}</span>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">{item.time}</span>
                        {canDeleteAnnotation(item) && (
                          <button
                            onClick={() => handleDeleteAnnotation(item.id)}
                            className="text-red-500 active:text-red-600 sm:hover:text-red-600 transition-colors p-1 rounded active:bg-red-50 sm:hover:bg-red-50 touch-manipulation"
                            title="删除批注"
                          >
                            <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 mb-1.5 sm:mb-2 break-words">{item.content}</p>
                    {item.timestamp && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2">
                        <span>{item.timestamp}</span>
                        {item.replies > 0 && (
                          <span>{item.replies}条回复</span>
                        )}
                      </div>
                    )}
                    <button className="text-[10px] sm:text-xs text-purple-400 active:text-purple-300 sm:hover:text-purple-300 touch-manipulation">
                      回复
                    </button>
                  </div>
                </div>
              </div>
            ))}
                {filteredAnnotations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">暂无批注</p>
                  </div>
                )}
          </div>
              
              {/* 批注输入框 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <textarea
                  value={annotation}
                  onChange={(e) => setAnnotation(e.target.value)}
                  placeholder="输入批注内容，发送后将在当前播放时刻显示弹幕..."
                  className="w-full h-20 px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    当前时刻: {formatTime(currentTime)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAnnotation('')}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-200 transition-colors touch-manipulation"
                    >
                      清空
                    </button>
                    <button
                      onClick={handleSubmitAnnotation}
                      disabled={!annotation.trim()}
                      className="px-4 py-1.5 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 active:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      发送
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoReview
