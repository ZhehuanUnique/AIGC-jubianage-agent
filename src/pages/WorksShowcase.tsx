import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Heart, Play, ArrowLeft, ChevronUp, ChevronDown, Trash2, Plus, Sparkles, Download, Share2, MoreVertical, Link, AlertTriangle, MessageCircle } from 'lucide-react'
import { getCommunityVideos, toggleVideoLike, recordVideoView, deleteCommunityVideo, CommunityVideo } from '../services/api'
import { alertError, alertSuccess, alertWarning } from '../utils/alert'
import { AuthService } from '../services/auth'
import NavigationBar from '../components/NavigationBar'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'likes'>('latest')
  const limit = 20
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null)
  const [deletingVideoId, setDeletingVideoId] = useState<number | null>(null)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [deleteConfirmState, setDeleteConfirmState] = useState<{ isOpen: boolean; videoId: number | null }>({ isOpen: false, videoId: null })

  // 检查用户权限
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

  // 加载视频列表
  const loadVideos = async () => {
    try {
      setIsLoading(true)
      const result = await getCommunityVideos({ page, limit, sortBy })
      let loadedVideos = result.videos
      
      // 尝试从本地存储恢复排序
      const savedOrder = localStorage.getItem('worksShowcaseOrder')
      if (savedOrder) {
        try {
          const sortedIds = JSON.parse(savedOrder) as number[]
          // 按照保存的顺序重新排列
          const sortedVideos = sortedIds
            .map(id => loadedVideos.find(v => v.id === id))
            .filter((v): v is CommunityVideo => v !== undefined)
          // 添加不在排序列表中的新视频
          const existingIds = new Set(sortedIds)
          const newVideos = loadedVideos.filter(v => !existingIds.has(v.id))
          loadedVideos = [...sortedVideos, ...newVideos]
        } catch (e) {
          console.error('恢复排序失败:', e)
        }
      }
      
      setVideos(loadedVideos)
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

    // 显示删除确认对话框
    setDeleteConfirmState({ isOpen: true, videoId })
  }

  // 确认删除视频
  const handleConfirmDelete = async () => {
    const videoId = deleteConfirmState.videoId
    if (!videoId) return

    try {
      setDeletingVideoId(videoId)
      await deleteCommunityVideo(videoId)
      // alertSuccess('视频已成功删除/下架', '成功') // 已移除成功提示框
      // 刷新视频列表
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

  // 当视频加载完成后，定位到指定的视频
  useEffect(() => {
    if (videoId && videos.length > 0) {
      const targetIndex = videos.findIndex(v => v.id === parseInt(videoId))
      if (targetIndex !== -1 && targetIndex !== currentVideoIndex) {
        setCurrentVideoIndex(targetIndex)
      }
    }
  }, [videoId, videos])

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

  // 处理点赞
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
        v.id === videoId 
          ? { ...v, likesCount: result.likesCount }
          : v
      ))
    } catch (error) {
      console.error('点赞失败:', error)
      alertError(error instanceof Error ? error.message : '点赞失败，请稍后重试', '错误')
    }
  }

  // 检查是否登录
  const checkAuth = () => {
    const token = localStorage.getItem('auth_token')
    return !!token
  }

  // 处理下载视频
  const handleDownload = async (video: CommunityVideo, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!video.videoUrl) {
      alertError('视频地址不存在', '下载失败')
      return
    }
    try {
      // 使用fetch下载视频
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
      alertSuccess('视频下载已开始', '下载中')
    } catch (error) {
      console.error('下载失败:', error)
      // 如果fetch失败，尝试直接打开链接
      window.open(video.videoUrl, '_blank')
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

  // 键盘导航
  useEffect(() => {
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
  }, [currentVideoIndex, videos, navigate])

  // 滚轮导航
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const threshold = 50 // 滚轮阈值

      if (Math.abs(e.deltaY) > threshold) {
        if (e.deltaY > 0) {
          // 向下滚动，切换到下一个视频
          switchToVideo(currentVideoIndex + 1)
        } else {
          // 向上滚动，切换到上一个视频
          switchToVideo(currentVideoIndex - 1)
        }
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [currentVideoIndex, videos])

  // 自动播放当前视频
  useEffect(() => {
    if (videos.length === 0 || currentVideoIndex < 0 || currentVideoIndex >= videos.length) return

    const video = videoRefs.current.get(videos[currentVideoIndex]?.id)
    if (video) {
      video.play().catch(() => {})
      recordVideoView(videos[currentVideoIndex].id)
    }
  }, [currentVideoIndex, videos])

  // 垂直全屏滑动模式
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

      {/* 排序选项（右上角） */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setShowPublishModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          <span>发布</span>
        </button>
        <button
          onClick={() => setSortBy('latest')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            sortBy === 'latest'
              ? 'bg-purple-600 text-white'
              : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
          }`}
        >
          最新
        </button>
        <button
          onClick={() => setSortBy('popular')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            sortBy === 'popular'
              ? 'bg-purple-600 text-white'
              : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
          }`}
        >
          最热
        </button>
        <button
          onClick={() => setSortBy('likes')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            sortBy === 'likes'
              ? 'bg-purple-600 text-white'
              : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
          }`}
        >
          最多点赞
        </button>
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

              {/* 管理员删除按钮（右上角） */}
              {isAdmin && (
                <button
                  onClick={(e) => handleDeleteVideo(video.id, e)}
                  disabled={deletingVideoId === video.id}
                  className="absolute top-20 right-4 w-10 h-10 bg-red-500 bg-opacity-80 hover:bg-opacity-100 rounded-lg flex items-center justify-center text-white transition-all shadow-lg z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="删除/下架视频"
                >
                  {deletingVideoId === video.id ? (
                    <HamsterLoader size={3} />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              )}

              {/* 右侧操作栏 */}
              <div className="absolute right-4 bottom-20 flex flex-col items-center gap-4 z-30">
                {/* 作者头像 */}
                <div className="relative">
                  {video.avatar ? (
                    <img
                      src={video.avatar}
                      alt={video.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white text-lg font-medium border-2 border-white shadow-lg">
                      {video.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* 关注按钮 */}
                  <button className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-lg font-bold transition-colors shadow-lg">
                    +
                  </button>
                </div>

                {/* 点赞 */}
                <button
                  onClick={(e) => handleLike(video.id, e)}
                  className="flex flex-col items-center gap-1 text-white"
                >
                  <div className="w-12 h-12 bg-black bg-opacity-30 rounded-full flex items-center justify-center hover:bg-opacity-50 transition-all">
                    <Heart className={`w-6 h-6 ${video.isLiked ? 'fill-current text-red-500' : ''}`} />
                  </div>
                  <span className="text-xs">{formatNumber(video.likesCount)}</span>
                </button>

                {/* 评论 */}
                <button className="flex flex-col items-center gap-1 text-white">
                  <div className="w-12 h-12 bg-black bg-opacity-30 rounded-full flex items-center justify-center hover:bg-opacity-50 transition-all">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <span className="text-xs">0</span>
                </button>

                {/* 分享 */}
                <button className="flex flex-col items-center gap-1 text-white">
                  <div className="w-12 h-12 bg-black bg-opacity-30 rounded-full flex items-center justify-center hover:bg-opacity-50 transition-all">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <span className="text-xs">分享</span>
                </button>

                {/* 下载 */}
                <button 
                  onClick={(e) => handleDownload(video, e)}
                  className="flex flex-col items-center gap-1 text-white"
                >
                  <div className="w-12 h-12 bg-black bg-opacity-30 rounded-full flex items-center justify-center hover:bg-opacity-50 transition-all">
                    <Download className="w-6 h-6" />
                  </div>
                  <span className="text-xs">下载</span>
                </button>
              </div>

              {/* 底部信息栏 */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">@{video.username}</span>
                  </div>
                  <div className="flex items-center gap-4 text-white text-xs">
                    <span>{formatNumber(video.viewsCount)} 次观看</span>
                    <span>{formatTime(video.publishedAt)}</span>
                  </div>
                </div>
                
                <p className="text-white text-sm mb-2 line-clamp-2">{video.title}</p>
                
                {/* 模型信息 */}
                {video.model && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-white/20 rounded text-xs text-white/90">
                      {video.model}
                    </span>
                    {video.duration && (
                      <span className="px-2 py-1 bg-white/20 rounded text-xs text-white/90">
                        {video.duration}s
                      </span>
                    )}
                    {video.resolution && (
                      <span className="px-2 py-1 bg-white/20 rounded text-xs text-white/90">
                        {video.resolution}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 导航指示器（左侧） */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-30">
                {/* 上一个视频按钮 */}
                {currentVideoIndex > 0 && (
                  <button
                    onClick={() => switchToVideo(currentVideoIndex - 1)}
                    className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-all"
                  >
                    <ChevronUp size={20} />
                  </button>
                )}
                
                {/* 当前位置指示器 */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-white text-xs">{currentVideoIndex + 1}</span>
                  <div className="w-1 h-8 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="w-full bg-white rounded-full transition-all duration-300"
                      style={{ height: `${((currentVideoIndex + 1) / videos.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-white text-xs">{videos.length}</span>
                </div>

                {/* 下一个视频按钮 */}
                {currentVideoIndex < videos.length - 1 && (
                  <button
                    onClick={() => switchToVideo(currentVideoIndex + 1)}
                    className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-all"
                  >
                    <ChevronDown size={20} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 发布作品模态框 */}
      <PublishVideoModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onSuccess={() => {
          loadVideos()
          window.dispatchEvent(new CustomEvent('community-video-uploaded'))
        }}
      />

      {/* 删除确认对话框 */}
      <DeleteConfirmModal
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState({ isOpen: false, videoId: null })}
        onConfirm={handleConfirmDelete}
        message="确定要删除/下架这个视频吗？此操作不可恢复。"
      />
    </div>
  )
}

export default WorksShowcase
