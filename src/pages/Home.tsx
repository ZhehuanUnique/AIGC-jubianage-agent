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
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    // 确保背景视频循环播放
    if (videoRef.current) {
      videoRef.current.loop = true
      const playPromise = videoRef.current.play()
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('背景视频开始播放')
            setVideoLoaded(true)
          })
          .catch(err => {
            console.warn('背景视频自动播放失败:', err)
            setVideoError(true)
          })
      }
    }
  }, [])

  const handleVideoLoaded = () => {
    setVideoLoaded(true)
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.warn('视频播放失败:', err)
      })
    }
  }

  const handleVideoError = () => {
    console.error('视频加载失败')
    setVideoError(true)
  }

  return (
    <div className="w-full h-screen flex flex-col bg-black relative overflow-hidden">
      {/* 背景视频 */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={handleVideoLoaded}
        onError={handleVideoError}
        preload="auto"
      >
        <source src="/index.mp4" type="video/mp4" />
        您的浏览器不支持视频播放。
      </video>

      {/* 视频加载失败时的占位背景 */}
      {videoError && (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-black z-0" />
      )}

      {/* 视频加载中的遮罩 */}
      {!videoLoaded && !videoError && (
        <div className="absolute inset-0 w-full h-full bg-black z-0 flex items-center justify-center">
          <div className="text-white text-sm">加载视频中...</div>
        </div>
      )}

      {/* 内容层 */}
      <div className="relative z-10 flex flex-col h-full">
        {/* 导航栏 */}
        <NavigationBar activeTab="home" />
        
        {/* 主要内容 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-8 relative z-10">
          {/* 中央标语和按钮区域 */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white text-center mb-2 drop-shadow-lg">
              用剧变时代AI
            </h1>
            <button
              onClick={handleClick}
              className="px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl md:text-2xl font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-2xl hover:shadow-purple-500/50 relative z-20 transform hover:scale-105"
            >
              做真人剧
            </button>
            <button
              onClick={handleClick}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white text-base font-medium rounded-full hover:bg-white/30 transition-all duration-300 relative z-20"
            >
              创建项目
            </button>
          </div>

          {/* 横向滚动海报带容器 - 固定在底部 */}
          <div className="w-full space-y-4 relative z-10 mt-auto">
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
