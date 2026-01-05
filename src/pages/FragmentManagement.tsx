import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { Plus, MoreVertical, Trash2, ArrowLeft, RefreshCw, Download, Upload, Heart } from 'lucide-react'
import CreateFragmentModal from '../components/CreateFragmentModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { getProjectFragments, publishVideoToCommunity } from '../services/api'
import { alert, alertSuccess, alertError } from '../utils/alert'

interface Fragment {
  id: string
  name: string
  description?: string
  projectId?: string
  createdAt?: string
  imageUrl?: string
  videoUrls?: string[]
}

// 片段卡片组件（支持悬停播放）
function FragmentCard({ 
  fragment, 
  projectId, 
  onNavigate, 
  onDelete 
}: { 
  fragment: Fragment
  projectId: string
  onNavigate: (id: string) => void
  onDelete: (id: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // 下载视频
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowMenu(false)
    
    if (!fragment.videoUrls || fragment.videoUrls.length === 0) {
      alertError('该片段没有视频', '下载失败')
      return
    }

    const videoUrl = fragment.videoUrls[0]
    try {
      // 创建下载链接
      const link = document.createElement('a')
      link.href = videoUrl
      link.download = `${fragment.name}.mp4`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      alertSuccess('视频下载已开始', '下载成功')
    } catch (error) {
      console.error('下载视频失败:', error)
      alertError('下载视频失败，请稍后重试', '下载失败')
    }
  }

  // 上传到社区
  const handleUploadToCommunity = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowMenu(false)
    
    if (!fragment.videoUrls || fragment.videoUrls.length === 0) {
      alertError('该片段没有视频', '上传失败')
      return
    }

    const videoUrl = fragment.videoUrls[0]
    const title = prompt('请输入视频标题：', fragment.name)
    if (!title) {
      return
    }

    const description = prompt('请输入视频描述（可选）：', '') || undefined
    const tagsInput = prompt('请输入标签，用逗号分隔（可选）：', '') || undefined
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : undefined

    try {
      await publishVideoToCommunity({
        videoUrl,
        title,
        description,
        tags,
        projectId: projectId ? parseInt(projectId, 10) : undefined,
        shotId: fragment.id ? parseInt(fragment.id, 10) : undefined,
      })
      alertSuccess('视频已上传到社区', '上传成功')
    } catch (error) {
      console.error('上传到社区失败:', error)
      alertError(error instanceof Error ? error.message : '上传到社区失败，请稍后重试', '上传失败')
    }
  }

  // 收藏视频
  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowMenu(false)
    
    // TODO: 实现收藏功能
    alertSuccess('收藏功能开发中', '提示')
  }

  return (
    <div
      className="w-full sm:w-64 h-40 sm:h-48 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden cursor-pointer sm:hover:scale-105 transition-transform relative group touch-manipulation"
      onMouseEnter={() => {
        // 桌面端悬停播放
        if (window.innerWidth >= 640 && videoRef.current && fragment.videoUrls && fragment.videoUrls.length > 0) {
          videoRef.current.play().catch(() => {})
        }
      }}
      onMouseLeave={() => {
        // 桌面端离开暂停
        if (window.innerWidth >= 640 && videoRef.current) {
          videoRef.current.pause()
          videoRef.current.currentTime = 0
        }
      }}
      onTouchStart={() => {
        // 移动端触摸时播放预览
        if (videoRef.current && fragment.videoUrls && fragment.videoUrls.length > 0) {
          videoRef.current.play().catch(() => {})
        }
      }}
      onTouchEnd={() => {
        // 移动端触摸结束时暂停
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
          }
        }, 500)
      }}
    >
      <div
        onClick={() => onNavigate(fragment.id)}
        className="w-full h-full bg-gray-700 flex items-center justify-center"
      >
        {fragment.videoUrls && fragment.videoUrls.length > 0 ? (
          <video
            ref={videoRef}
            src={fragment.videoUrls[0]}
            className="w-full h-full object-cover"
            muted
            loop
            preload="metadata"
            playsInline
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
      {/* 片段名称 - 去掉黑边，改为白色文字带阴影 */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 text-center text-xs sm:text-sm text-white font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
        {fragment.name}
      </div>
      {/* 删除按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onDelete(fragment.id)
        }}
        className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 w-6 h-6 sm:w-7 sm:h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 sm:group-hover:opacity-100 active:opacity-100 transition-opacity active:bg-red-600 sm:hover:bg-red-600 z-10 touch-manipulation"
        title="删除片段"
      >
        <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
      </button>
      {/* 三个点菜单按钮 - 右下角 */}
      {fragment.videoUrls && fragment.videoUrls.length > 0 && (
        <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 z-20" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setShowMenu(!showMenu)
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full flex items-center justify-center transition-all touch-manipulation"
            title="更多操作"
          >
            <MoreVertical size={16} className="sm:w-4 sm:h-4" />
          </button>
          {/* 菜单下拉列表 */}
          {showMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30">
              <button
                onClick={handleDownload}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 touch-manipulation"
              >
                <Download size={16} />
                <span>下载</span>
              </button>
              <button
                onClick={handleUploadToCommunity}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 touch-manipulation"
              >
                <Upload size={16} />
                <span>上传到社区</span>
              </button>
              <button
                onClick={handleFavorite}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 touch-manipulation"
              >
                <Heart size={16} />
                <span>收藏</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
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
        <div className="border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/project-management')}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg active:bg-purple-700 sm:hover:bg-purple-700 flex items-center gap-1.5 sm:gap-2 touch-manipulation text-sm sm:text-base"
            >
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
              返回
            </button>
            <h2 className="text-lg sm:text-xl font-semibold">片段管理</h2>
          </div>
          <button
            onClick={loadFragments}
            disabled={isLoading}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg active:bg-purple-700 sm:hover:bg-purple-700 flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm sm:text-base"
            title="刷新片段列表"
          >
            <RefreshCw size={16} className={`sm:w-[18px] sm:h-[18px] ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        <div className="flex-1 p-3 sm:p-6">
        {/* 片段列表 */}
        <div className="flex gap-3 sm:gap-4 flex-wrap">
          {/* 新建片段卡片 */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-64 h-40 sm:h-48 bg-gray-50 border-2 border-dashed border-pink-500 rounded-lg flex flex-col items-center justify-center cursor-pointer active:border-pink-400 sm:hover:border-pink-400 transition-all touch-manipulation"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center mb-3 sm:mb-4">
              <Plus size={24} className="sm:w-8 sm:h-8 text-white" />
            </div>
            <span className="text-pink-600 font-medium text-sm sm:text-base">新建片段</span>
          </div>

          {/* 首尾帧生视频卡片 */}
          {projectId && (
            <div
              onClick={() => navigate(`/project/${projectId}/first-last-frame-video`)}
              className="w-full sm:w-64 h-40 sm:h-48 bg-gray-50 border-2 border-dashed border-blue-500 rounded-lg flex flex-col items-center justify-center cursor-pointer active:border-blue-400 sm:hover:border-blue-400 transition-all touch-manipulation"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-blue-600 font-medium text-sm sm:text-base">首尾帧生视频</span>
            </div>
          )}

          {/* 片段卡片 */}
          {fragments.map((fragment) => (
            <FragmentCard
              key={fragment.id}
              fragment={fragment}
              projectId={projectId || ''}
              onNavigate={(id) => navigate(`/project/${projectId}/fragments/${id}/review`)}
              onDelete={handleDeleteFragment}
            />
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
