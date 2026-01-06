import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Flame, Clock, TrendingUp } from 'lucide-react'
import NavigationBar from '../components/NavigationBar'

// 榜单类型
const rankingTypes = [
  { id: 'anime', label: '动态漫榜' },
  { id: 'ai-real', label: 'AI真人榜' },
  { id: 'short-drama', label: '短剧榜' },
  { id: 'trending', label: '热搜榜' },
  { id: 'popular', label: '热门榜' },
]

// 示例榜单数据
const rankingData = [
  { id: 1, title: '日本年轻人聚众晒梅毒', tag: '热', tagColor: 'red', rightInfo: '好友正在看', rank: 1 },
  { id: 2, title: '吴世勋 danking', rightInfo: '下午霸榜', rank: 2 },
  { id: 3, title: '关晓彤 未来请幸福', tag: '新', tagColor: 'pink', rightInfo: '98186', rank: 3 },
  { id: 4, title: '月薪一万的工作强度', tag: '热', tagColor: 'red', rightInfo: '186195', rank: 4 },
  { id: 5, title: '霸王茶姬通报', rightInfo: '13:17登顶', rank: 5 },
  { id: 6, title: '童锦程不纠缠是最后的体面', rightInfo: '11:26登顶', rank: 6 },
  { id: 7, title: '马杜罗跪着艰难爬上囚车', rightInfo: '45273', rank: 7 },
  { id: 8, title: '女子以油养肤导致面部疯狂掉皮', rightInfo: '286793', rank: 8 },
  { id: 9, title: '冯提莫瘦了50斤', rightInfo: '12:06登顶', rank: 9 },
  { id: 10, title: '日本梅毒扩散', tag: '热', tagColor: 'red', rightInfo: '下午霸榜', rank: 10 },
  { id: 11, title: '小洛熙爸爸', rightInfo: '53707', rank: 11 },
  { id: 12, title: '霸王茶姬手打', rightInfo: '62291', rank: 12 },
  { id: 13, title: '羽绒服一下就洗干净了', tag: '新', tagColor: 'pink', rightInfo: '98003', rank: 13 },
  { id: 14, title: '范丞丞线上呕完线下也呕了', rightInfo: '50339', rank: 14 },
  { id: 15, title: '骄阳似我大结局', tag: '新', tagColor: 'pink', rightInfo: '18:26登顶', rank: 15 },
]

function RankingDetail() {
  const navigate = useNavigate()
  const { type } = useParams<{ type?: string }>()
  const [activeRankingType, setActiveRankingType] = useState(type || 'anime')
  const [activeSubCategory, setActiveSubCategory] = useState('my')

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
                {rankingData.map((item) => (
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
                ))}
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

