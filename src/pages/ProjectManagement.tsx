import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavigationBar from '../components/NavigationBar'
import { MoreVertical, Menu, Plus, X, CheckCircle, Trash2, Edit, Copy, Scissors } from 'lucide-react'
import CreateProjectModal from '../components/CreateProjectModal'
import { getAllProjects, createProject, Project } from '../services/projectStorage'
import { deleteProject as deleteProjectApi, getProjects, createOrUpdateProject } from '../services/api'
import { alertError, alertInfo, alertSuccess } from '../utils/alert'

interface LocationState {
  autoCreateProject?: boolean
  projectName?: string
  analysisResult?: {
    characters?: Array<{ name: string }>
    scenes?: Array<{ name: string }>
    items?: Array<{ name: string }>
  }
}

function ProjectManagement() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [notification, setNotification] = useState<{ message: string; projectName: string } | null>(null)
  const [hasProcessedAutoCreate, setHasProcessedAutoCreate] = useState(false)
  const [hoveredProjectId, setHoveredProjectId] = useState<number | string | null>(null)
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | string | null>(null)
  const [renameProject, setRenameProject] = useState<{ id: number | string; name: string } | null>(null)
  const [copySourceProject, setCopySourceProject] = useState<number | string | null>(null)
  const [cutSourceProject, setCutSourceProject] = useState<number | string | null>(null)
  const menuRefs = useRef<Map<number | string, HTMLDivElement>>(new Map())
  const [apiProjects, setApiProjects] = useState<Array<{
    id: number
    name: string
    scriptTitle?: string
    workStyle?: string
    workBackground?: string
    createdAt?: string
    updatedAt?: string
  }>>(() => {
    // 初始化时尝试从缓存加载
    try {
      const cachedProjects = sessionStorage.getItem('projectList_projects')
      if (cachedProjects) {
        const parsed = JSON.parse(cachedProjects)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      console.warn('从缓存加载项目失败:', e)
    }
    return []
  })

  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const loadingPromiseRef = useRef<Promise<void> | null>(null) // 防止重复请求

  // 从API加载项目列表（按用户过滤）- 乐观更新优化
  const loadProjects = async (silent = false) => {
    // 如果正在加载中，等待当前请求完成
    if (loadingPromiseRef.current) {
      return loadingPromiseRef.current
    }

    // 乐观更新：先显示缓存数据
    if (!silent) {
      // 如果已有数据，不显示加载状态
      if (apiProjects.length > 0) {
        // 尝试从数据库静默更新，不设置 isLoading
      } else {
        try {
          const cachedProjects = sessionStorage.getItem('projectList_projects')
          if (cachedProjects) {
            const parsed = JSON.parse(cachedProjects)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setApiProjects(parsed)
              setIsLoadingProjects(true) // 显示加载状态，但已有数据展示
            }
          } else {
            setIsLoadingProjects(true)
          }
        } catch (e) {
          console.warn('解析缓存项目失败:', e)
          setIsLoadingProjects(true)
        }
      }
    } else {
      setIsLoadingProjects(false) // 静默模式不显示加载状态
    }

    // 创建加载 Promise
    const loadPromise = (async () => {
      try {
        const projects = await getProjects()
        // 只使用 API 返回的数据，确保按用户过滤
        setApiProjects(projects)
        // 更新缓存
        sessionStorage.setItem('projectList_projects', JSON.stringify(projects))
        // 清空本地项目列表，避免显示旧数据
        setProjects([])
      } catch (error) {
        console.error('加载项目列表失败:', error)
        // 如果加载失败但有缓存数据，不更新为空
        if (apiProjects.length === 0) {
          setApiProjects([])
          setProjects([])
        }
      } finally {
        if (!silent) {
          setIsLoadingProjects(false)
        }
        loadingPromiseRef.current = null // 清除加载 Promise
      }
    })()

    loadingPromiseRef.current = loadPromise
    return loadPromise
  }

  // 初始加载和定期刷新 - 乐观更新优化
  useEffect(() => {
    loadProjects(false) // 首次加载，显示缓存

    // 每20秒自动刷新一次（静默模式，不显示加载状态）
    refreshIntervalRef.current = setInterval(() => {
      loadProjects(true) // 静默刷新
    }, 20000) // 增加到20秒，减少请求频率

    // 页面可见时刷新（静默模式，延迟执行避免频繁刷新）
    let visibilityTimeout: NodeJS.Timeout | null = null
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 延迟500ms执行，避免页面切换时立即刷新
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout)
        }
        visibilityTimeout = setTimeout(() => {
          loadProjects(true) // 静默刷新
        }, 500)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // 处理自动创建项目（只执行一次）
  useEffect(() => {
    if (state?.autoCreateProject && state.projectName && state.analysisResult && !hasProcessedAutoCreate) {
      // 检查是否已存在同名项目（使用 API 数据）
      const projectExists = apiProjects.some(p => p.name === state.projectName)
      
      if (!projectExists) {
        // 调用 API 创建项目
        createOrUpdateProject({
          name: state.projectName,
          analysisResult: state.analysisResult,
        }).then(() => {
          // 重新加载项目列表
          return getProjects()
        }).then((projects) => {
          // 乐观更新：立即更新列表和缓存
          setApiProjects(projects)
          sessionStorage.setItem('projectList_projects', JSON.stringify(projects))
          
          // 显示提示消息
          setNotification({
            message: '已自动创建项目文件',
            projectName: state.projectName,
          })

          // 5秒后自动关闭提示
          const timer = setTimeout(() => {
            setNotification(null)
          }, 5000)

          setHasProcessedAutoCreate(true)
          // 清除路由state，避免刷新时重复创建
          window.history.replaceState({}, document.title)

          return () => clearTimeout(timer)
        }).catch((error) => {
          console.error('自动创建项目失败:', error)
        })
      } else {
        setHasProcessedAutoCreate(true)
        window.history.replaceState({}, document.title)
      }
    }
  }, [state, hasProcessedAutoCreate, apiProjects])

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation() // 阻止点击事件冒泡到卡片
    setDeleteConfirmProject(project)
  }

  const handleConfirmDelete = async () => {
    if (deleteConfirmProject) {
      try {
        // 调用后端 API 删除项目
        await deleteProjectApi(deleteConfirmProject.id)
        
        // 乐观更新：立即从状态和缓存中移除
        const previousProjects = apiProjects
        setApiProjects(prev => {
          const updated = prev.filter(p => p.id !== deleteConfirmProject.id)
          // 更新缓存
          sessionStorage.setItem('projectList_projects', JSON.stringify(updated))
          return updated
        })
        
        // 同时从 localStorage 删除（如果存在）
        const { deleteProject: deleteLocalProject } = await import('../services/projectStorage')
        deleteLocalProject(String(deleteConfirmProject.id))
        
        setDeleteConfirmProject(null)
        
        // 后台同步（静默模式）
        try {
          const projects = await getProjects()
          setApiProjects(projects)
          sessionStorage.setItem('projectList_projects', JSON.stringify(projects))
        } catch (error) {
          console.error('刷新项目列表失败:', error)
          // 如果同步失败，恢复乐观更新
          setApiProjects(previousProjects)
          sessionStorage.setItem('projectList_projects', JSON.stringify(previousProjects))
        }
      } catch (error) {
        console.error('删除项目失败:', error)
        alert(error instanceof Error ? error.message : '删除项目失败，请稍后重试')
      }
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirmProject(null)
  }

  // 处理菜单点击
  const handleMenuClick = (e: React.MouseEvent, projectId: number | string) => {
    e.stopPropagation()
    e.preventDefault()
    console.log('菜单按钮被点击，projectId:', projectId, '当前openMenuId:', openMenuId)
    setOpenMenuId(openMenuId === projectId ? null : projectId)
  }

  // 关闭菜单（点击外部时）
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId !== null) {
        const menuElement = menuRefs.current.get(openMenuId)
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuId])

  // 处理重命名
  const handleRename = (projectId: number | string, currentName: string) => {
    setOpenMenuId(null)
    setRenameProject({ id: projectId, name: currentName })
  }

  const [renameNewName, setRenameNewName] = useState('')

  useEffect(() => {
    if (renameProject) {
      setRenameNewName(renameProject.name)
    }
  }, [renameProject])

  const handleRenameConfirm = async () => {
    if (!renameProject || !renameNewName.trim()) {
      setRenameProject(null)
      return
    }

    try {
      // 更新项目名称
      const numericProjectId = typeof renameProject.id === 'number' ? renameProject.id : parseInt(renameProject.id)
      if (isNaN(numericProjectId)) {
        alertError('项目ID格式错误', '错误')
        setRenameProject(null)
        setRenameNewName('')
        return
      }

      const token = localStorage.getItem('token')
      const apiBaseUrl = (() => {
        if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
        const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
        return isProduction ? '' : 'http://localhost:3002'
      })()
      const response = await fetch(`${apiBaseUrl}/api/projects/${numericProjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: renameNewName.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '重命名项目失败')
      }
      
      // 乐观更新：立即更新状态和缓存
      setApiProjects(prev => {
        const updated = prev.map(p => 
          p.id === numericProjectId ? { ...p, name: renameNewName.trim() } : p
        )
        sessionStorage.setItem('projectList_projects', JSON.stringify(updated))
        return updated
      })
      
      alertSuccess('项目已重命名', '成功')
      
      // 后台同步（静默模式）
      try {
        const projects = await getProjects()
        setApiProjects(projects)
        sessionStorage.setItem('projectList_projects', JSON.stringify(projects))
      } catch (error) {
        console.error('刷新项目列表失败:', error)
      }
    } catch (error) {
      console.error('重命名项目失败:', error)
      alertError(error instanceof Error ? error.message : '重命名失败', '错误')
    }
    
    setRenameProject(null)
    setRenameNewName('')
  }

  // 处理复制
  const handleCopy = (projectId: number | string) => {
    setOpenMenuId(null)
    setCopySourceProject(projectId)
    alertInfo('请选择目标项目文件夹进行复制', '提示')
  }

  // 处理复制到目标项目
  const handleCopyToProject = async (targetProjectId: number | string) => {
    if (!copySourceProject) return

    try {
      const sourceProject = apiProjects.find(p => p.id === copySourceProject)
      const targetProject = apiProjects.find(p => p.id === targetProjectId)

      if (!sourceProject || !targetProject) {
        alertError('找不到源项目或目标项目', '错误')
        setCopySourceProject(null)
        return
      }

      // 确保项目ID是数字
      const sourceId = typeof copySourceProject === 'number' ? copySourceProject : parseInt(copySourceProject)
      const targetId = typeof targetProjectId === 'number' ? targetProjectId : parseInt(targetProjectId)

      if (isNaN(sourceId) || isNaN(targetId)) {
        alertError('项目ID格式错误', '错误')
        setCopySourceProject(null)
        return
      }

      // 调用后端API复制项目
      const token = localStorage.getItem('token')
      const apiBaseUrl = (() => {
        if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
        const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
        return isProduction ? '' : 'http://localhost:3002'
      })()
      const response = await fetch(`${apiBaseUrl}/api/projects/${sourceId}/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetProjectId: targetId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '复制项目失败')
      }

      alertSuccess(`项目已复制到 "${targetProject.name}"`, '成功')
      setCopySourceProject(null)
      
      // 后台同步（静默模式）
      loadProjects(true)
    } catch (error) {
      console.error('复制项目失败:', error)
      alertError(error instanceof Error ? error.message : '复制失败', '错误')
      setCopySourceProject(null)
    }
  }

  // 处理剪切
  const handleCut = (projectId: number | string) => {
    setOpenMenuId(null)
    setCutSourceProject(projectId)
    alertInfo('请选择目标项目文件夹进行移动', '提示')
  }

  // 处理移动到目标项目
  const handleMoveToProject = async (targetProjectId: number | string) => {
    if (!cutSourceProject) return

    try {
      const sourceProject = apiProjects.find(p => p.id === cutSourceProject)
      const targetProject = apiProjects.find(p => p.id === targetProjectId)

      if (!sourceProject || !targetProject) {
        alertError('找不到源项目或目标项目', '错误')
        setCutSourceProject(null)
        return
      }

      // 确保项目ID是数字
      const sourceId = typeof cutSourceProject === 'number' ? cutSourceProject : parseInt(cutSourceProject)
      const targetId = typeof targetProjectId === 'number' ? targetProjectId : parseInt(targetProjectId)

      if (isNaN(sourceId) || isNaN(targetId)) {
        alertError('项目ID格式错误', '错误')
        setCutSourceProject(null)
        return
      }

      // 调用后端API移动项目
      const token = localStorage.getItem('token')
      const apiBaseUrl = (() => {
        if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
        const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
        return isProduction ? '' : 'http://localhost:3002'
      })()
      const response = await fetch(`${apiBaseUrl}/api/projects/${sourceId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetProjectId: targetId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '移动项目失败')
      }

      alertSuccess(`项目已移动到 "${targetProject.name}"`, '成功')
      setCutSourceProject(null)
      
      // 后台同步（静默模式）
      loadProjects(true)
    } catch (error) {
      console.error('移动项目失败:', error)
      alertError(error instanceof Error ? error.message : '移动失败', '错误')
      setCutSourceProject(null)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <NavigationBar activeTab="project" showBackButton />
      
      {/* 提示消息 */}
      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
          <CheckCircle size={20} />
          <span>{notification.message}{notification.projectName}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:bg-green-700 rounded p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        {/* 加载状态 */}
        {isLoadingProjects && apiProjects.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <span className="ml-4 text-gray-600">加载中...</span>
          </div>
        )}
        
        {/* 项目网格 */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          {/* 添加项目卡片 */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="aspect-[4/3] bg-gray-50 border-2 border-dashed border-purple-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus size={32} className="text-white" />
            </div>
            <span className="text-purple-600 font-medium">添加项目</span>
          </div>

          {/* 项目文件夹卡片 - 优先显示API项目 */}
          {apiProjects.map((project) => {
            // 安全地获取 projectId
            let projectId: number | string
            if (typeof project.id === 'number') {
              projectId = project.id
            } else if (typeof project.id === 'string') {
              const parsed = parseInt(project.id, 10)
              projectId = isNaN(parsed) ? project.id : parsed
            } else {
              projectId = project.id
            }
            
            const apiProject = apiProjects.find(p => p.id === projectId)
            const workStyle = apiProject?.workStyle
            const workBackground = apiProject?.workBackground
            
            return (
              <div
                key={project.id}
                onClick={() => {
                  // 如果正在复制或剪切，选择目标项目
                  if (copySourceProject) {
                    handleCopyToProject(projectId)
                  } else if (cutSourceProject) {
                    handleMoveToProject(projectId)
                  } else {
                    navigate(`/project/${project.id}/fragments`)
                  }
                }}
                onMouseEnter={() => setHoveredProjectId(projectId)}
                onMouseLeave={() => setHoveredProjectId(null)}
                className={`aspect-[4/3] bg-gray-50 border rounded-lg p-4 cursor-pointer hover:scale-105 transition-transform duration-300 relative group ${
                  copySourceProject === projectId || cutSourceProject === projectId
                    ? 'border-yellow-400 border-2'
                    : 'border-gray-200'
                }`}
              >
                {/* 操作按钮 */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      handleDeleteClick(e, project)
                    }}
                    className="w-6 h-6 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-500/20 rounded transition-colors pointer-events-auto"
                    title="删除项目"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      console.log('菜单按钮onClick触发，projectId:', projectId)
                      handleMenuClick(e, projectId)
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                    }}
                    className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900 relative z-30 pointer-events-auto"
                    title="更多操作"
                  >
                    <Menu size={14} />
                    {/* 菜单下拉框 */}
                    {openMenuId === projectId && (
                      <div
                        ref={(el) => {
                          if (el) menuRefs.current.set(projectId, el)
                        }}
                        className="absolute top-6 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[120px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleRename(projectId, project.name)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Edit size={14} />
                          重命名
                        </button>
                        <button
                          onClick={() => handleCopy(projectId)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Copy size={14} />
                          复制
                        </button>
                        <button
                          onClick={() => handleCut(projectId)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Scissors size={14} />
                          剪切
                        </button>
                      </div>
                    )}
                  </button>
                </div>

                {/* 悬停提示 - 显示作品背景和风格 */}
                {String(hoveredProjectId) === String(projectId) && (workStyle || workBackground) && (
                  <div className="absolute inset-0 bg-black bg-opacity-80 rounded-lg flex items-center justify-center z-15 pointer-events-none">
                    <div className="text-white text-center px-4 py-2">
                      {workStyle && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-300 mb-1">作品风格</div>
                          <div className="text-sm font-medium text-white">{workStyle}</div>
                        </div>
                      )}
                      {workBackground && (
                        <div>
                          <div className="text-xs text-gray-300 mb-1">作品背景</div>
                          <div className="text-sm font-medium text-white">{workBackground}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 文件夹图标 */}
                <div className="flex-1 flex items-center justify-center mb-2">
                  <div className="w-20 h-20 text-pink-500">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                    </svg>
                  </div>
                </div>

                {/* 项目名称 */}
                <div className="text-center text-sm text-gray-700 truncate">{project.name}</div>
              </div>
            )
          })}
        </div>

        {/* 分页 */}
        <div className="flex justify-center items-center gap-2 mt-8">
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors">‹</button>
          <button className="px-4 py-2 bg-purple-600 text-white rounded">1</button>
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors">›</button>
        </div>
      </div>

      {/* 创建项目模态框 */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={async () => {
            // 后台同步（静默模式）
            loadProjects(true)
          }}
        />
      )}

      {/* 重命名确认模态框 */}
      {renameProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-300 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">重命名项目</h3>
            <p className="text-gray-700 mb-2">
              当前名称: <span className="text-purple-600 font-medium">"{renameProject.name}"</span>
            </p>
            <input
              type="text"
              value={renameNewName}
              onChange={(e) => setRenameNewName(e.target.value)}
              placeholder="请输入新名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-purple-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameConfirm()
                } else if (e.key === 'Escape') {
                  setRenameProject(null)
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRenameProject(null)
                  setRenameNewName('')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRenameConfirm}
                disabled={!renameNewName.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {deleteConfirmProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-300 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">确认删除</h3>
            <p className="text-gray-700 mb-6">
              是否删除该文档 <span className="text-purple-600 font-medium">"{deleteConfirmProject.name}"</span>？
            </p>
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

export default ProjectManagement
