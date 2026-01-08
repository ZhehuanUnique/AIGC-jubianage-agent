import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Play, Trash2, Plus, Sparkles, Download, Share2, MoreVertical } from 'lucide-react'
import { getCommunityVideos, toggleVideoLike, recordVideoView, deleteCommunityVideo, CommunityVideo } from '../services/api'
import { alertError, alertWarning } from '../utils/alert'
import { AuthService } from '../services/auth'
import NavigationBar from '../components/NavigationBar'
import { PublishVideoModal } from '../components/PublishVideoModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import HamsterLoader from '../components/HamsterLoader'

function WorksGallery() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<CommunityVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())
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

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setCurrentUser(user)
  }, [])

  const isAdmin = currentUser?.username === 'Chiefavefan' || currentUser?.username === 'jubian888'

  const loadVideos = async () => {
    try {
      setIsLoading(true)
      const result = await getCommunityVideos({ page, limit, sortBy })
      let loadedVideos = result.videos
      
      const savedOrder = localStorage.getItem('worksShowcaseOrder')
      if (savedOrder) {
        try {
          const sortedIds = JSON.parse(savedOrder) as number[]
          const sortedVideos = sortedIds
            .map(id => loadedVideos.find(v => v.id === id))
            .filter((v): v is CommunityVideo => v !== undefined)
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

  const checkAuth = () => {
    const token = localStorage.getItem('auth_token')
    return !!token
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

  // 按日期分组视频
  const groupVideosByDate = (videos: CommunityVideo[]) => {
    const groups: { [key: string]: CommunityVideo[] } = {}
    
    videos.forEach(video => {
      const date = new Date(video.publishedAt || video.createdAt)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      
      let groupKey: string
      if (diffDays === 0) {
        groupKey = '今天'
      } else if (diffDays === 1) {
        groupKey = '昨天'
      } else {
        // 格式化为 "1月6日" 的形式
        groupKey = `${date.getMonth() + 1}月${date.getDate()}日`
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(video)
    })
    
    // 按日期排序分组，最新的在最下面
    const sortedGroups = Object.entries(groups).sort(([keyA, videosA], [keyB, videosB]) => {
      const dateA = new Date(videosA[0].publishedAt || videosA[0].createdAt)
      const dateB = new Date(videosB[0].publishedAt || videosB[0].createdAt)
      return dateA.getTime() - dateB.getTime() // 升序，最早的在上面
    })
    
    return sortedGroups
  }

  const formatNumber = (num: number): string => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-white">
      <NavigationBar activeTab="works" />
      
      <div className="max-w-full mx-auto bg-white" style={{ padding: 0, margin: 0 }}>
        {/* 头部：排序选项 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 sm:gap-0 mb-0 px-4 py-2">
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
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                sortBy === 'latest' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              最新
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                sortBy === 'popular' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              最热
            </button>
            <button
              onClick={() => setSortBy('likes')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                sortBy === 'likes' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              最多点赞
            </button>
          </div>
        </div>

        {/* 按日期分组的视频列表 */}
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
          <div className="px-4 pb-8">
            {groupVideosByDate(videos).map(([dateGroup, groupVideos]) => (
              <div key={dateGroup} className="mb-8">
                {/* 日期标题 */}
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{dateGroup}</h2>
                
                {/* 该日期的视频网格 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {groupVideos.map((video) => (
                    <div
                      key={video.id}
                      className="group cursor-pointer relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      onClick={(e) => {
                        recordVideoView(video.id)
                        navigate(`/works/play/${video.id}`)
                      }}
                      onMouseEnter={() => {
                        setHoveredVideoId(video.id)
                        const videoEl = videoRefs.current.get(video.id)
                        if (videoEl) videoEl.play().catch(() => {})
                      }}
                      onMouseLeave={() => {
                        setHoveredVideoId(null)
                        const videoEl = videoRefs.current.get(video.id)
                        if (videoEl) {
                          videoEl.pause()
                          videoEl.currentTime = 0
                        }
                      }}
                    >
                      {/* 视频容器 */}
                      <div className="relative bg-black aspect-video">
                        {video.thumbnailUrl ? (
                          <>
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                            {video.videoUrl && (
                              <video
                                ref={(el) => {
                                  if (el) videoRefs.current.set(video.id, el)
                                  else videoRefs.current.delete(video.id)
                                }}
                                src={video.videoUrl}
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                                  hoveredVideoId === video.id ? 'opacity-100' : 'opacity-0'
                                }`}
                                muted
                                loop
                                preload="metadata"
                                playsInline
                                onLoadedMetadata={(e) => {
                                  const videoEl = e.currentTarget
                                  setVideoAspectRatios(prev => new Map(prev).set(video.id, videoEl.videoWidth / videoEl.videoHeight))
                                }}
                              />
                            )}
                          </>
                        ) : video.videoUrl ? (
                          <video
                            ref={(el) => {
                              if (el) videoRefs.current.set(video.id, el)
                              else videoRefs.current.delete(video.id)
                            }}
                            src={video.videoUrl}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            preload="metadata"
                            playsInline
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <Play className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        
                        {/* 管理员删除按钮 */}
                        {hoveredVideoId === video.id && isAdmin && (
                          <button
                            onClick={(e) => handleDeleteVideo(video.id, e)}
                            disabled={deletingVideoId === video.id}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 bg-opacity-80 hover:bg-opacity-100 rounded-lg flex items-center justify-center text-white z-20"
                          >
                            {deletingVideoId === video.id ? <HamsterLoader size={2} /> : <Trash2 size={14} />}
                          </button>
                        )}
                      </div>

                      {/* 视频信息 */}
                      <div className="p-3">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                          {video.title || '未命名视频'}
                        </h3>
                        
                        <div className="flex items-center gap-2 mb-2">
                          {video.avatar ? (
                            <img src={video.avatar} alt={video.username} className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs">
                              {video.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs text-gray-600 truncate">{video.username}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-3">
                            <button onClick={(e) => handleLike(video.id, e)} className="flex items-center gap-1 hover:text-red-400">
                              <Heart className={`w-3 h-3 ${video.isLiked ? 'fill-current text-red-400' : ''}`} />
                              <span>{formatNumber(video.likesCount)}</span>
                            </button>
                            <span>{formatNumber(video.viewsCount)}次观看</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {video.model && (
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{video.model}</span>
                            )}
                            {video.duration && (
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{video.duration}s</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {total > limit && (
          <div className="flex justify-center items-center gap-2 mt-8 pb-8">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              ‹
            </button>
            <span className="px-4 py-1 text-sm text-gray-700">
              第 {page} 页，共 {Math.ceil(total / limit)} 页
            </span>
            <button
              onClick={() => setPage(prev => Math.min(Math.ceil(total / limit), prev + 1))}
              disabled={page >= Math.ceil(total / limit)}
              className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <PublishVideoModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onSuccess={() => {
          loadVideos()
          window.dispatchEvent(new CustomEvent('community-video-uploaded'))
        }}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState({ isOpen: false, videoId: null })}
        onConfirm={handleConfirmDelete}
        message="确定要删除/下架这个视频吗？此操作不可恢复。"
      />
    </div>
  )
}

export default WorksGallery
