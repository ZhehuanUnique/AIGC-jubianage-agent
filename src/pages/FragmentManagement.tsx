import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { Plus, MoreVertical, Trash2, ArrowLeft, RefreshCw } from 'lucide-react'
import CreateFragmentModal from '../components/CreateFragmentModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
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
  const [deleteConfirmFragmentId, setDeleteConfirmFragmentId] = useState<string | null>(null)
  const deletingFragmentsRef = useRef<Set<string>>(new Set()) // 正在删除的片段ID集合，防止重复删除

  // 监听片段更新事件
  useEffect(() => {
    const handleFragmentUpdated = (event: CustomEvent) => {
      const eventProjectId = event.detail?.projectId
      if (eventProjectId && projectId && parseInt(projectId, 10) === eventProjectId) {
        console.log('📢 收到片段更新事件，刷新片段列表')
        loadFragments(true) // 静默刷新
      }
    }
    
    window.addEventListener('fragment-updated', handleFragmentUpdated as EventListener)
    return () => {
      window.removeEventListener('fragment-updated', handleFragmentUpdated as EventListener)
    }
  }, [projectId])

  // 从数据库加载片段列表（包含视频）- 乐观更新优化
  const loadFragments = async (silent = false) => {
    if (!projectId) return
    
    // 乐观更新：先显示缓存数据
    if (!silent) {
      const storageKey = projectId ? `fragments_${projectId}` : 'fragments'
      const cachedFragments = localStorage.getItem(storageKey)
      if (cachedFragments) {
        try {
          const parsed = JSON.parse(cachedFragments)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFragments(parsed)
            setIsLoading(true) // 显示加载状态，但已有数据展示
          }
        } catch (e) {
          console.warn('解析缓存片段失败:', e)
        }
      } else {
        setIsLoading(true)
      }
    } else {
      setIsLoading(false) // 静默模式不显示加载状态
    }
    
    try {
      // 检查 projectId 是否是数字（数据库ID）
      const numericProjectId = parseInt(projectId, 10)
      if (!isNaN(numericProjectId)) {
        // 如果是数字，从数据库加载
        try {
          const dbFragments = await getProjectFragments(numericProjectId)
          if (dbFragments && dbFragments.length > 0) {
            const convertedFragments = dbFragments.map(fragment => ({
              id: fragment.id,
              name: fragment.name,
              description: fragment.description,
              imageUrl: fragment.imageUrl,
              videoUrls: fragment.videoUrls || [],
            }))
            setFragments(convertedFragments)
            // 更新缓存
            const storageKey = projectId ? `fragments_${projectId}` : 'fragments'
            localStorage.setItem(storageKey, JSON.stringify(convertedFragments))
            setIsLoading(false)
            return
          } else {
            // 如果没有数据，显示空列表
            setFragments([])
            const storageKey = projectId ? `fragments_${projectId}` : 'fragments'
            localStorage.setItem(storageKey, JSON.stringify([]))
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
      // 如果加载失败但有缓存数据，不更新为空
      if (fragments.length === 0) {
        setFragments([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 初始加载和定期刷新 - 乐观更新优化
  useEffect(() => {
    loadFragments(false) // 首次加载，显示缓存
    
    // 每10秒自动刷新一次（静默模式，不显示加载状态）
    refreshIntervalRef.current = setInterval(() => {
      loadFragments(true) // 静默刷新
    }, 10000) // 增加到10秒，减少请求频率
    
    // 页面可见时刷新（静默模式）
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadFragments(true) // 静默刷新
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
    // 乐观更新：立即添加到列表
    setFragments(prev => {
      const updated = [...prev, newFragment]
      // 更新缓存
      const storageKey = projectId ? `fragments_${projectId}` : 'fragments'
      localStorage.setItem(storageKey, JSON.stringify(updated))
      return updated
    })
    // 后台同步（静默模式）
    loadFragments(true)
  }

  // 删除片段
  const handleDeleteFragment = async (fragmentId: string) => {
    setDeleteConfirmFragmentId(fragmentId)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmFragmentId) return

    const fragmentIdToDelete = deleteConfirmFragmentId
    
    // 防止重复删除：如果正在删除，直接返回
    if (deletingFragmentsRef.current.has(fragmentIdToDelete)) {
      console.log('片段正在删除中，跳过重复请求')
      setDeleteConfirmFragmentId(null)
      return
    }

    // 标记为正在删除
    deletingFragmentsRef.current.add(fragmentIdToDelete)
    setDeleteConfirmFragmentId(null)

    // 乐观更新：立即从列表中移除
    setFragments(prev => {
      const updated = prev.filter(f => f.id !== fragmentIdToDelete)
      // 更新缓存
      const storageKey = projectId ? `fragments_${projectId}` : 'fragments'
      localStorage.setItem(storageKey, JSON.stringify(updated))
      return updated
    })

    try {
      // 生产环境使用相对路径，开发环境使用完整URL
      const API_BASE_URL = (() => {
        if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
        const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
        return isProduction ? '' : 'http://localhost:3002'
      })()
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        alert('请先登录', 'warning')
        // 如果未登录，重新加载以恢复数据
        deletingFragmentsRef.current.delete(fragmentIdToDelete)
        loadFragments(true)
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/fragments/${fragmentIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const result = await response.json()
      
      // 如果返回404或错误提示片段不存在，说明已经删除成功，静默处理
      if (response.status === 404 || (result.error && result.error.includes('不存在'))) {
        console.log('片段已不存在，删除成功（可能是重复请求）')
        // 静默处理，不显示错误
        loadFragments(true)
      } else if (result.success) {
        // 删除成功，静默刷新以确保数据同步
        loadFragments(true)
      } else {
        // 其他错误才显示提示
        alert(`删除失败: ${result.error}`, 'error')
        // 如果删除失败，重新加载以恢复数据
        loadFragments(true)
      }
    } catch (error) {
      console.error('删除片段失败:', error)
      // 网络错误等，不显示错误提示，静默刷新
      loadFragments(true)
    } finally {
      // 移除删除标记
      deletingFragmentsRef.current.delete(fragmentIdToDelete)
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
        <div className="flex gap-4 flex-wrap">
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

          {/* 首尾帧生视频卡片 */}
          {projectId && (
            <div
              onClick={() => navigate(`/project/${projectId}/first-last-frame-video`)}
              className="w-64 h-48 bg-gray-50 border-2 border-dashed border-blue-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-blue-600 font-medium">首尾帧生视频</span>
            </div>
          )}

          {/* 片段卡片 */}
          {fragments.map((fragment) => (
            <div
              key={fragment.id}
              className="w-64 h-48 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform relative group"
            >
              <div
                onClick={() => navigate(`/project/${projectId}/fragments/${fragment.id}/review`)}
                className="w-full h-full bg-gray-700 flex items-center justify-center"
              >
                {fragment.videoUrls && fragment.videoUrls.length > 0 ? (
                  <video
                    src={fragment.videoUrls[0]}
                    className="w-full h-full object-cover"
                    controls
                    muted
                  />
                ) : fragment.imageUrl && fragment.imageUrl.startsWith('http') ? (
                  <img
                    src={fragment.imageUrl}
                    alt={fragment.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-purple-600 flex items-center justify-center text-white text-xs text-center p-2">
                    {fragment.name}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 text-center text-sm text-white bg-black bg-opacity-50">
                {fragment.name}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  handleDeleteFragment(fragment.id)
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                title="删除片段"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* 分页 */}
        <div className="flex justify-center items-center gap-2 mt-8">
          <button className="px-3 py-1 text-gray-600 hover:text-gray-900">‹</button>
          <button className="px-4 py-1 bg-purple-600 text-white rounded">1</button>
          <button className="px-3 py-1 text-gray-600 hover:text-gray-900">›</button>
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

      {/* 删除确认模态框 */}
      <DeleteConfirmModal
        isOpen={!!deleteConfirmFragmentId}
        onClose={() => setDeleteConfirmFragmentId(null)}
        onConfirm={handleConfirmDelete}
        message="确定要删除这个片段吗？删除后无法恢复。"
      />
    </div>
  )
}

export default FragmentManagement
