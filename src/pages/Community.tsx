import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Heart, MessageCircle, Eye, Share2, Plus, Home, Clock, TrendingUp, Flame, Bell, User, ChevronDown, Settings, Play, Crown } from 'lucide-react'
import { getCommunityVideos, toggleVideoLike, CommunityVideo } from '../services/api'
import { alertError } from '../utils/alert'
import { AuthService } from '../services/auth'
import NavigationBar from '../components/NavigationBar'
import HamsterLoader from '../components/HamsterLoader'

// 左侧导航菜单项
const leftMenuItems = [
  { id: 'hot', label: '热门推荐', icon: Flame, active: true },
  { id: 'ranking', label: '热门榜单', icon: Clock },
  { id: 'trending', label: '剧变热榜', icon: TrendingUp },
]

// 榜单类型（只保留前两个）
const rankingTypes = [
  { id: 'anime', label: '动态漫剧榜' },
  { id: 'ai-real', label: 'AI短剧榜' },
]

function Community() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<CommunityVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'likes'>('latest')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const [currentUser, setCurrentUser] = useState<{ username: string; displayName: string } | null>(null)
  const [activeLeftMenu, setActiveLeftMenu] = useState('hot')
  const [activeRankingType, setActiveRankingType] = useState('anime')
  const [hotSearchList, setHotSearchList] = useState<Array<{ id: number; keyword: string; tag: string | null; rank: number; views?: number }>>([])
  const [isLoadingRanking, setIsLoadingRanking] = useState(false)
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)
  const [hoveredUserPosition, setHoveredUserPosition] = useState<{ x: number; y: number } | null>(null)
  const [hoveredUserFollowStatus, setHoveredUserFollowStatus] = useState<{ [username: string]: boolean }>({})
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const [videoAspectRatios, setVideoAspectRatios] = useState<Map<number, number>>(new Map())
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null) // 当前播放的视频ID
  const [hoveredAvatarVideoId, setHoveredAvatarVideoId] = useState<number | null>(null) // 悬停头像的视频ID
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())
  const [videoProgress, setVideoProgress] = useState<Map<number, number>>(new Map()) // 视频播放进度（百分比）

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setCurrentUser(user)
  }, [])

  // 点击外部关闭设置菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false)
      }
    }

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettingsMenu])

  // 加载榜单数据
  const loadRanking = async (type: string, forceUpdate: boolean = false) => {
    try {
      setIsLoadingRanking(true)
      const token = AuthService.getToken()
      if (!token) {
        return
      }

      // 确定API基础URL
      const apiBaseUrl = (() => {
        if (import.meta.env.VITE_API_BASE_URL !== undefined) {
          return import.meta.env.VITE_API_BASE_URL
        }
        const isProduction = typeof window !== 'undefined' && 
          !window.location.hostname.includes('localhost') && 
          !window.location.hostname.includes('127.0.0.1')
        return isProduction ? '' : 'http://localhost:3002'
      })()

      // 如果强制更新，先调用更新API并等待完成
      if (forceUpdate) {
        try {
          const updateResponse = await fetch(`${apiBaseUrl}/api/trending-rankings/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ type }),
          })
          
          if (!updateResponse.ok) {
            console.warn('更新榜单失败，使用缓存数据')
          } else {
            // 等待一小段时间确保数据库写入完成
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } catch (error) {
          console.warn('更新榜单失败:', error)
        }
      }

      const response = await fetch(`${apiBaseUrl}/api/trending-rankings?type=${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('获取榜单失败')
      }

      const result = await response.json()
      console.log('📊 获取榜单数据:', { success: result.success, hasData: !!result.data, hasRanking: !!result.data?.ranking, rankingLength: result.data?.ranking?.length })
      
      if (result.success && result.data && result.data.ranking) {
        // 检查 ranking 是否为数组且不为空
        if (Array.isArray(result.data.ranking) && result.data.ranking.length > 0) {
          // 将API返回的数据转换为前端需要的格式
          const ranking = result.data.ranking.map((item: any, index: number) => ({
            id: index + 1,
            keyword: item.keyword || item.title || `榜单项 ${index + 1}`,
            tag: item.tag || null,
            rank: item.rank || index + 1,
            views: item.views || 0,
          }))
          console.log('✅ 设置榜单数据:', ranking.length, '条')
          setHotSearchList(ranking)
        } else {
          // 如果没有数据，显示空列表
          console.warn('⚠️ 榜单数据为空或格式不正确')
          setHotSearchList([])
        }
      } else {
        // 如果响应格式不正确，显示空列表
        console.warn('⚠️ 榜单响应格式不正确:', result)
        setHotSearchList([])
      }
    } catch (error) {
      console.error('加载榜单失败:', error)
      // 显示空列表
      setHotSearchList([])
    } finally {
      setIsLoadingRanking(false)
    }
  }

  // 当榜单类型改变时，重新加载榜单
  useEffect(() => {
    // 榜单显示在右侧边栏，页面加载时就获取
    loadRanking(activeRankingType)
  }, [activeRankingType])

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

  useEffect(() => {
    loadVideos()
  }, [page, sortBy])

  // 切换点赞
  const handleToggleLike = async (videoId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const result = await toggleVideoLike(videoId)
      setVideos(prevVideos =>
        prevVideos.map(video =>
          video.id === videoId
            ? {
                ...video,
                isLiked: result.liked,
                likesCount: result.likesCount,
              }
            : video
        )
      )
    } catch (error) {
      console.error('点赞失败:', error)
      alertError(error instanceof Error ? error.message : '点赞失败，请稍后重试', '错误')
    }
  }

  // 格式化时间
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return '刚刚'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar activeTab="community" />
      
      {/* 顶部Header - 类似剧变社区 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* 搜索 */}
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索剧变"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                />
              </div>
            </div>

            {/* 右侧图标 */}
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Home className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                <MessageCircle className="w-5 h-5 text-gray-600" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="relative" ref={settingsMenuRef}>
                <button 
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5 text-gray-600" />
                </button>
                {showSettingsMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2">
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                        // TODO: 跳转到账号设置
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      账号设置
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                        navigate('/verification')
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      V认证
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                        // TODO: 跳转到会员中心
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      会员中心
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                        // TODO: 跳转到账号安全
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      账号安全
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                        // TODO: 跳转到隐私设置
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      隐私设置
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                        // TODO: 跳转到消息设置
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      消息设置
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                        // TODO: 跳转到屏蔽设置
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      屏蔽设置
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                        // TODO: 跳转到使用偏好
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      使用偏好
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                        // TODO: 跳转到意见反馈
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      意见反馈
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                        // TODO: 跳转到帮助中心
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      帮助中心
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                        AuthService.logout()
                        navigate('/')
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                    >
                      退出
                    </button>
                  </div>
                )}
              </div>
              {currentUser ? (
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <User className="w-5 h-5 text-gray-600" />
                </button>
              ) : (
                <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                  登录/注册
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 - 三栏布局 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* 左侧边栏 */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="space-y-1">
                {leftMenuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeLeftMenu === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveLeftMenu(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-orange-50 text-orange-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  )
                })}

                {/* 榜单类型切换 */}
                {activeLeftMenu === 'trending' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {rankingTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setActiveRankingType(type.id)}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${
                          activeRankingType === type.id
                            ? 'bg-orange-50 text-orange-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 中间主内容区 */}
          <div className="flex-1 min-w-0">
            {/* 排序选项 */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center gap-2">
              <button
                onClick={() => setSortBy('popular')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'popular'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                热门
                {sortBy === 'popular' && (
                  <span className="ml-1 text-xs bg-orange-600 px-1.5 py-0.5 rounded">New</span>
                )}
              </button>
              <button
                onClick={() => setSortBy('latest')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'latest'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                最新
              </button>
            </div>

            {/* 帖子列表 - 微博风格 */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center flex flex-col items-center">
                  <HamsterLoader size={8} />
                  <p className="mt-4 text-gray-600">加载中...</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <p className="text-gray-600">暂无内容</p>
                </div>
              ) : (
                videos.map((video) => {
                  // 格式化时长
                  const formatDuration = (seconds?: number): string => {
                    if (!seconds) return '00:00'
                    const mins = Math.floor(seconds / 60)
                    const secs = Math.floor(seconds % 60)
                    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                  }

                  // 格式化观看次数
                  const formatViews = (count: number): string => {
                    if (count >= 10000) {
                      return `${(count / 10000).toFixed(1)}万`
                    }
                    return count.toString()
                  }

                  const isPlaying = playingVideoId === video.id

                  return (
                    <div
                      key={video.id}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                    >
                      {/* 用户信息（顶部） */}
                      <div className="p-4 pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div 
                              className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg cursor-pointer relative flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/user/${video.username}`)
                              }}
                            >
                              {video.avatar ? (
                                <img
                                  src={video.avatar}
                                  alt={video.username}
                                  className="w-full h-full rounded-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <span>{video.username?.[0]?.toUpperCase() || 'U'}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900 text-base">{video.username || '匿名用户'}</span>
                                {video.username === 'Chiefavefan' && (
                                  <div className="flex items-center gap-1">
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                    <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">II</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{formatTimeAgo(video.publishedAt)}</span>
                                {video.model && (
                                  <>
                                    <span>·</span>
                                    <span>来自{video.model}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 文本内容 */}
                      {(video.title || video.description) && (
                        <div className="px-4 pb-3">
                          {video.title && (
                            <p className="text-gray-900 text-base leading-relaxed mb-1">{video.title}</p>
                          )}
                          {video.description && (
                            <p className="text-gray-700 text-sm leading-relaxed">{video.description}</p>
                          )}
                        </div>
                      )}

                      {/* 视频播放器 - 点击直接播放 */}
                      <div 
                        className="relative bg-black cursor-pointer"
                        style={{ aspectRatio: `${videoAspectRatios.get(video.id) || 16/9}` }}
                        onClick={() => {
                          if (isPlaying) {
                            // 如果正在播放，暂停
                            const videoEl = videoRefs.current.get(video.id)
                            if (videoEl) {
                              videoEl.pause()
                            }
                            setPlayingVideoId(null)
                          } else {
                            // 暂停其他视频
                            videoRefs.current.forEach((el, id) => {
                              if (id !== video.id) {
                                el.pause()
                              }
                            })
                            // 播放当前视频
                            const videoEl = videoRefs.current.get(video.id)
                            if (videoEl) {
                              videoEl.play().catch(() => {})
                            }
                            setPlayingVideoId(video.id)
                          }
                        }}
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
                            className="w-full h-full object-contain"
                            muted={!isPlaying}
                            loop
                            playsInline
                            preload="metadata"
                            onLoadedMetadata={(e) => {
                              const videoEl = e.currentTarget
                              const ratio = videoEl.videoWidth / videoEl.videoHeight
                              setVideoAspectRatios(prev => new Map(prev).set(video.id, ratio))
                            }}
                            onTimeUpdate={(e) => {
                              const videoEl = e.currentTarget
                              if (videoEl.duration > 0) {
                                const progress = (videoEl.currentTime / videoEl.duration) * 100
                                setVideoProgress(prev => new Map(prev).set(video.id, progress))
                              }
                            }}
                          />
                        ) : video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-contain"
                            onLoad={(e) => {
                              const img = e.currentTarget
                              const ratio = img.naturalWidth / img.naturalHeight
                              setVideoAspectRatios(prev => new Map(prev).set(video.id, ratio))
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : null}
                        
                        {/* 播放按钮覆盖层 - 未播放时显示 */}
                        {!isPlaying && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                            <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                              <Play className="w-8 h-8 text-gray-900 ml-1" />
                            </div>
                          </div>
                        )}

                        {/* 右下角作者头像 - 仅在播放时显示 */}
                        {isPlaying && (
                          <div 
                            className="absolute bottom-4 right-4 z-10"
                            onMouseEnter={() => setHoveredAvatarVideoId(video.id)}
                            onMouseLeave={() => setHoveredAvatarVideoId(null)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="relative">
                              {video.avatar ? (
                                <img
                                  src={video.avatar}
                                  alt={video.username}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg cursor-pointer"
                                  onClick={() => navigate(`/user/${video.username}`)}
                                />
                              ) : (
                                <div 
                                  className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white text-lg font-medium border-2 border-white shadow-lg cursor-pointer"
                                  onClick={() => navigate(`/user/${video.username}`)}
                                >
                                  {video.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                              )}
                              {/* 悬停时显示关注按钮 */}
                              {hoveredAvatarVideoId === video.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // TODO: 实现关注功能
                                  }}
                                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full whitespace-nowrap transition-colors shadow-lg"
                                >
                                  + 关注
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 视频底部信息 - 未播放时显示观看次数和时长 */}
                        {!isPlaying && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
                            <div className="flex items-center justify-between text-white text-sm">
                              <span>{formatViews(video.viewsCount || 0)}次观看</span>
                              <span>{formatDuration(video.duration)}</span>
                            </div>
                          </div>
                        )}

                        {/* 播放时显示进度条 */}
                        {isPlaying && (
                          <div className="absolute bottom-0 left-0 right-16 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
                            <div className="flex items-center gap-2 text-white text-sm">
                              <div className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-white transition-all duration-300"
                                  style={{ width: `${videoProgress.get(video.id) || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 视频下方互动数据 */}
                      <div className="px-4 py-3 border-t border-gray-100">
                        <div className="flex items-center gap-6 text-gray-600">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: 实现转发功能
                            }}
                            className="flex items-center gap-2 hover:text-green-600 transition-colors"
                          >
                            <Share2 className="w-5 h-5" />
                            <span className="text-sm">转发</span>
                          </button>
                          <button 
                            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-sm">评论</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleLike(video.id, e)
                            }}
                            className={`flex items-center gap-2 transition-colors ${
                              video.isLiked ? 'text-red-600' : 'hover:text-red-600'
                            }`}
                          >
                            <Heart className={`w-5 h-5 ${video.isLiked ? 'fill-current' : ''}`} />
                            <span className="text-sm">{video.likesCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* 分页 */}
            {total > limit && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>
                <span className="px-4 py-2 text-gray-600">
                  第 {page} 页，共 {Math.ceil(total / limit)} 页
                </span>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                  disabled={page >= Math.ceil(total / limit)}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            )}
          </div>

          {/* 用户信息悬停卡片 */}
          {hoveredUserId && hoveredUserPosition && (
            <div
              className="user-hover-card fixed bg-white rounded-lg shadow-2xl border border-gray-200 z-[200] p-4 min-w-[320px] max-w-[400px]"
              style={{
                left: `${hoveredUserPosition.x}px`,
                top: `${hoveredUserPosition.y}px`,
                transform: 'translateX(-50%)',
              }}
              onMouseEnter={() => {
                // 保持显示
              }}
              onMouseLeave={() => {
                setHoveredUserId(null)
                setHoveredUserPosition(null)
              }}
            >
              {/* 用户头部信息 */}
              <div className="flex items-start gap-3 mb-4">
                {videos.find(v => v.username === hoveredUserId)?.avatar ? (
                  <img
                    src={videos.find(v => v.username === hoveredUserId)?.avatar}
                    alt={hoveredUserId}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-gray-200">
                    {hoveredUserId[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-base">{hoveredUserId}</span>
                    {hoveredUserId === 'Chiefavefan' && (
                      <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">V</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    剧变认证: 剧变牧场计划合作达人 纪录片博主 剧变新知博主
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>关注 <span className="font-semibold text-gray-900">0</span></span>
                    <span>粉丝 <span className="font-semibold text-gray-900">0</span></span>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!hoveredUserId) return
                    
                    const isCurrentlyFollowing = hoveredUserFollowStatus[hoveredUserId] || false
                    const action = isCurrentlyFollowing ? 'unfollow' : 'follow'
                    
                    try {
                      const { followUser } = await import('../services/api')
                      await followUser(hoveredUserId, action)
                      setHoveredUserFollowStatus(prev => ({
                        ...prev,
                        [hoveredUserId]: !isCurrentlyFollowing,
                      }))
                    } catch (error) {
                      console.error('关注操作失败:', error)
                      alertError(error instanceof Error ? error.message : '操作失败', '错误')
                    }
                  }}
                  className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                    hoveredUserFollowStatus[hoveredUserId]
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {hoveredUserFollowStatus[hoveredUserId] ? '已关注' : '+关注'}
                </button>
                <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  留言
                </button>
                <button className="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* 右侧边栏 */}
          <div className="hidden xl:block w-80 flex-shrink-0">
            <div className="space-y-4">
              {/* 登录提示 */}
              {!currentUser && (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                  <p className="text-gray-600 mb-4">随时随地 发现新鲜事</p>
                  <button className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">
                    登录/注册
                  </button>
                </div>
              )}

              {/* 剧变热榜 */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">剧变热榜</h3>
                </div>
                
                {/* 榜单类型切换标签 */}
                <div className="flex gap-2 mb-4 border-b border-gray-200">
                  {rankingTypes.slice(0, 2).map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setActiveRankingType(type.id)}
                      className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                        activeRankingType === type.id
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                
                <div className="space-y-3">
                  {isLoadingRanking ? (
                    <div className="flex items-center justify-center py-8">
                      <HamsterLoader size={4} />
                      <span className="ml-2 text-sm text-gray-500">加载榜单中...</span>
                    </div>
                  ) : hotSearchList.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      暂无榜单数据
                    </div>
                  ) : (
                    hotSearchList.slice(0, 10).map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      >
                        <span className={`text-sm font-medium ${
                          index < 3 ? 'text-orange-500' : 'text-gray-400'
                        }`}>
                          {item.rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-900 truncate">{item.keyword}</span>
                            {item.tag && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                item.tag === '新' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                              }`}>
                                {item.tag}
                              </span>
                            )}
                            {/* 显示浏览量（如果有） */}
                            {item.views && (
                              <span className="text-xs text-gray-500">{item.views.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={() => navigate(`/community/ranking/${activeRankingType}`)}
                  className="w-full mt-4 text-sm text-orange-500 hover:text-orange-600 text-center transition-colors"
                >
                  查看完整热搜榜单 &gt;
                </button>
              </div>

              {/* 帮助链接 */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex flex-col gap-2 text-sm">
                  <a href="#" className="text-gray-600 hover:text-orange-500 transition-colors">帮助中心</a>
                  <a href="#" className="text-gray-600 hover:text-orange-500 transition-colors">合作&服务</a>
                </div>
                <button className="mt-4 w-full py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                  TOP
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Community
