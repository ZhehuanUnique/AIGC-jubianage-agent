import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import NavigationBar from '../components/NavigationBar'
import { AuthService } from '../services/auth'
import Login from './Login'

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

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* 导航栏 */}
      <NavigationBar activeTab="home" />
      
      {/* 主要内容 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <button
          onClick={handleClick}
          className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl font-semibold rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          剧变时代Agent
        </button>
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
