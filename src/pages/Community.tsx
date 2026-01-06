import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Heart, MessageCircle, Eye, Share2, Plus } from 'lucide-react'
import { getCommunityVideos, toggleVideoLike, CommunityVideo } from '../services/api'
import { alertError } from '../utils/alert'
import { AuthService } from '../services/auth'
import NavigationBar from '../components/NavigationBar'

// 分类选项
const categories = [
  { id: 'all', label: '全部', count: null },
  { id: 'casting', label: '组讯', count: 99 },
  { id: 'script', label: '收剧', count: 99 },
  { id: 'production', label: '短剧承制', count: 99 },
  { id: 'overseas', label: '短剧出海', count: null },
  { id: 'news', label: '行业资讯', count: 99 },
  { id: 'discussion', label: '话题讨论', count: 99 },
  { id: 'trading', label: '剧本交易', count: 99 },
  { id: 'distribution', label: '投流分销', count: 99 },
  { id: 'promotion', label: '短剧宣传', count: 99 },
  { id: 'post', label: '后期', count: 99 },
  { id: 'recruitment', label: '招聘', count: 99 },
  { id: 'investment', label: '投资', count: 99 },
  { id: 'actor', label: '演员', count: null },
  { id: 'qualification', label: '企业资质', count: null },
  { id: 'policy', label: '政策快讯', count: 72 },
  { id: 'other', label: '其他', count: null },
]

function Community() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<CommunityVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'likes'>('latest')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const [currentUser, setCurrentUser] = useState<{ username: string; displayName: string } | null>(null)

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
      
      {/* 顶部红色标题栏 */}
      <div className="bg-red-600 text-white py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">社区</h1>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-red-700 rounded-lg transition-colors">
              <div className="w-5 h-5 border-2 border-white rounded-full"></div>
            </button>
            <button className="p-2 hover:bg-red-700 rounded-lg transition-colors">
              <div className="w-5 h-5 border-2 border-white rounded-full"></div>
            </button>
            <button className="p-2 hover:bg-red-700 rounded-lg transition-colors">
              <div className="w-5 h-5 border-2 border-white rounded-full"></div>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* 搜索和排序栏 */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="关键词"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('popular')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'popular'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              热门
              {sortBy === 'popular' && (
                <span className="ml-1 text-xs bg-red-700 px-1.5 py-0.5 rounded">New</span>
              )}
            </button>
            <button
              onClick={() => setSortBy('latest')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'latest'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              最新
            </button>
          </div>
        </div>

        {/* 分类筛选 */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category.label}
                {category.count !== null && category.count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {category.count > 99 ? '99+' : category.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">暂无内容</p>
            </div>
          ) : (
            videos.map((video) => (
              <div
                key={video.id}
                onClick={() => navigate(`/works/${video.id}`)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4 sm:p-6"
              >
                {/* 用户信息 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {video.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{video.username || '匿名用户'}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">已实名</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{formatTimeAgo(video.publishedAt)}</div>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">组讯</span>
                </div>

                {/* 视频标题和描述 */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{video.title}</h3>
                  {video.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">{video.description}</p>
                  )}
                </div>

                {/* 视频缩略图 */}
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
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{video.viewsCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="w-4 h-4" />
                      <span>0</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>0</span>
                    </div>
                    <button
                      onClick={(e) => handleToggleLike(video.id, e)}
                      className={`flex items-center gap-1 transition-colors ${
                        video.isLiked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${video.isLiked ? 'fill-current' : ''}`} />
                      <span>{video.likesCount || 0}</span>
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // 发布新内容的逻辑
                    }}
                    className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
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
    </div>
  )
}

export default Community

