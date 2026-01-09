import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavigationBar from '../components/NavigationBar'
import { MoreVertical, Menu, Plus, X, CheckCircle, Trash2, Edit, Copy, Scissors, FolderOpen, ChevronRight, Home, User } from 'lucide-react'
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

interface ApiProject {
  id: number
  name: string
  scriptTitle?: string
  workStyle?: string
  workBackground?: string
  createdAt?: string
  updatedAt?: string
  userId?: number
  groupId?: number
  parentId?: number | null
  path?: string
  coverUrl?: string
  ownerName?: string
  isOwner?: boolean
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
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<ApiProject | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | string | null>(null)
  const [renameProject, setRenameProject] = useState<{ id: number | string; name: string } | null>(null)
  const [copySourceProject, setCopySourceProject] = useState<number | string | null>(null)
  const [cutSourceProject, setCutSourceProject] = useState<number | string | null>(null)
  const menuRefs = useRef<Map<number | string, HTMLDivElement>>(new Map())

  // 当前路径（用于文件夹导航）
  const [currentPath, setCurrentPath] = useState<string>('/')
  const [parentProject, setParentProject] = useState<{ id: number; name: string; path: string } | null>(null)

  const [apiProjects, setApiProjects] = useState<ApiProject[]>(() => {
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
  const loadingPromiseRef = useRef<Promise<void> | null>(null)

  // 根据当前路径过滤项目
  const filteredProjects = useMemo(() => {
    return apiProjects.filter(p => {
      const projectPath = p.path || '/'
      // 显示当前路径下的项目（不包括子文件夹中的）
      if (currentPath === '/') {
        return projectPath === '/'
      }
      return projectPath === currentPath
    })
  }, [apiProjects, currentPath])

  // 获取当前路径下的子文件夹（合并同名文件夹）
  const subFolders = useMemo(() => {
    const folderMap = new Map<string, ApiProject[]>()
    
    apiProjects.forEach(p => {
      const projectPath = p.path || '/'
      // 检查是否是当前路径的直接子项目（作为文件夹）
      let expectedParentPath: string
      if (currentPath === '/') {
        expectedParentPath = `/${p.name}`
      } else {
        expectedParentPath = `${currentPath}/${p.name}`
      }
      
      // 查找以此项目为父级的子项目
      const hasChildren = apiProjects.some(child => 
        child.path === expectedParentPath || 
        (child.parentId === p.id)
      )
      
      if (hasChildren && projectPath === currentPath) {
        const existing = folderMap.get(p.name) || []
        existing.push(p)
        folderMap.set(p.name, existing)
      }
    })
    
    return Array.from(folderMap.entries()).map(([name, projects]) => ({
      name,
      projects,
      totalCount: projects.length
    }))
  }, [apiProjects, currentPath])

  // 面包屑导航
  const breadcrumbs = useMemo(() => {
    if (currentPath === '/') return [{ name: '根目录', path: '/' }]
    
    const parts = currentPath.split('/').filter(Boolean)
    const crumbs = [{ name: '根目录', path: '/' }]
    let accPath = ''
    
    parts.forEach(part => {
      accPath += `/${part}`
      crumbs.push({ name: part, path: accPath })
    })
    
    return crumbs
  }, [currentPath])

  // 从API加载项目列表
  const loadProjects = async (silent = false) => {
    if (loadingPromiseRef.current) {
      return loadingPromiseRef.current
    }

    if (!silent) {
      if (apiProjects.length > 0) {
        // 已有数据，静默更新
      } else {
        try {
          const cachedProjects = sessionStorage.getItem('projectList_projects')
          if (cachedProjects) {
            const parsed = JSON.parse(cachedProjects)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setApiProjects(parsed)
              setIsLoadingProjects(true)
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
      setIsLoadingProjects(false)
    }

    const loadPromise = (async () => {
      try {
        const projects = await getProjects()
        setApiProjects(projects)
        sessionStorage.setItem('projectList_projects', JSON.stringify(projects))
        setProjects([])
      } catch (error) {
        console.error('加载项目列表失败:', error)
        if (apiProjects.length === 0) {
          setApiProjects([])
          setProjects([])
        }
      } finally {
        if (!silent) {
          setIsLoadingProjects(false)
        }
        loadingPromiseRef.current = null
      }
    })()

    loadingPromiseRef.current = loadPromise
    return loadPromise
  }

  // 初始加载和定期刷新
  useEffect(() => {
    loadProjects(false)

    refreshIntervalRef.current = setInterval(() => {
      loadProjects(true)
    }, 20000)

    let visibilityTimeout: NodeJS.Timeout | null = null
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout)
        }
        visibilityTimeout = setTimeout(() => {
          loadProjects(true)
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

  // 处理自动创建项目
  useEffect(() => {
    if (state?.autoCreateProject && state.projectName && state.analysisResult && !hasProcessedAutoCreate) {
      const projectExists = apiProjects.some(p => p.name === state.projectName)
      
      if (!projectExists) {
        createOrUpdateProject({
          name: state.projectName,
          analysisResult: state.analysisResult,
        }).then(() => {
          return getProjects()
        }).then((projects) => {
          setApiProjects(projects)
          sessionStorage.setItem('projectList_projects', JSON.stringify(projects))
          
          setNotification({
            message: '已自动创建项目文件',
            projectName: state.projectName,
          })

          const timer = setTimeout(() => {
            setNotification(null)
          }, 5000)

          setHasProcessedAutoCreate(true)
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

  const handleDeleteClick = (e: React.MouseEvent, project: ApiProject) => {
    e.stopPropagation()
    setDeleteConfirmProject(project)
  }

  const handleConfirmDelete = async () => {
    if (deleteConfirmProject) {
      try {
        await deleteProjectApi(deleteConfirmProject.id)
        
        const previousProjects = apiProjects
        setApiProjects(prev => {
          const updated = prev.filter(p => p.id !== deleteConfirmProject.id)
          sessionStorage.setItem('projectList_projects', JSON.stringify(updated))
          return updated
        })
        
        const { deleteProject: deleteLocalProject } = await import('../services/projectStorage')
        deleteLocalProject(String(deleteConfirmProject.id))
        
        setDeleteConfirmProject(null)
        
        try {
          const projects = await getProjects()
          setApiProjects(projects)
          sessionStorage.setItem('projectList_projects', JSON.stringify(projects))
        } catch (error) {
          console.error('刷新项目列表失败:', error)
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

  const handleMenuClick = (e: React.MouseEvent, projectId: number | string) => {
    e.stopPropagation()
    e.preventDefault()
    setOpenMenuId(openMenuId === projectId ? null : projectId)
  }

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
      
      setApiProjects(prev => {
        const updated = prev.map(p => 
          p.id === numericProjectId ? { ...p, name: renameNewName.trim() } : p
        )
        sessionStorage.setItem('projectList_projects', JSON.stringify(updated))
        return updated
      })
      
      alertSuccess('项目已重命名', '成功')
      
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

  const handleCopy = (projectId: number | string) => {
    setOpenMenuId(null)
    setCopySourceProject(projectId)
    alertInfo('请选择目标项目文件夹进行复制', '提示')
  }

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

      const sourceId = typeof copySourceProject === 'number' ? copySourceProject : parseInt(copySourceProject)
      const targetId = typeof targetProjectId === 'number' ? targetProjectId : parseInt(targetProjectId)

      if (isNaN(sourceId) || isNaN(targetId)) {
        alertError('项目ID格式错误', '错误')
        setCopySourceProject(null)
        return
      }

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
      loadProjects(true)
    } catch (error) {
      console.error('复制项目失败:', error)
      alertError(error instanceof Error ? error.message : '复制失败', '错误')
      setCopySourceProject(null)
    }
  }

  const handleCut = (projectId: number | string) => {
    setOpenMenuId(null)
    setCutSourceProject(projectId)
    alertInfo('请选择目标项目文件夹进行移动', '提示')
  }

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

      const sourceId = typeof cutSourceProject === 'number' ? cutSourceProject : parseInt(cutSourceProject)
      const targetId = typeof targetProjectId === 'number' ? targetProjectId : parseInt(targetProjectId)

      if (isNaN(sourceId) || isNaN(targetId)) {
        alertError('项目ID格式错误', '错误')
        setCutSourceProject(null)
        return
      }

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
      loadProjects(true)
    } catch (error) {
      console.error('移动项目失败:', error)
      alertError(error instanceof Error ? error.message : '移动失败', '错误')
      setCutSourceProject(null)
    }
  }

  // 进入文件夹
  const handleEnterFolder = (folderName: string) => {
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`
    setCurrentPath(newPath)
  }

  // 返回上级目录
  const handleGoBack = () => {
    if (currentPath === '/') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath(parts.length === 0 ? '/' : `/${parts.join('/')}`)
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
        {/* 面包屑导航 */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-2">
              {index > 0 && <ChevronRight size={14} className="text-gray-400" />}
              <button
                onClick={() => setCurrentPath(crumb.path)}
                className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                  index === breadcrumbs.length - 1 ? 'text-purple-600 font-medium' : 'text-gray-600'
                }`}
              >
                {index === 0 && <Home size={14} />}
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* 项目网格 */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          {/* 加载状态 - 骨架屏 */}
          {isLoadingProjects && apiProjects.length === 0 ? (
            <>
              <div className="aspect-[4/3] bg-gray-50 border-2 border-dashed border-purple-500 rounded-lg flex flex-col items-center justify-center opacity-50">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center mb-4">
                  <Plus size={32} className="text-white" />
                </div>
                <span className="text-purple-600 font-medium">添加项目</span>
              </div>
              
              {[...Array(4)].map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="aspect-[4/3] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse"
                >
                  <div className="h-full flex flex-col">
                    <div className="flex-1 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
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

              {/* 子文件夹 */}
              {subFolders.map((folder) => (
                <div
                  key={`folder-${folder.name}`}
                  onClick={() => handleEnterFolder(folder.name)}
                  className="aspect-[4/3] bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:scale-105 transition-transform duration-300 relative group"
                >
                  <div className="flex-1 flex items-center justify-center mb-2">
                    <div className="w-20 h-20 text-yellow-500">
                      <FolderOpen size={80} />
                    </div>
                  </div>
                  <div className="text-center text-sm text-gray-700 truncate font-medium">{folder.name}</div>
                  <div className="text-center text-xs text-gray-500">{folder.totalCount} 个项目</div>
                </div>
              ))}

              {/* 项目文件夹卡片 */}
              {filteredProjects.map((project) => {
                const projectId = project.id
                
                return (
                  <div
                    key={project.id}
                    onClick={() => {
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
                    {/* 所有者标识 */}
                    {!project.isOwner && project.ownerName && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs">
                        <User size={10} />
                        {project.ownerName}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-auto">
                      {project.isOwner && (
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
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
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
                        {openMenuId === projectId && (
                          <div
                            ref={(el) => {
                              if (el) menuRefs.current.set(projectId, el)
                            }}
                            className="absolute top-6 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[120px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {project.isOwner && (
                              <button
                                onClick={() => handleRename(projectId, project.name)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Edit size={14} />
                                重命名
                              </button>
                            )}
                            <button
                              onClick={() => handleCopy(projectId)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Copy size={14} />
                              复制
                            </button>
                            {project.isOwner && (
                              <button
                                onClick={() => handleCut(projectId)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Scissors size={14} />
                                剪切
                              </button>
                            )}
                          </div>
                        )}
                      </button>
                    </div>

                    {/* 悬停提示 */}
                    {String(hoveredProjectId) === String(projectId) && (project.workStyle || project.workBackground) && (
                      <div className="absolute inset-0 bg-black bg-opacity-80 rounded-lg flex items-center justify-center z-15 pointer-events-none">
                        <div className="text-white text-center px-4 py-2">
                          {project.workStyle && (
                            <div className="mb-3">
                              <div className="text-xs text-gray-300 mb-1">作品风格</div>
                              <div className="text-sm font-medium text-white">{project.workStyle}</div>
                            </div>
                          )}
                          {project.workBackground && (
                            <div>
                              <div className="text-xs text-gray-300 mb-1">作品背景</div>
                              <div className="text-sm font-medium text-white">{project.workBackground}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 封面图或文件夹图标 */}
                    <div className="flex-1 flex items-center justify-center mb-2">
                      {project.coverUrl ? (
                        <img 
                          src={project.coverUrl} 
                          alt={project.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-20 h-20 text-pink-500">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-sm text-gray-700 truncate">{project.name}</div>
                  </div>
                )
              })}
            </>
          )}
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
            loadProjects(true)
          }}
          parentProject={currentPath !== '/' ? {
            id: 0,
            name: breadcrumbs[breadcrumbs.length - 1]?.name || '',
            path: currentPath
          } : null}
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
