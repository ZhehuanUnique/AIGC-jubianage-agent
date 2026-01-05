import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Play, ArrowLeft, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'
import { getCommunityVideos, toggleVideoLike, recordVideoView, deleteCommunityVideo, CommunityVideo } from '../services/api'
import { alertError, alertSuccess, alertWarning } from '../utils/alert'
import { AuthService } from '../services/auth'
import NavigationBar from '../components/NavigationBar'
import { PublishVideoModal } from '../components/PublishVideoModal'

function WorksShowcase() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<CommunityVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'likes'>('latest')
  const limit = 20
  const [hoveredVideoId, setHoveredVideoId] = useState<number | null>(null)
  const [videoAspectRatios, setVideoAspectRatios] = useState<Map<number, number>>(new Map())
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null)
  const [deletingVideoId, setDeletingVideoId] = useState<number | null>(null)
  const [showPublishModal, setShowPublishModal] = useState(false)

  // 检查用户权限
  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setCurrentUser(user)
  }, [])

  const isAdmin = currentUser?.username === 'Chiefavefan' || currentUser?.username === 'jubian888'

  // 检测是否为移动设备
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  // 触摸滑动相关
  const touchStartY = useRef<number>(0)
  const touchStartX = useRef<number>(0)
  const touchEndY = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const isSwiping = useRef<boolean>(false)

  // 加载视频列表
  const loadVideos = async () => {
    try {
      setIsLoading(true)
      const result = await getCommunityVideos({ page, limit, sortBy })
      setVideos(result.videos)
      setTotal(result.total)
    } catch (error) {
      console.error('加载视频失败:', error)
      const errorMessage = error instanceof Error ? error.message : '加载视频失败，请稍后重试'
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
        setVideos([])
        setTotal(0)
      } else {
        alertError(errorMessage, '错误')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 删除/下架视频（仅管理员）
  const handleDeleteVideo = async (videoId: number, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止触发卡片的点击事件
    
    if (!isAdmin) {
      alertWarning('您没有权限删除视频', '权限不足')
      return
    }

    if (!window.confirm('确定要删除/下架这个视频吗？此操作不可恢复。')) {
      return
    }

    try {
      setDeletingVideoId(videoId)
      await deleteCommunityVideo(videoId)
      alertSuccess('视频已成功删除/下架', '成功')
      // 刷新视频列表
      loadVideos()
    } catch (error) {
      console.error('删除视频失败:', error)
      alertError(error instanceof Error ? error.message : '删除视频失败，请稍后重试', '错误')
    } finally {
      setDeletingVideoId(null)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [page, sortBy])

  // 监听社区视频上传事件，自动刷新
  useEffect(() => {
    const handleVideoUploaded = () => {
      console.log('📢 收到社区视频上传事件，刷新视频列表')
      loadVideos()
    }
    
    window.addEventListener('community-video-uploaded', handleVideoUploaded)
    return () => {
      window.removeEventListener('community-video-uploaded', handleVideoUploaded)
    }
  }, [])

  // 切换到指定视频
  const switchToVideo = (index: number) => {
    if (index < 0 || index >= videos.length) return
    
    // 暂停当前视频
    const currentVideo = videoRefs.current.get(videos[currentVideoIndex]?.id)
    if (currentVideo) {
      currentVideo.pause()
    }

    setCurrentVideoIndex(index)
    
    // 播放新视频
    setTimeout(() => {
      const newVideo = videoRefs.current.get(videos[index]?.id)
      if (newVideo) {
        newVideo.play().catch(() => {})
        recordVideoView(videos[index].id)
      }
    }, 100)
  }

  // 触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
    isSwiping.current = false
  }

  // 触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY
    touchEndX.current = e.touches[0].clientX
    
    const deltaY = Math.abs(touchEndY.current - touchStartY.current)
    const deltaX = Math.abs(touchEndX.current - touchStartX.current)
    
    // 判断是垂直滑动还是水平滑动
    if (deltaY > deltaX && deltaY > 10) {
      isSwiping.current = true
    }
  }

  // 触摸结束
  const handleTouchEnd = () => {
    if (!isSwiping.current) return
    
    const deltaY = touchEndY.current - touchStartY.current
    const threshold = 50 // 滑动阈值

    if (Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        // 向下滑动，切换到上一个视频
        switchToVideo(currentVideoIndex - 1)
      } else {
        // 向上滑动，切换到下一个视频
        switchToVideo(currentVideoIndex + 1)
      }
    }

    // 左滑返回（水平滑动）
    const deltaX = touchEndX.current - touchStartX.current
    if (deltaX > 100 && Math.abs(deltaY) < 50) {
      navigate('/')
    }
  }

  // 检查是否登录
  const checkAuth = () => {
    const token = localStorage.getItem('auth_token')
    return !!token
  }

  // 处理点赞
  const handleLike = async (videoId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!checkAuth()) {
      alertError('请先登录', '需要登录')
      navigate('/login')
      return
    }

    try {
      const result = await toggleVideoLike(videoId)
      setVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { ...v, likesCount: result.likesCount }
          : v
      ))
    } catch (error) {
      console.error('点赞失败:', error)
      alertError(error instanceof Error ? error.message : '点赞失败，请稍后重试', '错误')
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

  // 键盘导航（桌面端）
  useEffect(() => {
    if (isMobile) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        switchToVideo(currentVideoIndex - 1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        switchToVideo(currentVideoIndex + 1)
      } else if (e.key === 'Enter' && videos[currentVideoIndex]) {
        navigate(`/works/${videos[currentVideoIndex].id}`)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentVideoIndex, videos, navigate, isMobile])

  // 滚轮导航（桌面端）
  useEffect(() => {
    if (isMobile) return

    const handleWheel = (e: WheelEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return

      e.preventDefault()
      const direction = e.deltaY > 0 ? 1 : -1
      switchToVideo(currentVideoIndex + direction)
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [currentVideoIndex, videos, isMobile])

  // 自动播放当前视频
  useEffect(() => {
    if (videos.length === 0 || currentVideoIndex < 0 || currentVideoIndex >= videos.length) return

    const video = videoRefs.current.get(videos[currentVideoIndex]?.id)
    if (video) {
      video.play().catch(() => {})
      recordVideoView(videos[currentVideoIndex].id)
    }
  }, [currentVideoIndex, videos])

  // 移动端全屏垂直滚动模式
  if (isMobile) {
    return (
      <div 
        className="fixed inset-0 bg-black overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 返回按钮 */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-50 w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white touch-manipulation"
        >
          <ArrowLeft size={20} />
        </button>

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <p className="text-lg">暂无视频</p>
            <p className="text-sm mt-2 opacity-70">还没有用户发布视频到社区</p>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="h-full overflow-y-scroll snap-y snap-mandatory"
            style={{ scrollSnapType: 'y mandatory' }}
          >
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="h-screen w-screen snap-start relative flex items-center justify-center"
              >
                {/* 视频 */}
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
                    className="w-full h-full object-contain"
                    muted
                    loop
                    playsInline
                    autoPlay={index === currentVideoIndex}
                  />
                ) : video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <Play className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}

                {/* 视频信息覆盖层（右下角） */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {video.avatar ? (
                        <img
                          src={video.avatar}
                          alt={video.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs">
                          {video.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-white text-sm font-medium">{video.username}</span>
                    </div>
                  </div>
                  
                  <p className="text-white text-sm mb-2 line-clamp-2">{video.title}</p>
                  
                  <div className="flex items-center gap-4 text-white text-xs">
                    <button
                      onClick={(e) => handleLike(video.id, e)}
                      className="flex items-center gap-1"
                    >
                      <Heart className="w-5 h-5" />
                      <span>{formatNumber(video.likesCount)}</span>
                    </button>
                    <span>{formatNumber(video.viewsCount)} 次观看</span>
                    <span>{formatTime(video.publishedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 桌面端网格模式
  return (
    <div className="min-h-screen bg-white">
      <NavigationBar activeTab="works" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* 头部：排序选项 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">作品展示</h1>
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Plus size={18} />
              <span>发布作品</span>
            </button>
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {videos.map((video, index) => {
              const aspectRatio = videoAspectRatios.get(video.id)
              const isPortrait = aspectRatio !== undefined && aspectRatio < 1
              
              return (
                <div
                  key={video.id}
                  id={`video-${video.id}`}
                  className="group relative bg-white rounded-lg overflow-hidden cursor-pointer transition-all"
                  onMouseEnter={() => {
                    setHoveredVideoId(video.id)
                    if (window.innerWidth >= 640) {
                      const videoEl = videoRefs.current.get(video.id)
                      if (videoEl) {
                        videoEl.play().catch(() => {})
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredVideoId(null)
                    if (window.innerWidth >= 640) {
                      const videoEl = videoRefs.current.get(video.id)
                      if (videoEl) {
                        videoEl.pause()
                        videoEl.currentTime = 0
                      }
                    }
                  }}
                  onClick={() => {
                    recordVideoView(video.id)
                    navigate(`/works/${video.id}`)
                  }}
                >
                  {/* 视频容器 - 根据宽高比自适应 */}
                  <div 
                    className={`relative bg-gray-100 overflow-hidden ${
                      isPortrait 
                        ? 'aspect-[9/16]' 
                        : 'aspect-video'
                    }`}
                  >
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
                        onLoadedMetadata={(e) => {
                          const videoEl = e.currentTarget
                          const ratio = videoEl.videoWidth / videoEl.videoHeight
                          setVideoAspectRatios(prev => new Map(prev).set(video.id, ratio))
                        }}
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
                    
                    {/* 悬停时显示的磨砂质感覆盖层（图3样式） */}
                    {hoveredVideoId === video.id && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex flex-col justify-end p-4 transition-all animate-fadeIn">
                        {/* 管理员删除按钮（右上角） */}
                        {isAdmin && (
                          <button
                            onClick={(e) => handleDeleteVideo(video.id, e)}
                            disabled={deletingVideoId === video.id}
                            className="absolute top-4 right-4 w-10 h-10 bg-red-500 bg-opacity-80 hover:bg-opacity-100 rounded-lg flex items-center justify-center text-white transition-all shadow-lg z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="删除/下架视频"
                          >
                            {deletingVideoId === video.id ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        )}
                        
                        {/* 底部操作栏 - 磨砂质感（更强烈的磨砂效果） */}
                        <div 
                          className="bg-white bg-opacity-25 backdrop-blur-xl rounded-lg p-3 border border-white border-opacity-40 shadow-lg"
                          style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(20px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                          }}
                        >
                          {/* 使用模板按钮 */}
                          <div className="flex items-center gap-2 mb-3">
                            <button 
                              className="flex-1 bg-white bg-opacity-40 backdrop-blur-md rounded-lg px-4 py-2.5 text-white text-sm font-medium hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
                              style={{
                                background: 'rgba(255, 255, 255, 0.3)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                              }}
                            >
                              <span className="text-base">⭐</span>
                              <span>使用模板</span>
                            </button>
                            <button 
                              className="w-11 h-11 bg-white bg-opacity-30 backdrop-blur-md rounded-lg flex items-center justify-center text-white hover:bg-opacity-40 transition-all shadow-md"
                              style={{
                                background: 'rgba(255, 255, 255, 0.25)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                              }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            <button 
                              className="w-11 h-11 bg-white bg-opacity-30 backdrop-blur-md rounded-lg flex items-center justify-center text-white hover:bg-opacity-40 transition-all shadow-md"
                              style={{
                                background: 'rgba(255, 255, 255, 0.25)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                              }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            </button>
                            <button 
                              className="w-11 h-11 bg-white bg-opacity-30 backdrop-blur-md rounded-lg flex items-center justify-center text-white hover:bg-opacity-40 transition-all shadow-md"
                              style={{
                                background: 'rgba(255, 255, 255, 0.25)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                              }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                          </div>
                          
                          {/* 视频描述 */}
                          <div className="text-white">
                            <p className="font-medium text-sm mb-1">{video.title}</p>
                            {video.description && (
                              <p className="text-xs text-white text-opacity-90 line-clamp-2 mb-2">{video.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-white text-opacity-80">
                              <span>00:{Math.floor((video.duration || 0) / 10).toString().padStart(2, '0')}</span>
                              <span className="px-2 py-0.5 bg-white bg-opacity-20 rounded">模板</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 视频信息 - 默认显示（图2样式） */}
                  <div className="p-3 bg-white">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-1">
                      {video.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 mb-2">
                      {video.avatar ? (
                        <img
                          src={video.avatar}
                          alt={video.username}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs">
                          {video.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-gray-600 truncate">{video.username}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <button
                        onClick={(e) => handleLike(video.id, e)}
                        className="flex items-center gap-1 hover:text-red-500 transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                        <span>{formatNumber(video.likesCount)}</span>
                      </button>
                      <span>{formatNumber(video.viewsCount)}次观看</span>
                      <span className="ml-auto">{formatTime(video.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
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

      {/* 发布作品模态框 */}
      <PublishVideoModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onSuccess={() => {
          loadVideos()
          window.dispatchEvent(new CustomEvent('community-video-uploaded'))
        }}
      />
    </div>
  )
}

export default WorksShowcase
