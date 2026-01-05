import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import NavigationBar from '../components/NavigationBar'
import { AuthService } from '../services/auth'
import Login from './Login'
import PosterCarousel from '../components/PosterCarousel'

function Home() {
  const navigate = useNavigate()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // 检查是否已登录
    const checkAuth = async () => {
      const authenticated = await AuthService.verifyToken()
      setIsAuthenticated(authenticated)
    }
    checkAuth()
    
    // 监听登录状态变化
    const handleAuthChange = () => {
      checkAuth()
    }
    
    window.addEventListener('auth-changed', handleAuthChange)
    
    return () => {
      window.removeEventListener('auth-changed', handleAuthChange)
    }
  }, [])

  const handleClick = async () => {
    // 先检查是否已登录
    const authenticated = await AuthService.verifyToken()
    if (authenticated) {
      // 如果已登录，直接跳转到任务列表
      navigate('/tasks')
    } else {
      // 如果未登录，显示登录模态框
      setShowLoginModal(true)
    }
  }

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    setIsAuthenticated(true)
    navigate('/tasks')
  }

  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // 确保背景视频循环播放
    if (videoRef.current) {
      videoRef.current.loop = true
      videoRef.current.play().catch(err => {
        console.warn('背景视频自动播放失败:', err)
      })
    }
  }, [])

  return (
    <div className="w-full h-screen flex flex-col bg-white relative overflow-hidden">
      {/* 背景视频 */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/index.mp4" type="video/mp4" />
      </video>

      {/* 内容层 */}
      <div className="relative z-10 flex flex-col h-full">
        {/* 导航栏 */}
        <NavigationBar activeTab="home" />
        
        {/* 主要内容 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-8">
          <button
            onClick={handleClick}
            className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl font-semibold rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl relative z-20"
          >
            剧变时代Agent
          </button>

          {/* 横向滚动海报带容器 */}
          <div className="w-full space-y-6 relative z-10">
            {/* 横向滚动海报带 - 7:10 */}
            <div className="w-full">
              <PosterCarousel posterFolder="7：10" />
            </div>

            {/* 横向滚动海报带 - 3:4（放在7:10壳子里） */}
            <div className="w-full">
              <PosterCarousel posterFolder="3：4" />
            </div>
          </div>
        </div>
      </div>

      {/* 登录模态框 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowLoginModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="animate-scaleIn">
            <Login 
              isModal={true}
              onLoginSuccess={handleLoginSuccess} 
              onClose={() => setShowLoginModal(false)} 
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
