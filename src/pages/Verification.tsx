import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Home, Video, Compass, Gamepad2, User, MessageSquare, Settings, Bookmark } from 'lucide-react'
import NavigationBar from '../components/NavigationBar'

function Verification() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'personal' | 'organization'>('personal')

  return (
    <div className="min-h-screen bg-white">
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
                  placeholder="搜索剧变、找人"
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
              <button className="flex items-center gap-1 text-gray-700 hover:text-red-500 transition-colors">
                <User className="w-5 h-5" />
                <span>用户7715342275</span>
              </button>
              <button className="relative">
                <MessageSquare className="w-5 h-5 text-gray-700" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">21</span>
              </button>
              <button>
                <Settings className="w-5 h-5 text-gray-700" />
              </button>
              <button>
                <Bookmark className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* 顶部横幅 - 橙色渐变背景 */}
        <div className="relative bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 rounded-2xl p-12 mb-8 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}></div>
          </div>
          
          <div className="relative flex items-center justify-between">
            {/* 左侧：Logo 和文字 */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-4xl font-bold">V</span>
                  </div>
                </div>
                <div className="text-white text-lg font-semibold mb-1">剧变认证</div>
                <div className="text-white text-sm opacity-90">verified.jubian.com</div>
              </div>
              
              <div>
                <h1 className="text-5xl font-bold text-yellow-200 mb-2">剧变认证</h1>
                <p className="text-xl text-yellow-100">独有标识,彰显不同身份</p>
              </div>
            </div>

            {/* 右侧：V 标识图标 */}
            <div className="relative">
              <div className="w-32 h-32 bg-yellow-300 rounded-full flex items-center justify-center shadow-2xl">
                <span className="text-white text-6xl font-bold">V</span>
              </div>
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">⭐</span>
              </div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="absolute top-1/2 -right-8 w-6 h-6 bg-yellow-400 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs">🏢</span>
              </div>
            </div>
          </div>
        </div>

        {/* 认证体系标题 */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">剧变认证体系</h2>
          <p className="text-gray-500 mb-6">CERTIFICATION SYSTEM</p>
          
          {/* 标签切换 */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'personal'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              个人认证
            </button>
            <button
              onClick={() => setActiveTab('organization')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'organization'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              组织认证
            </button>
          </div>
        </div>

        {/* 个人认证内容 */}
        {activeTab === 'personal' && (
          <>
            {/* 两个认证卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {/* 左侧卡片：真人快捷认证 */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">真人快捷认证</h3>
                <p className="text-gray-600 text-sm mb-6">认证真实个人资料,即可点亮黄V标识,获得认证特权。</p>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-gray-700">头像本人认证</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 text-xl">🎓</span>
                    </div>
                    <span className="text-gray-700">工作信息认证</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 text-xl">📚</span>
                    </div>
                    <span className="text-gray-700">教育信息认证</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 text-xl">💬</span>
                    </div>
                    <span className="text-gray-700">超话兴趣认证</span>
                  </div>
                </div>
                
                <button className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold">
                  去认证 &gt;
                </button>
              </div>

              {/* 右侧卡片：创作者专属认证 */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">创作者专属认证</h3>
                <p className="text-gray-600 text-sm mb-6">面向专业创作者的专属认证渠道,完成认证,享受专属创作权益</p>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-gray-700">身份认证</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 text-xl">⭐</span>
                    </div>
                    <span className="text-gray-700">兴趣博主认证</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Video className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-gray-700">视频博主认证</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 text-xl">💬</span>
                    </div>
                    <span className="text-gray-700">超话社区认证</span>
                  </div>
                </div>
                
                <button className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold">
                  去认证 &gt;
                </button>
              </div>
            </div>

            {/* 个人认证等级 */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">个人认证等级</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 黄V */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                  <div className="text-center mb-4">
                    <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <span className="text-white text-4xl font-bold">V</span>
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900">黄V</h4>
                    <p className="text-sm text-gray-600">认证作者</p>
                  </div>
                  <div className="flex items-start gap-2 mb-4">
                    <span className="text-yellow-600">✓</span>
                    <p className="text-sm text-gray-700">完成个人认证,点亮黄V 标识,彰显不同身份</p>
                  </div>
                </div>

                {/* 橙V */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                  <div className="text-center mb-4">
                    <div className="w-20 h-20 bg-orange-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <span className="text-white text-4xl font-bold">V</span>
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900">橙V</h4>
                    <p className="text-sm text-gray-600">优质创作者</p>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-600">✓</span>
                      <p className="text-sm text-gray-700">已认证黄V</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-600">✓</span>
                      <p className="text-sm text-gray-700">铁粉数≥100</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-600">✓</span>
                      <p className="text-sm text-gray-700">近30天阅读量≥30万</p>
                    </div>
                  </div>
                  <button className="w-full py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold">
                    了解详情 &gt;
                  </button>
                </div>

                {/* 金V */}
                <div className="bg-gradient-to-br from-red-50 to-pink-100 rounded-xl p-6 border border-red-200">
                  <div className="text-center mb-4">
                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <span className="text-white text-4xl font-bold">V</span>
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900">金V</h4>
                    <p className="text-sm text-gray-600">高影响力创作者</p>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <span className="text-red-600">✓</span>
                      <p className="text-sm text-gray-700">已认证黄V</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-600">✓</span>
                      <p className="text-sm text-gray-700">粉丝量≥1万</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-600">✓</span>
                      <p className="text-sm text-gray-700">铁粉数≥1000</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-600">✓</span>
                      <p className="text-sm text-gray-700">近30天阅读量≥1000万</p>
                    </div>
                  </div>
                  <button className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-semibold">
                    了解详情 &gt;
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 组织认证内容 */}
        {activeTab === 'organization' && (
          <div>
            {/* 组织认证标题横幅 */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-8 mb-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">组织认证</h2>
              <p className="text-blue-100">企业、机构等官方组织认证</p>
            </div>

            {/* 组织认证类型网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {[
                { icon: '💼', title: '企业认证', desc: '营利性组织、企业、个体工商户等' },
                { icon: '🏢', title: '机构认证', desc: '粉丝团工作室、影视综官微、游戏体育赛事、出版社、文化公司等机构' },
                { icon: '🏛️', title: '政府认证', desc: '广电、市政、税务单位等' },
                { icon: '📺', title: '媒体认证', desc: '电视电台、报纸杂志、媒体网站、垂直网站等' },
                { icon: '🎓', title: '校园认证', desc: '学校、校友会等' },
                { icon: '❤️', title: '公益认证', desc: '扶贫、支教、扶孤助残等' },
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow cursor-pointer">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">{item.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">{item.title}</h3>
                  <p className="text-sm text-gray-600 text-center">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 常见问题 */}
        <div className="mt-16 mb-8">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-3 h-3 bg-orange-500 transform rotate-45"></div>
            <h3 className="text-2xl font-bold text-gray-900">常见问题</h3>
            <span className="text-gray-500">Q&A</span>
            <div className="w-3 h-3 bg-orange-500 transform rotate-45"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <button className="w-full text-left text-gray-700 hover:text-orange-500 transition-colors">
                如何申请个人身份认证?
              </button>
              <button className="w-full text-left text-gray-700 hover:text-orange-500 transition-colors">
                认证周期所需时间以及认证进度查询?
              </button>
              <button className="w-full text-left text-gray-700 hover:text-orange-500 transition-colors">
                如何修改身份认证说明?
              </button>
            </div>
            <div className="space-y-4">
              <button className="w-full text-left text-gray-700 hover:text-orange-500 transition-colors">
                如何申请兴趣认证?
              </button>
              <button className="w-full text-left text-gray-700 hover:text-orange-500 transition-colors">
                个人认证后能否修改昵称,如何修改?
              </button>
              <button className="w-full text-left text-orange-500 hover:text-orange-600 transition-colors font-semibold">
                更多常见问题 &gt;&gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Verification

