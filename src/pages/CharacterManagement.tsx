import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { Plus, Search, ArrowLeft, User, RefreshCw, Trash2 } from 'lucide-react'
import CreateCharacterModal from '../components/CreateCharacterModal'
import CharacterDetailModal from '../components/CharacterDetailModal'
import { getProject } from '../services/projectStorage'
import { alertError, alertSuccess } from '../utils/alert'
import { getProjectCharacters, deleteCharacter } from '../services/api'

interface Character {
  id: string
  name: string
  image?: string
}

function CharacterManagement() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [characters, setCharacters] = useState<Character[]>([])
  const [projectName, setProjectName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 从数据库加载角色数据
  const loadCharacters = async () => {
    if (!projectId) {
      console.warn('⚠️ 没有projectId，无法加载角色')
      return
    }
    
    console.log(`🔄 开始加载角色数据，projectId: ${projectId} (类型: ${typeof projectId})`)
    setIsLoading(true)
    try {
      // 检查 projectId 是否是数字（数据库ID）
      const numericProjectId = parseInt(projectId, 10)
      if (!isNaN(numericProjectId)) {
        // 如果是数字，直接使用
        try {
          console.log(`📡 调用API获取项目 ${numericProjectId} 的角色...`)
          const dbCharacters = await getProjectCharacters(numericProjectId)
          console.log(`📥 API返回了 ${dbCharacters?.length || 0} 个角色`)
          
          // 无论是否有数据，都使用数据库结果（空数组也是有效结果）
          const mappedCharacters = (dbCharacters || []).map(character => {
            const imageUrl = character.image || character.image_url || null
            return {
              id: character.id.toString(),
              name: character.name,
              image: imageUrl,
            }
          })
          
          console.log(`✅ 映射后的角色数据:`, mappedCharacters.map(c => ({
            id: c.id,
            name: c.name,
            hasImage: !!c.image,
            imageUrl: c.image ? (c.image.length > 80 ? c.image.substring(0, 80) + '...' : c.image) : 'null'
          })))
          
          setCharacters(mappedCharacters)
          setIsLoading(false)
          console.log(`✅ 从数据库加载了 ${dbCharacters?.length || 0} 个角色 (项目ID: ${numericProjectId})`)
          return
        } catch (dbError) {
          console.error('从数据库加载角色失败:', dbError)
          // 数据库加载失败，显示空列表
          setCharacters([])
          setIsLoading(false)
          return
        }
      }
      
      // 如果不是数字，尝试通过项目名称查找数据库ID
      const project = getProject(projectId)
      if (project && project.name) {
        console.log(`🔍 通过项目名称查找数据库ID: "${project.name}"`)
        try {
          // 获取所有项目，找到匹配的项目
          const { getProjects } = await import('../services/api')
          const allProjects = await getProjects()
          const dbProject = allProjects.find(p => p.name === project.name || p.scriptTitle === project.name)
          
          if (dbProject && typeof dbProject.id === 'number') {
            console.log(`✅ 找到数据库项目ID: ${dbProject.id}`)
            // 使用数据库ID加载角色
            const dbCharacters = await getProjectCharacters(dbProject.id)
            console.log(`📥 API返回了 ${dbCharacters?.length || 0} 个角色`)
            
            const mappedCharacters = (dbCharacters || []).map(character => {
              const imageUrl = character.image || character.image_url || null
              return {
                id: character.id.toString(),
                name: character.name,
                image: imageUrl,
              }
            })
            
            console.log(`✅ 映射后的角色数据:`, mappedCharacters.map(c => ({
              id: c.id,
              name: c.name,
              hasImage: !!c.image,
              imageUrl: c.image ? (c.image.length > 80 ? c.image.substring(0, 80) + '...' : c.image) : 'null'
            })))
            
            setCharacters(mappedCharacters)
            setIsLoading(false)
            console.log(`✅ 从数据库加载了 ${dbCharacters?.length || 0} 个角色 (项目名称: "${project.name}", 数据库ID: ${dbProject.id})`)
            return
          } else {
            console.warn(`⚠️ 未找到匹配的数据库项目: "${project.name}"`)
          }
        } catch (error) {
          console.error('通过项目名称查找数据库项目失败:', error)
        }
      }
      
      // 如果找不到数据库项目，尝试从localStorage加载（兼容旧数据）
      if (project && project.characters && project.characters.length > 0) {
        console.log('📦 从localStorage加载角色数据（兼容模式）')
        setCharacters(project.characters.map(character => ({
          ...character,
          image: character.image || '/character1.jpg',
        })))
      } else {
        // 如果没有数据，显示空列表
        console.warn('⚠️ 没有找到角色数据')
        setCharacters([])
      }
    } catch (error) {
      console.error('加载角色数据失败:', error)
      // 如果数据库加载失败，尝试从localStorage加载
      const project = getProject(projectId)
      if (project && project.characters && project.characters.length > 0) {
        setCharacters(project.characters.map(character => ({
          ...character,
          image: character.image || '/character1.jpg',
        })))
      } else {
        setCharacters([])
      }
    } finally {
      setIsLoading(false)
    }
  }

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

  // 初始加载和定期刷新
  useEffect(() => {
    loadCharacters()
    
    // 每3秒自动刷新一次（更频繁的刷新以确保数据同步）
    refreshIntervalRef.current = setInterval(() => {
      loadCharacters()
    }, 3000)
    
    // 页面可见时刷新
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadCharacters()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // 监听storage事件，当其他页面保存数据时触发刷新
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'character_uploaded' || e.key === 'asset_uploaded') {
        console.log('检测到资产上传，立即刷新角色列表')
        loadCharacters()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    // 监听自定义事件（同页面内通信）
    const handleCharacterUploaded = () => {
      console.log('📢 收到角色上传事件，准备刷新...')
      console.log(`   当前projectId: ${projectId}`)
      // 延迟一点刷新，确保数据库已保存
      setTimeout(() => {
        console.log('🔄 开始刷新角色列表...')
        loadCharacters()
      }, 1000) // 增加到1秒，确保数据库已保存
    }
    window.addEventListener('character-uploaded', handleCharacterUploaded)
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('character-uploaded', handleCharacterUploaded)
    }
  }, [projectId])

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="characters" />
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
            <h2 className="text-xl font-semibold">角色管理</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadCharacters}
              disabled={isLoading}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="刷新角色列表"
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
                placeholder="搜索角色"
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
                新建角色
              </button>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                公共角色
              </button>
            </div>

            {/* 右侧角色网格 */}
            <div className="flex-1 grid grid-cols-4 gap-4">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform relative group"
                >
                  <div
                    onClick={() => {
                      setSelectedCharacter(character)
                    }}
                    className="aspect-[9/16] bg-gray-700 flex items-center justify-center overflow-hidden"
                  >
                    {character.image && (character.image.startsWith('http') || character.image.startsWith('https')) ? (
                      <img
                        src={character.image}
                        alt={character.name}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          console.error('❌ 图片加载失败:', character.image, '角色:', character.name)
                          e.currentTarget.style.display = 'none'
                        }}
                        onLoad={() => {
                          console.log('✅ 图片加载成功:', character.image, '角色:', character.name)
                        }}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center text-white text-xl font-bold">
                        {character.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-center text-sm">{character.name}</div>
                  {/* 删除按钮 - 悬停时显示 */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (window.confirm(`确定要删除角色 "${character.name}" 吗？`)) {
                        try {
                          const numericId = parseInt(character.id, 10)
                          if (!isNaN(numericId)) {
                            await deleteCharacter(numericId)
                            alertSuccess('角色已删除', '成功')
                            // 重新加载列表
                            loadCharacters()
                          }
                        } catch (error) {
                          alertError(error instanceof Error ? error.message : '删除失败', '错误')
                        }
                      }
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                    title="删除角色"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 分页 */}
          <div className="flex justify-center items-center gap-2 mt-8">
            <button className="px-3 py-1 text-gray-600 hover:text-gray-900">上一页</button>
            <button className="px-4 py-1 bg-purple-600 text-white rounded">1</button>
            <button className="px-3 py-1 text-gray-600 hover:text-gray-900">下一页</button>
          </div>
        </div>
      </div>

      {/* 创建角色模态框 */}
      {showCreateModal && (
        <CreateCharacterModal 
          onClose={() => setShowCreateModal(false)}
          projectName={projectName}
          alwaysShowRightPanel={true}
          onCharacterSelect={(character) => {
            // 当用户选择角色后，刷新角色列表
            console.log('✅ 用户选择了角色，刷新列表:', character)
            setTimeout(() => {
              loadCharacters()
            }, 500) // 延迟500ms确保数据库已保存
          }}
        />
      )}

      {/* 角色详情模态框 */}
      {selectedCharacter && (
        <CharacterDetailModal
          character={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
          onImageUpload={async (characterId, imageUrl) => {
            // 更新本地状态
            setCharacters(characters.map(c => 
              c.id === characterId ? { ...c, image: imageUrl } : c
            ))
            if (selectedCharacter) {
              setSelectedCharacter({ ...selectedCharacter, image: imageUrl })
            }
            
            // 重新从数据库加载以确保数据同步
            if (projectId) {
              try {
                // 检查 projectId 是否是数字（数据库ID）
                const numericProjectId = parseInt(projectId, 10)
                if (!isNaN(numericProjectId)) {
                  const dbCharacters = await getProjectCharacters(numericProjectId)
                  if (dbCharacters && dbCharacters.length > 0) {
                    setCharacters(dbCharacters.map(character => ({
                      id: character.id.toString(),
                      name: character.name,
                      image: character.image || character.image_url || null,
                    })))
                  }
                }
              } catch (error) {
                console.error('重新加载角色数据失败:', error)
              }
            }
          }}
          onDelete={(characterId) => {
            setCharacters(characters.filter(c => c.id !== characterId))
          }}
        />
      )}
    </div>
  )
}

export default CharacterManagement
