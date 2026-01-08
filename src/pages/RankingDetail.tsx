import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Flame, Clock, TrendingUp } from 'lucide-react'
import NavigationBar from '../components/NavigationBar'

// 榜单类型（只保留前两个）
const rankingTypes = [
  { id: 'anime', label: '动态漫剧榜' },
  { id: 'ai-real', label: 'AI短剧榜' },
]

// 示例榜单数据 - 2026年1月热门动态漫剧作品（与后端默认数据一致）
const animeRankingData = [
  { id: 1, title: '《斗罗大陆》', tag: '热', tagColor: 'red', rightInfo: '1,580,000', rank: 1 },
  { id: 2, title: '《完美世界》', tag: '热', tagColor: 'red', rightInfo: '1,420,000', rank: 2 },
  { id: 3, title: '《斗破苍穹》', tag: '热', tagColor: 'red', rightInfo: '1,350,000', rank: 3 },
  { id: 4, title: '《万古神帝》', tag: '新', tagColor: 'pink', rightInfo: '1,280,000', rank: 4 },
  { id: 5, title: '《武动乾坤》', tag: '热', tagColor: 'red', rightInfo: '1,150,000', rank: 5 },
  { id: 6, title: '《遮天》', tag: '新', tagColor: 'pink', rightInfo: '1,080,000', rank: 6 },
  { id: 7, title: '《吞噬星空》', tag: '热', tagColor: 'red', rightInfo: '980,000', rank: 7 },
  { id: 8, title: '《凡人修仙传》', tag: '热', tagColor: 'red', rightInfo: '920,000', rank: 8 },
  { id: 9, title: '《一念永恒》', tag: null, tagColor: null, rightInfo: '850,000', rank: 9 },
  { id: 10, title: '《仙逆》', tag: '新', tagColor: 'pink', rightInfo: '780,000', rank: 10 },
  { id: 11, title: '《神印王座》', tag: null, tagColor: null, rightInfo: '720,000', rank: 11 },
  { id: 12, title: '《雪中悍刀行》', tag: '热', tagColor: 'red', rightInfo: '680,000', rank: 12 },
  { id: 13, title: '《剑来》', tag: '新', tagColor: 'pink', rightInfo: '650,000', rank: 13 },
  { id: 14, title: '《大奉打更人》', tag: null, tagColor: null, rightInfo: '620,000', rank: 14 },
  { id: 15, title: '《诛仙》', tag: null, tagColor: null, rightInfo: '580,000', rank: 15 },
  { id: 16, title: '《牧神记》', tag: '新', tagColor: 'pink', rightInfo: '550,000', rank: 16 },
  { id: 17, title: '《圣墟》', tag: null, tagColor: null, rightInfo: '520,000', rank: 17 },
  { id: 18, title: '《帝霸》', tag: null, tagColor: null, rightInfo: '480,000', rank: 18 },
  { id: 19, title: '《永生》', tag: null, tagColor: null, rightInfo: '450,000', rank: 19 },
  { id: 20, title: '《飞剑问道》', tag: null, tagColor: null, rightInfo: '420,000', rank: 20 },
]

// AI短剧榜数据 - 2026年1月热门AI短剧作品
const aiRealRankingData = [
  { id: 1, title: '《重生之门》', tag: '热', tagColor: 'red', rightInfo: '3,250,000', rank: 1 },
  { id: 2, title: '《闪婚后傅总每天都在追妻》', tag: '热', tagColor: 'red', rightInfo: '2,980,000', rank: 2 },
  { id: 3, title: '《龙王令》', tag: '新', tagColor: 'pink', rightInfo: '2,750,000', rank: 3 },
  { id: 4, title: '《战神归来》', tag: '热', tagColor: 'red', rightInfo: '2,580,000', rank: 4 },
  { id: 5, title: '《豪门弃妇的逆袭》', tag: '新', tagColor: 'pink', rightInfo: '2,420,000', rank: 5 },
  { id: 6, title: '《神医下山》', tag: '热', tagColor: 'red', rightInfo: '2,280,000', rank: 6 },
  { id: 7, title: '《总裁的替嫁新娘》', tag: null, tagColor: null, rightInfo: '2,150,000', rank: 7 },
  { id: 8, title: '《穿越之农门贵女》', tag: '新', tagColor: 'pink', rightInfo: '1,980,000', rank: 8 },
  { id: 9, title: '《绝世神医》', tag: '热', tagColor: 'red', rightInfo: '1,850,000', rank: 9 },
  { id: 10, title: '《霸道总裁爱上我》', tag: null, tagColor: null, rightInfo: '1,720,000', rank: 10 },
  { id: 11, title: '《重生之商界女王》', tag: '新', tagColor: 'pink', rightInfo: '1,650,000', rank: 11 },
  { id: 12, title: '《神豪从退婚开始》', tag: null, tagColor: null, rightInfo: '1,580,000', rank: 12 },
  { id: 13, title: '《离婚后前夫后悔了》', tag: '热', tagColor: 'red', rightInfo: '1,520,000', rank: 13 },
  { id: 14, title: '《都市最强战神》', tag: null, tagColor: null, rightInfo: '1,450,000', rank: 14 },
  { id: 15, title: '《千金归来》', tag: '新', tagColor: 'pink', rightInfo: '1,380,000', rank: 15 },
  { id: 16, title: '《隐婚甜妻》', tag: null, tagColor: null, rightInfo: '1,320,000', rank: 16 },
  { id: 17, title: '《逆袭人生》', tag: null, tagColor: null, rightInfo: '1,250,000', rank: 17 },
  { id: 18, title: '《豪门恩怨》', tag: null, tagColor: null, rightInfo: '1,180,000', rank: 18 },
  { id: 19, title: '《重生之我是大明星》', tag: '新', tagColor: 'pink', rightInfo: '1,120,000', rank: 19 },
  { id: 20, title: '《总裁的秘密情人》', tag: null, tagColor: null, rightInfo: '1,050,000', rank: 20 },
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
                {(activeRankingType === 'anime' ? animeRankingData : aiRealRankingData).map((item) => (
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

