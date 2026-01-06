import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Heart, ChevronUp, ChevronDown } from 'lucide-react'
import { getCommunityVideoDetail, getCommunityVideos, toggleVideoLike, recordVideoView, CommunityVideo } from '../services/api'
import { alertError } from '../utils/alert'
import NavigationBar from '../components/NavigationBar'

function CommunityVideoDetail() {
  const { videoId } = useParams()
  const navigate = useNavigate()
  const [video, setVideo] = useState<CommunityVideo | null>(null)
  const [relatedVideos, setRelatedVideos] = useState<CommunityVideo[]>([])
  const [allVideos, setAllVideos] = useState<CommunityVideo[]>([]) // 所有视频列表（用于导航）
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null)
  const [relatedVideoThumbnails, setRelatedVideoThumbnails] = useState<Map<number, string>>(new Map())
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  // 加载视频详情
  const loadVideo = async () => {
    if (!videoId) return
    
    try {
      setIsLoading(true)
      const videoData = await getCommunityVideoDetail(parseInt(videoId, 10))
      setVideo(videoData)
      
      // 记录观看
      recordVideoView(videoData.id)
      
      // 加载所有视频（用于导航）
      const allVideosResult = await getCommunityVideos({ page: 1, limit: 100, sortBy: 'latest' })
      setAllVideos(allVideosResult.videos)
      
      // 加载相关视频（用于显示在侧边栏）
      const filteredRelated = allVideosResult.videos.filter(v => v.id !== videoData.id).slice(0, 5)
      setRelatedVideos(filteredRelated)
      
      // 为没有缩略图的相关视频尝试提取首帧（如果提取失败，会显示占位符）
      filteredRelated.forEach((relatedVideo) => {
        // 优先使用数据库中的 thumbnailUrl，如果没有或为空字符串再尝试提取
        const hasValidThumbnail = relatedVideo.thumbnailUrl && 
          relatedVideo.thumbnailUrl.trim() !== '' && 
          relatedVideo.thumbnailUrl !== 'null' &&
          !relatedVideo.thumbnailUrl.startsWith('data:')
        if (!hasValidThumbnail && relatedVideo.videoUrl) {
          extractVideoThumbnail(relatedVideo.id, relatedVideo.videoUrl)
        }
      })
    } catch (error) {
      console.error('加载视频失败:', error)
      alertError(error instanceof Error ? error.message : '加载视频失败，请稍后重试', '错误')
    } finally {
      setIsLoading(false)
    }
  }

  // 提取视频第一帧作为缩略图（可选，如果失败会显示占位符）
  const extractVideoThumbnail = (videoId: number, videoUrl: string) => {
    if (!videoUrl) return

    // 创建一个隐藏的video元素来提取第一帧
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    
    // 设置超时，避免长时间等待
    const timeout = setTimeout(() => {
      console.warn(`提取相关视频 ${videoId} 缩略图超时`)
      video.src = ''
    }, 10000) // 10秒超时
    
    video.onloadedmetadata = () => {
      // 设置到第一帧（0秒）
      video.currentTime = 0.1 // 稍微偏移一点，确保能获取到帧
    }
    
    video.onseeked = () => {
      try {
        clearTimeout(timeout)
        // 创建canvas来绘制视频帧
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 1920
        canvas.height = video.videoHeight || 1080
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          // 将canvas转换为base64图片
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
          setRelatedVideoThumbnails(prev => new Map(prev).set(videoId, thumbnail))
          console.log(`✅ 已提取相关视频 ${videoId} 的缩略图`)
        }
        video.src = '' // 清理
      } catch (error) {
        clearTimeout(timeout)
        console.warn(`提取相关视频 ${videoId} 缩略图失败，将显示占位符:`, error)
        video.src = '' // 清理
      }
    }
    
    video.onerror = () => {
      clearTimeout(timeout)
      console.warn(`相关视频 ${videoId} 加载失败，将显示占位符`)
      video.src = '' // 清理
    }
    
    video.src = videoUrl
  }

  useEffect(() => {
    loadVideo()
  }, [videoId])

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (!video || allVideos.length === 0) return
        
        const currentIndex = allVideos.findIndex(v => v.id === video.id)
        if (currentIndex === -1) return
        
        const direction = e.key === 'ArrowUp' ? -1 : 1
        const newIndex = currentIndex + direction
        
        if (newIndex >= 0 && newIndex < allVideos.length) {
          navigate(`/works/${allVideos[newIndex].id}`)
        }
      } else if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen()
      } else if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [allVideos, video, isFullscreen, navigate])

  // 滚轮导航（Windows逻辑：向下滚动切换到下一个，向上滚动切换到上一个）
  useEffect(() => {
    let wheelTimeout: ReturnType<typeof setTimeout> | null = null
    let isNavigating = false
    
    const handleWheel = (e: WheelEvent) => {
      if (!video || allVideos.length === 0 || isNavigating) return
      
      // 如果用户在输入框或文本区域中，不触发导航
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      
      e.preventDefault()
      
      // 防抖：避免快速滚动时频繁切换
      if (wheelTimeout) {
        clearTimeout(wheelTimeout)
      }
      
      wheelTimeout = setTimeout(() => {
        const currentIndex = allVideos.findIndex(v => v.id === video.id)
        if (currentIndex === -1) return
        
        // Windows逻辑：向下滚动（deltaY > 0）切换到下一个，向上滚动（deltaY < 0）切换到上一个
        const direction = e.deltaY > 0 ? 1 : -1
        const newIndex = currentIndex + direction
        
        if (newIndex >= 0 && newIndex < allVideos.length) {
          isNavigating = true
          navigate(`/works/${allVideos[newIndex].id}`)
          // 重置导航标志，允许下一次导航
          setTimeout(() => {
            isNavigating = false
          }, 500)
        }
      }, 150) // 150ms 防抖延迟
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      if (wheelTimeout) {
        clearTimeout(wheelTimeout)
      }
    }
  }, [allVideos, video, navigate])

  // 播放控制
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      videoRef.current.currentTime = percent * duration
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const enterFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen()
      }
      setIsFullscreen(true)
    }
  }

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
    setIsFullscreen(false)
  }

  // 检查是否登录
  const checkAuth = () => {
    const token = localStorage.getItem('auth_token')
    return !!token
  }

  const handleLike = async () => {
    if (!video) return
    
    if (!checkAuth()) {
      alertError('请先登录', '需要登录')
      navigate('/?showLogin=true')
      return
    }

    try {
      const result = await toggleVideoLike(video.id)
      setVideo(prev => prev ? { 
        ...prev, 
        likesCount: result.likesCount,
        isLiked: result.liked 
      } : null)
    } catch (error) {
      console.error('点赞失败:', error)
      alertError(error instanceof Error ? error.message : '点赞失败，请稍后重试', '错误')
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`
    }
    return num.toString()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <div className="w-16 bg-gray-800 flex flex-col items-center py-4">
          <button
            onClick={() => navigate('/works')}
            className="w-12 h-12 bg-purple-600 text-white rounded-lg active:bg-purple-700 hover:bg-purple-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="flex-1 bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
        <div className="w-80 bg-gray-100"></div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <div className="w-16 bg-gray-800 flex flex-col items-center py-4">
          <button
            onClick={() => navigate('/works')}
            className="w-12 h-12 bg-purple-600 text-white rounded-lg active:bg-purple-700 hover:bg-purple-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="flex-1 bg-gray-900 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-lg mb-4">视频不存在</p>
            <button
              onClick={() => navigate('/works')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              返回作品展示
            </button>
          </div>
        </div>
        <div className="w-80 bg-gray-100"></div>
      </div>
    )
  }

  // 判断是否为竖屏视频
  const isPortrait = videoAspectRatio !== null && videoAspectRatio < 1

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 左侧窄边栏：返回按钮 */}
      <div className="w-16 bg-gray-800 flex flex-col items-center py-4">
        <button
          onClick={() => navigate('/works')}
          className="w-12 h-12 bg-purple-600 text-white rounded-lg active:bg-purple-700 hover:bg-purple-700 flex items-center justify-center gap-1 transition-colors touch-manipulation"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* 中间：视频播放器 */}
      <div className="flex-1 bg-gray-900 flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-5xl"
          style={{ 
            aspectRatio: isPortrait ? '9/16' : '16/9',
            maxHeight: 'calc(100vh - 2rem)'
          }}
        >
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="w-full h-full object-contain rounded-lg"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => {
              const videoEl = e.currentTarget
              setDuration(videoEl.duration)
              const ratio = videoEl.videoWidth / videoEl.videoHeight
              setVideoAspectRatio(ratio)
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            autoPlay
          />

          {/* 播放控制覆盖层 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-30 rounded-lg">
            <button
              onClick={togglePlay}
              className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all touch-manipulation"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-gray-900" />
              ) : (
                <Play className="w-8 h-8 text-gray-900 ml-1" />
              )}
            </button>
          </div>

          {/* 进度条和控制按钮 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent rounded-b-lg p-4">
            <div
              ref={progressBarRef}
              onClick={handleProgressClick}
              className="h-1 bg-gray-700 bg-opacity-50 cursor-pointer rounded-full mb-3"
            >
              <div
                className="h-full bg-purple-600 transition-all rounded-full"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <button onClick={togglePlay} className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors">
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button onClick={toggleMute} className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors">
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <span className="text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <button onClick={enterFullscreen} className="p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors">
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：视频信息（浅灰色背景） */}
      <div className="w-80 bg-gray-100 flex flex-col overflow-y-auto">
        {/* 用户信息 */}
        <div className="p-4 border-b border-gray-300">
          <div className="flex items-center gap-3 mb-3">
            {video.avatar ? (
              <img
                src={video.avatar}
                alt={video.username}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white text-lg font-semibold">
                {video.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-base text-gray-900">{video.username}</p>
              <p className="text-sm text-gray-600">{formatNumber(video.viewsCount)}次观看</p>
            </div>
          </div>
          
          {/* 分隔线 */}
          <div className="h-px bg-gray-300 my-3"></div>
          
          {/* 标题 */}
          <h1 className="text-base font-semibold text-gray-900">{video.title}</h1>
        </div>

        {/* 点赞 */}
        <div className="p-4 border-b border-gray-300">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 transition-colors ${
              video.isLiked 
                ? 'text-red-500 hover:text-red-600' 
                : 'text-gray-700 hover:text-red-500'
            }`}
          >
            <Heart className={`w-5 h-5 ${video.isLiked ? 'fill-current' : ''}`} />
            <span className="text-base">{formatNumber(video.likesCount)}</span>
          </button>
        </div>

        {/* 相关视频 */}
        {relatedVideos.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">相关视频</h3>
            <div className="space-y-3">
              {relatedVideos.map((relatedVideo) => (
                <div
                  key={relatedVideo.id}
                  onClick={() => navigate(`/works/${relatedVideo.id}`)}
                  className="flex gap-3 cursor-pointer hover:bg-gray-200 p-2 rounded-lg transition-colors"
                >
                  <div className="relative w-24 h-32 bg-gray-300 rounded overflow-hidden flex-shrink-0">
                    {relatedVideo.thumbnailUrl && relatedVideo.thumbnailUrl.trim() !== '' ? (
                      <img
                        src={relatedVideo.thumbnailUrl}
                        alt={relatedVideo.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // 如果数据库中的缩略图加载失败，尝试提取视频首帧
                          const target = e.currentTarget
                          target.style.display = 'none'
                          if (relatedVideo.videoUrl && !relatedVideoThumbnails.get(relatedVideo.id)) {
                            extractVideoThumbnail(relatedVideo.id, relatedVideo.videoUrl)
                          }
                        }}
                      />
                    ) : relatedVideoThumbnails.get(relatedVideo.id) ? (
                      <img
                        src={relatedVideoThumbnails.get(relatedVideo.id)!}
                        alt={relatedVideo.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // 如果提取的缩略图也加载失败，显示占位符
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {relatedVideo.videoUrl && !relatedVideoThumbnails.get(relatedVideo.id) ? (
                          // 如果还没有尝试提取，显示加载状态
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <Play className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                      {relatedVideo.title}
                    </h4>
                    <p className="text-xs text-gray-600 truncate mb-1">{relatedVideo.username}</p>
                    <div className="text-xs text-gray-500">
                      <span>{formatNumber(relatedVideo.viewsCount)}次观看</span>
                      <span className="mx-1">•</span>
                      <span>{formatNumber(relatedVideo.likesCount)}点赞</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CommunityVideoDetail

