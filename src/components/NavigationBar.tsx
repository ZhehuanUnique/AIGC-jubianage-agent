import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'
import { useState } from 'react'
import SettingsModal from './SettingsModal'

interface NavigationBarProps {
  showBackButton?: boolean
  activeTab?: 'home' | 'project' | 'works' | 'guide'
}

function SettingsButton() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowSettings(true)}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="设置"
      >
        <Settings size={20} />
      </button>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}

function NavigationBar({ showBackButton = false, activeTab = 'home' }: NavigationBarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = () => {
    // 如果在项目相关页面，返回到项目管理
    if (location.pathname.includes('/project/')) {
      navigate('/project-management');
    } else if (location.pathname === '/project-management') {
      // 如果在项目管理页面，返回到首页
      navigate('/')
    } else {
      navigate(-1)
    }
  }

  return (
    <div className="w-full bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      {/* 左侧 */}
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button
            onClick={handleBack}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            返回
          </button>
        )}
        <img 
          src="/logo.png" 
          alt="Logo" 
          className="w-10 h-10 rounded-full object-cover"
        />
        <nav className="flex items-center gap-6">
          <button
            onClick={() => navigate('/')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'home' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            首页
          </button>
          <button
            onClick={() => navigate('/project-management')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'project' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            项目管理
          </button>
          <button
            onClick={() => navigate('/works')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'works' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            作品展示
          </button>
          <button
            onClick={() => navigate('/guide')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'guide' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            创作指引
          </button>
        </nav>
      </div>

      {/* 右侧 */}
      <div className="flex items-center gap-4">
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
          <span className="text-lg">¥</span>
          积分充值
        </button>
        <span className="text-gray-700">积分余额: 4,348</span>
        <SettingsButton />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs">
            👤
          </div>
          <span className="text-gray-700">剧变时代</span>
        </div>
      </div>
    </div>
  )
}

export default NavigationBar
