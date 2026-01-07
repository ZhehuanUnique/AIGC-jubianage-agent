import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, MessageCircle, Share2, Eye, MoreVertical, Search, Home, Video, Compass, Gamepad2, User, MessageSquare, Settings, Bookmark, Crown, CheckCircle } from 'lucide-react'
import { getCommunityVideos, CommunityVideo } from '../services/api'
import NavigationBar from '../components/NavigationBar'
import HamsterLoader from '../components/HamsterLoader'

function UserProfile() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'featured' | 'posts' | 'videos' | 'albums'>('posts')
  const [videos, setVideos] = useState<CommunityVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)

  // 模拟用户数据（实际应该从API获取）
  const userProfile = {
    username: username || '用户',
    displayName: username || '用户',
    avatar: '',
    followers: 647000, // 64.7万
    following: 12,
    totalInteractions: 97250000, // 972.5万
    description: '热门搞笑幽默博主数据飙升',
    stats: {
      yesterdayPosts: 5,
      reads: 100000,
      interactions: 3173,
    },
    verified: username === 'Chiefavefan',
    verifiedType: '搞笑幽默博主',
    isRealName: true,
    ipLocation: '上海',
    fanGroup: {
      name: '一杯芝士',
      members: 955,
      owner: username || '用户',
    },
  }

  // 加载用户的视频/帖子
  useEffect(() => {
    const loadUserVideos = async () => {
      try {
        setIsLoading(true)
        // 这里应该调用获取特定用户视频的API
        // 暂时使用获取所有视频，然后过滤
        const result = await getCommunityVideos({ page: 1, limit: 100 })
        const userVideos = result.videos.filter(v => v.username === username)
        setVideos(userVideos)
      } catch (error) {
        console.error('加载用户视频失败:', error)
        setVideos([])
      } finally {
        setIsLoading(false)
      }
    }

    if (username) {
      loadUserVideos()
    }
  }, [username])

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`
    }
    return num.toLocaleString()
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

  // 获取第一个视频作为顶部视频
  const featuredVideo = videos.find(v => v.videoUrl) || videos[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar activeTab="community" />
      
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* 左侧：Logo 和搜索 */}
            <div className="flex items-center gap-4 flex-1">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/community')}
              >
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  剧
                </div>
                <span className="text-xl font-bold text-red-500">剧变</span>
              </div>
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索剧变"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                />
              </div>
            </div>

            {/* 右侧：导航图标 */}
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1 text-gray-700 hover:text-red-500 transition-colors">
                <Home className="w-5 h-5" />
                <span>首页</span>
              </button>
              <button className="flex items-center gap-1 text-gray-700 hover:text-red-500 transition-colors">
                <Video className="w-5 h-5" />
                <span>视频</span>
              </button>
              <button className="flex items-center gap-1 text-gray-700 hover:text-red-500 transition-colors">
                <Compass className="w-5 h-5" />
                <span>发现</span>
              </button>
              <button className="flex items-center gap-1 text-gray-700 hover:text-red-500 transition-colors">
                <Gamepad2 className="w-5 h-5" />
                <span>游戏</span>
              </button>
              <button className="relative">
                <MessageSquare className="w-5 h-5 text-gray-700" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">21</span>
              </button>
              <button>
                <Settings className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* 左侧：主内容 */}
          <div className="flex-1 min-w-0">
            {/* 顶部视频播放器 */}
            {featuredVideo && (
              <div className="relative bg-black rounded-lg overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
                <button
                  onClick={() => navigate('/community')}
                  className="absolute top-4 left-4 z-10 w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {featuredVideo.videoUrl ? (
                  <video
                    src={featuredVideo.videoUrl}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    muted
                  />
                ) : featuredVideo.thumbnailUrl ? (
                  <img
                    src={featuredVideo.thumbnailUrl}
                    alt={featuredVideo.title}
                    className="w-full h-full object-contain"
                  />
                ) : null}
              </div>
            )}

            {/* 用户信息卡片 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-start gap-4 mb-4">
                {userProfile.avatar ? (
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.username}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl border-2 border-gray-200">
                    {userProfile.username[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">{userProfile.displayName}</h1>
                    {userProfile.verified && (
                      <div className="flex items-center gap-1">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">II</span>
                      </div>
                    )}
                  </div>
                  
                  {/* 统计数据 */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span><span className="font-semibold text-gray-900">{formatNumber(userProfile.followers)}</span> 粉丝</span>
                    <span><span className="font-semibold text-gray-900">{userProfile.following}</span> 关注</span>
                    <span><span className="font-semibold text-gray-900">{formatNumber(userProfile.totalInteractions)}</span> 转评赞</span>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setIsFollowing(!isFollowing)}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        isFollowing
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {isFollowing ? '已关注' : '+关注'}
                    </button>
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                      留言
                    </button>
                    <button className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 用户描述和统计 */}
                  <div className="text-sm text-gray-600 mb-2">
                    <p>{userProfile.description}</p>
                    <p className="mt-1">昨日发博{userProfile.stats.yesterdayPosts}, 阅读数{formatNumber(userProfile.stats.reads)}+, 互动数{userProfile.stats.interactions}</p>
                  </div>

                  {/* 认证信息 */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {userProfile.verifiedType && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {userProfile.verifiedType}
                      </span>
                    )}
                    {userProfile.isRealName && (
                      <span>已实名</span>
                    )}
                    {userProfile.ipLocation && (
                      <span>IP属地:{userProfile.ipLocation}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 内容标签 */}
              <div className="flex items-center gap-1 border-t border-gray-200 pt-4">
                <button
                  onClick={() => setActiveTab('featured')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'featured'
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  精选
                </button>
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'posts'
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  微博
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'videos'
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  视频
                </button>
                <button
                  onClick={() => setActiveTab('albums')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'albums'
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  相册
                </button>
              </div>
            </div>

            {/* 帖子列表 */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">全部微博 ({videos.length})</h3>
                  <span className="text-gray-400">▼</span>
                </div>
                <div className="flex-1 max-w-xs relative ml-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="搜索她的微博"
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-sm"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <HamsterLoader size={8} />
                  <p className="mt-4 text-gray-600">加载中...</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <p>暂无内容</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {videos.map((video, index) => (
                    <div key={video.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3 mb-3">
                        {userProfile.avatar ? (
                          <img
                            src={userProfile.avatar}
                            alt={userProfile.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {userProfile.username[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{userProfile.username}</span>
                            {index === 0 && (
                              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">置顶</span>
                            )}
                            {userProfile.verified && (
                              <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">V</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{formatTime(video.publishedAt)}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-gray-900 leading-relaxed">{video.title}</p>
                        {video.description && (
                          <p className="text-gray-700 text-sm mt-2">{video.description}</p>
                        )}
                      </div>

                      {video.thumbnailUrl && (
                        <div className="mb-3 rounded-lg overflow-hidden">
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full max-w-md h-auto object-cover"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-gray-600">
                        <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                          <Heart className="w-5 h-5" />
                          <span className="text-sm">{video.likesCount || 0}</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                          <MessageCircle className="w-5 h-5" />
                          <span className="text-sm">0</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-green-500 transition-colors">
                          <Share2 className="w-5 h-5" />
                          <span className="text-sm">0</span>
                        </button>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Eye className="w-5 h-5" />
                          <span className="text-sm">{video.viewsCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右侧边栏 */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="space-y-4">
              {/* 常用功能 */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-3">常用功能</h3>
                <button className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4" />
                  <span>为TA助威</span>
                  <span className="text-xs bg-orange-600 px-1.5 py-0.5 rounded">V+</span>
                </button>
              </div>

              {/* 粉丝群 */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-3">粉丝群</h3>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{userProfile.fanGroup.name}</p>
                    <p className="text-sm text-gray-500">{userProfile.fanGroup.members}人</p>
                  </div>
                </div>
                <button className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium mb-2">
                  加入群
                </button>
                <p className="text-xs text-gray-500">群主:{userProfile.fanGroup.owner}</p>
              </div>

              {/* 关注推荐 */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">关注推荐</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>1</span>
                    <span>/</span>
                    <span>8</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { name: '桃心便当', desc: '搞笑幽默博主', avatar: '' },
                    { name: '煎饼多加洋芋', desc: '设计美学博主', avatar: '' },
                    { name: '大头和他的朋友...', desc: '微博喜剧写手,编...', avatar: '' },
                    { name: '小酷宝', desc: '超话创作官(表情...', avatar: '' },
                  ].map((user, index) => (
                    <div key={index} className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.desc}</p>
                      </div>
                      <button className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition-colors whitespace-nowrap">
                        +关注
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 帮助链接 */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="space-y-2 text-sm">
                  <a href="#" className="block text-gray-600 hover:text-orange-500 transition-colors">帮助中心</a>
                  <a href="#" className="block text-gray-600 hover:text-orange-500 transition-colors">合作&服务</a>
                  <a href="#" className="block text-gray-600 hover:text-orange-500 transition-colors">举报中心</a>
                  <a href="#" className="block text-gray-600 hover:text-orange-500 transition-colors">关于剧变</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile

