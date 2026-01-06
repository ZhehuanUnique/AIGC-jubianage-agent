import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Heart, MessageCircle, Eye, Share2, Plus, Home, Clock, TrendingUp, Flame, Bell, User, ChevronDown } from 'lucide-react'
import { getCommunityVideos, toggleVideoLike, CommunityVideo } from '../services/api'
import { alertError } from '../utils/alert'
import { AuthService } from '../services/auth'
import NavigationBar from '../components/NavigationBar'

// 左侧导航菜单项
const leftMenuItems = [
  { id: 'hot', label: '热门推荐', icon: Flame, active: true },
  { id: 'ranking', label: '热门榜单', icon: Clock },
  { id: 'trending', label: '剧变热榜', icon: TrendingUp },
]

// 热搜子分类
const trendingSubCategories = [
  { id: 'my', label: '我的' },
  { id: 'hot', label: '热搜' },
  { id: 'entertainment', label: '文娱' },
  { id: 'life', label: '生活' },
  { id: 'society', label: '社会' },
]

// 热搜榜单数据（示例）
const hotSearchList = [
  { id: 1, keyword: '日本年轻人聚众晒梅毒', tag: '新', rank: 1 },
  { id: 2, keyword: '冯提莫瘦了50斤', tag: '热', rank: 2 },
  { id: 3, keyword: '白百何还回来当女明星吗', tag: null, rank: 3 },
  { id: 4, keyword: '沈腾确认回归春晚语言类节目', tag: null, rank: 4 },
  { id: 5, keyword: '短剧行业新动态', tag: '新', rank: 5 },
  { id: 6, keyword: 'AI视频生成技术突破', tag: null, rank: 6 },
  { id: 7, keyword: '短剧出海市场分析', tag: null, rank: 7 },
  { id: 8, keyword: '剧变时代AI新功能', tag: '热', rank: 8 },
  { id: 9, keyword: '短剧制作成本优化', tag: null, rank: 9 },
  { id: 10, keyword: '短视频平台政策更新', tag: null, rank: 10 },
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
  const [activeTrendingSub, setActiveTrendingSub] = useState('my')

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setCurrentUser(user)
  }, [])

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
            {/* Logo和搜索 */}
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full" />
                <span className="text-sm text-gray-600 hidden sm:inline">剧变时代AI</span>
              </div>
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

                {/* 热搜子分类 */}
                {activeLeftMenu === 'trending' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {trendingSubCategories.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveTrendingSub(sub.id)}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${
                          activeTrendingSub === sub.id
                            ? 'bg-orange-50 text-orange-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {sub.label}
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

            {/* 帖子列表 */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600">加载中...</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <p className="text-gray-600">暂无内容</p>
                </div>
              ) : (
                videos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => navigate(`/works/${video.id}`)}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-6"
                  >
                    {/* 用户信息 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {video.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{video.username || '匿名用户'}</span>
                            {video.username === 'Chiefavefan' && (
                              <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">V</span>
                            )}
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">已实名</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{formatTimeAgo(video.publishedAt)}</div>
                        </div>
                      </div>
                      <button className="px-4 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors">
                        +关注
                      </button>
                    </div>

                    {/* 内容 */}
                    <div className="mb-4">
                      <h3 className="text-base font-medium text-gray-900 mb-2 leading-relaxed">{video.title}</h3>
                      {video.description && (
                        <p className="text-gray-700 text-sm leading-relaxed">{video.description}</p>
                      )}
                    </div>

                    {/* 视频/图片 */}
                    {video.thumbnailUrl && (
                      <div className="mb-4 rounded-lg overflow-hidden">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-auto object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    )}

                    {/* 互动数据 */}
                    <div className="flex items-center gap-6 pt-4 border-t border-gray-100 text-gray-600">
                      <button
                        onClick={(e) => handleToggleLike(video.id, e)}
                        className={`flex items-center gap-1 transition-colors ${
                          video.isLiked ? 'text-red-600' : 'hover:text-red-600'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${video.isLiked ? 'fill-current' : ''}`} />
                        <span className="text-sm">{video.likesCount || 0}</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm">0</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-green-600 transition-colors">
                        <Share2 className="w-5 h-5" />
                        <span className="text-sm">0</span>
                      </button>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Eye className="w-5 h-5" />
                        <span className="text-sm">{video.viewsCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))
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

              {/* 热搜榜单 */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">剧变热榜</h3>
                <div className="space-y-3">
                  {hotSearchList.map((item, index) => (
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900 truncate">{item.keyword}</span>
                          {item.tag && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              item.tag === '新' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                            }`}>
                              {item.tag}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 text-sm text-orange-500 hover:text-orange-600 text-center">
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
