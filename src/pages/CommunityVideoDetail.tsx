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

  const handleLike = async () => {
    if (!video) return
    try {
      const result = await toggleVideoLike(video.id)
      setVideo(prev => prev ? { ...prev, likesCount: result.likesCount } : null)
    } catch (error) {
      console.error('点赞失败:', error)
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">视频不存在</p>
          <button
            onClick={() => navigate('/works')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            返回作品展示
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <NavigationBar activeTab="works" />
      
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        {/* 左侧：视频播放器 */}
        <div className="flex-1 flex flex-col bg-gray-900 order-2 lg:order-1">
          {/* 返回按钮 */}
          <div className="p-2 sm:p-4">
            <button
              onClick={() => navigate('/works')}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg active:bg-purple-700 sm:hover:bg-purple-700 flex items-center gap-2 touch-manipulation text-sm sm:text-base"
            >
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
              返回
            </button>
          </div>

          {/* 视频播放器 */}
          <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
            <div className="relative w-full max-w-4xl" style={{ aspectRatio: '9/16' }}>
              <video
                ref={videoRef}
                src={video.videoUrl}
                className="w-full h-full object-contain rounded-lg"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration)
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />

              {/* 播放控制覆盖层 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 sm:hover:opacity-100 transition-opacity bg-black bg-opacity-30 rounded-lg">
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 sm:w-16 sm:h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center active:bg-opacity-100 sm:hover:bg-opacity-100 transition-all touch-manipulation"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 sm:w-8 sm:h-8 text-gray-900" />
                  ) : (
                    <Play className="w-7 h-7 sm:w-8 sm:h-8 text-gray-900 ml-0.5 sm:ml-1" />
                  )}
                </button>
              </div>

              {/* 进度条 */}
              <div
                ref={progressBarRef}
                onClick={handleProgressClick}
                className="absolute bottom-0 left-0 right-0 h-2 bg-gray-700 bg-opacity-50 cursor-pointer rounded-b-lg"
              >
                <div
                  className="h-full bg-purple-600 transition-all"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              {/* 控制按钮 */}
              <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-1 sm:gap-2">
                  <button onClick={togglePlay} className="p-1.5 sm:p-2 active:bg-white active:bg-opacity-20 sm:hover:bg-white sm:hover:bg-opacity-20 rounded touch-manipulation">
                    {isPlaying ? <Pause size={18} className="sm:w-5 sm:h-5" /> : <Play size={18} className="sm:w-5 sm:h-5" />}
                  </button>
                  <button onClick={toggleMute} className="p-1.5 sm:p-2 active:bg-white active:bg-opacity-20 sm:hover:bg-white sm:hover:bg-opacity-20 rounded touch-manipulation">
                    {isMuted ? <VolumeX size={18} className="sm:w-5 sm:h-5" /> : <Volume2 size={18} className="sm:w-5 sm:h-5" />}
                  </button>
                  <span className="text-xs sm:text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <button onClick={enterFullscreen} className="p-1.5 sm:p-2 active:bg-white active:bg-opacity-20 sm:hover:bg-white sm:hover:bg-opacity-20 rounded touch-manipulation">
                  <Maximize size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：视频信息 */}
        <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col order-1 lg:order-2 max-h-[40vh] lg:max-h-none overflow-y-auto">
          {/* 用户信息 */}
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              {video.avatar ? (
                <img
                  src={video.avatar}
                  alt={video.username}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-600 flex items-center justify-center text-white text-base sm:text-lg font-semibold">
                  {video.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">{video.username}</p>
                <p className="text-xs sm:text-sm text-gray-500">{formatNumber(video.viewsCount)} 次观看</p>
              </div>
            </div>
            
            {/* 标题和描述 */}
            <h1 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2 line-clamp-2">{video.title}</h1>
            {video.description && (
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 sm:line-clamp-3">{video.description}</p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <button
              onClick={handleLike}
              className="w-full px-4 py-2.5 sm:py-2 bg-gray-100 active:bg-gray-200 sm:hover:bg-gray-200 rounded-lg flex items-center justify-center gap-2 transition-colors touch-manipulation text-sm sm:text-base"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{formatNumber(video.likesCount)}</span>
            </button>
          </div>

          {/* 相关视频 */}
          {relatedVideos.length > 0 && (
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">相关视频</h3>
              <div className="space-y-2 sm:space-y-3">
                {relatedVideos.map((relatedVideo) => (
                  <div
                    key={relatedVideo.id}
                    onClick={() => navigate(`/works/${relatedVideo.id}`)}
                    className="flex gap-2 sm:gap-3 cursor-pointer active:bg-gray-50 sm:hover:bg-gray-50 p-2 rounded-lg transition-colors touch-manipulation"
                  >
                    <div className="relative w-20 h-28 sm:w-24 sm:h-32 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                      {relatedVideo.thumbnailUrl ? (
                        <img
                          src={relatedVideo.thumbnailUrl}
                          alt={relatedVideo.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 mb-0.5 sm:mb-1">
                        {relatedVideo.title}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 truncate">{relatedVideo.username}</p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-500">
                        <span>{formatNumber(relatedVideo.viewsCount)} 次观看</span>
                        <span>•</span>
                        <span>{formatNumber(relatedVideo.likesCount)} 点赞</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommunityVideoDetail

