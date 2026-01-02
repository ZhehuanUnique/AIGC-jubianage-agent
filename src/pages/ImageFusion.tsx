import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, Eye, Star, Trash2, Download, Loader2 } from 'lucide-react'
import ImageSelectionModal from '../components/ImageSelectionModal'
import VideoPromptModelSelectionModal from '../components/VideoPromptModelSelectionModal'
import VideoEditingDrawer from '../components/VideoEditingDrawer'
import { generateVideoFromImage, getVideoTaskStatus, generateVideoMotionPrompt, exportImagesToDesktop } from '../services/api'

interface FusionItem {
  id: number
  shotNumber: number
  image: string
  videoPrompt: string
  model: string // 视频模型
  resolution: string // 视频分辨率
  duration: number
  quantity: number // 每个分镜生成几个视频
  selected: boolean
  generatingStatus?: 'idle' | 'generating' | 'completed' | 'failed'
  generatingProgress?: number
  generatingTaskIds?: string[] // 可能生成多个视频
  videoUrls?: string[] // 生成的视频URL列表
}

interface LocationState {
  fusions?: FusionItem[]
  shots?: any[] // 从分镜管理页面传递的所有分镜数据，包含所有生成的图片
  allImages?: string[] // 所有生成的图片URL列表（包括同一分镜的多张图片）
}

function ImageFusion() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null) // 预览的图片URL
  const [isVideoEditingDrawerOpen, setIsVideoEditingDrawerOpen] = useState(false)
  const [selectedFusionForEditing, setSelectedFusionForEditing] = useState<FusionItem | null>(null)
  
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
  
  // 成功提示模态框状态
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean
    message: string
  }>({
    isOpen: false,
    message: '',
  })
  
  // 从分镜管理页面传递的数据初始化，如果没有则使用默认数据
  const [fusions, setFusions] = useState<FusionItem[]>(() => {
    console.log('🔍 ImageFusion 组件初始化，检查 location.state:', {
      hasState: !!state,
      hasFusions: !!(state?.fusions && state.fusions.length > 0),
      fusionsCount: state?.fusions?.length || 0,
      hasShots: !!(state?.shots && state.shots.length > 0),
      shotsCount: state?.shots?.length || 0,
    })
    
    // 优先使用从视频编辑页面返回的数据（location.state）
    if (state?.fusions && state.fusions.length > 0) {
      console.log('✅ 使用 location.state.fusions 初始化，数量:', state.fusions.length)
      // 确保所有字段都存在
      const savedFusions = state.fusions.map(f => ({
        ...f,
        shotNumber: f.shotNumber || f.id,
        quantity: f.quantity || 1,
        model: f.model || 'wan2.2-i2v-flash',
        resolution: f.resolution || '720p',
        duration: f.duration || 5,
        generatingStatus: f.generatingStatus || 'idle',
        generatingProgress: f.generatingProgress || 0,
        generatingTaskIds: f.generatingTaskIds || [],
        videoUrls: f.videoUrls || [],
        selected: f.selected || false,
      }))
      
      // 同时保存到 sessionStorage
      try {
        sessionStorage.setItem('imageFusion_fusions', JSON.stringify(savedFusions))
        console.log('✅ 已保存 fusions 到 sessionStorage')
      } catch (error) {
        console.warn('⚠️ 保存 fusions 到 sessionStorage 失败:', error)
      }
      
      return savedFusions
    }
    
    // 如果没有 location.state，尝试从 sessionStorage 恢复
    try {
      const savedFusions = sessionStorage.getItem('imageFusion_fusions')
      if (savedFusions) {
        const parsed = JSON.parse(savedFusions)
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('✅ 从 sessionStorage 恢复 fusions 数据，数量:', parsed.length)
          return parsed.map(f => ({
            ...f,
            shotNumber: f.shotNumber || f.id,
            quantity: f.quantity || 1,
            model: f.model || 'wan2.2-i2v-flash',
            resolution: f.resolution || '720p',
            duration: f.duration || 5,
            generatingStatus: f.generatingStatus || 'idle',
            generatingProgress: f.generatingProgress || 0,
            generatingTaskIds: f.generatingTaskIds || [],
            videoUrls: f.videoUrls || [],
            selected: f.selected || false,
          }))
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 fusions 失败:', error)
    }
    
    // 尝试从 sessionStorage 读取 shots 数据
    try {
      const savedShots = sessionStorage.getItem('shotManagement_shots')
      if (savedShots) {
        const shots = JSON.parse(savedShots)
        if (Array.isArray(shots) && shots.length > 0) {
          console.log('✅ 从 sessionStorage 读取 shots 数据，数量:', shots.length)
          // 这里不能调用 updateFusionsFromShots，因为它在组件外部
          // 先返回空数组，在 useEffect 中处理
          return []
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 读取 shots 失败:', error)
    }
    
    console.log('⚠️ 没有找到任何数据，使用默认占位符数据')
    // 默认数据（占位符）
    return [
      {
        id: 1,
        shotNumber: 1,
        image: '/placeholder-image.jpg',
        videoPrompt: '真人电影风格，风轻轻吹过，两人的长发和衣角微微飘动。她们静静地站着，没有任何交流，气氛沉静而压抑。镜头缓慢从两人身后向前推进，越过她们的肩膀，展现下方的宫城全貌。',
        model: 'wan2.2-i2v-flash',
        resolution: '720p',
        duration: 5,
        quantity: 1,
        selected: false,
      },
      {
        id: 2,
        shotNumber: 2,
        image: '/placeholder-image.jpg',
        videoPrompt: '真人电影风格，画面描述...',
        model: 'wan2.2-i2v-flash',
        resolution: '720p',
        duration: 5,
        quantity: 1,
        selected: false,
      },
      {
        id: 3,
        shotNumber: 3,
        image: '/placeholder-image.jpg',
        videoPrompt: '真人电影风格，画面描述...',
        model: 'wan2.2-i2v-flash',
        resolution: '720p',
        duration: 5,
        quantity: 1,
        selected: false,
      },
      {
        id: 4,
        shotNumber: 4,
        image: '/placeholder-image.jpg',
        videoPrompt: '真人电影风格，画面描述...',
        model: 'wan2.2-i2v-flash',
        resolution: '720p',
        duration: 5,
        quantity: 1,
        selected: false,
      },
    ]
  })

  // 视频生成全局设置
  const [globalModel, setGlobalModel] = useState('wan2.2-i2v-flash') // 视频模型
  const [globalResolution, setGlobalResolution] = useState('720p') // 视频分辨率
  const [globalDuration, setGlobalDuration] = useState(5) // 视频时长
  const [globalQuantity, setGlobalQuantity] = useState(1) // 每个分镜生成几个视频（1或2）
  const [progress, setProgress] = useState(0) // 所有视频生成的进度
  const [isGenerating, setIsGenerating] = useState(false) // 是否正在生成视频
  const [showVideoPromptModelModal, setShowVideoPromptModelModal] = useState(false) // 视频提示词模型选择弹窗
  const [selectedVideoPromptModel, setSelectedVideoPromptModel] = useState<'ollama-qwen3-vl-8b' | 'gemini-3-flash-preview' | 'gemini-3-pro-preview' | null>(null) // 选择的视频提示词生成模型
  
  // 收集所有图片素材（包括同一分镜的多张图片）
  const [allImageAssets, setAllImageAssets] = useState<string[]>(() => {
    // 优先使用从视频编辑页面返回的数据（location.state）
    if (state?.allImageAssets && state.allImageAssets.length > 0) {
      // 同时保存到 sessionStorage
      try {
        sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(state.allImageAssets))
      } catch (error) {
        console.warn('⚠️ 保存 allImageAssets 到 sessionStorage 失败:', error)
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
  
  // 从 sessionStorage 读取最新的 shots 数据并更新 fusions
  const updateFusionsFromShots = (shotsData: any[]) => {
    if (!Array.isArray(shotsData) || shotsData.length === 0) {
      return
    }

    const images: string[] = []
    const newFusions: FusionItem[] = []

    shotsData.forEach((shot: any) => {
      // 收集所有图片
      if (shot.thumbnailImages && Array.isArray(shot.thumbnailImages)) {
        shot.thumbnailImages.forEach((img: string) => {
          if (img && img !== '/placeholder-image.jpg' && !images.includes(img)) {
            images.push(img)
          }
        })
      }
      if (shot.thumbnailImage && shot.thumbnailImage !== '/placeholder-image.jpg' && !images.includes(shot.thumbnailImage)) {
        images.push(shot.thumbnailImage)
      }

      // 创建 fusion 项
      const shotNumber = shot.shotNumber || shot.id
      let image = '/placeholder-image.jpg'
      let isGenerating = false

      // 优先使用 thumbnailImages 的第一张图片
      if (shot.thumbnailImages && shot.thumbnailImages.length > 0) {
        const firstImage = shot.thumbnailImages.find((img: string) => img && img !== '/placeholder-image.jpg')
        if (firstImage) {
          image = firstImage
        } else {
          isGenerating = true
        }
      } else if (shot.thumbnailImage && shot.thumbnailImage !== '/placeholder-image.jpg') {
        image = shot.thumbnailImage
      } else {
        isGenerating = true
      }

      newFusions.push({
        id: shot.id,
        shotNumber: shotNumber,
        image: image,
        videoPrompt: shot.videoPrompt || shot.prompt || '真人电影风格，画面描述...',
        model: 'wan2.2-i2v-flash',
        resolution: '720p',
        duration: 5,
        quantity: 1,
        selected: false,
        ...(isGenerating && {
          isGenerating: true,
          generatingShotId: shot.id,
        }),
      })
    })

    // 更新 fusions 和 allImageAssets
    if (newFusions.length > 0) {
      setFusions(newFusions)
      try {
        sessionStorage.setItem('imageFusion_fusions', JSON.stringify(newFusions))
      } catch (error) {
        console.warn('⚠️ 保存 fusions 到 sessionStorage 失败:', error)
      }
    }

    if (images.length > 0) {
      setAllImageAssets(prev => {
        const combined = [...prev]
        images.forEach(img => {
          if (!combined.includes(img)) {
            combined.push(img)
          }
        })
        return combined
      })
    }
  }

  // 当从分镜管理页面传递数据时，初始化数据
  useEffect(() => {
    // 如果已经有数据（从视频编辑页面返回），不再覆盖
    if (allImageAssets.length > 0 && state?.allImageAssets) {
      return
    }
    
    // 优先使用传递的 fusions 数据
    if (state?.fusions && state.fusions.length > 0) {
      console.log('✅ 从 location.state 读取 fusions 数据，数量:', state.fusions.length)
      const savedFusions = state.fusions.map(f => ({
        ...f,
        shotNumber: f.shotNumber || f.id,
        quantity: f.quantity || 1,
        model: f.model || 'wan2.2-i2v-flash',
        resolution: f.resolution || '720p',
        duration: f.duration || 5,
        generatingStatus: f.generatingStatus || 'idle',
        generatingProgress: f.generatingProgress || 0,
        generatingTaskIds: f.generatingTaskIds || [],
        videoUrls: f.videoUrls || [],
        selected: f.selected || false,
      }))
      
      setFusions(savedFusions)
      
      // 收集所有图片素材
      const images: string[] = []
      savedFusions.forEach(fusion => {
        if (fusion.image && fusion.image !== '/placeholder-image.jpg' && !images.includes(fusion.image)) {
          images.push(fusion.image)
        }
      })
      if (images.length > 0) {
        setAllImageAssets(images)
      }
      
      // 保存到 sessionStorage
      try {
        sessionStorage.setItem('imageFusion_fusions', JSON.stringify(savedFusions))
      } catch (error) {
        console.warn('⚠️ 保存 fusions 到 sessionStorage 失败:', error)
      }
    } else if (state?.allImages && state.allImages.length > 0) {
      setAllImageAssets(state.allImages)
    } else if (state?.shots && Array.isArray(state.shots) && state.shots.length > 0) {
      // 如果传递的是shots数据，使用统一的更新函数
      console.log('✅ 从 location.state 读取 shots 数据，数量:', state.shots.length)
      updateFusionsFromShots(state.shots)
    } else {
      // 如果没有传递数据，尝试从 sessionStorage 读取
      console.log('⚠️ location.state 没有数据，尝试从 sessionStorage 读取')
    }
  }, [state])

  // 组件加载时，主动从 sessionStorage 读取最新的 shots 数据
  useEffect(() => {
    // 如果 fusions 已经有数据，检查是否需要更新
    if (fusions.length > 0) {
      const hasPlaceholder = fusions.some(f => f.image === '/placeholder-image.jpg')
      // 如果有占位符，需要继续检查；如果没有占位符且数据完整，不需要读取
      if (!hasPlaceholder) {
        return
      }
    }

    try {
      const savedShots = sessionStorage.getItem('shotManagement_shots')
      if (savedShots) {
        const shots = JSON.parse(savedShots)
        if (Array.isArray(shots) && shots.length > 0) {
          console.log('✅ 从 sessionStorage 读取最新的 shots 数据，更新 fusions，数量:', shots.length)
          updateFusionsFromShots(shots)
          return // 成功读取，不需要继续
        }
      }
      
      // 如果 shots 数据为空，但 fusions 也为空，尝试从 sessionStorage 读取 fusions
      if (fusions.length === 0) {
        const savedFusions = sessionStorage.getItem('imageFusion_fusions')
        if (savedFusions) {
          const parsed = JSON.parse(savedFusions)
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('✅ 从 sessionStorage 恢复 fusions 数据，数量:', parsed.length)
            setFusions(parsed.map(f => ({
              ...f,
              shotNumber: f.shotNumber || f.id,
              quantity: f.quantity || 1,
              model: f.model || 'wan2.2-i2v-flash',
              resolution: f.resolution || '720p',
              duration: f.duration || 5,
              generatingStatus: f.generatingStatus || 'idle',
              generatingProgress: f.generatingProgress || 0,
              generatingTaskIds: f.generatingTaskIds || [],
              videoUrls: f.videoUrls || [],
              selected: f.selected || false,
            })))
            return
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 读取数据失败:', error)
    }
  }, []) // 只在组件加载时执行一次
  
  // 当 fusions 或 allImageAssets 更新时，保存到 sessionStorage
  useEffect(() => {
    if (fusions.length > 0) {
      try {
        sessionStorage.setItem('imageFusion_fusions', JSON.stringify(fusions))
      } catch (error) {
        console.warn('⚠️ 保存 fusions 到 sessionStorage 失败:', error)
      }
    }
  }, [fusions])
  
  // 定期检查 sessionStorage 中的 shots 数据，当图片生成完成后自动更新 fusions
  useEffect(() => {
    // 检查是否有正在生成的分镜（使用占位符图片）
    const hasGeneratingFusions = fusions.some(f => f.image === '/placeholder-image.jpg')
    if (!hasGeneratingFusions) {
      return // 没有正在生成的分镜，不需要检查
    }
    
    const checkInterval = setInterval(() => {
      try {
        const savedShots = sessionStorage.getItem('shotManagement_shots')
        if (savedShots) {
          const shots = JSON.parse(savedShots)
          if (Array.isArray(shots) && shots.length > 0) {
            // 检查是否有新的图片生成完成
            let hasUpdate = false
            const updatedFusions = fusions.map(fusion => {
              // 如果当前 fusion 使用的是占位符图片，检查对应的 shot 是否已生成图片
              if (fusion.image === '/placeholder-image.jpg') {
                // 通过 shotNumber 或 id 匹配 shot
                const shot = shots.find((s: any) => 
                  s.id === fusion.id || 
                  s.shotNumber === fusion.shotNumber ||
                  s.id === (fusion as any).generatingShotId
                )
                
                if (shot) {
                  // 检查是否有新生成的图片
                  let newImage: string | null = null
                  
                  // 优先检查 thumbnailImages（Midjourney 多张图片）
                  if (shot.thumbnailImages && shot.thumbnailImages.length > 0) {
                    const firstImage = shot.thumbnailImages.find((img: string) => img && img !== '/placeholder-image.jpg')
                    if (firstImage) {
                      newImage = firstImage
                    }
                  } else if (shot.thumbnailImage && shot.thumbnailImage !== '/placeholder-image.jpg') {
                    // 检查单个 thumbnailImage
                    newImage = shot.thumbnailImage
                  }
                  
                  // 如果有新图片，更新 fusion（同时更新 videoPrompt）
                  if (newImage) {
                    // 同时检查是否有 videoPrompt
                    const videoPrompt = shot.videoPrompt || shot.prompt || fusion.videoPrompt
                    hasUpdate = true
                    console.log(`✅ 检测到分镜${shot.id || fusion.shotNumber}图片生成完成，更新融图管理页面`)
                    
                    // 更新图片和视频提示词
                    const updatedFusion = {
                      ...fusion,
                      image: newImage,
                      videoPrompt: videoPrompt,
                    }
                    // 移除生成标记
                    delete (updatedFusion as any).isGenerating
                    delete (updatedFusion as any).generatingShotId
                    
                    // 同时更新 allImageAssets
                    setAllImageAssets(prev => {
                      if (!prev.includes(newImage!)) {
                        return [...prev, newImage!]
                      }
                      return prev
                    })
                    
                    return updatedFusion
                  }
                }
              }
              return fusion
            })
            
            // 如果有更新，保存到 state
            if (hasUpdate) {
              console.log('✅ 更新 fusions，显示新生成的图片')
              setFusions(updatedFusions)
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ 检查 shots 数据失败:', error)
      }
    }, 2000) // 每2秒检查一次，更频繁地检查
    
    return () => clearInterval(checkInterval)
  }, [fusions, allImageAssets])
  
  useEffect(() => {
    if (allImageAssets.length > 0) {
      try {
        sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(allImageAssets))
      } catch (error) {
        console.warn('⚠️ 保存 allImageAssets 到 sessionStorage 失败:', error)
      }
    }
  }, [allImageAssets])

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
      // Veo3.1 模型不支持分辨率选择，只支持宽高比，但为了兼容性，返回空数组或默认值
      // 注意：Veo3.1 实际上不使用分辨率参数，而是使用宽高比
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
      // 根据代码，没有明确限制，默认返回 5 和 10 秒
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

  // 全局视频模型改变时，同步更新所有行，并自动调整分辨率和时长
  const handleGlobalModelChange = (newModel: string) => {
    setGlobalModel(newModel)
    
    // 获取新模型支持的分辨率
    const availableResolutions = getAvailableResolutions(newModel)
    // 如果当前分辨率不在新模型支持的分辨率列表中，自动切换到第一个可用分辨率
    let newResolution = globalResolution
    if (!availableResolutions.includes(globalResolution)) {
      newResolution = availableResolutions[0] || '720p'
      setGlobalResolution(newResolution)
    }
    
    // 获取新分辨率支持的时长
    const availableDurations = getAvailableDurations(newModel, newResolution)
    // 如果当前时长不在新分辨率支持的时长列表中，自动切换到最接近的可用时长
    let newDuration = globalDuration
    if (!availableDurations.includes(globalDuration)) {
      // 找到最接近的可用时长
      const closestDuration = availableDurations.reduce((prev, curr) => 
        Math.abs(curr - globalDuration) < Math.abs(prev - globalDuration) ? curr : prev
      )
      newDuration = closestDuration || availableDurations[0] || 5
      setGlobalDuration(newDuration)
    }
    
    setFusions(prevFusions => 
      prevFusions.map(fusion => ({
        ...fusion,
        model: newModel,
        resolution: newResolution,
        duration: newDuration,
      }))
    )
  }

  // 全局视频分辨率改变时，同步更新所有行，并自动调整时长
  const handleGlobalResolutionChange = (newResolution: string) => {
    setGlobalResolution(newResolution)
    
    // 获取当前模型和新分辨率支持的时长
    const availableDurations = getAvailableDurations(globalModel, newResolution)
    // 如果当前时长不在新分辨率支持的时长列表中，自动切换到最接近的可用时长
    let newDuration = globalDuration
    if (!availableDurations.includes(globalDuration)) {
      // 找到最接近的可用时长
      const closestDuration = availableDurations.reduce((prev, curr) => 
        Math.abs(curr - globalDuration) < Math.abs(prev - globalDuration) ? curr : prev
      )
      newDuration = closestDuration || availableDurations[0] || 5
      setGlobalDuration(newDuration)
    }
    
    setFusions(prevFusions => 
      prevFusions.map(fusion => ({
        ...fusion,
        resolution: newResolution,
        duration: newDuration,
      }))
    )
  }

  // 全局时长改变时，同步更新所有行
  const handleGlobalDurationChange = (newDuration: number) => {
    setGlobalDuration(newDuration)
    setFusions(prevFusions => 
      prevFusions.map(fusion => ({
        ...fusion,
        duration: newDuration,
      }))
    )
  }

  // 全局数量改变时，同步更新所有行
  const handleGlobalQuantityChange = (newQuantity: number) => {
    setGlobalQuantity(newQuantity)
    setFusions(prevFusions => 
      prevFusions.map(fusion => ({
        ...fusion,
        quantity: newQuantity,
      }))
    )
  }

  // 单行模型改变，自动调整分辨率和时长
  const handleRowModelChange = (id: number, newModel: string) => {
    setFusions(prevFusions =>
      prevFusions.map(fusion => {
        if (fusion.id === id) {
          // 获取新模型支持的分辨率
          const availableResolutions = getAvailableResolutions(newModel)
          // 如果当前分辨率不在新模型支持的分辨率列表中，自动切换到第一个可用分辨率
          let newResolution = fusion.resolution
          if (!availableResolutions.includes(fusion.resolution)) {
            newResolution = availableResolutions[0] || '720p'
          }
          
          // 获取新分辨率支持的时长
          const availableDurations = getAvailableDurations(newModel, newResolution)
          // 如果当前时长不在新分辨率支持的时长列表中，自动切换到最接近的可用时长
          let newDuration = fusion.duration
          if (!availableDurations.includes(fusion.duration)) {
            // 找到最接近的可用时长
            const closestDuration = availableDurations.reduce((prev, curr) => 
              Math.abs(curr - fusion.duration) < Math.abs(prev - fusion.duration) ? curr : prev
            )
            newDuration = closestDuration || availableDurations[0] || 5
          }
          
          return { ...fusion, model: newModel, resolution: newResolution, duration: newDuration }
        }
        return fusion
      })
    )
  }

  // 单行分辨率改变，自动调整时长
  const handleRowResolutionChange = (id: number, newResolution: string) => {
    setFusions(prevFusions =>
      prevFusions.map(fusion => {
        if (fusion.id === id) {
          // 获取当前模型和新分辨率支持的时长
          const availableDurations = getAvailableDurations(fusion.model, newResolution)
          // 如果当前时长不在新分辨率支持的时长列表中，自动切换到最接近的可用时长
          let newDuration = fusion.duration
          if (!availableDurations.includes(fusion.duration)) {
            // 找到最接近的可用时长
            const closestDuration = availableDurations.reduce((prev, curr) => 
              Math.abs(curr - fusion.duration) < Math.abs(prev - fusion.duration) ? curr : prev
            )
            newDuration = closestDuration || availableDurations[0] || 5
          }
          
          return { ...fusion, resolution: newResolution, duration: newDuration }
        }
        return fusion
      })
    )
  }

  // 单行时长改变
  const handleRowDurationChange = (id: number, newDuration: number) => {
    setFusions(prevFusions =>
      prevFusions.map(fusion =>
        fusion.id === id ? { ...fusion, duration: newDuration } : fusion
      )
    )
  }

  // 单行数量改变
  const handleRowQuantityChange = (id: number, newQuantity: number) => {
    setFusions(prevFusions =>
      prevFusions.map(fusion =>
        fusion.id === id ? { ...fusion, quantity: newQuantity } : fusion
      )
    )
  }

  const handlePreview = (id: number) => {
    // 预览图片逻辑 - 在页面内展示
    const fusionItem = fusions.find(f => f.id === id)
    if (fusionItem?.image && fusionItem.image !== '/placeholder-image.jpg') {
      setPreviewImage(fusionItem.image)
    } else {
      setSuccessModal({
        isOpen: true,
        message: '暂无图片可预览',
      })
    }
  }

  const handleClosePreview = () => {
    setPreviewImage(null)
  }

  const handleOperate = (id: number) => {
    // 打开右侧视频编辑抽屉
    const fusionItem = fusions.find(f => f.id === id)
    if (fusionItem) {
      setSelectedFusionForEditing(fusionItem)
      setIsVideoEditingDrawerOpen(true)
    }
  }

  // 处理fusion更新
  const handleFusionUpdate = (updatedFusion: FusionItem) => {
    setFusions(prev => prev.map(f => f.id === updatedFusion.id ? updatedFusion : f))
    // 如果当前正在编辑的是这个fusion，也更新
    if (selectedFusionForEditing?.id === updatedFusion.id) {
      setSelectedFusionForEditing(updatedFusion)
    }
  }

  // 处理所有fusions更新
  const handleFusionsUpdate = (updatedFusions: FusionItem[]) => {
    setFusions(updatedFusions)
  }

  // 开始生成所有视频
  const handleGenerateAllVideos = async () => {
    if (isGenerating) {
      console.log('⚠️ 正在生成中，跳过重复请求')
      return
    }

    const videosToGenerate = fusions.filter(f => f.image && f.image !== '/placeholder-image.jpg')
    if (videosToGenerate.length === 0) {
      setSuccessModal({
        isOpen: true,
        message: '没有可生成视频的图片',
      })
      return
    }

    // 如果没有选择视频提示词生成模型，先弹出选择弹窗
    if (!selectedVideoPromptModel) {
      setShowVideoPromptModelModal(true)
      return
    }

    // 继续生成视频
    await startVideoGeneration(videosToGenerate)
  }

  // 实际开始生成视频的函数
  const startVideoGeneration = async (videosToGenerate: FusionItem[]) => {
    console.log('🎬 开始生成视频，分镜数量:', videosToGenerate.length, '使用视频提示词模型:', selectedVideoPromptModel)

    setIsGenerating(true)
    setProgress(0)

    let hasError = false
    const errors: string[] = []
    
    // 用于跟踪所有更新的 fusions
    const updatedFusions = [...fusions]

    // 为每个分镜生成视频
    for (const fusion of videosToGenerate) {
      const fusionIndex = updatedFusions.findIndex(f => f.id === fusion.id)
      if (fusionIndex === -1) continue

      console.log(`📹 处理分镜 ${fusion.shotNumber}，数量: ${fusion.quantity}`)

      // 更新状态为生成中
      updatedFusions[fusionIndex] = {
        ...updatedFusions[fusionIndex],
        generatingStatus: 'generating',
        generatingProgress: 0,
        generatingTaskIds: [],
      }

      // 获取 RAG 相关参数（用于自动生成视频运动提示词）
      let scriptId: string | null = null
      let scriptContext: string | null = null
      let shotNumber: string | number | null = null
      
      try {
        // 从 sessionStorage 获取 scriptId
        const savedScriptId = sessionStorage.getItem('current_scriptId')
        if (savedScriptId) {
          scriptId = savedScriptId
          console.log(`  📚 找到 RAG 库 scriptId: ${scriptId}`)
        }
        
        // 从 shots 数据中获取当前分镜的剧本上下文
        try {
          const savedShots = sessionStorage.getItem('shotManagement_shots')
          if (savedShots) {
            const shots = JSON.parse(savedShots)
            const currentShot = shots.find((s: any) => s.shotNumber === fusion.shotNumber)
            if (currentShot && currentShot.segment) {
              scriptContext = currentShot.segment
              shotNumber = currentShot.shotNumber
              console.log(`  📝 找到分镜 ${shotNumber} 的剧本上下文`)
            }
          }
        } catch (error) {
          console.warn('  ⚠️ 获取分镜上下文失败:', error)
        }
      } catch (error) {
        console.warn('  ⚠️ 获取 RAG 参数失败:', error)
      }

      // 根据数量生成多个视频
      const taskIds: string[] = []
      for (let i = 0; i < fusion.quantity; i++) {
        try {
          console.log(`  → 提交第 ${i + 1} 个视频任务...`)
          
          // 如果视频提示词为空或需要重新生成，使用选择的模型生成
          let finalVideoPrompt = fusion.videoPrompt
          if ((!finalVideoPrompt || finalVideoPrompt.trim() === '') && selectedVideoPromptModel && scriptContext && fusion.image) {
            try {
              console.log(`  🤖 使用 ${selectedVideoPromptModel} 生成视频提示词...`)
              
              // 获取作品风格和背景（从 sessionStorage）
              let workStyle = '真人电影风格'
              let workBackground = '现代'
              try {
                const savedWorkStyle = sessionStorage.getItem('scriptInput_workStyle')
                const savedWorkBackground = sessionStorage.getItem('scriptInput_workBackground')
                if (savedWorkStyle) workStyle = savedWorkStyle
                if (savedWorkBackground) workBackground = savedWorkBackground
              } catch (e) {
                console.warn('  ⚠️ 获取作品风格/背景失败:', e)
              }
              
              const motionResult = await generateVideoMotionPrompt({
                imageUrl: fusion.image,
                scriptContext: scriptContext,
                shotNumber: shotNumber || fusion.shotNumber,
                scriptId: scriptId || undefined,
                model: selectedVideoPromptModel,
                workStyle,
                workBackground,
              })
              
              finalVideoPrompt = motionResult.motionPrompt
              console.log(`  ✅ 视频提示词生成完成: ${finalVideoPrompt}`)
              
              // 更新 fusion 的 videoPrompt
              updatedFusions[fusionIndex] = {
                ...updatedFusions[fusionIndex],
                videoPrompt: finalVideoPrompt,
              }
            } catch (error) {
              console.warn(`  ⚠️ 生成视频提示词失败，使用默认提示词:`, error)
              finalVideoPrompt = fusion.videoPrompt || '镜头缓慢推进'
            }
          }
          
          // 构建请求参数
          const videoRequest: any = {
            imageUrl: fusion.image,
            model: fusion.model,
            resolution: fusion.resolution,
            duration: fusion.duration,
            text: finalVideoPrompt, // 使用生成的或原有的视频提示词
          }
          
          const result = await generateVideoFromImage(videoRequest)

          console.log(`  ✅ 任务已提交，taskId: ${result.taskId}`)
          taskIds.push(result.taskId)
          
          // 开始轮询任务状态（在后台进行，不阻塞）
          pollVideoTaskStatus(fusion.id, result.taskId, i)
        } catch (error) {
          console.error(`  ❌ 分镜${fusion.shotNumber}第${i + 1}个视频生成失败:`, error)
          const errorMessage = error instanceof Error ? error.message : '视频生成失败，请稍后重试'
          errors.push(`分镜${fusion.shotNumber}第${i + 1}个视频：${errorMessage}`)
          hasError = true
          
          updatedFusions[fusionIndex] = {
            ...updatedFusions[fusionIndex],
            generatingStatus: 'failed',
            generatingProgress: 0,
          }
        }
      }

      // 保存任务ID
      updatedFusions[fusionIndex] = {
        ...updatedFusions[fusionIndex],
        generatingTaskIds: taskIds,
      }
    }

    console.log('📊 所有任务提交完成，准备跳转...')
    console.log('  - 成功任务数:', updatedFusions.filter(f => f.generatingTaskIds && f.generatingTaskIds.length > 0).length)
    console.log('  - 失败任务数:', updatedFusions.filter(f => f.generatingStatus === 'failed').length)

    // 更新所有状态
    setFusions(updatedFusions)

    // 立即跳转到视频编辑页面，不等待视频生成完成
    // 保存当前状态到 sessionStorage，以便视频编辑页面可以访问
    try {
      sessionStorage.setItem('imageFusion_fusions', JSON.stringify(updatedFusions))
      sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(allImageAssets))
      console.log('✅ 数据已保存到 sessionStorage')
    } catch (error) {
      console.warn('⚠️ 保存数据到 sessionStorage 失败:', error)
    }

    // 如果有错误，显示错误提示（但不阻止跳转）
    if (hasError) {
      // 延迟显示错误提示，确保跳转先执行
      setTimeout(() => {
        setErrorModal({
          isOpen: true,
          title: '部分视频生成任务提交失败',
          message: `以下视频生成任务提交失败：\n\n${errors.join('\n')}\n\n请检查：\n1. COS配置是否正确\n2. 图片URL是否可访问\n3. API密钥是否有效\n\n其他任务已提交，可以在视频编辑页面查看进度。`,
        })
      }, 100)
    }

    // 立即跳转到视频编辑页面（无论是否有错误都跳转）
    console.log('🚀 执行跳转到视频编辑页面...')
    console.log('📊 跳转数据:', {
      fusionsCount: updatedFusions.length,
      allImageAssetsCount: allImageAssets.length,
      hasError,
    })
    
    try {
      navigate('/video-editing', {
        state: {
          fusions: updatedFusions,
          allImageAssets: allImageAssets,
        },
        replace: false, // 允许返回
      })
      console.log('✅ navigate 调用成功')
    } catch (navError) {
      console.error('❌ navigate 调用失败:', navError)
      // 如果 navigate 失败，使用 window.location 作为备选
      console.log('🔄 尝试使用 window.location 跳转...')
      window.location.href = '/video-editing'
    }
  }

  // 轮询视频生成任务状态
  const pollVideoTaskStatus = async (fusionId: number, taskId: string, videoIndex: number) => {
    const maxAttempts = 120
    let attempts = 0
    
    // 获取当前分镜的模型（在闭包外获取，避免状态更新导致的问题）
    const currentFusion = fusions.find(f => f.id === fusionId)
    const model = (currentFusion?.model || 'wan2.2-i2v-flash') as 'wan2.2-i2v-flash' | 'wan2.5-i2v-preview' | 'wan2.6-i2v' | 'doubao-seedance-1-0-lite-i2v-250428' | 'doubao-seedance-1-5-pro-251215' | 'viduq2-turbo' | 'viduq2-pro' | 'viduq1' | 'vidu2.0' | 'vidu1.5' | 'vidu1.0' | 'veo3.1' | 'veo3.1-pro'

    const poll = async () => {
      try {
        attempts++
        // 获取项目名称和shotId
        const projectName = sessionStorage.getItem('scriptInput_scriptTitle') || ''
        const status = await getVideoTaskStatus(taskId, model, projectName, fusionId)

        // 更新进度
        setFusions(prev => prev.map(f => {
          if (f.id === fusionId) {
            const videoUrls = f.videoUrls || []
            if (status.status === 'completed' && status.videoUrl) {
              videoUrls[videoIndex] = status.videoUrl
              return {
                ...f,
                generatingProgress: 100,
                videoUrls: videoUrls,
                generatingStatus: videoUrls.length === f.quantity ? 'completed' : 'generating',
              }
            } else if (status.status === 'failed') {
              // 生成失败，停止轮询并显示错误
              setIsGenerating(false)
              setProgress(0)
              setErrorModal({
                isOpen: true,
                title: '视频生成失败',
                message: `分镜${fusionId}第${videoIndex + 1}个视频生成失败。\n\n请检查后端日志获取详细错误信息。`,
              })
              return { ...f, generatingStatus: 'failed', generatingProgress: 0 }
            } else {
              return {
                ...f,
                generatingProgress: status.progress || 0,
              }
            }
          }
          return f
        }))

        // 更新总体进度
        setFusions(prev => {
          const completed = prev.filter(f => f.generatingStatus === 'completed').length
          const total = prev.filter(f => f.image && f.image !== '/placeholder-image.jpg').length
          setProgress(Math.floor((completed / total) * 100))
          return prev
        })

        if (status.status === 'completed' || status.status === 'failed' || attempts >= maxAttempts) {
          if (status.status === 'completed') {
            // 检查是否所有视频都完成
            setFusions(prev => {
              const currentFusion = prev.find(f => f.id === fusionId)
              if (currentFusion) {
                const completedVideos = (currentFusion.videoUrls || []).filter(url => !!url).length
                if (completedVideos === currentFusion.quantity) {
                  setIsGenerating(false)
                }
              }
              return prev
            })
          } else if (status.status === 'failed') {
            setIsGenerating(false)
            setProgress(0)
            setErrorModal({
              isOpen: true,
              title: '视频生成失败',
              message: `分镜${fusionId}第${videoIndex + 1}个视频生成失败。\n\n请检查后端日志获取详细错误信息。`,
            })
          } else if (attempts >= maxAttempts) {
            setIsGenerating(false)
            setProgress(0)
            setErrorModal({
              isOpen: true,
              title: '视频生成超时',
              message: `分镜${fusionId}第${videoIndex + 1}个视频生成超时（已轮询${maxAttempts}次）。\n\n请稍后重试。`,
            })
          }
          return
        }

        setTimeout(poll, 3000)
      } catch (error) {
        console.error('轮询视频任务状态失败:', error)
        
        // 如果是网络错误或API错误，停止轮询并显示错误
        if (attempts >= 10) { // 连续失败10次后停止
          setIsGenerating(false)
          setProgress(0)
          const errorMessage = error instanceof Error ? error.message : '未知错误'
          setErrorModal({
            isOpen: true,
            title: '视频生成失败',
            message: `分镜${fusionId}第${videoIndex + 1}个视频轮询失败：\n${errorMessage}\n\n请检查后端服务器是否正常运行。`,
          })
          return
        }
        
        setTimeout(poll, 5000)
      }
    }

    setTimeout(poll, 3000)
  }

  // 导出全部选定图片
  const handleExportAllImages = async () => {
    try {
      // 只导出选定的图片（selected为true）
      const imagesToExport = fusions.filter(
        fusion => fusion.selected && fusion.image && fusion.image !== '/placeholder-image.jpg'
      )
      
      if (imagesToExport.length === 0) {
        setErrorModal({
          isOpen: true,
          title: '导出失败',
          message: '没有可导出的图片，请先选择要导出的图片',
        })
        return
      }

      // 获取剧本名
      const scriptName = sessionStorage.getItem('scriptInput_scriptTitle') || '未命名剧本'
      
      // 收集图片URL
      const imageUrls = imagesToExport.map(fusion => fusion.image)
      
      // 导入提示函数
      const { alertInfo } = await import('../utils/alert')
      
      alertInfo(`正在导出 ${imageUrls.length} 张图片到桌面...`)

      // 调用API导出图片
      const result = await exportImagesToDesktop(imageUrls, scriptName)

      if (result.success) {
        const message = result.errors && result.errors.length > 0
          ? `成功导出 ${result.downloadedFiles?.length || 0} 张图片到桌面文件夹"${result.folderName}"\n\n失败: ${result.errors.length} 张`
          : `成功导出 ${result.downloadedFiles?.length || 0} 张图片到桌面文件夹"${result.folderName}"`
        
        setSuccessModal({
          isOpen: true,
          message: message,
        })
        console.log('✅ 图片导出成功:', result)
      } else {
        throw new Error(result.error || '导出失败')
      }
    } catch (error) {
      console.error('❌ 导出图片失败:', error)
      setErrorModal({
        isOpen: true,
        title: '导出失败',
        message: error instanceof Error ? error.message : '导出图片失败，请稍后重试',
      })
    }
  }

  return (
    <div className="h-screen bg-white text-gray-900 overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 导航栏 */}
        <div className="flex items-center gap-4 px-4 py-2 flex-shrink-0">
          <button
            onClick={() => {
              // 返回时保存当前状态到 sessionStorage，以便再次进入时恢复
              try {
                sessionStorage.setItem('imageFusion_fusions', JSON.stringify(fusions))
                sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(allImageAssets))
                console.log('✅ 返回时已保存数据到 sessionStorage')
              } catch (error) {
                console.warn('⚠️ 保存数据到 sessionStorage 失败:', error)
              }
              
              // 跳转回分镜管理页面，传递所有必要的数据
              // 尝试从 sessionStorage 恢复 shots 数据
              let shotsData = null
              try {
                const savedShots = sessionStorage.getItem('shotManagement_shots')
                if (savedShots) {
                  shotsData = JSON.parse(savedShots)
                }
              } catch (error) {
                console.warn('⚠️ 从 sessionStorage 恢复 shots 失败:', error)
              }
              
              // 尝试从 sessionStorage 恢复 segments 数据
              let segmentsData = null
              try {
                const savedSegments = sessionStorage.getItem('shotManagement_segments')
                if (savedSegments) {
                  segmentsData = JSON.parse(savedSegments)
                }
              } catch (error) {
                console.warn('⚠️ 从 sessionStorage 恢复 segments 失败:', error)
              }
              
              navigate('/shot-management', {
                state: {
                  segments: segmentsData || state?.segments || undefined,
                  shots: shotsData || state?.shots || undefined, // 传递 shots 数据，包含缩略图
                  scriptTitle: state?.scriptTitle,
                  workStyle: state?.workStyle,
                  maxShots: state?.maxShots,
                },
              })
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <button
              onClick={() => {
                // 保存当前数据
                try {
                  sessionStorage.setItem('imageFusion_fusions', JSON.stringify(fusions))
                  sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(allImageAssets))
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
                } catch (error) {
                  console.warn('⚠️ 保存数据失败:', error)
                }
                navigate('/shot-management', {
                  state: { segments: state?.segments }
                })
              }}
              className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">3</span>
              <span>分镜管理</span>
            </button>
            <span className="text-gray-600">→</span>
            <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-pink-500 flex items-center justify-center text-xs font-bold">4</span>
              <span className="border-b-2 border-pink-500">融图管理</span>
            </div>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem('imageFusion_fusions', JSON.stringify(fusions))
                  sessionStorage.setItem('imageFusion_allImageAssets', JSON.stringify(allImageAssets))
                } catch (error) {
                  console.warn('⚠️ 保存数据失败:', error)
                }
                navigate('/video-editing', {
                  state: {
                    fusions: fusions,
                    allImageAssets: allImageAssets,
                  }
                })
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
          <div className="max-w-7xl mx-auto">
            {/* 全局设置 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <div className="flex items-center gap-6">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">模型</label>
              <select
                value={globalModel}
                onChange={(e) => handleGlobalModelChange(e.target.value)}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="wan2.2-i2v-flash">wan2.2-i2v-flash</option>
                <option value="wan2.5-i2v-preview">wan2.5-i2v-preview</option>
                <option value="wan2.6-i2v">wan2.6-i2v</option>
                <option value="doubao-seedance-1-0-lite-i2v-250428">即梦AI-视频生成3.0pro</option>
                <option value="doubao-seedance-1-5-pro-251215">即梦AI-视频生成3.5pro</option>
                <option value="viduq2-turbo">ViduQ2-Turbo</option>
                <option value="veo3.1">Google Veo3.1</option>
                <option value="veo3.1-pro">Google Veo3.1-Pro</option>
                <option value="minimax-hailuo-02">MiniMax Hailuo-02</option>
                <option value="minimax-hailuo-2.3">MiniMax Hailuo-2.3</option>
                <option value="minimax-hailuo-2.3-fast">MiniMax Hailuo-2.3-fast</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">分辨率</label>
              <select
                value={globalResolution}
                onChange={(e) => handleGlobalResolutionChange(e.target.value)}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
              >
                {getAvailableResolutions(globalModel).map(res => (
                  <option key={res} value={res}>{res}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">时长</label>
              <select
                value={globalDuration}
                onChange={(e) => handleGlobalDurationChange(parseInt(e.target.value))}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
              >
                {getAvailableDurations(globalModel, globalResolution).map(dur => (
                  <option key={dur} value={dur}>{dur}s</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">数量</label>
              <select
                value={globalQuantity}
                onChange={(e) => handleGlobalQuantityChange(parseInt(e.target.value))}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-1 block">进度</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-green-600 text-sm">{progress}%</span>
              </div>
            </div>
          </div>
        </div>

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
                <th className="px-4 py-3 text-left text-sm font-semibold">视频提示词</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">模型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">分辨率</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">时长(秒)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">数量</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {fusions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <span>暂无数据</span>
                      <span className="text-xs text-gray-400">请先在第三步"分镜管理"中生成分镜图片</span>
                    </div>
                  </td>
                </tr>
              ) : (
                fusions.map((fusion, index) => (
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
                  <td className="px-4 py-4">
                    <div 
                      className="relative bg-white rounded border border-gray-300 group cursor-pointer overflow-hidden"
                      style={{ 
                        aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1',
                        width: '96px' // 保持 w-24 的宽度
                      }}
                    >
                      {fusion.image && fusion.image !== '/placeholder-image.jpg' ? (
                        <>
                          <img 
                            src={fusion.image} 
                            alt={`分镜${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => handlePreview(fusion.id)}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 transition-opacity"
                          >
                            <Eye className="text-white" size={20} />
                          </button>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">暂无图片</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-700 line-clamp-2 max-w-md">
                      {fusion.videoPrompt}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={fusion.model}
                      onChange={(e) => handleRowModelChange(fusion.id, e.target.value)}
                      className="px-2 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="wan2.2-i2v-flash">wan2.2-i2v-flash</option>
                      <option value="wan2.5-i2v-preview">wan2.5-i2v-preview</option>
                      <option value="wan2.6-i2v">wan2.6-i2v</option>
                      <option value="doubao-seedance-1-0-lite-i2v-250428">即梦AI-视频生成3.0pro</option>
                      <option value="doubao-seedance-1-5-pro-251215">即梦AI-视频生成3.5pro</option>
                      <option value="viduq2-turbo">ViduQ2-Turbo</option>
                      <option value="veo3.1">Google Veo3.1</option>
                      <option value="veo3.1-pro">Google Veo3.1-Pro</option>
                      <option value="minimax-hailuo-02">MiniMax Hailuo-02</option>
                      <option value="minimax-hailuo-2.3">MiniMax Hailuo-2.3</option>
                      <option value="minimax-hailuo-2.3-fast">MiniMax Hailuo-2.3-fast</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={fusion.resolution}
                      onChange={(e) => handleRowResolutionChange(fusion.id, e.target.value)}
                      className="px-2 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getAvailableResolutions(fusion.model).map(res => (
                        <option key={res} value={res}>{res}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={fusion.duration}
                      onChange={(e) => handleRowDurationChange(fusion.id, parseInt(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getAvailableDurations(fusion.model, fusion.resolution).map(dur => (
                        <option key={dur} value={dur}>{dur}s</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={fusion.quantity}
                      onChange={(e) => handleRowQuantityChange(fusion.id, parseInt(e.target.value))}
                      className="px-2 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOperate(fusion.id)}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                      >
                        操作
                      </button>
                      <button className="text-gray-600 hover:text-red-500">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between items-center mt-6">
          <button 
            onClick={handleExportAllImages}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Download size={18} />
            导出全部选定图片
          </button>
              <button
                onClick={handleGenerateAllVideos}
                disabled={isGenerating}
                className={`px-6 py-2 text-white rounded-lg transition-all flex items-center gap-2 ${
                  isGenerating
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isGenerating && <Loader2 className="animate-spin" size={18} />}
                {isGenerating ? `生成中... (${progress}%)` : '开始生成视频'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ImageSelectionModal
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false)
          setSelectedRow(null)
        }}
        rowId={selectedRow || 0}
      />

      {/* 视频提示词生成模型选择弹窗 */}
      <VideoPromptModelSelectionModal
        isOpen={showVideoPromptModelModal}
        onClose={() => setShowVideoPromptModelModal(false)}
        onSelect={(model) => {
          setSelectedVideoPromptModel(model as any)
          setShowVideoPromptModelModal(false)
          // 选择模型后，立即开始生成视频
          const videosToGenerate = fusions.filter(f => f.image && f.image !== '/placeholder-image.jpg')
          if (videosToGenerate.length > 0) {
            startVideoGeneration(videosToGenerate)
          }
        }}
      />

      {/* 图片预览模态框 */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={handleClosePreview}
        >
          <div 
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleClosePreview}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-all shadow-lg"
            >
              <X size={24} className="text-gray-800" />
            </button>
            
            {/* 图片 */}
            <img 
              src={previewImage} 
              alt="预览图片"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const errorDiv = document.createElement('div')
                errorDiv.className = 'text-white text-center p-8'
                errorDiv.textContent = '图片加载失败，请检查图片URL是否正确'
                target.parentElement?.appendChild(errorDiv)
              }}
            />
          </div>
        </div>
      )}

      {/* 错误提示模态框 */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-red-600">{errorModal.title}</h3>
            <p className="text-gray-700 mb-6 whitespace-pre-line">{errorModal.message}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setErrorModal({ isOpen: false, title: '', message: '' })}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成功提示模态框 */}
      {successModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-green-600">提示</h3>
            <p className="text-gray-700 mb-6">{successModal.message}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setSuccessModal({ isOpen: false, message: '' })}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 视频编辑抽屉 */}
      <VideoEditingDrawer
        isOpen={isVideoEditingDrawerOpen}
        onClose={() => {
          setIsVideoEditingDrawerOpen(false)
          setSelectedFusionForEditing(null)
        }}
        fusion={selectedFusionForEditing}
        allFusions={fusions}
        allImageAssets={allImageAssets}
        onFusionUpdate={handleFusionUpdate}
        onFusionsUpdate={handleFusionsUpdate}
      />
    </div>
  )
}

export default ImageFusion
