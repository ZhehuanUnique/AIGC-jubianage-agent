import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Film, Trash2, ChevronLeft, ChevronRight, ArrowLeft, Check } from 'lucide-react'
import ModeSelectionModal from '../components/ModeSelectionModal'
import { getTasks, deleteTask, Task } from '../services/api'
import { alertError, alertInfo } from '../utils/alert'

interface TaskDisplay extends Task {
  isExpanded: boolean
  isCompleted1: boolean
  isCompleted2: boolean // 是否完成第二步（有 project_id 且 analysis_result 存在）
}

function TaskList() {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<TaskDisplay | null>(null)
  const [tasks, setTasks] = useState<TaskDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 检查后端服务状态
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        // 生产环境使用相对路径，开发环境使用完整URL
        const API_BASE_URL = (() => {
          if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
          const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
          return isProduction ? '' : 'http://localhost:3002'
        })()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        
        const response = await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          setBackendStatus('online')
        } else {
          setBackendStatus('offline')
        }
      } catch (error) {
        console.warn('后端服务健康检查失败:', error)
        setBackendStatus('offline')
      }
    }
    
    checkBackendHealth()
  }, [])

  // 从API加载任务
  useEffect(() => {
    if (backendStatus === 'online') {
      loadTasks()
      
      // 每10秒自动刷新一次（静默模式，不显示加载状态）
      refreshIntervalRef.current = setInterval(() => {
        loadTasks(true) // 静默刷新
      }, 10000)
      
      // 页面可见时刷新（静默模式）
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          loadTasks(true) // 静默刷新
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // 监听任务创建事件
      const handleTaskCreated = () => {
        console.log('📢 收到任务创建事件，立即刷新任务列表')
        loadTasks(true) // 静默刷新
      }
      window.addEventListener('task-created', handleTaskCreated)
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('task-created', handleTaskCreated)
      }
    } else if (backendStatus === 'offline') {
      setError('无法连接到后端服务器，请确保后端服务器已启动（端口3002）\n\n提示：请运行 "npm run dev" 启动后端服务器')
      setLoading(false)
    }
  }, [backendStatus])

  const loadTasks = async (silent = false) => {
    try {
      // 乐观更新：先显示缓存数据
      if (!silent) {
        const cachedTasks = sessionStorage.getItem('taskList_tasks')
        if (cachedTasks) {
          try {
            const parsed = JSON.parse(cachedTasks)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTasks(parsed)
              setLoading(true) // 显示加载状态，但已有数据展示
            }
          } catch (e) {
            console.warn('解析缓存任务失败:', e)
          }
        } else {
          setLoading(true)
        }
      }
      
      setError(null)
      const fetchedTasks = await getTasks()
      
      // 转换字段名并判断是否完成第二步
      // 注意：只要完成了第一步（is_completed1 = true），无论后续步骤（第二步、第三步、第四步、第五步）进行到哪一步，都会显示在历史记录中
      const convertedTasks: TaskDisplay[] = fetchedTasks
        .filter(task => task.is_completed1) // 显示所有完成了第一步的任务（包括已完成后续步骤的任务）
        .map(task => {
          // 判断是否完成第二步：有 project_id 且 analysis_result 存在
          const isCompleted2 = !!(task.project_id && task.analysis_result)
          
          return {
            ...task,
            isExpanded: task.is_expanded ?? false,
            isCompleted1: task.is_completed1 ?? false,
            isCompleted2,
          }
        })
      
      // 更新状态和缓存
      setTasks(convertedTasks)
      sessionStorage.setItem('taskList_tasks', JSON.stringify(convertedTasks))
    } catch (err) {
      console.error('加载任务失败:', err)
      let errorMessage = '加载任务失败'
      
      if (err instanceof Error) {
        errorMessage = err.message
        if (err.message.includes('无法连接到后端服务器')) {
          errorMessage = '无法连接到后端服务器，请确保后端服务器已启动（端口3002）\n\n提示：请运行 "npm run dev" 启动后端服务器'
        } else if (err.message.includes('未登录') || err.message.includes('登录已过期')) {
          errorMessage = '请先登录后再访问任务列表'
          // 可以在这里添加跳转到登录页的逻辑
        }
      }
      
      // 如果加载失败但有缓存数据，不显示错误
      if (tasks.length === 0) {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = () => {
    setIsModalOpen(true)
  }

  const handleModeConfirm = (mode: 'fusion' | 'image') => {
    setIsModalOpen(false)
    if (mode === 'fusion') {
      // 融生视频模式 - 跳转到剧梦工厂（首尾帧生视频）
      navigate('/first-last-frame-video')
    } else if (mode === 'image') {
      // 图生视频模式 - 跳转到剧本输入
      navigate('/script-input')
    }
  }


  const handleDeleteClick = (e: React.MouseEvent, task: TaskDisplay) => {
    e.stopPropagation() // 阻止事件冒泡，避免触发卡片点击
    setDeleteConfirmTask(task)
  }

  const handleCancelDelete = () => {
    setDeleteConfirmTask(null)
  }

  const handleConfirmDelete = async () => {
    if (deleteConfirmTask) {
      try {
        await deleteTask(deleteConfirmTask.id)
        setTasks(tasks.filter(task => task.id !== deleteConfirmTask.id))
        setDeleteConfirmTask(null)
      } catch (err) {
        console.error('删除任务失败:', err)
        alertError('删除任务失败，请重试')
      }
    }
  }

  // 处理任务卡片点击，继续编辑
  // 根据任务的完成状态，跳转到相应的编辑页面
  const handleTaskClick = (task: TaskDisplay) => {
    // 如果只完成了第一步，跳转到第二步（资产详情）
    if (!task.isCompleted2) {
      navigate('/asset-details', {
        state: {
          analysisResult: task.analysis_result,
          scriptTitle: task.title,
          scriptContent: task.script_content,
          workStyle: task.work_style,
          projectId: task.project_id, // 传递项目ID
        }
      })
    } else {
      // 如果完成了第二步或更多步骤，也跳转到资产详情页面继续编辑
      // 用户可以从这里继续后续步骤（第三步、第四步、第五步等）
      navigate('/asset-details', {
        state: {
          analysisResult: task.analysis_result,
          scriptTitle: task.title,
          scriptContent: task.script_content,
          workStyle: task.work_style,
          projectId: task.project_id, // 传递项目ID
        }
      })
    }
  }

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      // 检查日期是否有效（不是1970年）
      if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
        return ''
      }
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    } catch {
      return ''
    }
  }

  // 截取剧本内容预览（前200字）
  const getScriptPreview = (scriptContent?: string) => {
    if (!scriptContent) return ''
    return scriptContent.length > 200 ? scriptContent.substring(0, 200) + '...' : scriptContent
  }

  // 获取模式显示文本
  const getModeText = (mode?: string) => {
    return mode === 'fusion' ? '融图模式' : '图生视频模式'
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              返回
            </button>
            <h1 className="text-2xl font-bold">剧本任务列表</h1>
          </div>
          <button
            onClick={handleCreateTask}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
          >
            创建任务
          </button>
        </div>

        {loading && (
          <div className="text-center py-8 text-gray-600">加载中...</div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 whitespace-pre-line">{error}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={loadTasks}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                重试
              </button>
              {error.includes('无法连接到后端服务器') && (
                <button
                  onClick={() => {
                    alertInfo('请打开终端，进入 server 目录，运行 "npm run dev" 启动后端服务器', '启动说明')
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  查看启动说明
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            暂无任务，点击"创建任务"开始
          </div>
        )}

        {/* 任务卡片列表 - 白色主题样式 */}
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="bg-white text-gray-900 rounded-lg p-6 border border-gray-300 cursor-pointer hover:border-purple-500 transition-all hover:shadow-lg"
            >
              {/* 顶部：任务编号、模式、标题 */}
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-pink-500 text-white rounded-full text-sm font-medium">
                  任务 #{index + 1}
                </span>
                <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-medium">
                  {getModeText(task.mode)}
                </span>
                <h2 className="text-xl font-semibold flex-1 text-gray-900">{task.title}</h2>
              </div>

              {/* 进度条区域 */}
              <div className="flex items-center gap-4 mb-4">
                {/* 第一步进度 */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    {task.isCompleted1 ? (
                      <Check className="text-green-500" size={20} />
                    ) : (
                      <Play className="text-green-500" size={20} />
                    )}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        task.isCompleted1 ? 'bg-green-500' : 'bg-green-400'
                      }`}
                      style={{ width: `${task.progress1}%` }}
                    />
                  </div>
                  {task.isCompleted1 && (
                    <Check className="text-green-500" size={16} />
                  )}
                </div>

                {/* 第二步进度 */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    {task.isCompleted2 ? (
                      <Check className="text-pink-500" size={20} />
                    ) : (
                      <Film className="text-pink-500" size={20} />
                    )}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        task.isCompleted2 ? 'bg-pink-500' : 'bg-pink-400'
                      }`}
                      style={{ width: `${task.progress2}%` }}
                    />
                  </div>
                  {task.isCompleted2 && (
                    <Check className="text-pink-500" size={16} />
                  )}
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={(e) => handleDeleteClick(e, task)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2"
                  title="删除任务"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {/* 日期 */}
              <div className="flex items-center justify-start mb-3">
                <span className="text-gray-600 text-sm">
                  {formatDate(task.created_at || task.updated_at || task.date)}
                </span>
              </div>

            </div>
          ))}
        </div>

        {/* 分页 */}
        <div className="flex justify-center items-center gap-2 mt-6">
          <button className="text-gray-600 hover:text-gray-900">
            <ChevronLeft size={20} />
          </button>
          <span className="px-4 py-2 bg-purple-600 rounded text-white">1</span>
          <button className="text-gray-600 hover:text-gray-900">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <ModeSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleModeConfirm}
      />

      {/* 删除确认模态框 */}
      {deleteConfirmTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-300 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">确认删除</h3>
            <p className="text-gray-700 mb-6">
              确定要删除任务 <span className="text-purple-600 font-medium">"{deleteConfirmTask.title}"</span> 吗？
            </p>
            <p className="text-sm text-gray-500 mb-6">此操作无法撤销。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskList
