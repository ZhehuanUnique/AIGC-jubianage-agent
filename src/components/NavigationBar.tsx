import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import SettingsModal from './SettingsModal'
import { AuthService } from '../services/auth'

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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ username: string; displayName: string } | null>(null)
  const [balance, setBalance] = useState<string>('')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const isLoadingBalanceRef = useRef(false) // 用于防止重复请求
  const lastBalanceRef = useRef<string>('') // 记录上次的余额，避免不必要的更新

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
    const hasExistingBalance = lastBalanceRef.current && lastBalanceRef.current !== ''
    const shouldShowLoading = !silent || !hasExistingBalance
    
    isLoadingBalanceRef.current = true
    if (shouldShowLoading) {
      setIsLoadingBalance(true)
    }
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'
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
    
    const checkAuth = async () => {
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
      
      // 验证 token
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
    }
    
    checkAuth()
    
    // 监听登录状态变化（包括同窗口的 localStorage 变化）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'auth_user') {
        checkAuth()
      }
    }
    
    // 监听自定义事件（用于同窗口内的登录状态变化）
    const handleAuthChange = () => {
      checkAuth()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth-changed', handleAuthChange)
    
    // 定期刷新积分余额（如果已登录，且不在加载中）
    // 使用静默模式，避免显示"加载中..."
    const interval = setInterval(() => {
      const token = AuthService.getToken()
      if (token && !isLoadingBalanceRef.current) {
        loadBalance(false, true) // 静默刷新，不显示"加载中..."
      }
    }, 30000) // 每30秒刷新一次
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-changed', handleAuthChange)
      clearInterval(interval)
    }
  }, []) // 只在组件挂载时执行一次

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

      {/* 右侧 - 仅在登录时显示 */}
      {isAuthenticated && user && (
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
            <span className="text-lg">¥</span>
            积分充值
          </button>
          <span className="text-gray-700">
            积分余额: {isLoadingBalance ? '加载中...' : balance}
          </span>
          <SettingsButton />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs">
              👤
            </div>
            <span className="text-gray-700">
              {user.displayName || user.username || '用户'}
            </span>
            {(user.username === 'Chiefavefan' || user.username === 'jubian888') && (
              <span className="text-xs text-gray-500 ml-1">
                ({getUserRoleDisplay(user.username)})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NavigationBar
