import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Heart, Play, ArrowLeft, ChevronUp, ChevronDown, Trash2, Plus, Download, Share2, MessageCircle } from 'lucide-react'
import { getCommunityVideos, toggleVideoLike, recordVideoView, deleteCommunityVideo, CommunityVideo } from '../services/api'
import { alertError, alertWarning } from '../utils/alert'
import { AuthService } from '../services/auth'
import { PublishVideoModal } from '../components/PublishVideoModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import HamsterLoader from '../components/HamsterLoader'

function WorksShowcase() {
  const navigate = useNavigate()
  const { videoId } = useParams<{ videoId: string }>()
  const [videos, setVideos] = useState<CommunityVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'likes'>('latest')
  const limit = 20
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null)
  const [deletingVideoId, setDeletingVideoId] = useState<number | null>(null)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [deleteConfirmState, setDeleteConfirmState] = useState<{ isOpen: boolean; videoId: number | null }>({ isOpen: false, videoId: null })
  const [showThumbnailList, setShowThumbnailList] = useState(false)
  
  // 防抖控制
  const lastSwitchTime = useRef<number>(0)
  const SWITCH_DEBOUNCE = 400 // 400ms 防抖

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setCurrentUser(user)
  }, [])

  const isAdmin = currentUser?.username === 'Chiefavefan' || currentUser?.username === 'jubian888'

  // 触摸滑动相关
  const touchStartY = useRef<number>(0)
  const touchStartX = useRef<number>(0)
  const touchEndY = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const isSwiping = useRef<boolean>(false)

  const loadVideos = async () => {
    try {
      setIsLoading(true)
      const result = await getCommunityVideos({ page, limit, sortBy })
      let loadedVideos = result.videos
      
      // 按时间升序排列：最早的在前面（index 0），最新的在后面
      loadedVideos = [...loadedVideos].sort((a, b) => {
        const dateA = new Date(a.publishedAt || a.createdAt)
        const dateB = new Date(b.publishedAt || b.createdAt)
        return dateA.getTime() - dateB.getTime()
      })
      
      setVideos(loadedVideos)
      setTotal(result.total)
      
      if (videoId) {
        const targetIndex = loadedVideos.findIndex(v => v.id === parseInt(videoId))
        if (targetIndex !== -1) {
          setCurrentVideoIndex(targetIndex)
        } else {
          setCurrentVideoIndex(loadedVideos.length - 1)
        }
      } else {
        setCurrentVideoIndex(loadedVideos.length - 1)
      }
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

  const handleDeleteVideo = async (videoId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAdmin) {
      alertWarning('您没有权限删除视频', '权限不足')
      return
    }
    setDeleteConfirmState({ isOpen: true, videoId })
  }

  const handleConfirmDelete = async () => {
    const videoId = deleteConfirmState.videoId
    if (!videoId) return
    try {
      setDeletingVideoId(videoId)
      await deleteCommunityVideo(videoId)
      loadVideos()
    } catch (error) {
      console.error('删除视频失败:', error)
      alertError(error instanceof Error ? error.message : '删除视频失败，请稍后重试', '错误')
    } finally {
      setDeletingVideoId(null)
      setDeleteConfirmState({ isOpen: false, videoId: null })
    }
  }

  useEffect(() => {
    loadVideos()
  }, [page, sortBy])

  useEffect(() => {
    const handleVideoUploaded = () => {
      loadVideos()
    }
    window.addEventListener('community-video-uploaded', handleVideoUploaded)
    return () => window.removeEventListener('community-video-uploaded', handleVideoUploaded)
  }, [])

  // 切换视频的核心函数
  const switchToVideo = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= videos.length || newIndex === currentVideoIndex) return
    
    // 防抖检查
    const now = Date.now()
    if (now - lastSwitchTime.current < SWITCH_DEBOUNCE) return
    lastSwitchTime.current = now
    
    // 暂停当前视频
    const currentVideo = videoRefs.current.get(videos[currentVideoIndex]?.id)
    if (currentVideo) {
      currentVideo.pause()
    }
    
    // 更新索引
    setCurrentVideoIndex(newIndex)
    
    // 播放新视频
    setTimeout(() => {
      const newVideo = videoRefs.current.get(videos[newIndex]?.id)
      if (newVideo) {
        newVideo.play().catch(() => {})
        recordVideoView(videos[newIndex].id)
      }
    }, 50)
  }, [videos, currentVideoIndex])

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
    isSwiping.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY
    touchEndX.current = e.touches[0].clientX
    const deltaY = Math.abs(touchEndY.current - touchStartY.current)
    const deltaX = Math.abs(touchEndX.current - touchStartX.current)
    if (deltaY > deltaX && deltaY > 10) {
      isSwiping.current = true
    }
  }

  const handleTouchEnd = () => {
    if (!isSwiping.current) return
    const deltaY = touchEndY.current - touchStartY.current
    const threshold = 50
    if (Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        switchToVideo(currentVideoIndex - 1)
      } else {
        switchToVideo(currentVideoIndex + 1)
      }
    }
    const deltaX = touchEndX.current - touchStartX.current
    if (deltaX > 100 && Math.abs(deltaY) < 50) {
      navigate('/works')
    }
  }

  const handleLike = async (videoId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!checkAuth()) {
      alertError('请先登录', '需要登录')
      navigate('/?showLogin=true')
      return
    }
    try {
      const result = await toggleVideoLike(videoId)
      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, likesCount: result.likesCount } : v
      ))
    } catch (error) {
      console.error('点赞失败:', error)
      alertError(error instanceof Error ? error.message : '点赞失败，请稍后重试', '错误')
    }
  }

  const checkAuth = () => !!localStorage.getItem('auth_token')

  const handleDownload = async (video: CommunityVideo, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!video.videoUrl) {
      alertError('视频地址不存在', '下载失败')
      return
    }
    try {
      const response = await fetch(video.videoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${video.title || '视频'}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      window.open(video.videoUrl, '_blank')
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
    return num.toString()
  }

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

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (videos.length === 0) return
      
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        switchToVideo(currentVideoIndex - 1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        switchToVideo(currentVideoIndex + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [switchToVideo, videos.length, currentVideoIndex])

  // 滚轮事件处理
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      if (videos.length === 0) return
      
      if (e.deltaY > 30) {
        switchToVideo(currentVideoIndex + 1)
      } else if (e.deltaY < -30) {
        switchToVideo(currentVideoIndex - 1)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    return () => window.removeEventListener('wheel', handleWheel, true)
  }, [switchToVideo, videos.length, currentVideoIndex])

  // 自动播放当前视频
  useEffect(() => {
    if (videos.length === 0 || currentVideoIndex < 0 || currentVideoIndex >= videos.length) return
    const video = videoRefs.current.get(videos[currentVideoIndex]?.id)
    if (video) {
      video.play().catch(() => {})
      recordVideoView(videos[currentVideoIndex].id)
    }
  }, [currentVideoIndex, videos])

  const currentVideo = videos[currentVideoIndex]

  return (
    <div 
      className="fixed inset-0 bg-black overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/works')}
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white"
      >
        <ArrowLeft size={20} />
      </button>

      {/* 排序选项 */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setShowPublishModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          <span>发布</span>
        </button>
        {['latest', 'popular', 'likes'].map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s as typeof sortBy)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === s ? 'bg-purple-600 text-white' : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
            }`}
          >
            {s === 'latest' ? '最新' : s === 'popular' ? '最热' : '最多点赞'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full">
          <HamsterLoader size={10} />
          <p className="mt-4 text-white">加载中...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-white">
          <p className="text-lg">暂无视频</p>
          <p className="text-sm mt-2 opacity-70">还没有用户发布视频到社区</p>
        </div>
      ) : currentVideo && (
        <div className="h-full w-full relative flex items-center justify-center">
          {/* 视频 */}
          {currentVideo.videoUrl ? (
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(currentVideo.id, el)
              }}
              key={currentVideo.id}
              src={currentVideo.videoUrl}
              className="w-full h-full object-contain"
              muted
              loop
              playsInline
              autoPlay
            />
          ) : currentVideo.thumbnailUrl ? (
            <img src={currentVideo.thumbnailUrl} alt={currentVideo.title} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <Play className="w-16 h-16 text-white opacity-50" />
            </div>
          )}

          {/* 管理员删除按钮 */}
          {isAdmin && (
            <button
              onClick={(e) => handleDeleteVideo(currentVideo.id, e)}
              disabled={deletingVideoId === currentVideo.id}
              className="absolute top-20 right-4 w-10 h-10 bg-red-500 bg-opacity-80 hover:bg-opacity-100 rounded-lg flex items-center justify-center text-white z-20"
            >
              {deletingVideoId === currentVideo.id ? <HamsterLoader size={3} /> : <Trash2 size={18} />}
            </button>
          )}

          {/* 右侧操作栏 */}
          <div className="absolute right-4 bottom-20 flex flex-col items-center gap-4 z-30">
            <div className="relative">
              {currentVideo.avatar ? (
                <img src={currentVideo.avatar} alt={currentVideo.username} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white text-lg font-medium border-2 border-white shadow-lg">
                  {currentVideo.username.charAt(0).toUpperCase()}
                </div>
              )}
              <button className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-lg font-bold">+</button>
            </div>
            <button onClick={(e) => handleLike(currentVideo.id, e)} className="flex flex-col items-center gap-1 text-white">
              <div className="w-12 h-12 bg-black bg-opacity-30 rounded-full flex items-center justify-center hover:bg-opacity-50">
                <Heart className={`w-6 h-6 ${currentVideo.isLiked ? 'fill-current text-red-500' : ''}`} />
              </div>
              <span className="text-xs">{formatNumber(currentVideo.likesCount)}</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-white">
              <div className="w-12 h-12 bg-black bg-opacity-30 rounded-full flex items-center justify-center hover:bg-opacity-50">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-xs">0</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-white">
              <div className="w-12 h-12 bg-black bg-opacity-30 rounded-full flex items-center justify-center hover:bg-opacity-50">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-xs">分享</span>
            </button>
            <button onClick={(e) => handleDownload(currentVideo, e)} className="flex flex-col items-center gap-1 text-white">
              <div className="w-12 h-12 bg-black bg-opacity-30 rounded-full flex items-center justify-center hover:bg-opacity-50">
                <Download className="w-6 h-6" />
              </div>
              <span className="text-xs">下载</span>
            </button>
          </div>

          {/* 底部信息栏 */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm font-medium">@{currentVideo.username}</span>
              <div className="flex items-center gap-4 text-white text-xs">
                <span>{formatNumber(currentVideo.viewsCount)} 次观看</span>
                <span>{formatTime(currentVideo.publishedAt)}</span>
              </div>
            </div>
            <p className="text-white text-sm mb-2 line-clamp-2">{currentVideo.title}</p>
            {currentVideo.model && (
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-white/20 rounded text-xs text-white/90">{currentVideo.model}</span>
                {currentVideo.duration && <span className="px-2 py-1 bg-white/20 rounded text-xs text-white/90">{currentVideo.duration}s</span>}
                {currentVideo.resolution && <span className="px-2 py-1 bg-white/20 rounded text-xs text-white/90">{currentVideo.resolution}</span>}
              </div>
            )}
          </div>

          {/* 左侧导航指示器 - 悬停显示缩略图 */}
          <div 
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30"
            onMouseEnter={() => setShowThumbnailList(true)}
            onMouseLeave={() => setShowThumbnailList(false)}
          >
            {/* 缩略图列表 */}
            {showThumbnailList && (
              <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-sm rounded-lg p-3 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/30">
                <div className="flex flex-col gap-3 w-32">
                  {videos.map((v, idx) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        // 点击时跳过防抖直接切换
                        lastSwitchTime.current = 0
                        switchToVideo(idx)
                      }}
                      className={`relative w-full aspect-video rounded-lg overflow-hidden transition-all ${
                        idx === currentVideoIndex 
                          ? 'ring-2 ring-purple-500 scale-105 shadow-lg shadow-purple-500/30' 
                          : 'opacity-80 hover:opacity-100 hover:scale-102'
                      }`}
                    >
                      {/* 优先使用 thumbnailUrl，否则用 video 元素显示首帧 */}
                      {v.thumbnailUrl ? (
                        <img 
                          src={v.thumbnailUrl} 
                          alt={v.title} 
                          className="w-full h-full object-cover bg-gray-800"
                          onError={(e) => {
                            // 图片加载失败时隐藏
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : v.videoUrl ? (
                        <video 
                          src={v.videoUrl} 
                          className="w-full h-full object-cover bg-gray-800"
                          muted
                          preload="metadata"
                          onLoadedMetadata={(e) => {
                            // 视频加载后跳到第一帧
                            e.currentTarget.currentTime = 0.1
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <Play size={16} className="text-white/50" />
                        </div>
                      )}
                      
                      {/* 底部标题 */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                        <p className="text-white text-[11px] truncate font-medium">
                          {idx + 1}. {v.title || '无标题'}
                        </p>
                      </div>
                      
                      {/* 当前播放指示 */}
                      {idx === currentVideoIndex && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                            <Play size={12} className="text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 主导航 */}
            <div className="flex flex-col items-center gap-2">
              {currentVideoIndex > 0 && (
                <button onClick={() => switchToVideo(currentVideoIndex - 1)} className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70">
                  <ChevronUp size={20} />
                </button>
              )}
              <div className="flex flex-col items-center gap-1 cursor-pointer" title="悬停查看所有视频">
                <span className="text-white text-xs">{currentVideoIndex + 1}</span>
                <div className="w-1 h-8 bg-white/30 rounded-full overflow-hidden">
                  <div className="w-full bg-white rounded-full transition-all duration-300" style={{ height: `${((currentVideoIndex + 1) / videos.length) * 100}%` }} />
                </div>
                <span className="text-white text-xs">{videos.length}</span>
              </div>
              {currentVideoIndex < videos.length - 1 && (
                <button onClick={() => switchToVideo(currentVideoIndex + 1)} className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70">
                  <ChevronDown size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <PublishVideoModal isOpen={showPublishModal} onClose={() => setShowPublishModal(false)} onSuccess={() => { loadVideos(); window.dispatchEvent(new CustomEvent('community-video-uploaded')) }} />
      <DeleteConfirmModal isOpen={deleteConfirmState.isOpen} onClose={() => setDeleteConfirmState({ isOpen: false, videoId: null })} onConfirm={handleConfirmDelete} message="确定要删除/下架这个视频吗？此操作不可恢复。" />
    </div>
  )
}

export default WorksShowcase
