import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { Plus, MoreVertical, Trash2, ArrowLeft, RefreshCw } from 'lucide-react'
import CreateFragmentModal from '../components/CreateFragmentModal'
import { getProjectFragments } from '../services/api'
import { alert } from '../utils/alert'

interface Fragment {
  id: string
  name: string
  description?: string
  projectId?: string
  createdAt?: string
  imageUrl?: string
  videoUrls?: string[]
}

function FragmentManagement() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [fragments, setFragments] = useState<Fragment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 从数据库加载片段列表（包含视频）
  const loadFragments = async () => {
    if (!projectId) return
    
    setIsLoading(true)
    try {
      // 检查 projectId 是否是数字（数据库ID）
      const numericProjectId = parseInt(projectId, 10)
      if (!isNaN(numericProjectId)) {
        // 如果是数字，从数据库加载
        try {
          const dbFragments = await getProjectFragments(numericProjectId)
          if (dbFragments && dbFragments.length > 0) {
            setFragments(dbFragments.map(fragment => ({
              id: fragment.id,
              name: fragment.name,
              description: fragment.description,
              imageUrl: fragment.imageUrl,
              videoUrls: fragment.videoUrls || [],
            })))
            setIsLoading(false)
            return
          } else {
            // 如果没有数据，显示空列表
            setFragments([])
            setIsLoading(false)
            return
          }
        } catch (dbError) {
          console.warn('从数据库加载片段失败，尝试从localStorage加载:', dbError)
        }
      }
      
      // 如果不是数字或数据库加载失败，尝试从localStorage加载（兼容旧数据）
      try {
        const storageKey = projectId ? `fragments_${projectId}` : 'fragments'
        const savedFragments = JSON.parse(localStorage.getItem(storageKey) || '[]')
        
        if (savedFragments.length > 0) {
          setFragments(savedFragments)
        } else {
          setFragments([])
        }
      } catch (error) {
        console.error('加载片段列表失败:', error)
        setFragments([])
      }
    } catch (error) {
      console.error('加载片段列表失败:', error)
      setFragments([])
    } finally {
      setIsLoading(false)
    }
  }

  // 初始加载和定期刷新
  useEffect(() => {
    loadFragments()
    
    // 每5秒自动刷新一次
    refreshIntervalRef.current = setInterval(() => {
      loadFragments()
    }, 5000)
    
    // 页面可见时刷新
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadFragments()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [projectId])

  const handleFragmentCreated = (newFragment: Fragment) => {
    // 添加新片段到列表
    setFragments(prev => [...prev, newFragment])
    // 重新加载以确保数据同步
    loadFragments()
  }

  // 删除片段
  const handleDeleteFragment = async (fragmentId: string) => {
    if (!confirm('确定要删除这个片段吗？删除后无法恢复。')) {
      return
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        alert('请先登录', 'warning')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/fragments/${fragmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      
      if (result.success) {
        alert('片段已删除', 'success')
        // 重新加载片段列表
        loadFragments()
      } else {
        alert(`删除失败: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('删除片段失败:', error)
      alert('删除片段失败，请稍后重试', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="fragments" />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/project-management')}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              返回
            </button>
            <h2 className="text-xl font-semibold">片段管理</h2>
          </div>
          <button
            onClick={loadFragments}
            disabled={isLoading}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="刷新片段列表"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>

        <div className="flex-1 p-6">
        {/* 片段列表 */}
        <div className="flex gap-4">
          {/* 新建片段卡片 */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="w-64 h-48 bg-gray-50 border-2 border-dashed border-pink-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center mb-4">
              <Plus size={32} className="text-white" />
            </div>
            <span className="text-pink-600 font-medium">新建片段</span>
          </div>

          {/* 片段卡片 */}
          {fragments.map((fragment) => (
            <div
              key={fragment.id}
              onClick={() => navigate(`/project/${projectId}/fragments/${fragment.id}/review`)}
              className="w-64 h-48 bg-gray-50 border border-gray-200 rounded-lg p-4 cursor-pointer hover:scale-105 transition-transform duration-300 relative group"
            >
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900">
                  <MoreVertical size={14} />
                </button>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleDeleteFragment(fragment.id)
                  }}
                  className="w-6 h-6 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="删除片段"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center mb-2">
                {fragment.videoUrls && fragment.videoUrls.length > 0 ? (
                  <video
                    src={fragment.videoUrls[0]}
                    className="w-full h-full object-cover rounded-lg"
                    controls
                    muted
                  />
                ) : fragment.imageUrl && fragment.imageUrl.startsWith('http') ? (
                  <img
                    src={fragment.imageUrl}
                    alt={fragment.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-700 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-center text-sm text-gray-700">{fragment.name}</div>
            </div>
          ))}
        </div>

        {/* 分页 */}
        <div className="flex justify-center items-center gap-2 mt-8">
          <button className="px-3 py-1 text-gray-600 hover:text-gray-900">上一页</button>
          <button className="px-4 py-1 bg-purple-600 text-white rounded">1</button>
          <button className="px-3 py-1 text-gray-600 hover:text-gray-900">下一页</button>
        </div>
        </div>
      </div>

      {/* 创建片段模态框 */}
      {showCreateModal && (
        <CreateFragmentModal 
          onClose={() => setShowCreateModal(false)}
          onFragmentCreated={handleFragmentCreated}
        />
      )}
    </div>
  )
}

export default FragmentManagement
