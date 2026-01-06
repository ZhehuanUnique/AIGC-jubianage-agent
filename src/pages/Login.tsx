import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
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
          // 如果没有提供回调，默认停留在当前页面（首页）
          // 不进行跳转
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
    <div className="flex justify-center items-center h-full w-full">
      <div className="grid gap-8 w-full max-w-md">
        <section
          id="back-div"
          className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl relative"
        >
          {/* 关闭按钮 */}
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors z-10"
            >
              <X size={24} />
            </button>
          )}
          
          <div
            className="border-8 border-transparent rounded-xl bg-white dark:bg-gray-900 shadow-xl p-8 m-2"
          >
            <h1
              className="text-5xl font-bold text-center cursor-default dark:text-gray-300 text-gray-900 mb-6"
            >
              剧变时代Agent
            </h1>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block mb-2 text-lg dark:text-gray-300 text-gray-700">
                  用户名
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border p-3 shadow-md dark:bg-indigo-700 dark:text-gray-300 dark:border-gray-700 border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 transition transform hover:scale-105 duration-300"
                  placeholder="请输入用户名"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="password" className="block mb-2 text-lg dark:text-gray-300 text-gray-700">
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border p-3 shadow-md dark:bg-indigo-700 dark:text-gray-300 dark:border-gray-700 border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 transition transform hover:scale-105 duration-300"
                  placeholder="请输入密码"
                  required
                />
              </div>
              
              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}
              
              <a href="#" className="text-blue-400 text-sm transition hover:underline">
                忘记密码？
              </a>
              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 mt-4 text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:scale-105 transition transform duration-300 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
            <div className="flex flex-col mt-4 text-sm text-center dark:text-gray-300 text-gray-600">
              <p>
                还没有账户？
                <a href="#" className="text-blue-400 transition hover:underline ml-1">
                  点击注册
                </a>
              </p>
            </div>
            <div id="third-party-auth" className="flex justify-center gap-4 mt-5">
              {/* 第三方登录按钮占位，后续实现 */}
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>
                点击登录，即代表同意
                <a href="/user-agreement" target="_blank" className="text-blue-400 transition hover:underline mx-1">
                  《用户协议》
                </a>
                和
                <a href="/privacy-policy" target="_blank" className="text-blue-400 transition hover:underline ml-1">
                  《隐私政策》
                </a>
                。
              </p>
            </div>
          </div>
        </section>
      </div>
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
