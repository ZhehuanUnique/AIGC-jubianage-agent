import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Flame, Clock, TrendingUp } from 'lucide-react'
import NavigationBar from '../components/NavigationBar'
import { AuthService } from '../services/auth'

// 榜单类型（只保留前两个）
const rankingTypes = [
  { id: 'anime', label: '动态漫剧榜' },
  { id: 'ai-real', label: 'AI短剧榜' },
]

// 榜单项类型
interface RankingItem {
  id: number
  title: string
  tag: string | null
  tagColor: string | null
  rightInfo: string
  rank: number
}

function RankingDetail() {
  const navigate = useNavigate()
  const { type } = useParams<{ type?: string }>()
  const [activeRankingType, setActiveRankingType] = useState(type || 'anime')
  const [activeSubCategory, setActiveSubCategory] = useState('my')
  const [rankingData, setRankingData] = useState<RankingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 加载榜单数据
  const loadRanking = async (rankingType: string) => {
    try {
      setIsLoading(true)
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

      const response = await fetch(`${apiBaseUrl}/api/trending-rankings?type=${rankingType}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('获取榜单失败')
      }

      const result = await response.json()
      
      if (result.success && result.data && result.data.ranking && Array.isArray(result.data.ranking)) {
        // 将API返回的数据转换为前端需要的格式
        const ranking = result.data.ranking.map((item: any, index: number) => ({
          id: index + 1,
          title: item.keyword || item.title || `榜单项 ${index + 1}`,
          tag: item.tag || null,
          tagColor: item.tag === '热' ? 'red' : item.tag === '新' ? 'pink' : null,
          rightInfo: item.views ? item.views.toLocaleString() : '0',
          rank: item.rank || index + 1,
        }))
        setRankingData(ranking)
      } else {
        setRankingData([])
      }
    } catch (error) {
      console.error('加载榜单失败:', error)
      setRankingData([])
    } finally {
      setIsLoading(false)
    }
  }

  // 当榜单类型改变时，重新加载榜单
  useEffect(() => {
    loadRanking(activeRankingType)
  }, [activeRankingType])

  // 子分类
  const subCategories = [
    { id: 'my', label: '我的' },
    { id: 'hot', label: '热搜' },
    { id: 'entertainment', label: '文娱' },
    { id: 'life', label: '生活' },
    { id: 'society', label: '社会' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar activeTab="community" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* 左侧导航栏 */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              {/* 返回按钮 */}
              <button
                onClick={() => navigate('/community')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">返回</span>
              </button>

              {/* 标题 */}
              <h2 className="text-xl font-bold text-gray-900 mb-4">推荐</h2>

              {/* 主菜单 */}
              <div className="space-y-1 mb-6">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-orange-50 text-orange-600">
                  <Flame className="w-5 h-5" />
                  <span className="text-sm font-medium">热门推荐</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-600 hover:bg-gray-50">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">热门榜单</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-600 hover:bg-gray-50">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">剧变热榜</span>
                </button>
              </div>

              {/* 子分类 */}
              <div className="space-y-1">
                {subCategories.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubCategory(sub.id)}
                    className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors relative ${
                      activeSubCategory === sub.id
                        ? 'text-orange-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {activeSubCategory === sub.id && (
                      <span className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-orange-500 rounded-r"></span>
                    )}
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧主内容区 */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* 榜单类型切换 */}
              <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
                {rankingTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setActiveRankingType(type.id)}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      activeRankingType === type.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {/* 榜单列表 */}
              <div className="space-y-1">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">加载中...</div>
                ) : rankingData.length > 0 ? (
                  rankingData.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group"
                  >
                    {/* 排名 */}
                    <span className={`text-sm font-medium w-8 text-center ${
                      item.rank <= 3 ? 'text-orange-500' : 'text-gray-400'
                    }`}>
                      {item.rank}
                    </span>

                    {/* 标题和标签 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-900 group-hover:text-orange-600 transition-colors">
                          {item.title}
                        </span>
                        {item.tag && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            item.tagColor === 'red'
                              ? 'bg-red-500 text-white'
                              : item.tagColor === 'pink'
                              ? 'bg-pink-500 text-white'
                              : item.tagColor === 'blue'
                              ? 'bg-blue-500 text-white'
                              : 'bg-orange-500 text-white'
                          }`}>
                            {item.tag}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 右侧信息 */}
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {item.rightInfo}
                    </div>
                  </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">暂无数据</div>
                )}
              </div>

              {/* 加载更多 */}
              <div className="mt-6 text-center">
                <button className="px-6 py-2 text-sm text-gray-600 hover:text-orange-600 transition-colors">
                  加载更多
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RankingDetail

