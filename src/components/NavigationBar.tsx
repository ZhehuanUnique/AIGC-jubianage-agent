import { useNavigate, useLocation } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import SettingsModal from './SettingsModal'
import { AuthService } from '../services/auth'

interface NavigationBarProps {
  activeTab?: 'home' | 'project' | 'works' | 'community' | 'guide' | 'recharge'
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

function NavigationBar({ activeTab = 'home' }: NavigationBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ username: string; displayName: string } | null>(null)
  const [balance, setBalance] = useState<string>('')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const isLoadingBalanceRef = useRef(false) // 用于防止重复请求
  const lastBalanceRef = useRef<string>('') // 记录上次的余额，避免不必要的更新

  // 检测是否为移动设备
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  // 获取用户角色显示名称
  const getUserRoleDisplay = (username: string): string => {
    if (username === 'Chiefavefan') {
      return '超级管理员'
    }
    if (username === 'jubian888') {
      return '高级管理员'
    }
    return '普通用户'
  }

  // 加载积分余额（添加防重复请求机制）
  const loadBalance = async (force = false, silent = false) => {
    // 如果正在加载中且不是强制刷新，则跳过
    if (isLoadingBalanceRef.current && !force) {
      return
    }
    
    // 如果已有余额且是静默刷新，不显示"加载中..."
    const hasExistingBalance = lastBalanceRef.current && lastBalanceRef.current !== '' && lastBalanceRef.current !== '0'
    // 显示"加载中..."的条件：不是静默模式，或者没有已有余额，或者是强制刷新
    const shouldShowLoading = !silent || !hasExistingBalance || force
    
    isLoadingBalanceRef.current = true
    if (shouldShowLoading) {
      setIsLoadingBalance(true)
    }
    
    try {
      // 生产环境使用相对路径，开发环境使用完整URL
      const API_BASE_URL = (() => {
        if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
        const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
        return isProduction ? '' : 'http://localhost:3002'
      })()
      const token = AuthService.getToken()
      
      if (!token) {
        setBalance('')
        lastBalanceRef.current = ''
        return
      }
      
      const response = await fetch(`${API_BASE_URL}/api/user/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const newBalance = result.displayBalance || '0'
          // 只有余额真正改变时才更新，避免不必要的重新渲染
          if (newBalance !== lastBalanceRef.current) {
            setBalance(newBalance)
            lastBalanceRef.current = newBalance
          }
        } else {
          if (lastBalanceRef.current !== '0') {
            setBalance('0')
            lastBalanceRef.current = '0'
          }
        }
      } else {
        if (lastBalanceRef.current !== '0') {
          setBalance('0')
          lastBalanceRef.current = '0'
        }
      }
    } catch (error) {
      console.error('获取积分余额失败:', error)
      if (lastBalanceRef.current !== '0') {
        setBalance('0')
        lastBalanceRef.current = '0'
      }
    } finally {
      if (shouldShowLoading) {
        setIsLoadingBalance(false)
      }
      isLoadingBalanceRef.current = false
    }
  }

  // 检查登录状态
  useEffect(() => {
    let lastAuthState = false // 记录上次的认证状态
    let lastUserId: number | null = null // 记录上次的用户ID
    let isChecking = false // 防止重复检查
    
    const checkAuth = async () => {
      // 如果正在检查中，跳过
      if (isChecking) {
        return
      }
      
      isChecking = true
      try {
        const token = AuthService.getToken()
        
        // 如果没有 token，直接设置为未登录
        if (!token) {
          setIsAuthenticated(false)
          setUser(null)
          setBalance('')
          lastAuthState = false
          lastUserId = null
          return
        }
        
        // 验证 token（不触发事件，避免循环）
        const authenticated = await AuthService.verifyToken()
        const currentUser = AuthService.getCurrentUser()
        const currentUserId = currentUser?.id || null
        
        // 只有在认证状态或用户真正改变时才更新
        const authStateChanged = authenticated !== lastAuthState
        const userChanged = currentUserId !== lastUserId
        
        setIsAuthenticated(authenticated)
        
        if (authenticated && currentUser) {
          setUser(currentUser)
          lastUserId = currentUserId
          
          // 只有在认证状态改变或用户改变时才加载余额
          if (authStateChanged || userChanged) {
            loadBalance(true, false) // 强制刷新，显示"加载中..."
          } else if (lastBalanceRef.current === '') {
            // 如果还没有余额，静默加载一次
            loadBalance(false, true)
          }
        } else {
          setUser(null)
          setBalance('')
          lastUserId = null
        }
        
        lastAuthState = authenticated
      } finally {
        isChecking = false
      }
    }
    
    checkAuth()
    
    // 监听登录状态变化（包括同窗口的 localStorage 变化）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'auth_user') {
        // 延迟执行，避免与当前检查冲突
        setTimeout(checkAuth, 100)
      }
    }
    
    // 监听自定义事件（用于同窗口内的登录状态变化）
    // 添加防抖，避免频繁触发
    let authChangeTimeout: ReturnType<typeof setTimeout> | null = null
    const handleAuthChange = () => {
      if (authChangeTimeout) {
        clearTimeout(authChangeTimeout)
      }
      authChangeTimeout = setTimeout(() => {
        checkAuth()
      }, 200) // 200ms 防抖
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth-changed', handleAuthChange)
    
    // 定期刷新积分余额（如果已登录，且不在加载中）
    // 使用静默模式，避免显示"加载中..."
    const interval = setInterval(() => {
      const token = AuthService.getToken()
      if (token && !isLoadingBalanceRef.current && !isChecking) {
        loadBalance(false, true) // 静默刷新，不显示"加载中..."
      }
    }, 30000) // 每30秒刷新一次
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-changed', handleAuthChange)
      clearInterval(interval)
      if (authChangeTimeout) {
        clearTimeout(authChangeTimeout)
      }
    }
  }, []) // 只在组件挂载时执行一次

  const handleBack = () => {
    // 如果在项目相关页面，返回到项目管理
    if (location.pathname.includes('/project/')) {
      navigate('/project-management');
    } else if (location.pathname === '/project-management') {
      // 如果在项目管理页面，根据设备类型返回
      // 电脑端返回到首页（/），手机端返回到作品展示（/works）
      navigate(isMobile ? '/works' : '/')
    } else {
      navigate(-1)
    }
  }

  // 处理首页按钮点击
  const handleHomeClick = () => {
    // 电脑端跳转到首页（/），手机端跳转到作品展示（/works）
    navigate(isMobile ? '/works' : '/')
  }

  return (
    <div className={`w-full ${activeTab === 'home' ? 'bg-transparent border-transparent absolute top-0 left-0 z-20' : 'bg-white border-b border-gray-200'} px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between`}>
      {/* 左侧 */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        <img 
          src="/logo.png" 
          alt="Logo" 
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
        />
        <nav className="hidden md:flex items-center">
          <div className="glass-radio-group">
            <input 
              type="radio" 
              name="nav-plan" 
              id="glass-home" 
              checked={(isMobile ? activeTab === 'works' : activeTab === 'home')}
              readOnly
            />
            <label 
              htmlFor="glass-home"
              onClick={handleHomeClick}
            >
              首页
            </label>

            <input 
              type="radio" 
              name="nav-plan" 
              id="glass-project" 
              checked={activeTab === 'project'}
              readOnly
            />
            <label 
              htmlFor="glass-project"
              onClick={async () => {
                // 检查是否已登录
                const authenticated = await AuthService.verifyToken()
                if (authenticated) {
                  navigate('/project-management')
                } else {
                  // 未登录，跳转到首页并显示登录模态框
                  navigate('/?showLogin=true')
                }
              }}
            >
              项目管理
            </label>

            <input 
              type="radio" 
              name="nav-plan" 
              id="glass-works" 
              checked={activeTab === 'works'}
              readOnly
            />
            <label 
              htmlFor="glass-works"
              onClick={() => navigate('/works')}
            >
              作品展示
            </label>

            <input 
              type="radio" 
              name="nav-plan" 
              id="glass-community" 
              checked={activeTab === 'community'}
              readOnly
            />
            <label 
              htmlFor="glass-community"
              onClick={() => navigate('/community')}
            >
              社区
            </label>

            <input 
              type="radio" 
              name="nav-plan" 
              id="glass-guide" 
              checked={activeTab === 'guide'}
              readOnly
            />
            <label 
              htmlFor="glass-guide"
              onClick={() => window.open('https://e60nf37yjb.feishu.cn/wiki/FRwpwbfB1inQbskzC7dcw4HxnuK', '_blank')}
            >
              创作指引
            </label>

            <div className="glass-glider"></div>
          </div>
        </nav>
      </div>

      {/* 右侧 - 仅在登录时显示 */}
      {isAuthenticated && user && (
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              navigate('/credit-recharge')
            }}
            className="Btn"
          >
          </button>
          <span className="text-xs sm:text-sm lg:text-base text-gray-700 hidden sm:inline">
            积分余额: {isLoadingBalance ? '加载中...' : balance}
          </span>
          <span className="text-xs text-gray-700 sm:hidden">
            {isLoadingBalance ? '...' : balance}
          </span>
          <SettingsButton />
          <div 
            className="relative flex items-center gap-2 group cursor-pointer"
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs">
              👤
            </div>
            <span className="text-gray-700 group-hover:hidden transition-opacity">
              {user.username === 'Chiefavefan' || user.username === 'jubian888' 
                ? getUserRoleDisplay(user.username)
                : (user.displayName || user.username || '用户')}
            </span>
            <span 
              className="text-red-500 hidden group-hover:inline font-medium transition-opacity cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                AuthService.logout()
                navigate('/')
              }}
            >
              退出登录
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default NavigationBar
