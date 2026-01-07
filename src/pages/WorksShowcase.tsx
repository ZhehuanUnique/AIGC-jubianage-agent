import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Play, ArrowLeft, ChevronUp, ChevronDown, Trash2, Plus, Sparkles, Download, Share2, MoreVertical } from 'lucide-react'
import { getCommunityVideos, toggleVideoLike, recordVideoView, deleteCommunityVideo, CommunityVideo } from '../services/api'
import { alertError, alertSuccess, alertWarning } from '../utils/alert'
import { AuthService } from '../services/auth'
import NavigationBar from '../components/NavigationBar'
import { PublishVideoModal } from '../components/PublishVideoModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import HamsterLoader from '../components/HamsterLoader'

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
  const [deleteConfirmState, setDeleteConfirmState] = useState<{ isOpen: boolean; videoId: number | null }>({ isOpen: false, videoId: null })
  const [draggedVideoId, setDraggedVideoId] = useState<number | null>(null)
  const [dragOverVideoId, setDragOverVideoId] = useState<number | null>(null)

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

  // 滚轮导航（桌面端 - 仅用于移动端全屏模式，桌面端网格模式不需要）
  // 注意：桌面端网格模式应该允许正常滚动，所以这里不添加滚轮监听
  // useEffect(() => {
  //   if (isMobile) return
  //   // 桌面端网格模式不需要滚轮切换视频，应该允许正常页面滚动
  // }, [currentVideoIndex, videos, isMobile])

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
      
      <div className="max-w-full mx-auto bg-white" style={{ padding: 0, margin: 0 }}>
        {/* 头部：排序选项 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 sm:gap-0 mb-0 px-4 py-2" style={{ marginBottom: 0 }}>
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
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
          <div className="flex flex-col items-center justify-center py-20">
            <HamsterLoader size={10} />
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">暂无视频</p>
            <p className="text-sm mt-2">还没有用户发布视频到社区</p>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="works-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          >
            {/* 视频卡片 */}
            {videos.map((video, index) => {
              const aspectRatio = videoAspectRatios.get(video.id)
              const isPortrait = aspectRatio !== undefined && aspectRatio < 1
              
              return (
                <div
                  key={video.id}
                  id={`video-${video.id}`}
                  draggable
                  className={`group cursor-grab active:cursor-grabbing ${
                    draggedVideoId === video.id ? 'opacity-50 cursor-grabbing' : ''
                  } ${dragOverVideoId === video.id ? 'ring-2 ring-purple-500 ring-inset' : ''}`}
                  style={{ position: 'relative' }}
                  onDragStart={(e) => {
                    setDraggedVideoId(video.id)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', video.id.toString())
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverVideoId !== video.id && draggedVideoId !== video.id) {
                      setDragOverVideoId(video.id)
                    }
                  }}
                  onDragLeave={() => {
                    setDragOverVideoId(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const draggedId = parseInt(e.dataTransfer.getData('text/plain'))
                    if (draggedId !== video.id && draggedId !== null) {
                      // 重新排序视频
                      const draggedIndex = videos.findIndex(v => v.id === draggedId)
                      const dropIndex = videos.findIndex(v => v.id === video.id)
                      if (draggedIndex !== -1 && dropIndex !== -1) {
                        const newVideos = [...videos]
                        const [removed] = newVideos.splice(draggedIndex, 1)
                        newVideos.splice(dropIndex, 0, removed)
                        setVideos(newVideos)
                        // 保存排序到本地存储
                        const sortedIds = newVideos.map(v => v.id)
                        localStorage.setItem('worksShowcaseOrder', JSON.stringify(sortedIds))
                      }
                    }
                    setDraggedVideoId(null)
                    setDragOverVideoId(null)
                  }}
                  onDragEnd={() => {
                    setDraggedVideoId(null)
                    setDragOverVideoId(null)
                  }}
                  onMouseEnter={() => {
                    if (!draggedVideoId) {
                      setHoveredVideoId(video.id)
                      if (window.innerWidth >= 640) {
                        const videoEl = videoRefs.current.get(video.id)
                        if (videoEl) {
                          videoEl.play().catch(() => {})
                        }
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    if (!draggedVideoId) {
                      setHoveredVideoId(null)
                      if (window.innerWidth >= 640) {
                        const videoEl = videoRefs.current.get(video.id)
                        if (videoEl) {
                          videoEl.pause()
                          videoEl.currentTime = 0
                        }
                      }
                    }
                  }}
                  onClick={(e) => {
                    // 如果正在拖拽，不触发点击事件
                    if (draggedVideoId) {
                      e.preventDefault()
                      return
                    }
                    recordVideoView(video.id)
                    navigate(`/works/${video.id}`)
                  }}
                >
                  {/* 视频容器 - 根据宽高比自适应 */}
                  <div 
                    className={`relative bg-black ${
                      isPortrait 
                        ? 'aspect-[9/16]' 
                        : 'aspect-video'
                    }`}
                  >
                    {/* 优先显示缩略图（如果存在），悬停时再显示视频 */}
                    {video.thumbnailUrl && video.thumbnailUrl.trim() !== '' ? (
                      <>
                        {/* 缩略图 - 始终显示 */}
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // 如果缩略图加载失败，尝试显示视频或占位符
                            const target = e.currentTarget
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent && video.videoUrl && video.videoUrl.trim() !== '') {
                              // 如果有视频URL，创建视频元素
                              const videoEl = document.createElement('video')
                              videoEl.src = video.videoUrl
                              videoEl.className = 'w-full h-full object-cover'
                              videoEl.muted = true
                              videoEl.loop = true
                              videoEl.playsInline = true
                              videoEl.preload = 'metadata'
                              videoEl.onerror = () => {
                                // 视频也加载失败，显示占位符
                                videoEl.style.display = 'none'
                                if (parent && !parent.querySelector('.placeholder')) {
                                  const placeholder = document.createElement('div')
                                  placeholder.className = 'w-full h-full flex items-center justify-center bg-gray-200 placeholder'
                                  placeholder.innerHTML = '<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
                                  parent.appendChild(placeholder)
                                }
                              }
                              parent.appendChild(videoEl)
                            } else if (parent && !parent.querySelector('.placeholder')) {
                              // 没有视频URL，显示占位符
                              const placeholder = document.createElement('div')
                              placeholder.className = 'w-full h-full flex items-center justify-center bg-gray-200 placeholder'
                              placeholder.innerHTML = '<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
                              parent.appendChild(placeholder)
                            }
                          }}
                        />
                        {/* 视频 - 悬停时显示并播放 */}
                        {video.videoUrl && video.videoUrl.trim() !== '' && (
                          <video
                            ref={(el) => {
                              if (el) {
                                videoRefs.current.set(video.id, el)
                              } else {
                                videoRefs.current.delete(video.id)
                              }
                            }}
                            src={video.videoUrl}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                              hoveredVideoId === video.id ? 'opacity-100' : 'opacity-0'
                            }`}
                            style={{ zIndex: hoveredVideoId === video.id ? 1 : 0 }}
                            muted
                            loop
                            preload="metadata"
                            playsInline
                            onLoadedMetadata={(e) => {
                              const videoEl = e.currentTarget
                              const ratio = videoEl.videoWidth / videoEl.videoHeight
                              setVideoAspectRatios(prev => new Map(prev).set(video.id, ratio))
                            }}
                            onError={(e) => {
                              // 视频加载失败，隐藏视频，保持显示缩略图
                              console.error('视频加载失败:', video.videoUrl, video.id)
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                      </>
                    ) : video.videoUrl && video.videoUrl.trim() !== '' ? (
                      // 没有缩略图，直接显示视频
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
                        onError={(e) => {
                          // 视频加载失败，显示占位符
                          console.error('视频加载失败:', video.videoUrl, video.id)
                          const videoEl = e.currentTarget
                          videoEl.style.display = 'none'
                          const parent = videoEl.parentElement
                          if (parent && !parent.querySelector('.placeholder')) {
                            const placeholder = document.createElement('div')
                            placeholder.className = 'w-full h-full flex items-center justify-center bg-gray-200 placeholder'
                            placeholder.innerHTML = '<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
                            parent.appendChild(placeholder)
                          }
                        }}
                      />
                    ) : (
                      // 既没有缩略图也没有视频，显示占位符
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <Play className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* 管理员删除按钮（右上角，仅在悬停时显示） */}
                    {hoveredVideoId === video.id && isAdmin && (
                      <button
                        onClick={(e) => handleDeleteVideo(video.id, e)}
                        disabled={deletingVideoId === video.id}
                        className="absolute top-4 right-4 w-10 h-10 bg-red-500 bg-opacity-80 hover:bg-opacity-100 rounded-lg flex items-center justify-center text-white transition-all shadow-lg z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="删除/下架视频"
                      >
                        {deletingVideoId === video.id ? (
                          <HamsterLoader size={3} />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    )}
                  </div>

                  {/* 悬停时显示的悬浮窗口 - 绝对定位悬浮在视频上方 */}
                  {hoveredVideoId === video.id && (
                    <div 
                      className="hover-window absolute inset-0 bg-white bg-opacity-98 backdrop-blur-sm shadow-2xl z-[9999] flex flex-col p-3 pointer-events-auto rounded-lg border border-gray-200"
                      onMouseEnter={() => setHoveredVideoId(video.id)}
                      onMouseLeave={() => setHoveredVideoId(null)}
                    >
                      {/* 标题 */}
                      <h3 className="text-sm font-semibold text-gray-900 mb-1.5 line-clamp-2 flex-shrink-0">
                        {video.title || '未命名视频'}
                      </h3>
                      
                      {/* 用户信息 */}
                      <div className="flex items-center gap-2 mb-1.5 flex-shrink-0">
                        {video.avatar ? (
                          <img
                            src={video.avatar}
                            alt={video.username}
                            className="w-6 h-6 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs border border-gray-200">
                            {video.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-gray-700 truncate">{video.username}</span>
                      </div>

                      {/* 互动数据 */}
                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => handleLike(video.id, e)}
                          className="flex items-center gap-1 hover:text-red-500 transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${video.isLiked ? 'fill-current text-red-500' : ''}`} />
                          <span>{formatNumber(video.likesCount)}</span>
                        </button>
                        <span>{formatNumber(video.viewsCount)}次观看</span>
                        <span className="ml-auto">{formatTime(video.publishedAt)}</span>
                      </div>
                      
                      {/* 模型和规格信息 */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap flex-shrink-0">
                        {video.model ? (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                            {video.model}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                            未知模型
                          </span>
                        )}
                        {video.duration ? (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                            {video.duration}s
                          </span>
                        ) : null}
                        {video.resolution ? (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                            {video.resolution}
                          </span>
                        ) : null}
                      </div>
                      
                      {/* 操作按钮行 - 参考海螺AI网站的设计 */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 mt-auto flex-shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: 实现使用模板功能
                          }}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-2.5 text-white text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5 shadow-md"
                        >
                          <Sparkles className="w-4 h-4 mb-0.5" />
                          <span className="leading-tight text-xs">使用模板</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: 实现下载功能
                          }}
                          className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 transition-all shadow-sm"
                          title="下载"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: 实现分享功能
                          }}
                          className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 transition-all shadow-sm"
                          title="分享"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: 实现更多选项
                          }}
                          className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 transition-all shadow-sm"
                          title="更多"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

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
