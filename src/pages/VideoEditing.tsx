import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, Download, Edit, Trash2, Star, Video, Play, Plus, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import VideoEditModal from '../components/VideoEditModal'
import VideoEditDrawer from '../components/VideoEditDrawer'
import InlineDeleteConfirm from '../components/InlineDeleteConfirm'
import CreateSceneModal from '../components/CreateSceneModal'
import CreateCharacterModal from '../components/CreateCharacterModal'
import { alert, alertInfo, alertWarning, alertSuccess, alertError } from '../utils/alert'
import { exportVideosToDesktop } from '../services/api'

interface FusionItem {
  id: number
  shotNumber: number
  image: string
  videoPrompt: string
  model: string
  resolution: string
  duration: number
  quantity: number
  selected: boolean
  generatingStatus?: 'idle' | 'generating' | 'completed' | 'failed'
  generatingProgress?: number
  generatingTaskIds?: string[]
  videoUrls?: string[]
}

interface LocationState {
  currentFusion?: FusionItem
  allFusions?: FusionItem[]
  allImageAssets?: string[]
}

function VideoEditing() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [selectedFusionForEdit, setSelectedFusionForEdit] = useState<FusionItem | null>(null)
  const [starredFusions, setStarredFusions] = useState<Set<number>>(new Set()) // 收藏的分镜ID集合
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean
    fusionId: number | null
    anchorElement: HTMLElement | null
  }>({
    isOpen: false,
    fusionId: null,
    anchorElement: null,
  })
  const deleteButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  
  // 从融图管理页面传递的数据初始化
  const [fusions, setFusions] = useState<FusionItem[]>(() => {
    // 优先使用 location.state
    if (state?.allFusions && state.allFusions.length > 0) {
      // 保存到 sessionStorage
      try {
        sessionStorage.setItem('imageFusion_fusions', JSON.stringify(state.allFusions))
      } catch (error) {
        console.warn('⚠️ 保存数据失败:', error)
      }
      return state.allFusions
    }
    
    // 如果没有 location.state，尝试从 sessionStorage 恢复
    try {
      const savedFusions = sessionStorage.getItem('imageFusion_fusions')
      if (savedFusions) {
        const parsed = JSON.parse(savedFusions)
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('✅ 从 sessionStorage 恢复 fusions 数据')
          return parsed
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 fusions 失败:', error)
    }
    
    return []
  })
  
  const [allImageAssets, setAllImageAssets] = useState<string[]>(() => {
    // 优先使用 location.state
    if (state?.allImageAssets && state.allImageAssets.length > 0) {
      try {
        sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(state.allImageAssets))
      } catch (error) {
        console.warn('⚠️ 保存数据失败:', error)
      }
      return state.allImageAssets
    }
    
    // 如果没有 location.state，尝试从 sessionStorage 恢复
    try {
      const savedAssets = sessionStorage.getItem('imageFusion_allImageAssets')
      if (savedAssets) {
        const parsed = JSON.parse(savedAssets)
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('✅ 从 sessionStorage 恢复 allImageAssets 数据')
          return parsed
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 allImageAssets 失败:', error)
    }
    
    return []
  })
  
  const [currentFusion, setCurrentFusion] = useState<FusionItem | null>(() => {
    // 优先使用 location.state
    if (state?.currentFusion) {
      try {
        sessionStorage.setItem('imageFusion_currentFusion', JSON.stringify(state.currentFusion))
      } catch (error) {
        console.warn('⚠️ 保存数据失败:', error)
      }
      return state.currentFusion
    }
    
    // 如果没有 location.state，尝试从 sessionStorage 恢复
    try {
      const savedCurrent = sessionStorage.getItem('imageFusion_currentFusion')
      if (savedCurrent) {
        const parsed = JSON.parse(savedCurrent)
        console.log('✅ 从 sessionStorage 恢复 currentFusion 数据')
        return parsed
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 currentFusion 失败:', error)
    }
    
    // 如果 fusions 有数据，使用第一个
    // 注意：这里不能直接使用 fusions，因为它在初始化时可能还是空数组
    // 所以需要在 useEffect 中处理
    return null
  })
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [imageScrollIndex, setImageScrollIndex] = useState(0)
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set()) // 选中的图片索引集合
  
  // 视频生成配置
  const [videoModel, setVideoModel] = useState('wan2.2-i2v-flash')
  const [videoQuantity, setVideoQuantity] = useState(1)
  const [videoRatio, setVideoRatio] = useState('16:9')
  const [selectedScenes, setSelectedScenes] = useState<Array<{ id: string; name: string; image?: string }>>([])
  const [selectedCharacters, setSelectedCharacters] = useState<Array<{ id: string; name: string; image?: string }>>([])
  
  // 选择器模态框状态
  const [showSceneSelector, setShowSceneSelector] = useState(false)
  const [showCharacterSelector, setShowCharacterSelector] = useState(false)
  
  // 项目名称（用于角色选择器）
  const [projectName, setProjectName] = useState<string>('')
  
  // 从 sessionStorage 读取图片比例
  const [aspectRatio, setAspectRatio] = useState<string>('16:9')
  useEffect(() => {
    try {
      const savedRatio = sessionStorage.getItem('shotManagement_aspectRatio')
      if (savedRatio) {
        setAspectRatio(savedRatio)
      }
    } catch (error) {
      console.warn('⚠️ 读取图片比例失败:', error)
    }
  }, [])
  
  // 从 sessionStorage 获取项目名称
  useEffect(() => {
    try {
      const savedScriptTitle = sessionStorage.getItem('scriptInput_scriptTitle')
      if (savedScriptTitle) {
        setProjectName(savedScriptTitle)
      }
    } catch (error) {
      console.warn('⚠️ 获取项目名称失败:', error)
    }
  }, [])
  
  // 当 currentFusion 改变时，更新选中的图片索引
  useEffect(() => {
    if (currentFusion && allImageAssets.length > 0) {
      const index = allImageAssets.findIndex(img => img === currentFusion.image)
      if (index >= 0) {
        setSelectedImageIndex(index)
      }
    }
  }, [currentFusion, allImageAssets])
  
  // 当 fusions 或 allImageAssets 更新时，保存到 sessionStorage
  useEffect(() => {
    if (fusions.length > 0) {
      try {
        sessionStorage.setItem('imageFusion_fusions', JSON.stringify(fusions))
      } catch (error) {
        console.warn('⚠️ 保存 fusions 失败:', error)
      }
    }
  }, [fusions])
  
  useEffect(() => {
    if (allImageAssets.length > 0) {
      try {
        sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(allImageAssets))
      } catch (error) {
        console.warn('⚠️ 保存 allImageAssets 失败:', error)
      }
    }
  }, [allImageAssets])
  
  useEffect(() => {
    if (currentFusion) {
      try {
        sessionStorage.setItem('imageFusion_currentFusion', JSON.stringify(currentFusion))
      } catch (error) {
        console.warn('⚠️ 保存 currentFusion 失败:', error)
      }
    }
  }, [currentFusion])
  
  // 如果没有传递数据，使用默认数据
  useEffect(() => {
    if (fusions.length === 0) {
      const defaultFusions: FusionItem[] = [
        {
          id: 1,
          shotNumber: 1,
          image: '/placeholder-image.jpg',
          videoPrompt: '开场交代背景。在高塔上，我和闺密并肩而立，俯瞰着华丽但冰冷的宫城，暗示被困七年的压抑。',
          model: 'wan2.2-i2v-flash',
          resolution: '720p',
          duration: 5,
          quantity: 1,
          selected: false,
          generatingStatus: 'idle',
        },
        {
          id: 2,
          shotNumber: 2,
          image: '/placeholder-image.jpg',
          videoPrompt: '闺密转过身，脸上带着一种奇异的、解脱般的微笑，告诉我一个好消息。',
          model: 'wan2.2-i2v-flash',
          resolution: '720p',
          duration: 5,
          quantity: 1,
          selected: false,
          generatingStatus: 'idle',
        },
        {
          id: 3,
          shotNumber: 3,
          image: '/placeholder-image.jpg',
          videoPrompt: '闺密说出关键信息的第一部分，她的眼神中透露着一种狂热的光芒',
          model: 'wan2.2-i2v-flash',
          resolution: '720p',
          duration: 5,
          quantity: 1,
          selected: false,
          generatingStatus: 'idle',
        },
      ]
      setFusions(defaultFusions)
      if (!currentFusion) {
        setCurrentFusion(defaultFusions[0])
      }
    }
  }, [])

  const handleEdit = (id: number) => {
    const fusion = fusions.find(f => f.id === id)
    if (fusion) {
      setSelectedFusionForEdit(fusion)
      setIsEditDrawerOpen(true)
    }
  }

  const handleFusionUpdate = (updatedFusion: FusionItem) => {
    setFusions(prev => prev.map(f => f.id === updatedFusion.id ? updatedFusion : f))
  }

  // 辅助函数：判断是否是 Hailuo 模型
  const isHailuoModel = (model: string): boolean => {
    return model === 'minimax-hailuo-02' || model === 'minimax-hailuo-2.3' || model === 'minimax-hailuo-2.3-fast'
  }

  // 辅助函数：判断是否是 Vidu V2 模型
  const isViduV2Model = (model: string): boolean => {
    return model === 'viduq2-turbo' || model === 'viduq2-pro' || model === 'viduq1' || 
           model === 'vidu2.0' || model === 'vidu1.5' || model === 'vidu1.0'
  }

  // 辅助函数：判断是否是 Veo3.1 模型
  const isVeo3Model = (model: string): boolean => {
    return model === 'veo3.1' || model === 'veo3.1-pro'
  }

  // 辅助函数：判断是否是豆包 Seedance 模型
  const isSeedanceModel = (model: string): boolean => {
    return model === 'doubao-seedance-1-5-pro-251215' || model === 'doubao-seedance-1-0-lite-i2v-250428'
  }

  // 辅助函数：获取可用的分辨率选项
  const getAvailableResolutions = (model: string): string[] => {
    if (isHailuoModel(model)) {
      // Hailuo 模型只支持 768P 和 1080P（对应 720p 和 1080p）
      return ['720p', '1080p']
    } else if (isViduV2Model(model)) {
      // Vidu V2 模型支持 360p, 540p, 720p, 1080p
      return ['360p', '540p', '720p', '1080p']
    } else if (isVeo3Model(model)) {
      // Veo3.1 模型不支持分辨率选择，只支持宽高比，但为了兼容性，返回默认值
      return ['720p', '1080p'] // 为了兼容，返回默认值
    } else if (isSeedanceModel(model)) {
      // 豆包 Seedance 支持 480p, 720p, 1080p
      return ['480p', '720p', '1080p']
    }
    // 通义万相模型（wan2.x）支持 480p, 720p, 1080p
    return ['480p', '720p', '1080p']
  }

  // 辅助函数：获取可用的时长选项
  const getAvailableDurations = (model: string, resolution: string): number[] => {
    if (isHailuoModel(model)) {
      // Hailuo 模型：768P(720p) 支持 6 和 10 秒，1080P(1080p) 只支持 6 秒
      if (resolution === '1080p') {
        return [6]
      } else if (resolution === '720p') {
        return [6, 10]
      }
    } else if (isViduV2Model(model)) {
      // Vidu V2 模型：默认支持 5 秒，但通常也支持其他时长
      return [5, 10]
    } else if (isVeo3Model(model)) {
      // Veo3.1 模型：没有明确时长限制，默认返回 5 和 10 秒
      return [5, 10]
    } else if (isSeedanceModel(model)) {
      // 豆包 Seedance：支持 2~12 秒
      return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    }
    // 通义万相模型（wan2.x）：默认支持 5 和 10 秒
    return [5, 10]
  }

  const handleSelectFusion = (fusion: FusionItem) => {
    setCurrentFusion(fusion)
    // 同步配置
    setVideoModel(fusion.model)
    setVideoQuantity(fusion.quantity)
  }

  const handleExportAll = async () => {
    try {
      // 只收集选定的（selected为true）且有视频的 fusion 的 videoUrls
      const allVideoUrls: string[] = []
      fusions.forEach((fusion) => {
        if (fusion.selected && fusion.videoUrls && fusion.videoUrls.length > 0) {
          // 只取第一个视频URL（已确认的视频）
          allVideoUrls.push(fusion.videoUrls[0])
        }
      })

      if (allVideoUrls.length === 0) {
        alertWarning('没有可导出的视频，请先选择要导出的视频或先生成视频')
        return
      }

      // 获取剧本名
      const scriptName = projectName || sessionStorage.getItem('scriptInput_scriptTitle') || '未命名剧本'
      
      alertInfo(`正在导出 ${allVideoUrls.length} 个视频到桌面...`)

      // 调用API导出视频
      const result = await exportVideosToDesktop(allVideoUrls, scriptName)

      if (result.success) {
        const message = result.errors && result.errors.length > 0
          ? `成功导出 ${result.downloadedFiles?.length || 0} 个视频到桌面文件夹"${result.folderName}"\n\n失败: ${result.errors.length} 个`
          : `成功导出 ${result.downloadedFiles?.length || 0} 个视频到桌面文件夹"${result.folderName}"`
        
        alertSuccess(message, '导出成功')
        console.log('✅ 视频导出成功:', result)
      } else {
        throw new Error(result.error || '导出失败')
      }
    } catch (error) {
      console.error('❌ 导出视频失败:', error)
      alertError(error instanceof Error ? error.message : '导出视频失败', '导出失败')
    }
  }

  const handleExportToCapCut = () => {
    console.log('导出到剪映草稿文件')
    alertInfo('导出到剪映草稿文件功能待实现')
  }

  const handleImageScroll = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setImageScrollIndex(Math.max(0, imageScrollIndex - 1))
    } else {
      setImageScrollIndex(Math.min(allImageAssets.length - 5, imageScrollIndex + 1))
    }
  }

  const handleAddScene = () => {
    // 打开场景选择器
    setShowSceneSelector(true)
  }

  const handleRemoveScene = (index: number) => {
    setSelectedScenes(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddCharacter = () => {
    // 打开角色选择器
    setShowCharacterSelector(true)
  }

  const handleRemoveCharacter = (index: number) => {
    setSelectedCharacters(prev => prev.filter((_, i) => i !== index))
  }
  
  const handleSceneSelect = (scene: { id: string; name: string; image?: string }) => {
    // 添加选中的场景（避免重复）
    setSelectedScenes(prev => {
      const exists = prev.some(s => s.id === scene.id)
      if (exists) {
        alertInfo('该场景已添加', '提示')
        return prev
      }
      return [...prev, scene]
    })
    setShowSceneSelector(false)
  }
  
  const handleCharacterSelect = (character: { id: string; name: string; image?: string }) => {
    // 添加选中的角色（避免重复）
    setSelectedCharacters(prev => {
      const exists = prev.some(c => c.id === character.id)
      if (exists) {
        alertInfo('该角色已添加', '提示')
        return prev
      }
      return [...prev, { id: character.id, name: character.name, image: character.image }]
    })
    setShowCharacterSelector(false)
  }

  // 计算进度
  const completedCount = fusions.filter(f => f.generatingStatus === 'completed').length
  const totalCount = fusions.length
  const progress = totalCount > 0 ? Math.floor((completedCount / totalCount) * 100) : 0

  return (
    <div className="h-screen bg-white text-gray-900 overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 导航栏 */}
        <div className="flex items-center gap-4 px-4 py-2 flex-shrink-0">
          <button
            onClick={() => {
              // 返回时保存当前状态到 sessionStorage 和 location.state，以便恢复
              const stateToSave = {
                fusions: fusions,
                allImageAssets: allImageAssets,
                currentFusion: currentFusion,
              }
              
              // 保存到 sessionStorage（防止刷新丢失）
              try {
                sessionStorage.setItem('imageFusion_fusions', JSON.stringify(fusions))
                sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(allImageAssets))
                if (currentFusion) {
                  sessionStorage.setItem('imageFusion_currentFusion', JSON.stringify(currentFusion))
                }
                console.log('✅ 状态已保存到 sessionStorage')
              } catch (error) {
                console.warn('⚠️ 保存状态到 sessionStorage 失败:', error)
              }
              
              navigate('/image-fusion', {
                state: stateToSave
              })
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem('imageFusion_fusions', JSON.stringify(fusions))
                  sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(allImageAssets))
                  if (currentFusion) {
                    sessionStorage.setItem('imageFusion_currentFusion', JSON.stringify(currentFusion))
                  }
                } catch (error) {
                  console.warn('⚠️ 保存数据失败:', error)
                }
                navigate('/script-input')
              }}
              className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">1</span>
              <span>输入剧本(一整集)</span>
            </button>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem('imageFusion_fusions', JSON.stringify(fusions))
                  sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(allImageAssets))
                  if (currentFusion) {
                    sessionStorage.setItem('imageFusion_currentFusion', JSON.stringify(currentFusion))
                  }
                } catch (error) {
                  console.warn('⚠️ 保存数据失败:', error)
                }
                navigate('/asset-details')
              }}
              className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">2</span>
              <span>资产详情</span>
            </button>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem('imageFusion_fusions', JSON.stringify(fusions))
                  sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(allImageAssets))
                  if (currentFusion) {
                    sessionStorage.setItem('imageFusion_currentFusion', JSON.stringify(currentFusion))
                  }
                } catch (error) {
                  console.warn('⚠️ 保存数据失败:', error)
                }
                navigate('/shot-management')
              }}
              className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">3</span>
              <span>分镜管理</span>
            </button>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem('imageFusion_fusions', JSON.stringify(fusions))
                  sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(allImageAssets))
                  if (currentFusion) {
                    sessionStorage.setItem('imageFusion_currentFusion', JSON.stringify(currentFusion))
                  }
                } catch (error) {
                  console.warn('⚠️ 保存数据失败:', error)
                }
                navigate('/image-fusion', {
                  state: {
                    fusions: fusions,
                    allImageAssets: allImageAssets,
                  }
                })
              }}
              className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">4</span>
              <span>融图管理</span>
            </button>
            <span className="text-gray-600">→</span>
            <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-pink-500 flex items-center justify-center text-xs font-bold">5</span>
              <span className="border-b-2 border-pink-500">视频编辑</span>
            </div>
          </div>
        </div>

        {/* 内容区域 - 表格布局 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-7xl mx-auto">
            {/* 表格 */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={fusions.length > 0 && fusions.every(f => f.selected)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setFusions(fusions.map(f => ({ ...f, selected: checked })))
                        }}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">序号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">已确认素材</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">视频素材</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">分镜</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {fusions.map((fusion, index) => {
                    // 获取已确认的视频URL（第一个生成的视频或第一个videoUrl）
                    const confirmedVideoUrl = fusion.videoUrls && fusion.videoUrls.length > 0 
                      ? fusion.videoUrls[0] 
                      : null
                    // 视频素材URL（如果有多个，显示第一个）
                    const videoMaterialUrl = fusion.videoUrls && fusion.videoUrls.length > 0 
                      ? fusion.videoUrls[0] 
                      : null
                    // 是否已收藏
                    const isStarred = starredFusions.has(fusion.id)
                    
                    return (
                      <tr key={fusion.id} className="border-t border-gray-200 hover:bg-gray-100">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={fusion.selected}
                            onChange={(e) => {
                              setFusions(fusions.map(f => 
                                f.id === fusion.id ? { ...f, selected: e.target.checked } : f
                              ))
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-4 py-4">{index + 1}</td>
                        
                        {/* 已确认素材 */}
                        <td className="px-4 py-4">
                          <div 
                            className="relative bg-white rounded border border-gray-300 overflow-hidden group cursor-pointer"
                            style={{ 
                              aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1',
                              width: '128px' // 保持 w-32 的宽度
                            }}
                          >
                            {confirmedVideoUrl ? (
                              <>
                                <video
                                  src={confirmedVideoUrl}
                                  className="w-full h-full object-cover"
                                  muted
                                  onMouseEnter={(e) => {
                                    const video = e.currentTarget
                                    video.play().catch(() => {})
                                  }}
                                  onMouseLeave={(e) => {
                                    const video = e.currentTarget
                                    video.pause()
                                    video.currentTime = 0
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 transition-opacity">
                                  <Play size={24} className="text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-500 text-xs">暂无视频</span>
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* 视频素材 */}
                        <td className="px-4 py-4">
                          <div 
                            className="relative bg-white rounded border border-gray-300 overflow-hidden group"
                            style={{ 
                              aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1',
                              width: '128px' // 保持 w-32 的宽度
                            }}
                          >
                            {videoMaterialUrl ? (
                              <>
                                <video
                                  src={videoMaterialUrl}
                                  className="w-full h-full object-cover"
                                  muted
                                  onMouseEnter={(e) => {
                                    const video = e.currentTarget
                                    video.play().catch(() => {})
                                  }}
                                  onMouseLeave={(e) => {
                                    const video = e.currentTarget
                                    video.pause()
                                    video.currentTime = 0
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 transition-opacity">
                                  <Play size={24} className="text-white" />
                                </div>
                                
                                {/* 操作按钮组 */}
                                <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      alertInfo('对口型功能待实现')
                                    }}
                                    className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                                  >
                                    对口型
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (videoMaterialUrl) {
                                        const link = document.createElement('a')
                                        link.href = videoMaterialUrl
                                        link.download = `分镜${fusion.shotNumber}_视频.mp4`
                                        link.click()
                                      }
                                    }}
                                    className="p-1 bg-gray-700 bg-opacity-80 text-white rounded hover:bg-opacity-100"
                                    title="下载"
                                  >
                                    <Download size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEdit(fusion.id)
                                    }}
                                    className="p-1 bg-gray-700 bg-opacity-80 text-white rounded hover:bg-opacity-100"
                                    title="编辑"
                                  >
                                    <Edit size={14} />
                                  </button>
                                </div>
                                
                                {/* 星标按钮 */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setStarredFusions(prev => {
                                      const next = new Set(prev)
                                      if (next.has(fusion.id)) {
                                        next.delete(fusion.id)
                                      } else {
                                        next.add(fusion.id)
                                      }
                                      return next
                                    })
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-gray-700 bg-opacity-80 text-yellow-400 rounded hover:bg-opacity-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="收藏"
                                >
                                  <Star size={14} className={isStarred ? 'fill-current' : ''} />
                                </button>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-500 text-xs">暂无视频</span>
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* 分镜 */}
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-700 line-clamp-3 max-w-md">
                            {fusion.videoPrompt || '暂无分镜描述'}
                          </p>
                        </td>
                        
                        {/* 操作 */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => {
                                if (videoMaterialUrl) {
                                  const link = document.createElement('a')
                                  link.href = videoMaterialUrl
                                  link.download = `分镜${fusion.shotNumber}_视频.mp4`
                                  link.click()
                                } else {
                                  alertWarning('暂无视频可下载')
                                }
                              }}
                              className="text-purple-600 hover:text-purple-700 text-sm"
                            >
                              下载
                            </button>
                            <button
                              onClick={() => handleEdit(fusion.id)}
                              className="text-purple-600 hover:text-purple-700 text-sm"
                            >
                              编辑
                            </button>
                            <button
                              ref={(el) => {
                                if (el) {
                                  deleteButtonRefs.current.set(fusion.id, el)
                                } else {
                                  deleteButtonRefs.current.delete(fusion.id)
                                }
                              }}
                              onClick={(e) => {
                                const button = e.currentTarget
                                setDeleteConfirmState({
                                  isOpen: true,
                                  fusionId: fusion.id,
                                  anchorElement: button,
                                })
                              }}
                              className="text-gray-600 hover:text-red-500 text-sm"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={handleExportAll}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <Star size={18} />
                导出全部选定视频
              </button>
              <button
                onClick={handleExportToCapCut}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Video size={18} />
                导出选定视频到剪映
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 视频编辑抽屉 */}
      <VideoEditDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => {
          setIsEditDrawerOpen(false)
          setSelectedFusionForEdit(null)
        }}
        fusion={selectedFusionForEdit}
        allFusions={fusions}
        onFusionUpdate={handleFusionUpdate}
      />

      {/* 模态框组件 - 放在主容器内 */}
      <VideoEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedVideoId(null)
        }}
        videoId={selectedVideoId || 0}
        videoPrompt={selectedVideoId ? fusions.find(f => f.id === selectedVideoId)?.videoPrompt : undefined}
      />

      {/* 内联删除确认 */}
      <InlineDeleteConfirm
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState({ isOpen: false, fusionId: null, anchorElement: null })}
        onConfirm={() => {
          if (deleteConfirmState.fusionId) {
            setFusions(prev => prev.filter(f => f.id !== deleteConfirmState.fusionId))
            alertInfo('分镜已删除')
          }
        }}
        message="确认删除该分镜的视频吗?删除后积分不会返还。"
        anchorElement={deleteConfirmState.anchorElement}
      />

      {/* 场景选择器模态框 */}
      {showSceneSelector && (
        <CreateSceneModal
          onClose={() => setShowSceneSelector(false)}
          projectName={projectName}
          onSceneSelect={handleSceneSelect}
        />
      )}

      {/* 角色选择器模态框 */}
      {showCharacterSelector && projectName && (
        <CreateCharacterModal
          onClose={() => setShowCharacterSelector(false)}
          projectName={projectName}
          onCharacterSelect={handleCharacterSelect}
        />
      )}
    </div>
  )
}

export default VideoEditing
