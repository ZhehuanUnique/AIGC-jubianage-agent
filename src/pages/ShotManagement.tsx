import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, ChevronDown, ChevronUp, Plus, HelpCircle, Loader2 } from 'lucide-react'
import type { ScriptSegment } from '../services/api'
import { generateImage, getImageTaskStatus, generateVideoMotionPrompt, submitMidjourneyUpscale, getProjectShots, getProjects } from '../services/api'

interface Asset {
  id: string
  name: string
  type: 'character' | 'scene' | 'item'
  selectionMethod: string
  imageUrl?: string // 上传的图片URL
}

interface Shot {
  id: number
  shotNumber: number
  description: string
  prompt: string
  segment: string // 对应片段
  style: string
  sceneDescription: string
  visualFocus: string
  model: string
  resolution?: string // 分辨率：2K 或 4K（nano-banana-pro），2K（midjourney-v7-t2i）
  aspectRatio: string
  quantity: number
  isExpanded: boolean
  associatedCharacters: Asset[]
  associatedScenes: Asset[]
  associatedItems: Asset[]
  pose?: string
  thumbnailImage?: string
  thumbnailImages?: string[] // 多张图片（Midjourney 4张图片）
  videoPrompt?: string // 视频运动提示词（通过本地大模型+RAG库生成）
  generatingStatus?: 'idle' | 'submitting' | 'generating' | 'completed' | 'failed'
  generatingProgress?: number
  generatingTaskId?: string
  generatingTaskIds?: string[] // 多个 Upscale 任务ID（U1, U2, U3, U4）
  generatingResultUrl?: string // 302.ai 的查询URL
  generatingError?: string
}

interface LocationState {
  segments?: ScriptSegment[]
  shots?: Shot[] // 从步骤4返回时，会包含完整的 shots 数据（包括缩略图）
  scriptTitle?: string
  workStyle?: string
  workBackground?: string
  maxShots?: string
  scriptContent?: string
}

function ShotManagement() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  
  // 选择器模态框状态
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [showSceneModal, setShowSceneModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [currentShotId, setCurrentShotId] = useState<number | null>(null)
  const [currentResourceType, setCurrentResourceType] = useState<'character' | 'scene' | 'item' | null>(null)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null) // 选中的角色ID（用于显示红色边框）
  
  // 从 sessionStorage 读取 AssetDetails 的数据
  const [availableCharacters, setAvailableCharacters] = useState<Asset[]>([])
  const [availableScenes, setAvailableScenes] = useState<Asset[]>([])
  const [availableItems, setAvailableItems] = useState<Asset[]>([])
  
  // 从 sessionStorage 加载资产数据
  useEffect(() => {
    try {
      const savedCharacters = sessionStorage.getItem('assetDetails_characters')
      if (savedCharacters) {
        const parsed = JSON.parse(savedCharacters)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableCharacters(parsed)
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 characters 失败:', error)
    }
    
    try {
      const savedScenes = sessionStorage.getItem('assetDetails_scenes')
      if (savedScenes) {
        const parsed = JSON.parse(savedScenes)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableScenes(parsed)
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 scenes 失败:', error)
    }
    
    try {
      const savedItems = sessionStorage.getItem('assetDetails_items')
      if (savedItems) {
        const parsed = JSON.parse(savedItems)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableItems(parsed)
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 items 失败:', error)
    }
  }, [])
  
  // 转换旧的 string[] 格式为 Asset[] 格式
  const migrateShotsData = (shotsData: any[]): Shot[] => {
    return shotsData.map(shot => {
      // 转换 associatedCharacters
      const migratedCharacters: Asset[] = shot.associatedCharacters?.map((char: any) => {
        if (typeof char === 'string') {
          // 旧格式：string (图片URL)
          // 尝试从 availableCharacters 中找到匹配的资产
          const found = availableCharacters.find(c => c.imageUrl === char)
          if (found) {
            return found
          }
          // 如果找不到，创建一个临时资产
          return {
            id: `temp-char-${Date.now()}-${Math.random()}`,
            name: '未知角色',
            type: 'character' as const,
            selectionMethod: '通过角色选择器',
            imageUrl: char,
          }
        }
        return char as Asset
      }) || []
      
      // 转换 associatedScenes
      const migratedScenes: Asset[] = shot.associatedScenes?.map((scene: any) => {
        if (typeof scene === 'string') {
          const found = availableScenes.find(s => s.imageUrl === scene)
          if (found) {
            return found
          }
          return {
            id: `temp-scene-${Date.now()}-${Math.random()}`,
            name: '未知场景',
            type: 'scene' as const,
            selectionMethod: '通过场景选择器',
            imageUrl: scene,
          }
        }
        return scene as Asset
      }) || []
      
      // 转换 associatedItems
      const migratedItems: Asset[] = shot.associatedItems?.map((item: any) => {
        if (typeof item === 'string') {
          const found = availableItems.find(i => i.imageUrl === item)
          if (found) {
            return found
          }
          return {
            id: `temp-item-${Date.now()}-${Math.random()}`,
            name: '未知物品',
            type: 'item' as const,
            selectionMethod: '通过物品选择器',
            imageUrl: item,
          }
        }
        return item as Asset
      }) || []
      
      return {
        ...shot,
        associatedCharacters: migratedCharacters,
        associatedScenes: migratedScenes,
        associatedItems: migratedItems,
      }
    })
  }
  
  // 当 availableCharacters, availableScenes, availableItems 更新时，迁移 shots 数据
  useEffect(() => {
    // 延迟执行迁移，确保资产数据已加载
    const timer = setTimeout(() => {
      setShots(prevShots => {
        // 检查是否需要迁移（检查第一个元素是否为字符串）
        const needsMigration = prevShots.some(shot => 
          (shot.associatedCharacters.length > 0 && typeof (shot.associatedCharacters[0] as any) === 'string') ||
          (shot.associatedScenes.length > 0 && typeof (shot.associatedScenes[0] as any) === 'string') ||
          (shot.associatedItems.length > 0 && typeof (shot.associatedItems[0] as any) === 'string')
        )
        
        if (needsMigration) {
          console.log('🔄 迁移 shots 数据格式（从 string[] 到 Asset[]）')
          return migrateShotsData(prevShots)
        }
        return prevShots
      })
    }, 100)
    
    return () => clearTimeout(timer)
  }, [availableCharacters, availableScenes, availableItems])

  // 根据segments初始化shots
  const initializeShots = (segments: ScriptSegment[]): Shot[] => {
    if (!segments || segments.length === 0) {
      // 如果没有segments，使用默认数据
      return [
        {
          id: 1,
          shotNumber: 1,
          description: '场景建立镜头，展示清净峰的仙境氛围，云雾缭绕，仙鹤飞过。',
          prompt: '三维动漫风。画面描述:清净峰山顶，云海翻腾，几只优雅的仙鹤从画面中飞过，远处的宫殿若隐若现，阳光透过云层洒下金色光辉。视觉重点:观众视线聚焦于飞过的仙鹤和云海的壮丽景象，通过引导线构图突出仙境的飘渺感。整体呈现明亮、圣洁的白色与金色调。构图(Composition): 引导线构图。景别(Shot Scale): 大远景(Extreme Long Shot)。机位(Camera Position): 轴线顶机位。角度(Angle): 俯视(High Angle)。镜头类型(Lens Type): 广角镜头(Wide-Angle Lens)。光线(Lighting): 柔和的顺光(Soft Front Light)。色彩情绪(Color Emotion): 明亮圣洁的白色与金色，营造仙境氛围。',
          segment: '场景建立镜头，展示清净峰的仙境氛围，云雾缭绕，仙鹤飞过。',
          style: '三维动漫风',
          sceneDescription: '清净峰山顶，云海翻腾，几只优雅的仙鹤从画面中飞过，远处的宫殿若隐若现，阳光透过云层洒下金色光辉。',
          visualFocus: '观众视线聚焦于飞过的仙鹤和云海的壮丽景象，通过引导线构图突出仙境的飘渺感。整体呈现明亮、圣洁的白色与金色调。',
          model: 'nano-banana-pro',
          resolution: '2K',
          aspectRatio: '16:9',
          quantity: 1, // 默认1张（nano-banana-pro），midjourney-v7-t2i 默认4张
          isExpanded: false,
          associatedCharacters: [],
          associatedScenes: [],
          associatedItems: [],
          // 无图时不设置 thumbnailImage
        },
      ]
    }

    // 根据segments创建shots，使用生成的分镜提示词
    return segments.map((seg, index) => ({
      id: index + 1,
      shotNumber: seg.shotNumber,
      description: seg.description || '', // 使用生成的分镜描述
      prompt: seg.prompt || '', // 使用生成的分镜提示词
      segment: seg.segment, // 对应片段
      style: state?.workStyle || '三维动漫风',
      sceneDescription: '',
      visualFocus: '',
      model: 'nano-banana-pro',
      resolution: '2K',
      aspectRatio: '16:9',
      quantity: 1, // 默认1张（nano-banana-pro），midjourney-v7-t2i 默认4张
      isExpanded: false,
      associatedCharacters: [],
      associatedScenes: [],
      associatedItems: [],
      // 无图时不设置 thumbnailImage，只有在第4步生成图片后才会有
    }))
  }

  const [shots, setShots] = useState<Shot[]>(() => {
    // 优先使用 location.state 中的 shots（如果是从步骤4返回，会包含缩略图数据）
    if (state?.shots && Array.isArray(state.shots) && state.shots.length > 0) {
      console.log('🎬 从 location.state 恢复 shots 数据（包含缩略图），数量:', state.shots.length)
      // 保存到 sessionStorage
      try {
        sessionStorage.setItem('shotManagement_shots', JSON.stringify(state.shots))
        if (state.segments) {
          sessionStorage.setItem('shotManagement_segments', JSON.stringify(state.segments))
        }
        console.log('✅ 保存 shots 数据到 sessionStorage')
      } catch (error) {
        console.warn('⚠️ 保存数据到 sessionStorage 失败:', error)
      }
      return state.shots
    }
    
    // 其次使用 location.state 中的 segments（如果是正常流程进入）
    if (state?.segments && state.segments.length > 0) {
      const initialShots = initializeShots(state.segments)
      console.log('🎬 初始化分镜，segments数量:', state.segments.length, '分镜数量:', initialShots.length)
      
      // 保存到 sessionStorage，以便返回时恢复
      try {
        sessionStorage.setItem('shotManagement_segments', JSON.stringify(state.segments))
        sessionStorage.setItem('shotManagement_shots', JSON.stringify(initialShots))
        console.log('✅ 保存 segments 和 shots 到 sessionStorage')
      } catch (error) {
        console.warn('⚠️ 保存数据到 sessionStorage 失败:', error)
      }
      
      return initialShots
    }
    
    // 如果没有 location.state，尝试从 sessionStorage 恢复
    try {
      const savedShots = sessionStorage.getItem('shotManagement_shots')
      if (savedShots) {
        const parsed = JSON.parse(savedShots)
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('✅ 从 sessionStorage 恢复 shots 数据（包含缩略图），数量:', parsed.length)
          return parsed
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 shots 失败:', error)
    }
    
    // 默认数据（稍后会尝试从数据库加载）
    return []
  })
  
  // 从数据库加载分镜数据（如果没有 location.state 和 sessionStorage 数据）
  useEffect(() => {
    const loadShotsFromDatabase = async () => {
      // 如果已经有数据，不需要加载
      if (shots.length > 0 && shots[0].prompt) {
        return
      }
      
      // 如果 location.state 有 segments，不需要从数据库加载
      if (state?.segments && state.segments.length > 0) {
        return
      }
      
      try {
        // 获取项目名称
        const projectName = state?.scriptTitle || sessionStorage.getItem('scriptInput_scriptTitle')
        if (!projectName) {
          console.warn('⚠️ 无法获取项目名称，跳过从数据库加载分镜')
          return
        }
        
        console.log('📋 尝试从数据库加载分镜数据，项目名称:', projectName)
        
        // 获取所有项目，查找项目ID
        const projects = await getProjects()
        const project = projects.find(p => p.name === projectName || p.scriptTitle === projectName)
        
        if (!project || !project.id) {
          console.warn('⚠️ 未找到项目，跳过从数据库加载分镜')
          return
        }
        
        console.log('✅ 找到项目，ID:', project.id)
        
        // 从数据库加载分镜数据
        const dbShots = await getProjectShots(project.id)
        
        if (dbShots && dbShots.length > 0) {
          console.log('✅ 从数据库加载分镜数据成功，数量:', dbShots.length)
          
          // 转换为 Shot 格式
          const convertedShots: Shot[] = dbShots.map((dbShot, index) => ({
            id: dbShot.id || index + 1,
            shotNumber: dbShot.shotNumber || index + 1,
            description: dbShot.description || '',
            prompt: dbShot.prompt || '',
            segment: dbShot.segment || '',
            style: dbShot.style || state?.workStyle || '三维动漫风',
            sceneDescription: dbShot.sceneDescription || '',
            visualFocus: dbShot.visualFocus || '',
            model: dbShot.model || 'nano-banana-pro',
            resolution: '2K',
            aspectRatio: dbShot.aspectRatio || '16:9',
            quantity: dbShot.quantity || 1,
            isExpanded: false,
            associatedCharacters: [],
            associatedScenes: [],
            associatedItems: [],
            thumbnailImage: dbShot.thumbnailImage,
          }))
          
          setShots(convertedShots)
          
          // 保存到 sessionStorage
          try {
            sessionStorage.setItem('shotManagement_shots', JSON.stringify(convertedShots))
            console.log('✅ 分镜数据已保存到 sessionStorage')
          } catch (error) {
            console.warn('⚠️ 保存分镜数据到 sessionStorage 失败:', error)
          }
        } else {
          console.log('ℹ️ 数据库中没有分镜数据')
        }
      } catch (error) {
        console.error('❌ 从数据库加载分镜数据失败:', error)
      }
    }
    
    loadShotsFromDatabase()
  }, []) // 只在组件挂载时执行一次

  // 当segments变化时，更新shots
  useEffect(() => {
    if (state?.segments && state.segments.length > 0) {
      console.log('🎬 更新分镜，segments数量:', state.segments.length)
      const newShots = initializeShots(state.segments)
      console.log('🎬 生成的分镜数量:', newShots.length)
      setShots(newShots)
      
      // 保存到 sessionStorage
      try {
        sessionStorage.setItem('shotManagement_segments', JSON.stringify(state.segments))
        sessionStorage.setItem('shotManagement_shots', JSON.stringify(newShots))
        console.log('✅ 更新并保存 segments 和 shots 到 sessionStorage')
      } catch (error) {
        console.warn('⚠️ 保存数据到 sessionStorage 失败:', error)
      }
    } else if (state === null || (state && !state.segments)) {
      // 如果没有新的 segments，尝试从 sessionStorage 恢复
      try {
        const savedShots = sessionStorage.getItem('shotManagement_shots')
        if (savedShots) {
          const parsed = JSON.parse(savedShots)
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('✅ 从 sessionStorage 恢复 shots 数据')
            setShots(parsed)
            return
          }
        }
      } catch (error) {
        console.warn('⚠️ 从 sessionStorage 恢复 shots 失败:', error)
      }
      
      // 只在第一次没有数据时输出警告，避免重复
      const hasWarned = sessionStorage.getItem('shotManagement_segments_warned')
      if (!hasWarned) {
        console.warn('⚠️ 没有segments数据，使用默认数据。提示：请从"输入剧本"页面正常流程进入此页面。')
        sessionStorage.setItem('shotManagement_segments_warned', 'true')
      }
    }
  }, [state?.segments])
  
  // 当 shots 更新时，保存到 sessionStorage（但不覆盖从 segments 生成的数据）
  useEffect(() => {
    if (shots.length > 0) {
      // 检查是否是从 segments 生成的（避免覆盖）
      const savedSegments = sessionStorage.getItem('shotManagement_segments')
      if (!savedSegments || !state?.segments) {
        // 只有在没有 segments 的情况下才保存（用户手动修改的情况）
        try {
          sessionStorage.setItem('shotManagement_shots', JSON.stringify(shots))
        } catch (error) {
          console.warn('⚠️ 保存 shots 到 sessionStorage 失败:', error)
        }
      }
    }
  }, [shots, state?.segments])

  const toggleShot = (id: number) => {
    setShots(shots.map((shot) => (shot.id === id ? { ...shot, isExpanded: !shot.isExpanded } : shot)))
  }

  const handleAddResource = (shotId: number, resourceType: 'character' | 'item' | 'pose' | 'scene') => {
    if (resourceType === 'pose') {
      // 姿势仍然使用文件选择
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const imageUrl = URL.createObjectURL(file)
          setShots(shots.map(shot => 
            shot.id === shotId ? { ...shot, pose: imageUrl } : shot
          ))
        }
      }
      input.click()
    } else {
      // 角色、场景、物品打开对应的选择器
      setCurrentShotId(shotId)
      setCurrentResourceType(resourceType)
      if (resourceType === 'character') {
        setShowCharacterModal(true)
      } else if (resourceType === 'scene') {
        setShowSceneModal(true)
      } else if (resourceType === 'item') {
        setShowItemModal(true)
      }
    }
  }
  
  // 处理从选择器选择资产
  const handleSelectAsset = (asset: Asset) => {
    if (!currentShotId || !currentResourceType) return
    
    setShots(shots.map(shot => {
      if (shot.id === currentShotId) {
        if (currentResourceType === 'character') {
          // 检查是否已存在
          if (shot.associatedCharacters.some(c => c.id === asset.id)) {
            return shot
          }
          return { ...shot, associatedCharacters: [...shot.associatedCharacters, asset] }
        } else if (currentResourceType === 'scene') {
          if (shot.associatedScenes.some(s => s.id === asset.id)) {
            return shot
          }
          return { ...shot, associatedScenes: [...shot.associatedScenes, asset] }
        } else if (currentResourceType === 'item') {
          if (shot.associatedItems.some(i => i.id === asset.id)) {
            return shot
          }
          return { ...shot, associatedItems: [...shot.associatedItems, asset] }
        }
      }
      return shot
    }))
    
    // 关闭模态框
    setShowCharacterModal(false)
    setShowSceneModal(false)
    setShowItemModal(false)
    setCurrentShotId(null)
    setCurrentResourceType(null)
    setSelectedCharacterId(null) // 重置选中状态
  }

  // 生成状态管理
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingShots, setGeneratingShots] = useState<Set<number>>(new Set())
  
  // 错误提示模态框状态
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean
    title: string
    message: string
  }>({
    isOpen: false,
    title: '',
    message: '',
  })

  // 轮询任务状态
  // 为分镜生成视频运动提示词
  const generateVideoPromptForShot = async (shot: Shot, imageUrl: string) => {
    try {
      console.log(`🎬 开始为分镜${shot.id}生成视频运动提示词...`)
      
      // 获取 RAG 相关参数
      let scriptId: string | null = null
      try {
        const savedScriptId = sessionStorage.getItem('current_scriptId')
        if (savedScriptId) {
          scriptId = savedScriptId
        }
      } catch (error) {
        console.warn('⚠️ 获取 scriptId 失败:', error)
      }
      
      // 如果没有 scriptId 或 scriptContext，跳过生成
      if (!shot.segment) {
        console.warn(`⚠️ 分镜${shot.id}没有剧本片段，跳过视频提示词生成`)
        return
      }
      
      // 调用视频运动提示词生成 API
      const result = await generateVideoMotionPrompt({
        imageUrl: imageUrl,
        scriptContext: shot.segment,
        shotNumber: shot.shotNumber,
        scriptId: scriptId || undefined,
      })
      
      console.log(`✅ 分镜${shot.id}视频提示词生成完成:`, result.motionPrompt)
      
      // 更新 shot 的 videoPrompt
      setShots(prevShots =>
        prevShots.map(s =>
          s.id === shot.id
            ? {
                ...s,
                videoPrompt: result.motionPrompt,
              }
            : s
        )
      )
      
      // 保存到 sessionStorage
      try {
        setShots(currentShots => {
          sessionStorage.setItem('shotManagement_shots', JSON.stringify(currentShots))
          return currentShots
        })
      } catch (error) {
        console.warn('⚠️ 保存视频提示词失败:', error)
      }
    } catch (error) {
      console.error(`❌ 分镜${shot.id}生成视频提示词失败:`, error)
      // 生成失败不影响主流程，只记录错误
    }
  }

  const pollTaskStatus = async (
    shotId: number,
    taskId: string,
    model: 'nano-banana-pro' | 'midjourney-v7-t2i',
    resolution?: '2K' | '4K',
    resultUrl?: string // 302.ai 的查询URL
  ) => {
    // 验证 taskId
    if (!taskId || taskId === 'undefined') {
      console.error(`❌ 分镜${shotId}轮询失败: taskId无效`, taskId)
      setShots(prevShots =>
        prevShots.map(shot =>
          shot.id === shotId
            ? {
                ...shot,
                generatingStatus: 'failed',
                generatingError: '任务ID无效',
              }
            : shot
        )
      )
      setGeneratingShots(prev => {
        const next = new Set(prev)
        next.delete(shotId)
        return next
      })
      return false
    }

    const maxAttempts = 180 // 最多轮询180次（约15分钟，每5秒一次）
    let attempts = 0
    let currentResultUrl = resultUrl // 在闭包中保存 resultUrl

    const poll = async () => {
      try {
        attempts++
        
        // 从 state 中获取最新的 resultUrl（因为轮询是异步的，state 可能已更新）
        setShots(prevShots => {
          const currentShot = prevShots.find(s => s.id === shotId)
          if (currentShot?.generatingResultUrl) {
            currentResultUrl = currentShot.generatingResultUrl
          }
          return prevShots
        })
        
        // 获取项目名称（用于保存到项目文件夹）
        const projectName = state?.scriptTitle || sessionStorage.getItem('scriptInput_scriptTitle') || ''
        
        console.log(`🔍 分镜${shotId}轮询任务状态 (${attempts}/${maxAttempts}):`, taskId, model, resolution, currentResultUrl ? '使用302.ai' : '使用Grsai')
        const status = await getImageTaskStatus(taskId, model, resolution, currentResultUrl, projectName)

        // 更新生成进度（确保进度不会倒退）
        setShots(prevShots =>
          prevShots.map(shot => {
            if (shot.id === shotId) {
              const currentProgress = shot.generatingProgress || 0
              const newProgress = status.progress || 0
              // 进度只能增加，不能倒退（除非是完成或失败）
              const finalProgress = status.status === 'completed' || status.status === 'failed' 
                ? newProgress 
                : Math.max(currentProgress, newProgress) // 取较大值，避免倒退
              
              return {
                ...shot,
                generatingStatus: status.status === 'completed' ? 'completed' : status.status === 'failed' ? 'failed' : 'generating',
                generatingProgress: finalProgress,
              }
            }
            return shot
          })
        )

        // Midjourney 网格图生成完成，自动对 4 张图进行 Upscale
        if (status.status === 'completed' && status.imageUrl && (status as any).isGridImage) {
          console.log(`✅ 分镜${shotId} Midjourney 网格图生成完成，开始自动 Upscale 4 张图片`)
          
          // 获取按钮信息（应该包含 U1, U2, U3, U4）
          const buttons = (status as any).buttons || []
          const upscaleButtons = buttons.filter((btn: any) => 
            btn && (btn.customId === 'U1' || btn.customId === 'U2' || btn.customId === 'U3' || btn.customId === 'U4' ||
                   btn.label === 'U1' || btn.label === 'U2' || btn.label === 'U3' || btn.label === 'U4' ||
                   (typeof btn === 'string' && btn.includes('U1')) || (typeof btn === 'string' && btn.includes('U2')) ||
                   (typeof btn === 'string' && btn.includes('U3')) || (typeof btn === 'string' && btn.includes('U4')))
          )
          
          if (upscaleButtons.length >= 4) {
            console.log(`📸 找到 ${upscaleButtons.length} 个 Upscale 按钮，开始自动放大`)
            
            // 更新状态为生成中（Upscale 处理中）
            setShots(prevShots => {
              const currentShot = prevShots.find(s => s.id === shotId)
              if (!currentShot) return prevShots
              
              // 初始化 thumbnailImages 数组（4个位置）
              const thumbnailImages = new Array(4).fill(null)
              
              return prevShots.map(shot =>
                shot.id === shotId
                  ? {
                      ...shot,
                      thumbnailImages: thumbnailImages, // 初始化4个位置
                      generatingStatus: 'generating' as const,
                      generatingProgress: 25, // 网格图完成，开始 Upscale，进度25%
                      generatingError: undefined,
                    }
                  : shot
              )
            })
            
            // 自动提交 4 个 Upscale 任务
            const upscaleTaskIds: string[] = []
            for (let i = 0; i < 4; i++) {
              try {
                const button = upscaleButtons[i]
                if (button) {
                  // 调用 Midjourney Upscale API
                  const upscaleResult = await submitMidjourneyUpscale({
                    button: button,
                    resultUrl: currentResultUrl || undefined,
                  })
                  if (upscaleResult && upscaleResult.taskId) {
                    upscaleTaskIds.push(upscaleResult.taskId)
                    console.log(`✅ 分镜${shotId} Upscale ${i + 1}/4 任务已提交:`, upscaleResult.taskId)
                    
                    // 开始轮询单个 Upscale 任务
                    pollUpscaleTask(shotId, upscaleResult.taskId, i, model, resolution, currentResultUrl, 4, 0)
                  }
                }
              } catch (error) {
                console.error(`❌ 分镜${shotId} Upscale ${i + 1}/4 提交失败:`, error)
              }
            }
            
            // 保存 Upscale 任务ID
            setShots(prevShots =>
              prevShots.map(shot =>
                shot.id === shotId
                  ? {
                      ...shot,
                      generatingTaskIds: upscaleTaskIds,
                    }
                  : shot
              )
            )
            
            // 继续轮询，等待 Upscale 完成
            setTimeout(() => pollTaskStatus(shotId, taskId, model, resolution, currentResultUrl), 3000)
            return false // 继续轮询
          } else {
            // 如果没有找到 Upscale 按钮，使用网格图
            console.warn(`⚠️ 分镜${shotId} 未找到 Upscale 按钮（找到 ${upscaleButtons.length} 个），使用网格图`)
            setShots(prevShots => {
              const currentShot = prevShots.find(s => s.id === shotId)
              if (currentShot) {
                // 异步生成视频提示词（不阻塞UI）
                generateVideoPromptForShot(currentShot, status.imageUrl).catch(err => {
                  console.warn(`⚠️ 分镜${shotId}生成视频提示词失败:`, err)
                })
              }
              
              const updated = prevShots.map(shot =>
                shot.id === shotId
                  ? {
                      ...shot,
                      thumbnailImage: status.imageUrl, // 使用网格图
                      generatingStatus: 'completed' as const,
                      generatingProgress: 100,
                      generatingError: undefined,
                    }
                  : shot
              )
              // 检查是否所有分镜都完成
              const allCompleted = updated.every(s => 
                s.thumbnailImage || (s.thumbnailImages && s.thumbnailImages.length > 0) || s.generatingStatus === 'completed' || s.generatingStatus === 'failed'
              )
              if (allCompleted) {
                console.log('✅ 所有分镜网格图生成完成，准备跳转到融图管理页面')
                setTimeout(() => checkAllCompleted(updated), 1000)
              }
              return updated
            })
            setGeneratingShots(prev => {
              const next = new Set(prev)
              next.delete(shotId)
              return next
            })
            return true // 停止轮询
          }
        } else if (status.status === 'completed' && status.imageUrl) {
          // 其他模型的完成状态（或 Midjourney 非网格图完成）
          console.log(`✅ 分镜${shotId}生成完成，图片URL:`, status.imageUrl)
          
          // 图片生成完成后，自动生成视频运动提示词
          setShots(prevShots => {
            const currentShot = prevShots.find(s => s.id === shotId)
            if (currentShot) {
              // 异步生成视频提示词（不阻塞UI）
              generateVideoPromptForShot(currentShot, status.imageUrl).catch(err => {
                console.warn(`⚠️ 分镜${shotId}生成视频提示词失败:`, err)
              })
            }
            
            const updated = prevShots.map(shot =>
              shot.id === shotId
                ? {
                    ...shot,
                    thumbnailImage: status.imageUrl,
                    generatingStatus: 'completed' as const,
                    generatingProgress: 100,
                    generatingError: undefined,
                  }
                : shot
            )
            // 检查是否所有分镜都完成
            const allCompleted = updated.every(s => 
              s.thumbnailImage || (s.thumbnailImages && s.thumbnailImages.length > 0) || s.generatingStatus === 'completed' || s.generatingStatus === 'failed'
            )
            if (allCompleted) {
              console.log('✅ 所有分镜生成完成，准备跳转到融图管理页面')
              setTimeout(() => checkAllCompleted(updated), 1000)
            }
            return updated
          })
          setGeneratingShots(prev => {
            const next = new Set(prev)
            next.delete(shotId)
            return next
          })
          return true // 停止轮询
        } else if (status.status === 'processing' && !status.imageUrl) {
          // Upscale 处理中，继续轮询（不显示网格图片）
          setShots(prevShots =>
            prevShots.map(shot =>
              shot.id === shotId
                ? {
                    ...shot,
                    generatingProgress: status.progress || 75, // 使用返回的进度
                    generatingStatus: 'generating', // 保持生成中状态
                  }
                : shot
            )
          )
          // 继续轮询
          setTimeout(() => pollTaskStatus(shotId, taskId, model, resolution, currentResultUrl), 3000)
          return false
        } else if (status.status === 'failed') {
          // 生成失败，立即停止轮询
          setShots(prevShots =>
            prevShots.map(shot =>
              shot.id === shotId
                ? {
                    ...shot,
                    generatingStatus: 'failed',
                    generatingError: status.message || '生成失败',
                    generatingProgress: 0, // 重置进度
                  }
                : shot
            )
          )
          setGeneratingShots(prev => {
            const next = new Set(prev)
            next.delete(shotId)
            return next
          })
          // 失败后立即检查是否可以进入下一步（允许部分失败）
          setTimeout(() => {
            setShots(currentShots => {
              checkAllCompleted(currentShots)
              return currentShots
            })
          }, 100)
          return true // 停止轮询
        } else if (attempts >= maxAttempts) {
          // 超时
          setShots(prevShots =>
            prevShots.map(shot =>
              shot.id === shotId
                ? {
                    ...shot,
                    generatingStatus: 'failed',
                    generatingError: '生成超时，请稍后重试',
                  }
                : shot
            )
          )
          setGeneratingShots(prev => {
            const next = new Set(prev)
            next.delete(shotId)
            return next
          })
          return false
        } else {
          // 检查是否已经有图片了（可能已经完成但状态判断有问题）
          // 通过闭包获取当前状态
          let currentShot: Shot | undefined
          setShots(prevShots => {
            currentShot = prevShots.find(s => s.id === shotId)
            return prevShots
          })
          if (currentShot?.thumbnailImage && status.progress >= 95) {
            // 如果已经有图片且进度很高，可能是已完成但状态判断有问题
            console.warn(`⚠️ 分镜${shotId}已有图片但状态不是completed，可能是API状态判断问题，停止轮询`)
            setShots(prevShots =>
              prevShots.map(shot =>
                shot.id === shotId
                  ? {
                      ...shot,
                      generatingStatus: 'completed',
                      generatingProgress: 100,
                    }
                  : shot
              )
            )
            setGeneratingShots(prev => {
              const next = new Set(prev)
              next.delete(shotId)
              return next
            })
            return true
          }
          
          // 继续轮询（根据状态调整轮询间隔，processing 状态更快）
          const pollInterval = status.status === 'processing' ? 3000 : 5000
          setTimeout(poll, pollInterval)
          return false
        }
      } catch (error) {
        console.error(`分镜${shotId}轮询任务状态失败:`, error)
        
        // 检查是否是网络连接错误
        let errorMessage = '查询任务状态失败'
        let isConnectionError = false
        
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('网络错误')) {
            isConnectionError = true
            errorMessage = '无法连接到后端服务器，请确保后端服务器已启动（端口3002）'
          } else {
            errorMessage = error.message
          }
        }
        
        // 如果是连接错误，立即停止轮询并标记为失败
        if (isConnectionError) {
          console.error(`❌ 后端服务器连接失败，停止轮询分镜${shotId}`)
          setShots(prevShots =>
            prevShots.map(shot =>
              shot.id === shotId
                ? {
                    ...shot,
                    generatingStatus: 'failed',
                    generatingError: errorMessage,
                    generatingProgress: 0,
                  }
                : shot
            )
          )
          setGeneratingShots(prev => {
            const next = new Set(prev)
            next.delete(shotId)
            return next
          })
          return true // 停止轮询
        }
        
        // 如果是其他错误，继续重试（但增加延迟）
        if (attempts >= maxAttempts) {
          // 达到最大重试次数，标记为失败
          setShots(prevShots =>
            prevShots.map(shot =>
              shot.id === shotId
                ? {
                    ...shot,
                    generatingStatus: 'failed',
                    generatingError: errorMessage || '生成超时，请稍后重试',
                    generatingProgress: 0,
                  }
                : shot
            )
          )
          setGeneratingShots(prev => {
            const next = new Set(prev)
            next.delete(shotId)
            return next
          })
          return true
        }
        
        // 继续重试，但增加延迟（从5秒增加到10秒）
        console.warn(`⚠️ 分镜${shotId}轮询失败，${attempts}/${maxAttempts}次，10秒后重试...`)
        setTimeout(poll, 10000) // 错误时延迟更长时间
        return false
      }
    }

    // 开始轮询
    setTimeout(poll, 3000) // 3秒后开始第一次查询
  }

  // 轮询单个 Upscale 任务（用于多任务场景）
  const pollUpscaleTask = async (
    shotId: number,
    upscaleTaskId: string,
    imageIndex: number,
    model: 'nano-banana-pro' | 'midjourney-v7-t2i',
    resolution?: '2K' | '4K',
    resultUrl?: string,
    totalCount: number = 4,
    attempts: number = 0
  ) => {
    const maxAttempts = 180
    
    if (attempts >= maxAttempts) {
      console.warn(`⏰ 分镜${shotId} Upscale 任务 ${imageIndex + 1} 超时`)
      return
    }

    try {
      attempts++
      // 获取项目名称（用于保存到项目文件夹）
      const projectName = state?.scriptTitle || sessionStorage.getItem('scriptInput_scriptTitle') || ''
      const status = await getImageTaskStatus(upscaleTaskId, model, resolution, resultUrl, projectName)
      
      if (status.status === 'completed' && status.imageUrl) {
        // 单个 Upscale 任务完成，添加到图片数组
        console.log(`✅ 分镜${shotId} Upscale 任务 ${imageIndex + 1}/${totalCount} 完成:`, status.imageUrl)
        
        setShots(prevShots => {
          const updated = prevShots.map(shot => {
            if (shot.id === shotId) {
              const currentImages = shot.thumbnailImages || []
              // 确保图片按顺序添加到正确位置
              const newImages = [...currentImages]
              if (status.imageUrl) {
                newImages[imageIndex] = status.imageUrl
              }
              
              // 检查是否所有任务都完成
              const completedCount = newImages.filter(img => !!img).length
              const allCompleted = completedCount === totalCount
              
              return {
                ...shot,
                thumbnailImages: newImages,
                thumbnailImage: newImages[0] || shot.thumbnailImage, // 第一张作为主图
                generatingProgress: Math.floor((completedCount / totalCount) * 50) + 50, // 50% + (完成数/总数)*50%
                generatingStatus: allCompleted ? ('completed' as const) : ('generating' as const),
              }
            }
            return shot
          })
          
          // 检查是否所有分镜都完成（对于 Midjourney，需要检查所有图片是否都生成完成）
          const allShotsCompleted = updated.every(s => {
            // 对于 Midjourney，需要检查所有图片是否都生成完成
            if (s.model === 'midjourney-v7-t2i') {
              const expectedCount = s.quantity || 4
              const actualCount = (s.thumbnailImages || []).filter(img => !!img).length
              return actualCount === expectedCount || s.generatingStatus === 'completed' || s.generatingStatus === 'failed'
            } else {
              // 其他模型，检查是否有图片或已完成
              return s.thumbnailImage || (s.thumbnailImages && s.thumbnailImages.length > 0) || s.generatingStatus === 'completed' || s.generatingStatus === 'failed'
            }
          })
          
          if (allShotsCompleted) {
            console.log('✅ 所有分镜生成完成（包括所有 Upscale 任务），准备跳转到融图管理页面')
            setTimeout(() => checkAllCompleted(updated), 1000)
          }
          
          return updated
        })
        
        // 如果所有任务都完成，停止轮询
        setShots(prevShots => {
          const shot = prevShots.find(s => s.id === shotId)
          if (shot && shot.thumbnailImages && shot.thumbnailImages.filter(img => !!img).length === totalCount) {
            setGeneratingShots(prev => {
              const next = new Set(prev)
              next.delete(shotId)
              return next
            })
          }
          return prevShots
        })
      } else if (status.status === 'processing' || status.status === 'pending') {
        // 继续轮询
        setTimeout(() => pollUpscaleTask(shotId, upscaleTaskId, imageIndex, model, resolution, resultUrl, totalCount, attempts), 3000)
      } else if (status.status === 'failed') {
        console.error(`❌ 分镜${shotId} Upscale 任务 ${imageIndex + 1} 失败`)
      }
    } catch (error) {
      console.error(`❌ 分镜${shotId} Upscale 任务 ${imageIndex + 1} 轮询失败:`, error)
      // 继续重试
      setTimeout(() => pollUpscaleTask(shotId, upscaleTaskId, imageIndex, model, resolution, resultUrl, totalCount, attempts), 5000)
    }
  }

  // 生成单个分镜的图片（支持根据数量生成多张）
  const generateShotImage = async (shot: Shot) => {
    try {
      // 更新状态为提交中
      setShots(prevShots =>
        prevShots.map(s =>
          s.id === shot.id
            ? {
                ...s,
                generatingStatus: 'submitting',
                generatingProgress: 0,
                generatingError: undefined,
                thumbnailImages: [], // 初始化图片数组
                generatingTaskIds: [], // 初始化任务ID数组
              }
            : s
        )
      )

      const quantity = shot.quantity || 1
      const isMidjourney = shot.model === 'midjourney-v7-t2i'
      
      // Midjourney 特殊处理：自动生成4张图片（网格），然后放大
      if (isMidjourney && quantity >= 4) {
        // Midjourney 会自动生成4张图片，只需要提交一次任务
        await generateSingleImage(shot, 0, true) // true 表示是 Midjourney 的4张图片模式
      } else {
        // 其他情况：根据数量提交多次任务
        for (let i = 0; i < quantity; i++) {
          await generateSingleImage(shot, i, false)
          // 如果是 Nano Banana Pro，每次任务之间稍微延迟，避免API限流
          if (shot.model === 'nano-banana-pro' && i < quantity - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
    } catch (error) {
      console.error(`分镜${shot.id}生成图片失败:`, error)
      
      // 检查是否是网络连接错误
      let errorMessage = '生成失败'
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage = '无法连接到后端服务器，请确保后端服务器已启动（端口3002）'
        } else {
          errorMessage = error.message
        }
      }
      
      setShots(prevShots =>
        prevShots.map(s =>
          s.id === shot.id
            ? {
                ...s,
                generatingStatus: 'failed',
                generatingError: errorMessage,
              }
            : s
        )
      )
      setGeneratingShots(prev => {
        const next = new Set(prev)
        next.delete(shot.id)
        return next
      })
    }
  }

  // 生成单张图片（内部函数）
  const generateSingleImage = async (shot: Shot, imageIndex: number, isMidjourney4Images: boolean = false) => {
    // 获取全局图片比例（从sessionStorage或第一个分镜）
    let globalAspectRatio = '16:9'
    try {
      const savedAspectRatio = sessionStorage.getItem('shotManagement_aspectRatio')
      if (savedAspectRatio) {
        globalAspectRatio = savedAspectRatio
      } else if (shots.length > 0) {
        globalAspectRatio = shots[0].aspectRatio || '16:9'
      }
    } catch (error) {
      console.warn('⚠️ 读取全局图片比例失败:', error)
    }

    // 收集所有关联的参考图片（角色、场景、物品、姿势）
    const referenceImages: string[] = []
    
    // 收集角色图片
    if (shot.associatedCharacters && shot.associatedCharacters.length > 0) {
      shot.associatedCharacters.forEach(char => {
        if (char.imageUrl && !referenceImages.includes(char.imageUrl)) {
          referenceImages.push(char.imageUrl)
        }
      })
    }
    
    // 收集场景图片
    if (shot.associatedScenes && shot.associatedScenes.length > 0) {
      shot.associatedScenes.forEach(scene => {
        if (scene.imageUrl && !referenceImages.includes(scene.imageUrl)) {
          referenceImages.push(scene.imageUrl)
        }
      })
    }
    
    // 收集物品图片
    if (shot.associatedItems && shot.associatedItems.length > 0) {
      shot.associatedItems.forEach(item => {
        if (item.imageUrl && !referenceImages.includes(item.imageUrl)) {
          referenceImages.push(item.imageUrl)
        }
      })
    }
    
    // 收集姿势图片
    if (shot.pose && shot.pose.startsWith('http')) {
      if (!referenceImages.includes(shot.pose)) {
        referenceImages.push(shot.pose)
      }
    }

    // 获取项目名称（用于保存到项目文件夹）
    const projectName = state?.scriptTitle || sessionStorage.getItem('scriptInput_scriptTitle') || ''

    // 准备请求参数
    const request: any = {
      prompt: shot.prompt,
      model: shot.model as 'nano-banana-pro' | 'midjourney-v7-t2i',
      resolution: shot.resolution as '2K' | '4K' | undefined,
      // 使用全局图片比例，而不是每个分镜自己的
      aspectRatio: globalAspectRatio,
      projectName, // 传递项目名称
    }

    // 根据模型添加特定参数
    if (shot.model === 'nano-banana-pro') {
      // nano-banana-pro 支持参考图（图生图）
      if (referenceImages.length > 0) {
        // 如果有多张参考图，使用第一张（nano-banana-pro 只支持单张参考图）
        request.referenceImageUrl = referenceImages[0]
        console.log(`📸 分镜${shot.id}使用参考图（图生图模式）:`, referenceImages[0])
      }
    } else if (shot.model === 'midjourney-v7-t2i') {
      request.botType = 'MID_JOURNEY'
      // Midjourney 不支持参考图（图生图），只支持 base64Array（用于其他用途）
      if (referenceImages.length > 0) {
        console.warn(`⚠️ 分镜${shot.id}使用了参考图，但 Midjourney 不支持图生图模式，将忽略参考图`)
      }
    }

    // 检查模型是否支持参考图
    const modelsSupportingReferenceImage = [
      'nano-banana-pro',
      'seedream-4-0',
      'seedream-4-5',
      'flux-2-max',
      'flux-2-flex',
      'flux-2-pro',
    ]
    
    if (referenceImages.length > 0 && !modelsSupportingReferenceImage.includes(shot.model)) {
      console.warn(`⚠️ 分镜${shot.id}使用了参考图，但模型 ${shot.model} 不支持图生图模式`)
      // 显示用户友好的提示（使用浏览器原生alert）
      const supportedModels = [
        'nano-banana-pro',
        'seedream-4-0',
        'seedream-4-5',
        'flux-2-max',
        'flux-2-flex',
        'flux-2-pro',
      ].join('\n- ')
      window.alert(`⚠️ 模型 ${shot.model} 不支持参考图（图生图）模式\n\n支持的模型：\n- ${supportedModels}\n\n将使用文生图模式生成图片。`)
    }

    console.log(`🎨 分镜${shot.id}生成参数:`, {
      model: shot.model,
      aspectRatio: globalAspectRatio,
      hasReferenceImages: referenceImages.length > 0,
      referenceImagesCount: referenceImages.length,
    })

    // 提交生成任务
    const result = await generateImage(request)
    
    console.log(`✅ 分镜${shot.id}图片${imageIndex + 1}生成任务已提交:`, result)

    // 检查 taskId 是否存在
    if (!result.taskId) {
      throw new Error('任务ID获取失败，请检查API响应')
    }

    // 更新状态为生成中
    setShots(prevShots =>
      prevShots.map(s => {
        if (s.id === shot.id) {
          const currentTaskIds = s.generatingTaskIds || []
          const currentImages = s.thumbnailImages || []
          
          return {
            ...s,
            generatingStatus: 'generating',
            generatingProgress: 10,
            generatingTaskId: isMidjourney4Images ? result.taskId : (currentTaskIds[0] || result.taskId), // Midjourney 使用第一个任务ID
            generatingTaskIds: [...currentTaskIds, result.taskId], // 保存所有任务ID
            generatingResultUrl: (result as any)._resultUrl || (result as any).resultUrl,
            thumbnailImages: currentImages, // 保持数组结构
          }
        }
        return s
      })
    )

    // 开始轮询任务状态
    const resultUrl = (result as any)._resultUrl || (result as any).resultUrl
    
    if (isMidjourney4Images) {
      // Midjourney 4张图片模式：使用特殊轮询逻辑
      await pollTaskStatus(shot.id, result.taskId, request.model, request.resolution, resultUrl)
    } else {
      // 其他情况：为每张图片单独轮询
      pollSingleImageStatus(shot.id, result.taskId, imageIndex, request.model, request.resolution, resultUrl, shot.quantity || 1)
    }
  }

  // 轮询单张图片状态（用于多张图片场景）
  const pollSingleImageStatus = async (
    shotId: number,
    taskId: string,
    imageIndex: number,
    model: 'nano-banana-pro' | 'midjourney-v7-t2i',
    resolution?: '2K' | '4K',
    resultUrl?: string,
    totalQuantity: number = 1,
    attempts: number = 0
  ) => {
    const maxAttempts = 180
    
    if (attempts >= maxAttempts) {
      console.warn(`⏰ 分镜${shotId}图片${imageIndex + 1}超时`)
      return
    }

    try {
      attempts++
      // 获取项目名称（用于保存到项目文件夹）
      const projectName = state?.scriptTitle || sessionStorage.getItem('scriptInput_scriptTitle') || ''
      const status = await getImageTaskStatus(taskId, model, resolution, resultUrl, projectName)
      
      if (status.status === 'completed' && status.imageUrl) {
        // 单张图片完成，添加到图片数组
        console.log(`✅ 分镜${shotId}图片${imageIndex + 1}/${totalQuantity}完成:`, status.imageUrl)
        
        setShots(prevShots => {
          const updated = prevShots.map(shot => {
            if (shot.id === shotId) {
              const currentImages = shot.thumbnailImages || []
              const newImages = [...currentImages]
              if (status.imageUrl) {
                newImages[imageIndex] = status.imageUrl
              }
              
              // 检查是否所有图片都完成
              const completedCount = newImages.filter(img => !!img).length
              const allCompleted = completedCount === totalQuantity
              
              return {
                ...shot,
                thumbnailImages: newImages,
                thumbnailImage: newImages[0] || shot.thumbnailImage, // 第一张作为主图
                generatingProgress: Math.floor((completedCount / totalQuantity) * 100),
                generatingStatus: allCompleted ? ('completed' as const) : ('generating' as const),
              }
            }
            return shot
          })
          
          // 检查是否所有分镜都完成
          const allShotsCompleted = updated.every(s => 
            (s.thumbnailImages && s.thumbnailImages.filter(img => !!img).length === s.quantity) || 
            s.generatingStatus === 'completed' || 
            s.generatingStatus === 'failed'
          )
          if (allShotsCompleted) {
            setTimeout(() => checkAllCompleted(updated), 1000)
          }
          
          return updated
        })
        
        // 如果所有图片都完成，停止轮询
        setShots(prevShots => {
          const shot = prevShots.find(s => s.id === shotId)
          if (shot && shot.thumbnailImages && shot.thumbnailImages.filter(img => !!img).length === totalQuantity) {
            setGeneratingShots(prev => {
              const next = new Set(prev)
              next.delete(shotId)
              return next
            })
          }
          return prevShots
        })
      } else if (status.status === 'processing' || status.status === 'pending') {
        // 继续轮询
        setTimeout(() => pollSingleImageStatus(shotId, taskId, imageIndex, model, resolution, resultUrl, totalQuantity, attempts), 3000)
      } else if (status.status === 'failed') {
        console.error(`❌ 分镜${shotId}图片${imageIndex + 1}失败`)
      }
    } catch (error) {
      console.error(`❌ 分镜${shotId}图片${imageIndex + 1}轮询失败:`, error)
      // 继续重试
      setTimeout(() => pollSingleImageStatus(shotId, taskId, imageIndex, model, resolution, resultUrl, totalQuantity, attempts), 5000)
    }
  }

  // 检查所有分镜是否生成完成（使用函数式更新获取最新状态）
  const checkAllCompleted = (currentShots: Shot[]) => {
    const allCompleted = currentShots.every(shot => {
      // 对于 Midjourney，需要检查所有图片是否都生成完成
      if (shot.model === 'midjourney-v7-t2i') {
        const expectedCount = shot.quantity || 4
        const actualCount = (shot.thumbnailImages || []).filter(img => !!img).length
        // 如果已经有网格图（thumbnailImage），也算完成（因为会立即跳转）
        return (actualCount === expectedCount) || 
               shot.thumbnailImage || 
               shot.generatingStatus === 'completed' || 
               shot.generatingStatus === 'failed'
      } else {
        // 其他模型，检查是否有图片或已完成
        const hasImage = shot.thumbnailImage || (shot.thumbnailImages && shot.thumbnailImages.length > 0)
        return hasImage || 
               shot.generatingStatus === 'completed' || 
               shot.generatingStatus === 'failed'
      }
    })
    // 检查是否有至少一个分镜成功生成图片（允许部分失败）
    const hasSuccess = currentShots.some(shot => {
      if (shot.model === 'midjourney-v7-t2i') {
        const expectedCount = shot.quantity || 4
        const actualCount = (shot.thumbnailImages || []).filter(img => !!img).length
        return actualCount === expectedCount && shot.generatingStatus === 'completed'
      } else {
        // 只要有图片就认为成功（不强制要求状态为 completed，因为可能状态更新有延迟）
        return (shot.thumbnailImage || (shot.thumbnailImages && shot.thumbnailImages.length > 0))
      }
    })
    
    // 如果所有分镜都已完成（无论成功或失败），且有至少一个成功，就可以进入下一步
    if (allCompleted && hasSuccess) {
      // 所有分镜都生成完成，准备跳转
      // 收集所有图片素材（包括同一分镜可能生成的多张图片）
      const allImages: string[] = []
      const fusionData: any[] = []
      
      currentShots.forEach(shot => {
        // 如果有多张图片（thumbnailImages），为每张图片创建一个 fusion 项
        if (shot.thumbnailImages && shot.thumbnailImages.length > 0) {
          shot.thumbnailImages.forEach((image, idx) => {
            if (image) {
              fusionData.push({
                id: shot.id * 1000 + idx, // 确保每个图片有唯一ID
                shotNumber: shot.shotNumber || shot.id,
                image: image,
                videoPrompt: shot.prompt,
                model: 'wan2.2-i2v-flash',
                resolution: '720p',
                duration: 5,
                quantity: 1, // 每个图片单独处理
                selected: false,
              })
              if (!allImages.includes(image)) {
                allImages.push(image)
              }
            }
          })
        } else if (shot.thumbnailImage) {
          // 如果只有单张图片（thumbnailImage），创建一个 fusion 项
          fusionData.push({
            id: shot.id,
            shotNumber: shot.shotNumber,
            image: shot.thumbnailImage,
            videoPrompt: shot.videoPrompt || shot.prompt, // 优先使用生成的视频提示词
            model: 'wan2.2-i2v-flash',
            resolution: '720p',
            duration: 5,
            quantity: 1,
            selected: false,
          })
          if (!allImages.includes(shot.thumbnailImage)) {
            allImages.push(shot.thumbnailImage)
          }
        }
      })
      
      if (fusionData.length > 0) {
        // 延迟一下再跳转，确保状态更新完成
        setTimeout(() => {
          navigate('/image-fusion', {
            state: {
              fusions: fusionData,
              shots: currentShots.filter(shot => shot.thumbnailImage || (shot.thumbnailImages && shot.thumbnailImages.length > 0)),
              allImages: allImages, // 传递所有图片素材
            },
          })
        }, 500)
      }
    } else if (allCompleted && !hasSuccess) {
      // 所有分镜都已完成，但全部失败
      const failedShots = currentShots.filter(shot => shot.generatingStatus === 'failed')
      if (failedShots.length > 0) {
        setErrorModal({
          isOpen: true,
          title: '所有分镜生成失败',
          message: `所有分镜生成都失败了，请检查：\n${failedShots.map(s => `分镜${s.shotNumber}: ${s.generatingError || '未知错误'}`).join('\n')}`,
        })
      }
    } else if (allCompleted && hasSuccess) {
      // 部分失败，但有成功的，提示用户但允许继续
      const failedShots = currentShots.filter(shot => shot.generatingStatus === 'failed')
      if (failedShots.length > 0) {
        // 延迟显示错误提示，确保跳转先执行
        setTimeout(() => {
          setErrorModal({
            isOpen: true,
            title: '部分分镜生成失败',
            message: `以下分镜生成失败，但其他分镜已成功生成，可以继续进入下一步：\n${failedShots.map(s => `分镜${s.shotNumber}: ${s.generatingError || '未知错误'}`).join('\n')}`,
          })
        }, 500)
      }
    }
  }

  // 开始生成所有分镜图片
  const handleSubmit = async () => {
    if (isGenerating) {
      return
    }

    // 验证所有分镜都有提示词
    const shotsWithoutPrompt = shots.filter(shot => !shot.prompt || shot.prompt.trim() === '')
    if (shotsWithoutPrompt.length > 0) {
      setErrorModal({
        isOpen: true,
        title: '缺少融图提示词',
        message: `以下分镜缺少融图提示词，请先填写：\n${shotsWithoutPrompt.map(s => `分镜${s.shotNumber}`).join('、')}`,
      })
      return
    }

    setIsGenerating(true)
    // 只生成还没有图片的分镜（检查 thumbnailImage 和 thumbnailImages）
    const shotsToGenerate = shots.filter(shot => {
      // 如果已经有 thumbnailImage，不需要生成
      if (shot.thumbnailImage) return false
      // 如果已经有 thumbnailImages 且数量足够，不需要生成
      if (shot.thumbnailImages && shot.thumbnailImages.length > 0) {
        // 对于 Midjourney，需要4张图片
        if (shot.model === 'midjourney-v7-t2i') {
          const expectedCount = shot.quantity || 4
          const actualCount = shot.thumbnailImages.filter(img => !!img).length
          return actualCount < expectedCount
        }
        // 其他模型，有图片就不需要生成
        return false
      }
      // 都没有，需要生成
      return true
    })

    if (shotsToGenerate.length === 0) {
      setErrorModal({
        isOpen: true,
        title: '提示',
        message: '所有分镜都已生成图片',
      })
      setIsGenerating(false)
      // 如果所有分镜都有图片，直接跳转
      const fusionData = shots
        .filter(shot => shot.thumbnailImage)
        .map(shot => ({
          id: shot.id,
          image: shot.thumbnailImage!,
          videoPrompt: shot.videoPrompt || shot.prompt, // 优先使用生成的视频提示词
          model: shot.model,
          resolution: shot.resolution || '2K',
          duration: 5,
          selected: false,
        }))
      
      if (fusionData.length > 0) {
        navigate('/image-fusion', {
          state: {
            fusions: fusionData,
            shots: shots.filter(shot => shot.thumbnailImage),
          },
        })
      }
      return
    }

    // 初始化生成状态
    shotsToGenerate.forEach(shot => {
      setGeneratingShots(prev => new Set(prev).add(shot.id))
    })

    // 并发生成所有分镜图片（限制并发数为3，避免过多请求）
    // 注意：每个任务都是异步的，不会阻塞其他任务
    const concurrency = 3
    for (let i = 0; i < shotsToGenerate.length; i += concurrency) {
      const batch = shotsToGenerate.slice(i, i + concurrency)
      // 不等待完成，让轮询在后台进行（每个任务独立运行，不会互相阻塞）
      batch.forEach(shot => {
        // 异步执行，不阻塞，错误由 generateShotImage 内部处理
        generateShotImage(shot).catch(error => {
          console.error(`分镜${shot.id}生成失败:`, error)
        })
      })
      // 批次之间稍微延迟，避免API限流（但不阻塞，只是延迟下一批次的启动）
      if (i + concurrency < shotsToGenerate.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // 提交所有任务后，立即跳转到融图管理页面（不等待生成完成）
    // 收集所有分镜数据（包括已有图片和正在生成的分镜）
    const allImages: string[] = []
    const fusionData: any[] = []
    
    console.log('📊 准备跳转到融图管理页面，当前分镜数量:', shots.length)
    
    shots.forEach(shot => {
      // 如果有多张图片（thumbnailImages），为每张图片创建一个 fusion 项
      if (shot.thumbnailImages && shot.thumbnailImages.length > 0) {
        shot.thumbnailImages.forEach((image, idx) => {
          if (image) {
            fusionData.push({
              id: shot.id * 1000 + idx,
              shotNumber: shot.shotNumber || shot.id,
              image: image,
              videoPrompt: shot.videoPrompt || shot.prompt || '',
              model: 'wan2.2-i2v-flash',
              resolution: '720p',
              duration: 5,
              quantity: 1,
              selected: false,
            })
            if (!allImages.includes(image)) {
              allImages.push(image)
            }
          }
        })
      } else if (shot.thumbnailImage) {
        // 如果只有单张图片（thumbnailImage），创建一个 fusion 项
        fusionData.push({
          id: shot.id,
          shotNumber: shot.shotNumber || shot.id,
          image: shot.thumbnailImage,
          videoPrompt: shot.videoPrompt || shot.prompt || '',
          model: 'wan2.2-i2v-flash',
          resolution: '720p',
          duration: 5,
          quantity: 1,
          selected: false,
        })
        if (!allImages.includes(shot.thumbnailImage)) {
          allImages.push(shot.thumbnailImage)
        }
      } else {
        // 如果没有图片（正在生成中），也创建一个 fusion 项（使用占位符）
        fusionData.push({
          id: shot.id,
          shotNumber: shot.shotNumber || shot.id,
          image: '/placeholder-image.jpg', // 占位符，等待生成完成
          videoPrompt: shot.videoPrompt || shot.prompt || '',
          model: 'wan2.2-i2v-flash',
          resolution: '720p',
          duration: 5,
          quantity: 1,
          selected: false,
          isGenerating: true, // 标记为正在生成
          generatingShotId: shot.id, // 关联的分镜ID
        })
        console.log(`📝 为分镜${shot.id}创建占位符 fusion 项`)
      }
    })
    
    console.log('📊 生成的 fusionData 数量:', fusionData.length)
    console.log('📊 fusionData 详情:', fusionData.map(f => ({
      id: f.id,
      shotNumber: f.shotNumber,
      hasImage: f.image !== '/placeholder-image.jpg',
      isGenerating: f.isGenerating || false,
    })))
    
    // 保存当前状态到 sessionStorage
    try {
      sessionStorage.setItem('shotManagement_shots', JSON.stringify(shots))
      if (state?.segments) {
        sessionStorage.setItem('shotManagement_segments', JSON.stringify(state.segments))
      }
      console.log('✅ 已保存分镜数据到 sessionStorage，shots数量:', shots.length)
    } catch (error) {
      console.warn('⚠️ 保存数据到 sessionStorage 失败:', error)
    }
    
    // 立即跳转到融图管理页面
    console.log('🚀 提交所有生成任务后，立即跳转到融图管理页面')
    console.log('📤 传递的数据:', {
      fusionsCount: fusionData.length,
      shotsCount: shots.length,
      allImagesCount: allImages.length,
    })
    
    navigate('/image-fusion', {
      state: {
        fusions: fusionData,
        shots: shots, // 传递所有分镜数据（包括正在生成的）
        allImages: allImages,
      },
    })
  }

  // 监听生成状态变化，检查是否所有分镜都完成
  useEffect(() => {
    if (generatingShots.size === 0 && isGenerating) {
      // 所有分镜的生成任务都已提交完成，检查是否都生成完成
      setShots(currentShots => {
        checkAllCompleted(currentShots)
        return currentShots
      })
      setIsGenerating(false)
    }
  }, [generatingShots.size, isGenerating, navigate])
  
  // 定期检查所有分镜是否完成（防止轮询逻辑遗漏，确保即使有失败也能及时检测）
  useEffect(() => {
    if (isGenerating) {
      const checkInterval = setInterval(() => {
        setShots(currentShots => {
          // 检查是否所有分镜都已完成（成功或失败）
          const allCompleted = currentShots.every(shot => {
            // 检查状态（使用变量避免TypeScript类型推断问题）
            const status: string | undefined = shot.generatingStatus
            if (status === 'failed' || status === 'completed') {
              return true
            }
            
            // 对于 Midjourney，需要检查所有图片是否都生成完成
            if (shot.model === 'midjourney-v7-t2i') {
              const expectedCount = shot.quantity || 4
              const actualCount = (shot.thumbnailImages || []).filter(img => !!img).length
              // 如果已经有网格图（thumbnailImage），也算完成
              return (actualCount === expectedCount) || !!shot.thumbnailImage
            } else {
              // 其他模型，检查是否有图片
              const hasImage = shot.thumbnailImage || (shot.thumbnailImages && shot.thumbnailImages.length > 0)
              return !!hasImage
            }
          })
          
          // 如果所有分镜都已完成，检查是否可以进入下一步
          if (allCompleted) {
            console.log('✅ 定期检查：所有分镜都已完成，准备检查是否可以进入下一步')
            checkAllCompleted(currentShots)
            // 停止生成状态
            setIsGenerating(false)
            setGeneratingShots(new Set())
          }
          
          return currentShots
        })
      }, 3000) // 每3秒检查一次
      
      return () => clearInterval(checkInterval)
    }
  }, [isGenerating])

  return (
    <div className="h-screen bg-white text-gray-900 overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 导航栏 */}
        <div className="flex items-center gap-4 px-4 py-2 flex-shrink-0">
          <button
            onClick={() => navigate('/asset-details')}
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <button
              onClick={() => {
                try {
                  // 保存当前分镜数据
                  sessionStorage.setItem('shotManagement_shots', JSON.stringify(shots))
                  if (state?.segments) {
                    sessionStorage.setItem('shotManagement_segments', JSON.stringify(state.segments))
                  }
                  // 保存原始剧本数据（如果有）
                  if (state?.scriptTitle) {
                    sessionStorage.setItem('scriptInput_scriptTitle', state.scriptTitle)
                  }
                  if (state?.workStyle) {
                    sessionStorage.setItem('scriptInput_workStyle', state.workStyle)
                  }
                  if (state?.maxShots) {
                    sessionStorage.setItem('scriptInput_maxShots', state.maxShots)
                  }
                  // 尝试从 segments 恢复剧本内容
                  if (state?.segments && state.segments.length > 0) {
                    const scriptContent = state.segments.map((seg: any) => seg.segment || seg).join('\n\n')
                    if (scriptContent) {
                      sessionStorage.setItem('scriptInput_scriptContent', scriptContent)
                    }
                  }
                  console.log('✅ 已保存所有数据到 sessionStorage')
                } catch (error) {
                  console.warn('⚠️ 保存数据失败:', error)
                }
                navigate('/script-input', {
                  state: {
                    scriptTitle: state?.scriptTitle,
                    workStyle: state?.workStyle,
                    workBackground: state?.workBackground,
                    segments: state?.segments,
                  }
                })
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
                  sessionStorage.setItem('shotManagement_shots', JSON.stringify(shots))
                  if (state?.segments) {
                    sessionStorage.setItem('shotManagement_segments', JSON.stringify(state.segments))
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
            <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-pink-500 flex items-center justify-center text-xs font-bold">3</span>
              <span className="border-b-2 border-pink-500">分镜管理</span>
            </div>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem('shotManagement_shots', JSON.stringify(shots))
                  if (state?.segments) {
                    sessionStorage.setItem('shotManagement_segments', JSON.stringify(state.segments))
                  }
                } catch (error) {
                  console.warn('⚠️ 保存数据失败:', error)
                }
                // 构建 fusionData 并跳转
                const fusionData = shots
                  .filter(shot => shot.thumbnailImage || (shot.thumbnailImages && shot.thumbnailImages.length > 0))
                  .map(shot => ({
                    id: shot.id,
                    shotNumber: shot.shotNumber,
                    image: shot.thumbnailImages && shot.thumbnailImages.length > 0 ? shot.thumbnailImages[0] : shot.thumbnailImage || '/placeholder-image.jpg',
                    videoPrompt: shot.prompt || shot.description || '',
                    model: 'wan2.2-i2v-flash',
                    resolution: '720p',
                    duration: 5,
                    quantity: 1,
                    selected: false,
                  }))
                
                const allImages: string[] = []
                shots.forEach(shot => {
                  if (shot.thumbnailImages && Array.isArray(shot.thumbnailImages)) {
                    shot.thumbnailImages.forEach(img => {
                      if (img && !allImages.includes(img)) allImages.push(img)
                    })
                  }
                  if (shot.thumbnailImage && !allImages.includes(shot.thumbnailImage)) {
                    allImages.push(shot.thumbnailImage)
                  }
                })
                
                navigate('/image-fusion', {
                  state: {
                    fusions: fusionData,
                    shots: shots,
                    allImages: allImages,
                  }
                })
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">4</span>
              <span>融图管理</span>
            </button>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem('shotManagement_shots', JSON.stringify(shots))
                  if (state?.segments) {
                    sessionStorage.setItem('shotManagement_segments', JSON.stringify(state.segments))
                  }
                } catch (error) {
                  console.warn('⚠️ 保存数据失败:', error)
                }
                navigate('/video-editing')
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">5</span>
              <span>视频编辑</span>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">分镜列表(点击分镜面板可展开/折叠)</h2>
            </div>

            <div className="space-y-4">
          {shots.map((shot) => {
            // 截断融图提示词用于显示
            const truncatedPrompt = shot.prompt.length > 80 ? shot.prompt.substring(0, 80) + '...' : shot.prompt
            
            return (
              <div
                key={shot.id}
                className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleShot(shot.id)}
                >
                  {!shot.isExpanded ? (
                    // 未展开状态：显示图片、模型、数量、分镜描述、融图提示词
                    <div className="flex items-center gap-4">
                      {/* 左侧：图片缩略图（固定宽度，保持对齐） */}
                      <div className="w-24 h-16 bg-white rounded border border-gray-300 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                        {shot.thumbnailImages && shot.thumbnailImages.length > 0 ? (
                          // 显示多张图片（2x2网格布局）
                          <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                            {shot.thumbnailImages.map((img, idx) => (
                              img ? (
                                <img 
                                  key={idx} 
                                  src={img} 
                                  alt={`分镜${shot.shotNumber}-${idx + 1}`} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div key={idx} className="w-full h-full bg-gray-100 flex items-center justify-center">
                                  <span className="text-gray-400 text-[8px]">生成中</span>
                                </div>
                              )
                            ))}
                          </div>
                        ) : shot.thumbnailImage ? (
                          <img src={shot.thumbnailImage} alt={`分镜${shot.shotNumber}`} className="w-full h-full object-cover" />
                        ) : shot.generatingStatus === 'submitting' || shot.generatingStatus === 'generating' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                            <Loader2 className="animate-spin text-purple-600 mb-1" size={16} />
                            <span className="text-gray-500 text-xs">
                              {shot.generatingStatus === 'submitting' ? '提交中...' : `${shot.generatingProgress || 0}%`}
                            </span>
                          </div>
                        ) : shot.generatingStatus === 'failed' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                            <span className="text-red-500 text-xs">生成失败</span>
                            {shot.generatingError && (
                              <span className="text-red-400 text-[10px] px-1 text-center line-clamp-2" title={shot.generatingError}>
                                {shot.generatingError}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <span className="text-gray-400 text-xs">暂无图片</span>
                          </div>
                        )}
                      </div>
                      
                      {/* 中间：分镜标题和融图提示词 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-lg font-semibold whitespace-nowrap">分镜{shot.shotNumber}</h3>
                          <span className="text-purple-600 text-sm relative group cursor-pointer truncate">
                            融图提示词: {truncatedPrompt}
                            {/* Hover tooltip显示完整提示词 */}
                            <span className="absolute left-0 top-full mt-2 w-96 p-3 bg-white border border-gray-300 rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-xs text-gray-900 whitespace-pre-wrap break-words">
                              {shot.prompt}
                            </span>
                          </span>
                        </div>
                      </div>
                      
                      {/* 右侧：模型、分辨率、数量、分镜描述信息块 */}
                      <div className="bg-white border border-gray-300 rounded-lg p-3 flex-shrink-0 min-w-[200px]">
                        <div className="mb-2">
                          <span className="text-xs text-gray-600">模型:</span>
                          <span className="ml-2 text-xs">{shot.model}</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-xs text-gray-600">分辨率:</span>
                          <span className="ml-2 text-xs">{shot.resolution || '2K'}</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-xs text-gray-600">数量:</span>
                          <span className="ml-2 text-xs text-red-500">{shot.quantity}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">对应片段:</span>
                          <p className="mt-1 text-xs text-gray-700 line-clamp-2">{shot.segment || '暂无对应片段'}</p>
                        </div>
                      </div>
                      
                      <ChevronDown className="text-gray-600 flex-shrink-0" />
                    </div>
                  ) : (
                    // 展开状态：只显示分镜标题和箭头
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">分镜{shot.shotNumber}</h3>
                      <ChevronUp className="text-gray-600" />
                    </div>
                  )}
                </div>

              {shot.isExpanded && (
                <div className="p-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* 左侧：融图提示词和对应片段 */}
                    <div className="space-y-4">
                      {/* 融图提示词 */}
                      <div>
                        <label className="block text-sm mb-2 flex items-center gap-2">
                          <span className="text-red-500">*</span> 融图提示词
                        </label>
                        <textarea
                          value={shot.prompt}
                          onChange={(e) =>
                            setShots(
                              shots.map((s) => (s.id === shot.id ? { ...s, prompt: e.target.value } : s))
                            )
                          }
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none text-sm text-gray-700"
                          rows={8}
                          placeholder="请输入融图提示词..."
                        />
                      </div>
                    </div>
                    
                    {/* 右侧：模型、分辨率、数量、分镜描述等信息 */}
                    <div className="space-y-4">
                      <div className="bg-white border border-gray-300 rounded-lg p-4">
                        <div className="mb-3">
                          <span className="text-sm text-gray-600">模型:</span>
                          <span className="ml-2 text-sm">{shot.model}</span>
                        </div>
                        <div className="mb-3">
                          <span className="text-sm text-gray-600">分辨率:</span>
                          <span className="ml-2 text-sm">{shot.resolution || '2K'}</span>
                        </div>
                        <div className="mb-3">
                          <span className="text-sm text-gray-600">数量:</span>
                          <span className="ml-2 text-sm text-red-500">{shot.quantity}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">对应片段:</span>
                          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{shot.segment || '暂无对应片段'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 可编辑字段 */}
                  <div className="space-y-6">

                    {/* 图片比例、模型、分辨率、数量 */}
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm mb-2">图片比例(尺寸)</label>
                        <select
                          value={shot.aspectRatio}
                          onChange={(e) => {
                            const newRatio = e.target.value
                            // 同步修改所有分镜的图片比例（修改分率时，所有分镜都同步修改）
                            setShots((prevShots) =>
                              prevShots.map((s) => ({
                                ...s,
                                aspectRatio: newRatio,
                              }))
                            )
                            // 保存图片比例到 sessionStorage，供后续页面使用
                            try {
                              sessionStorage.setItem('shotManagement_aspectRatio', newRatio)
                            } catch (error) {
                              console.warn('⚠️ 保存图片比例到 sessionStorage 失败:', error)
                            }
                          }}
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                        >
                          <option>16:9</option>
                          <option>9:16</option>
                          <option>1:1</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm mb-2 flex items-center gap-2">
                          <span className="text-red-500">*</span> 模型
                          <HelpCircle size={16} className="text-gray-600 cursor-help" />
                        </label>
                        {/* 计算参考图片总数 */}
                        {(() => {
                          const referenceImageCount = 
                            (shot.associatedCharacters?.length || 0) +
                            (shot.associatedScenes?.length || 0) +
                            (shot.associatedItems?.length || 0) +
                            (shot.pose && shot.pose.trim() !== '' ? 1 : 0)
                          
                          // 判断是否应该显示 tooltip（没有参考图片时）
                          const showTooltip = referenceImageCount === 0
                          const tooltipText = 
                            shot.model === 'nano-banana-pro' ? '只能支持一张关联图片' :
                            shot.model === 'midjourney-v7-t2i' ? '不支持关联图生图功能' : ''
                          
                          return (
                            <div className="relative group">
                              <select
                                value={shot.model}
                                onChange={(e) => {
                                  const newModel = e.target.value
                                  // 切换模型时，如果当前分辨率不支持，自动调整为默认值
                                  let newResolution = shot.resolution || '2K'
                                  if (newModel === 'midjourney-v7-t2i' && newResolution === '4K') {
                                    newResolution = '2K' // midjourney 只支持 2K
                                  }
                                  // 切换模型时，自动调整数量：midjourney-v7-t2i 默认4，其他默认1
                                  let newQuantity = shot.quantity
                                  if (newModel === 'midjourney-v7-t2i') {
                                    newQuantity = 4
                                  } else if (newModel === 'nano-banana-pro' && shot.quantity === 4) {
                                    // 如果从 midjourney 切换到 nano-banana-pro，且数量是4，改为1
                                    newQuantity = 1
                                  }
                                  setShots(
                                    shots.map((s) => 
                                      s.id === shot.id 
                                        ? { ...s, model: newModel, resolution: newResolution, quantity: newQuantity }
                                        : s
                                    )
                                  )
                                }}
                                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                              >
                                {/* 如果参考图片数量 >= 2，隐藏 nano-banana-pro（只支持单张参考图） */}
                                {referenceImageCount < 2 && (
                                  <option value="nano-banana-pro">Nano Banana Pro</option>
                                )}
                                {/* 如果有关联图片（角色、场景、物品、姿势），隐藏 Midjourney v7（不支持参考图） */}
                                {referenceImageCount === 0 && (
                                  <option value="midjourney-v7-t2i">Midjourney v7</option>
                                )}
                                <option value="flux-2-max">Flux-2-Max</option>
                                <option value="flux-2-flex">Flux-2-Flex</option>
                                <option value="flux-2-pro">Flux-2-Pro</option>
                                <option value="seedream-4-5">Seedream 4.5</option>
                                <option value="seedream-4-0">Seedream 4.0</option>
                              </select>
                              {/* Tooltip：当没有参考图片时，显示提示 */}
                              {showTooltip && tooltipText && (
                                <span className="absolute left-0 top-full mt-2 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none">
                                  {tooltipText}
                                  {/* 小三角箭头 */}
                                  <span className="absolute bottom-full left-4 border-4 border-transparent border-b-gray-800"></span>
                                </span>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                      <div>
                        <label className="block text-sm mb-2 flex items-center gap-2">
                          <span className="text-red-500">*</span> 分辨率
                          <HelpCircle size={16} className="text-gray-600 cursor-help" />
                        </label>
                        <select
                          value={shot.resolution || '2K'}
                          onChange={(e) =>
                            setShots(
                              shots.map((s) =>
                                s.id === shot.id ? { ...s, resolution: e.target.value } : s
                              )
                            )
                          }
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                        >
                          {shot.model === 'nano-banana-pro' ? (
                            <>
                              <option value="2K">2K</option>
                              <option value="4K">4K</option>
                            </>
                          ) : (
                            <option value="2K">2K</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm mb-2 flex items-center gap-2">
                          <span className="text-red-500">*</span> 数量
                          <HelpCircle size={16} className="text-gray-600 cursor-help" />
                        </label>
                        <select
                          value={shot.quantity}
                          onChange={(e) =>
                            setShots(
                              shots.map((s) =>
                                s.id === shot.id ? { ...s, quantity: parseInt(e.target.value) } : s
                              )
                            )
                          }
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                          disabled={shot.model === 'midjourney-v7-t2i'} // midjourney-v7-t2i 时禁用选择
                        >
                          {shot.model === 'midjourney-v7-t2i' ? (
                            <option value={4}>4（自动生成2x2网格并放大）</option>
                          ) : (
                            <>
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={4}>4</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                  </div>

                  {/* 关联资源 - 横向排列 */}
                  <div className="mt-6">
                    <label className="block text-sm mb-3 flex items-center gap-2">
                      关联资源
                      <HelpCircle size={16} className="text-gray-600 cursor-help" />
                    </label>
                    <div className="grid grid-cols-4 gap-4">
                      {/* 关联角色 */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 flex items-center gap-1">
                          关联角色
                          <HelpCircle size={12} className="text-gray-500 cursor-help" />
                        </label>
                        {/* 使用网格布局，每行显示2个角色卡片，9:16比例 */}
                        <div className="grid grid-cols-2 gap-2">
                          {shot.associatedCharacters.map((_char, idx) => (
                            <div
                              key={char.id || idx}
                              className="relative bg-white border border-gray-300 rounded overflow-hidden"
                              style={{ aspectRatio: '9/16' }}
                            >
                              {char.imageUrl ? (
                                <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover object-top" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 px-1 text-center">
                                  {char.name}
                                </div>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShots(shots.map(s => 
                                    s.id === shot.id 
                                      ? { ...s, associatedCharacters: s.associatedCharacters.filter((_, i) => i !== idx) }
                                      : s
                                  ))
                                }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddResource(shot.id, 'character')
                            }}
                            className="w-16 h-16 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-purple-500 transition-colors"
                          >
                            <Plus size={20} className="text-gray-600" />
                          </button>
                        </div>
                      </div>

                      {/* 关联场景 */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 flex items-center gap-1">
                          关联场景
                          <HelpCircle size={12} className="text-gray-500 cursor-help" />
                        </label>
                        {/* 使用网格布局，每行显示2个场景卡片，16:9比例 */}
                        <div className="grid grid-cols-2 gap-2">
                          {shot.associatedScenes.map((_scene, idx) => (
                            <div
                              key={scene.id || idx}
                              className="relative bg-white border border-gray-300 rounded overflow-hidden"
                              style={{ aspectRatio: '16/9' }}
                            >
                              {scene.imageUrl ? (
                                <img src={scene.imageUrl} alt={scene.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 px-1 text-center">
                                  {scene.name}
                                </div>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShots(shots.map(s => 
                                    s.id === shot.id 
                                      ? { ...s, associatedScenes: s.associatedScenes.filter((_, i) => i !== idx) }
                                      : s
                                  ))
                                }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddResource(shot.id, 'scene')
                            }}
                            className="w-16 h-16 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-purple-500 transition-colors"
                          >
                            <Plus size={20} className="text-gray-600" />
                          </button>
                        </div>
                      </div>

                      {/* 姿势 */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 flex items-center gap-1">
                          姿势
                          <HelpCircle size={12} className="text-gray-500 cursor-help" />
                        </label>
                        <div className="flex gap-2">
                          {shot.pose ? (
                            <div className="relative w-16 h-16 bg-white border border-gray-300 rounded overflow-hidden">
                              <img src={shot.pose} alt="姿势" className="w-full h-full object-cover" />
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShots(shots.map(s => 
                                    s.id === shot.id ? { ...s, pose: undefined } : s
                                  ))
                                }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddResource(shot.id, 'pose')
                              }}
                              className="w-16 h-16 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-purple-500 transition-colors"
                            >
                              <Plus size={20} className="text-gray-600" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 关联物品 */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 flex items-center gap-1">
                          关联物品
                          <HelpCircle size={12} className="text-gray-500 cursor-help" />
                        </label>
                        {/* 使用网格布局，每行显示2个物品卡片，16:9比例 */}
                        <div className="grid grid-cols-2 gap-2">
                          {shot.associatedItems.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className="relative bg-white border border-gray-300 rounded overflow-hidden"
                              style={{ aspectRatio: '16/9' }}
                            >
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 px-1 text-center">
                                  {item.name}
                                </div>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShots(shots.map(s => 
                                    s.id === shot.id 
                                      ? { ...s, associatedItems: s.associatedItems.filter((_, i) => i !== idx) }
                                      : s
                                  ))
                                }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddResource(shot.id, 'item')
                            }}
                            className="w-16 h-16 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-purple-500 transition-colors"
                          >
                            <Plus size={20} className="text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )
          })}
        </div>

        {/* 生成按钮 */}
        <div className="mt-6 flex justify-end items-center gap-4">
          {isGenerating && (
            <div className="text-sm text-gray-600">
              正在生成 {generatingShots.size} 个分镜的图片...
            </div>
          )}
            <button
              onClick={handleSubmit}
              disabled={isGenerating}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating && <Loader2 className="animate-spin" size={20} />}
              {isGenerating ? '生成中...' : '开始生成分镜图片'}
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* 错误提示模态框 */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">{errorModal.title}</h3>
            <p className="text-gray-700 mb-6 whitespace-pre-line">{errorModal.message}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setErrorModal({ isOpen: false, title: '', message: '' })}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 角色选择器模态框 */}
      {showCharacterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setShowCharacterModal(false)
          setCurrentShotId(null)
          setCurrentResourceType(null)
        }}>
          <div className="bg-white rounded-lg w-[95vw] max-w-7xl h-[85vh] flex flex-col border border-gray-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">选择角色</h2>
              <button
                onClick={() => {
                  setShowCharacterModal(false)
                  setCurrentShotId(null)
                  setCurrentResourceType(null)
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {availableCharacters.length === 0 ? (
                <div className="text-center text-gray-500 py-8">暂无可用角色，请先在"资产详情"中添加角色</div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {availableCharacters.map((char) => {
                    const isSelected = selectedCharacterId === char.id
                    return (
                      <div
                        key={char.id}
                        onClick={() => {
                          setSelectedCharacterId(char.id)
                          handleSelectAsset(char)
                        }}
                        className={`border-2 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all ${
                          isSelected 
                            ? 'border-red-500' 
                            : 'border-gray-300 hover:border-purple-500'
                        }`}
                      >
                        {char.imageUrl ? (
                          <div className="w-full rounded overflow-hidden mb-2" style={{ aspectRatio: '9/16' }}>
                            <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover object-top" />
                          </div>
                        ) : (
                          <div className="w-full rounded bg-gray-100 flex items-center justify-center mb-2" style={{ aspectRatio: '9/16' }}>
                            <span className="text-gray-600 text-sm">{char.name}</span>
                          </div>
                        )}
                        <div className="text-sm font-medium text-center">{char.name}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 场景选择器模态框 */}
      {showSceneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setShowSceneModal(false)
          setCurrentShotId(null)
          setCurrentResourceType(null)
        }}>
          <div className="bg-white rounded-lg w-[90vw] max-w-4xl h-[80vh] flex flex-col border border-gray-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">选择场景</h2>
              <button
                onClick={() => {
                  setShowSceneModal(false)
                  setCurrentShotId(null)
                  setCurrentResourceType(null)
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {availableScenes.length === 0 ? (
                <div className="text-center text-gray-500 py-8">暂无可用场景，请先在"资产详情"中添加场景</div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {availableScenes.map((scene) => (
                    <div
                      key={scene.id}
                      onClick={() => handleSelectAsset(scene)}
                      className="border border-gray-300 rounded-lg p-3 cursor-pointer hover:border-purple-500 hover:shadow-md transition-all"
                    >
                      {scene.imageUrl ? (
                        <div className="w-full aspect-[16/9] rounded overflow-hidden mb-2">
                          <img src={scene.imageUrl} alt={scene.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-full aspect-[16/9] rounded bg-gray-100 flex items-center justify-center mb-2">
                          <span className="text-gray-600 text-sm">{scene.name}</span>
                        </div>
                      )}
                      <div className="text-sm font-medium text-center">{scene.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 物品选择器模态框 */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setShowItemModal(false)
          setCurrentShotId(null)
          setCurrentResourceType(null)
        }}>
          <div className="bg-white rounded-lg w-[90vw] max-w-4xl h-[80vh] flex flex-col border border-gray-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">选择物品</h2>
              <button
                onClick={() => {
                  setShowItemModal(false)
                  setCurrentShotId(null)
                  setCurrentResourceType(null)
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {availableItems.length === 0 ? (
                <div className="text-center text-gray-500 py-8">暂无可用物品，请先在"资产详情"中添加物品</div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {availableItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectAsset(item)}
                      className="border border-gray-300 rounded-lg p-3 cursor-pointer hover:border-purple-500 hover:shadow-md transition-all"
                    >
                      {item.imageUrl ? (
                        <div className="w-full aspect-[16/9] rounded overflow-hidden mb-2">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-full aspect-[16/9] rounded bg-gray-100 flex items-center justify-center mb-2">
                          <span className="text-gray-600 text-sm">{item.name}</span>
                        </div>
                      )}
                      <div className="text-sm font-medium text-center">{item.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShotManagement
