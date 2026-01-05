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
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null)
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
      
      // 加载相关视频
      const related = await getCommunityVideos({ page: 1, limit: 10, sortBy: 'latest' })
      setRelatedVideos(related.videos.filter(v => v.id !== videoData.id).slice(0, 5))
    } catch (error) {
      console.error('加载视频失败:', error)
      alertError(error instanceof Error ? error.message : '加载视频失败，请稍后重试', '错误')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVideo()
  }, [videoId])

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const currentIndex = relatedVideos.findIndex(v => v.id === video?.id)
        if (currentIndex === -1) return
        
        const direction = e.key === 'ArrowUp' ? -1 : 1
        const newIndex = currentIndex + direction
        
        if (newIndex >= 0 && newIndex < relatedVideos.length) {
          navigate(`/works/${relatedVideos[newIndex].id}`)
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
  }, [relatedVideos, video, isFullscreen, navigate])

  // 滚轮导航
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (relatedVideos.length === 0) return
      
      const currentIndex = relatedVideos.findIndex(v => v.id === video?.id)
      if (currentIndex === -1) return
      
      e.preventDefault()
      const direction = e.deltaY > 0 ? 1 : -1
      const newIndex = currentIndex + direction
      
      if (newIndex >= 0 && newIndex < relatedVideos.length) {
        navigate(`/works/${relatedVideos[newIndex].id}`)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [relatedVideos, video, navigate])

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
      navigate('/login')
      return
    }

    try {
      const result = await toggleVideoLike(video.id)
      setVideo(prev => prev ? { ...prev, likesCount: result.likesCount } : null)
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
            className="flex items-center gap-2 text-gray-700 hover:text-red-500 transition-colors"
          >
            <Heart className="w-5 h-5" />
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
                    {relatedVideo.thumbnailUrl ? (
                      <img
                        src={relatedVideo.thumbnailUrl}
                        alt={relatedVideo.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-gray-400" />
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

