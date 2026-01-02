import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, User, Lock, Sparkles } from 'lucide-react'
import { AuthService } from '../services/auth'

interface LoginProps {
  onLoginSuccess?: () => void
  onClose?: () => void
  isModal?: boolean
}

function Login({ onLoginSuccess, onClose, isModal = false }: LoginProps) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await AuthService.login(username, password)
      
      if (result.success) {
        // 登录成功
        if (onLoginSuccess) {
          onLoginSuccess()
        } else {
          // 如果没有提供回调，使用默认行为
          navigate('/tasks')
        }
      } else {
        setError(result.error || '登录失败')
      }
    } catch (error) {
      console.error('登录错误:', error)
      setError('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-6xl relative overflow-hidden">
      {/* 装饰性背景元素 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full blur-3xl opacity-50 -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full blur-3xl opacity-50 -ml-24 -mb-24"></div>
      
      {/* 关闭按钮 */}
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={28} />
        </button>
      )}

      {/* 标题区域 */}
      <div className="text-center mb-10 relative z-10">
        <div className="inline-flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-purple-500 mr-2" />
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600 bg-clip-text text-transparent">
            剧变时代Agent
          </h1>
        </div>
        <p className="text-gray-500 text-lg mt-3">欢迎回来，请登录您的账户</p>
      </div>

      {/* 表单区域 */}
      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        {/* 用户名输入 */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            用户名
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-lg bg-gray-50 hover:bg-white"
              placeholder="请输入用户名"
              required
              autoFocus
            />
          </div>
        </div>

        {/* 密码输入 */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            密码
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-lg bg-gray-50 hover:bg-white"
              placeholder="请输入密码"
              required
            />
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm font-medium animate-shake">
            {error}
          </div>
        )}

        {/* 登录按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600 text-white rounded-xl hover:from-pink-600 hover:via-purple-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              登录中...
            </span>
          ) : (
            '登录'
          )}
        </button>
      </form>
    </div>
  )

  if (isModal) {
    return content
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center p-4">
      {content}
    </div>
  )
}

export default Login
