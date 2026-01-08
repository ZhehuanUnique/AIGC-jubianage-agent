import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { Plus, Search, ArrowLeft, RefreshCw, Trash2 } from 'lucide-react'
import CreateItemModal from '../components/CreateItemModal'
import ItemDetailModal from '../components/ItemDetailModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { getProject } from '../services/projectStorage'
import { getProjectItems, deleteItem } from '../services/api'
import { alertError } from '../utils/alert'

interface Item {
  id: string
  name: string
  image?: string
}

function ItemManagement() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [projectName, setProjectName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null)

  // 如果projectId不存在，重定向到项目管理页面
  useEffect(() => {
    if (!projectId) {
      console.error('项目ID不存在，重定向到项目管理页面')
      navigate('/project-management')
    }
  }, [projectId, navigate])

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

  // 从数据库加载物品数据
  const loadItems = async () => {
    if (!projectId) {
      console.warn('项目ID不存在，无法加载物品')
      return
    }
    
    setIsLoading(true)
    try {
      // 检查 projectId 是否是数字（数据库ID）
      const numericProjectId = parseInt(projectId, 10)
      if (!isNaN(numericProjectId)) {
        // 如果是数字，从数据库加载
        try {
          const dbItems = await getProjectItems(numericProjectId)
          if (dbItems && dbItems.length > 0) {
            setItems(dbItems.map(item => ({
              id: item.id.toString(),
              name: item.name,
              image: item.image || null,
            })))
            setIsLoading(false)
            return
          } else {
            // 如果没有数据，显示空列表
            setItems([])
            setIsLoading(false)
            return
          }
        } catch (dbError) {
          console.warn('从数据库加载物品失败，尝试从localStorage加载:', dbError)
          // 继续执行下面的localStorage加载逻辑
        }
      }
      
      // 如果不是数字或数据库加载失败，尝试从localStorage加载（兼容旧数据）
      try {
        const project = getProject(projectId)
        if (project && project.items) {
          setItems(project.items.map(item => ({
            ...item,
            image: item.image || null,
          })))
        } else {
          setItems([])
        }
      } catch (localStorageError) {
        console.error('从localStorage加载物品失败:', localStorageError)
        setItems([])
      }
    } catch (error) {
      console.error('加载物品数据失败:', error)
      try {
        const project = getProject(projectId)
        if (project && project.items) {
          setItems(project.items.map(item => ({
            ...item,
            image: item.image || null,
          })))
        } else {
          setItems([])
        }
      } catch (fallbackError) {
        console.error('备用加载方案也失败:', fallbackError)
        setItems([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 初始加载和定期刷新
  useEffect(() => {
    loadItems()
    
    // 每5秒自动刷新一次
    refreshIntervalRef.current = setInterval(() => {
      loadItems()
    }, 5000)
    
    // 页面可见时刷新
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadItems()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // 监听物品上传事件
    const handleItemUploaded = () => {
      console.log('📢 收到物品上传事件，延迟500ms后刷新')
      setTimeout(() => {
        loadItems()
      }, 500)
    }
    window.addEventListener('item-uploaded', handleItemUploaded)
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('item-uploaded', handleItemUploaded)
    }
  }, [projectId])

  // 如果projectId不存在，显示加载或错误信息
  if (!projectId) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">项目ID不存在</p>
          <button
            onClick={() => navigate('/project-management')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            返回项目管理
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="items" />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/project-management')}
              className="back-button"
            >
              <svg height="16" width="16" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M874.690416 495.52477c0 11.2973-9.168824 20.466124-20.466124 20.466124l-604.773963 0 188.083679 188.083679c7.992021 7.992021 7.992021 20.947078 0 28.939099-4.001127 3.990894-9.240455 5.996574-14.46955 5.996574-5.239328 0-10.478655-1.995447-14.479783-5.996574l-223.00912-223.00912c-3.837398-3.837398-5.996574-9.046027-5.996574-14.46955 0-5.433756 2.159176-10.632151 5.996574-14.46955l223.019353-223.029586c7.992021-7.992021 20.957311-7.992021 28.949332 0 7.992021 8.002254 7.992021 20.957311 0 28.949332l-188.073446 188.073446 604.753497 0C865.521592 475.058646 874.690416 484.217237 874.690416 495.52477z"></path></svg>
              <span>返回</span>
            </button>
            <h2 className="text-xl font-semibold">物品管理</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadItems}
              disabled={isLoading}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="刷新物品列表"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              刷新
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索物品"
                className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="flex gap-6">
          {/* 左侧操作按钮 - 横向布局，与场景管理一致 */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              新建物品
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              公共物品
            </button>
          </div>

          {/* 右侧物品网格 */}
          <div className="flex-1 grid grid-cols-4 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform relative group"
              >
                <div
                  onClick={() => {
                    setSelectedItem(item)
                  }}
                  className="aspect-video bg-gray-700 flex items-center justify-center"
                >
                  {item.image && item.image.startsWith('http') ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-purple-600 flex items-center justify-center text-white text-xs text-center p-2">
                      {item.name}
                    </div>
                  )}
                </div>
                <div className="p-3 text-center text-sm">{item.name}</div>
                {/* 删除按钮 - 悬停时显示 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setItemToDelete(item)
                    setShowDeleteModal(true)
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                  title="删除物品"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          </div>

          {/* 分页 - 固定在页面底部中央 */}
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex justify-center items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
              <button className="px-3 py-1 text-gray-600 hover:text-gray-900">‹</button>
              <button className="px-4 py-1 bg-purple-600 text-white rounded">1</button>
              <button className="px-3 py-1 text-gray-600 hover:text-gray-900">›</button>
            </div>
          </div>
        </div>
      </div>

      {/* 创建物品模态框 */}
      {showCreateModal && (
        <CreateItemModal 
          onClose={() => setShowCreateModal(false)}
          projectName={projectName || (() => {
            // 获取项目名称（备用方案）
            if (!projectId) return undefined
            const project = getProject(projectId)
            return project?.name || project?.scriptTitle
          })()}
          onItemSelect={(item) => {
            // 当用户选择物品后，刷新物品列表
            console.log('✅ 用户选择了物品，刷新列表:', item)
            setTimeout(() => {
              loadItems()
            }, 500) // 延迟500ms确保数据库已保存
          }}
        />
      )}

      {/* 物品详情模态框 */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onImageUpload={(itemId, imageUrl) => {
            setItems(items.map(i => 
              i.id === itemId ? { ...i, image: imageUrl } : i
            ))
            setSelectedItem({ ...selectedItem, image: imageUrl })
          }}
          onDelete={(itemId) => {
            setItems(items.filter(i => i.id !== itemId))
            setSelectedItem(null)
          }}
        />
      )}

      {/* 删除确认模态框 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setItemToDelete(null)
        }}
        onConfirm={async () => {
          if (itemToDelete) {
            try {
              const numericId = parseInt(itemToDelete.id, 10)
              if (!isNaN(numericId)) {
                await deleteItem(numericId)
                // 移除成功提示框，直接重新加载列表
                loadItems()
              }
            } catch (error) {
              alertError(error instanceof Error ? error.message : '删除失败', '错误')
            }
          }
          setShowDeleteModal(false)
          setItemToDelete(null)
        }}
        message={itemToDelete ? `确定要删除物品 "${itemToDelete.name}" 吗？` : ''}
      />
    </div>
  )
}

export default ItemManagement
