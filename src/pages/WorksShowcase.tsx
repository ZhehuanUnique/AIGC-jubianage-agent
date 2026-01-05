import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Play, ChevronUp, ChevronDown } from 'lucide-react'
import { getCommunityVideos, toggleVideoLike, recordVideoView, CommunityVideo } from '../services/api'
import { alertError } from '../utils/alert'
import NavigationBar from '../components/NavigationBar'

function WorksShowcase() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<CommunityVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredVideoId, setHoveredVideoId] = useState<number | null>(null)
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null)
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'likes'>('latest')
  const limit = 20

  // 加载视频列表
  const loadVideos = async () => {
    try {
      setIsLoading(true)
      const result = await getCommunityVideos({ page, limit, sortBy })
      setVideos(result.videos)
      setTotal(result.total)
    } catch (error) {
      console.error('加载视频失败:', error)
      // 如果是数据库表不存在的错误，不显示错误提示，只显示"暂无视频"
      const errorMessage = error instanceof Error ? error.message : '加载视频失败，请稍后重试'
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
        // 表不存在时，只设置空列表，不显示错误提示
        setVideos([])
        setTotal(0)
      } else {
        alertError(errorMessage, '错误')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [page, sortBy])

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedVideoIndex === null) return

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const direction = e.key === 'ArrowUp' ? -1 : 1
        const newIndex = selectedVideoIndex + direction
        
        if (newIndex >= 0 && newIndex < videos.length) {
          setSelectedVideoIndex(newIndex)
          // 滚动到选中的视频
          const videoElement = document.getElementById(`video-${videos[newIndex].id}`)
          if (videoElement) {
            videoElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      } else if (e.key === 'Escape') {
        setSelectedVideoIndex(null)
      } else if (e.key === 'Enter' && selectedVideoIndex !== null) {
        navigate(`/works/${videos[selectedVideoIndex].id}`)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedVideoIndex, videos, navigate])

  // 滚轮导航
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (selectedVideoIndex === null) return
      if (!containerRef.current?.contains(e.target as Node)) return

      e.preventDefault()
      const direction = e.deltaY > 0 ? 1 : -1
      const newIndex = selectedVideoIndex + direction
      
      if (newIndex >= 0 && newIndex < videos.length) {
        setSelectedVideoIndex(newIndex)
        const videoElement = document.getElementById(`video-${videos[newIndex].id}`)
        if (videoElement) {
          videoElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }

    if (selectedVideoIndex !== null) {
      window.addEventListener('wheel', handleWheel, { passive: false })
      return () => window.removeEventListener('wheel', handleWheel)
    }
  }, [selectedVideoIndex, videos])

  // 处理点赞
  const handleLike = async (videoId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const result = await toggleVideoLike(videoId)
      setVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { ...v, likesCount: result.likesCount }
          : v
      ))
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`
    }
    return num.toString()
  }

  // 格式化时间
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    if (days < 365) return `${Math.floor(days / 30)}个月前`
    return `${Math.floor(days / 365)}年前`
  }

  return (
    <div className="min-h-screen bg-white">
      <NavigationBar activeTab="works" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* 头部：排序选项 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">作品展示</h1>
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              onClick={() => setSortBy('latest')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                sortBy === 'latest'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              最新
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                sortBy === 'popular'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              最热
            </button>
            <button
              onClick={() => setSortBy('likes')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                sortBy === 'likes'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              最多点赞
            </button>
          </div>
        </div>

        {/* 视频网格 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">暂无视频</p>
            <p className="text-sm mt-2">还没有用户发布视频到社区</p>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            {videos.map((video, index) => (
              <div
                key={video.id}
                id={`video-${video.id}`}
                className={`group relative bg-white rounded-lg sm:rounded-xl shadow-sm sm:hover:shadow-xl transition-all cursor-pointer touch-manipulation ${
                  selectedVideoIndex === index ? 'ring-2 ring-purple-600 sm:scale-105' : ''
                }`}
                onMouseEnter={() => {
                  // 桌面端悬停播放
                  if (window.innerWidth >= 640) {
                    setHoveredVideoId(video.id)
                    const videoEl = videoRefs.current.get(video.id)
                    if (videoEl) {
                      videoEl.play().catch(() => {})
                    }
                  }
                }}
                onMouseLeave={() => {
                  // 桌面端离开暂停
                  if (window.innerWidth >= 640) {
                    setHoveredVideoId(null)
                    const videoEl = videoRefs.current.get(video.id)
                    if (videoEl) {
                      videoEl.pause()
                      videoEl.currentTime = 0
                    }
                  }
                }}
                onTouchStart={() => {
                  // 移动端触摸时播放预览
                  setHoveredVideoId(video.id)
                  const videoEl = videoRefs.current.get(video.id)
                  if (videoEl) {
                    videoEl.play().catch(() => {})
                  }
                }}
                onTouchEnd={() => {
                  // 移动端触摸结束时暂停
                  setTimeout(() => {
                    setHoveredVideoId(null)
                    const videoEl = videoRefs.current.get(video.id)
                    if (videoEl) {
                      videoEl.pause()
                      videoEl.currentTime = 0
                    }
                  }, 500)
                }}
                onClick={() => {
                  recordVideoView(video.id)
                  navigate(`/works/${video.id}`)
                }}
              >
                {/* 视频容器 */}
                <div className="relative aspect-video bg-gray-100 rounded-t-xl overflow-hidden">
                  {video.videoUrl ? (
                    <video
                      ref={(el) => {
                        if (el) {
                          videoRefs.current.set(video.id, el)
                        } else {
                          videoRefs.current.delete(video.id)
                        }
                      }}
                      src={video.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      preload="metadata"
                      playsInline
                    />
                  ) : video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Play className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* 播放按钮覆盖层 */}
                  {hoveredVideoId !== video.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity">
                      <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>

                {/* 视频信息 - 一比一复刻图1的UI样式 */}
                <div className="p-2 sm:p-3">
                  {/* 标题 */}
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5 sm:mb-2">
                    {video.title}
                  </h3>
                  
                  {/* 用户信息 */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    {video.avatar ? (
                      <img
                        src={video.avatar}
                        alt={video.username}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-[10px] sm:text-xs">
                        {video.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10px] sm:text-xs text-gray-600 truncate">{video.username}</span>
                  </div>

                  {/* 统计信息 */}
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={(e) => handleLike(video.id, e)}
                        className="flex items-center gap-0.5 sm:gap-1 active:text-red-500 sm:hover:text-red-500 transition-colors touch-manipulation"
                      >
                        <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{formatNumber(video.likesCount)}</span>
                      </button>
                      <span className="hidden sm:inline">{formatNumber(video.viewsCount)} 次观看</span>
                      <span className="sm:hidden">{formatNumber(video.viewsCount)}</span>
                    </div>
                    <span className="truncate ml-1">{formatTime(video.publishedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {total > limit && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <span className="px-4 py-1 text-sm text-gray-700">
              第 {page} 页，共 {Math.ceil(total / limit)} 页
            </span>
            <button
              onClick={() => setPage(prev => Math.min(Math.ceil(total / limit), prev + 1))}
              disabled={page >= Math.ceil(total / limit)}
              className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorksShowcase

