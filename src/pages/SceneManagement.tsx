import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { Plus, Search, ArrowLeft, RefreshCw, Trash2 } from 'lucide-react'
import CreateSceneModal from '../components/CreateSceneModal'
import SceneDetailModal from '../components/SceneDetailModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { getProject } from '../services/projectStorage'
import { alertError } from '../utils/alert'
import { getProjectScenes, deleteScene } from '../services/api'

interface Scene {
  id: string
  name: string
  image?: string
}

function SceneManagement() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [scenes, setScenes] = useState<Scene[]>([])
  const [projectName, setProjectName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [sceneToDelete, setSceneToDelete] = useState<Scene | null>(null)

  // 从 projectId 获取项目名称
  useEffect(() => {
    const fetchProjectName = async () => {
      if (!projectId) return
      
      try {
        // 检查 projectId 是否是数字（数据库ID）
        const numericProjectId = parseInt(projectId, 10)
        if (!isNaN(numericProjectId)) {
          // 如果是数字，从数据库获取项目信息
          const { getProjects } = await import('../services/api')
          const allProjects = await getProjects()
          const project = allProjects.find(p => p.id === numericProjectId)
          if (project) {
            setProjectName(project.name || project.scriptTitle || '')
            return
          }
        }
        
        // 如果不是数字或找不到，尝试从 localStorage 获取
        const project = getProject(projectId)
        if (project && project.name) {
          setProjectName(project.name)
        } else {
          // 尝试从 sessionStorage 获取
          const savedScriptTitle = sessionStorage.getItem('scriptInput_scriptTitle')
          if (savedScriptTitle) {
            setProjectName(savedScriptTitle)
          }
        }
      } catch (error) {
        console.error('获取项目名称失败:', error)
        // 尝试从 localStorage 获取
        const project = getProject(projectId)
        if (project && project.name) {
          setProjectName(project.name)
        }
      }
    }
    
    fetchProjectName()
  }, [projectId])

  // 从数据库加载场景数据
  const loadScenes = async () => {
    if (!projectId) return
    
    setIsLoading(true)
    try {
      // 检查 projectId 是否是数字（数据库ID）
      const numericProjectId = parseInt(projectId, 10)
      if (!isNaN(numericProjectId)) {
        // 如果是数字，从数据库加载
        try {
          const dbScenes = await getProjectScenes(numericProjectId)
          if (dbScenes && dbScenes.length > 0) {
            setScenes(dbScenes.map(scene => ({
              id: scene.id.toString(),
              name: scene.name,
              image: scene.image || null,
            })))
            setIsLoading(false)
            return
          } else {
            // 如果没有数据，显示空列表
            setScenes([])
            setIsLoading(false)
            return
          }
        } catch (dbError) {
          console.warn('从数据库加载场景失败，尝试从localStorage加载:', dbError)
        }
      }
      
      // 如果不是数字或数据库加载失败，尝试从localStorage加载（兼容旧数据）
      const project = getProject(projectId)
      if (project && project.scenes) {
        setScenes(project.scenes.map(scene => ({
          ...scene,
          image: scene.image || null,
        })))
      } else {
        setScenes([])
      }
    } catch (error) {
      console.error('加载场景数据失败:', error)
      const project = getProject(projectId)
      if (project && project.scenes) {
        setScenes(project.scenes.map(scene => ({
          ...scene,
          image: scene.image || null,
        })))
      } else {
        setScenes([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 初始加载和定期刷新
  useEffect(() => {
    loadScenes()
    
    // 每5秒自动刷新一次
    refreshIntervalRef.current = setInterval(() => {
      loadScenes()
    }, 5000)
    
    // 页面可见时刷新
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadScenes()
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

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="scenes" />
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
            <h2 className="text-xl font-semibold">场景管理</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadScenes}
              disabled={isLoading}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="刷新场景列表"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              刷新
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索场景"
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="flex gap-6">
          {/* 左侧操作按钮 */}
          <div className="flex flex-col gap-4 w-48">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              新建场景
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              公共场景
            </button>
          </div>

          {/* 右侧场景网格 */}
          <div className="flex-1 grid grid-cols-4 gap-4">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform relative group"
              >
                <div
                  onClick={() => {
                    setSelectedScene(scene)
                  }}
                  className="aspect-video bg-gray-700 flex items-center justify-center"
                >
                  {scene.image && scene.image.startsWith('http') ? (
                    <img
                      src={scene.image}
                      alt={scene.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-purple-600 flex items-center justify-center text-white text-xs text-center p-2">
                      {scene.name}
                    </div>
                  )}
                </div>
                <div className="p-3 text-center text-sm">{scene.name}</div>
                {/* 删除按钮 - 悬停时显示 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSceneToDelete(scene)
                    setShowDeleteModal(true)
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                  title="删除场景"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          </div>

          {/* 分页 */}
          <div className="flex justify-center items-center gap-2 mt-8">
            <button className="px-3 py-1 text-gray-600 hover:text-gray-900">‹</button>
            <button className="px-4 py-1 bg-purple-600 text-white rounded">1</button>
            <button className="px-3 py-1 text-gray-600 hover:text-gray-900">›</button>
          </div>
        </div>
      </div>

      {/* 创建场景模态框 */}
      {showCreateModal && <CreateSceneModal projectName={projectName} onClose={() => setShowCreateModal(false)} />}

      {/* 场景详情模态框 */}
      {selectedScene && (
        <SceneDetailModal
          scene={selectedScene}
          onClose={() => setSelectedScene(null)}
          onImageUpload={(sceneId, imageUrl) => {
            setScenes(scenes.map(s => 
              s.id === sceneId ? { ...s, image: imageUrl } : s
            ))
            setSelectedScene({ ...selectedScene, image: imageUrl })
          }}
          onDelete={(sceneId) => {
            setScenes(scenes.filter(s => s.id !== sceneId))
          }}
        />
      )}

      {/* 删除确认模态框 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSceneToDelete(null)
        }}
        onConfirm={async () => {
          if (sceneToDelete) {
            try {
              const numericId = parseInt(sceneToDelete.id, 10)
              if (!isNaN(numericId)) {
                await deleteScene(numericId)
                // 移除成功提示框，直接重新加载列表
                loadScenes()
              }
            } catch (error) {
              alertError(error instanceof Error ? error.message : '删除失败', '错误')
            }
          }
          setShowDeleteModal(false)
          setSceneToDelete(null)
        }}
        message={sceneToDelete ? `确定要删除场景 "${sceneToDelete.name}" 吗？` : ''}
      />
    </div>
  )
}

export default SceneManagement
