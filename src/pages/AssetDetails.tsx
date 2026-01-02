import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, Plus, Trash2, Upload, Eye } from 'lucide-react'
import type { ScriptAnalysisResult, ScriptSegment } from '../services/api'
import { updateTask, uploadCharacterImage, uploadSceneImage, uploadItemImage } from '../services/api'
import CreateCharacterModal from '../components/CreateCharacterModal'
import CreateSceneModal from '../components/CreateSceneModal'
import CreateItemModal from '../components/CreateItemModal'
import { alertError, alertInfo } from '../utils/alert'

interface Asset {
  id: string
  name: string
  type: 'character' | 'scene' | 'item'
  selectionMethod: string
  imageUrl?: string // 上传的图片URL
}

interface LocationState {
  analysisResult?: ScriptAnalysisResult
  segments?: ScriptSegment[]
  scriptTitle?: string
  workStyle?: string
  workBackground?: string
  scriptContent?: string
}

function AssetDetails() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  // 从 sessionStorage 或 location.state 恢复数据
  const [characters, setCharacters] = useState<Asset[]>(() => {
    // 优先使用 location.state
    if (state?.analysisResult?.characters && state.analysisResult.characters.length > 0) {
      const assets = state.analysisResult.characters.map((char, index) => ({
        id: `char-${index}`,
        name: char.name,
        type: 'character' as const,
        selectionMethod: '通过本地上传',
      }))
      // 保存到 sessionStorage
      try {
        sessionStorage.setItem('assetDetails_characters', JSON.stringify(assets))
      } catch (error) {
        console.warn('⚠️ 保存 characters 到 sessionStorage 失败:', error)
      }
      return assets
    }
    
    // 尝试从 sessionStorage 恢复
    try {
      const saved = sessionStorage.getItem('assetDetails_characters')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('✅ 从 sessionStorage 恢复 characters 数据')
          return parsed
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 characters 失败:', error)
    }
    
    // 默认数据
    return [
      { id: '1', name: '傅北川', type: 'character', selectionMethod: '通过本地上传' },
      { id: '2', name: '苏绵绵', type: 'character', selectionMethod: '通过本地上传' },
    ]
  })

  const [scenes, setScenes] = useState<Asset[]>(() => {
    // 优先使用 location.state
    if (state?.analysisResult?.scenes && state.analysisResult.scenes.length > 0) {
      const assets = state.analysisResult.scenes.map((scene, index) => ({
        id: `scene-${index}`,
        name: scene.name,
        type: 'scene' as const,
        selectionMethod: '通过本地上传',
      }))
      // 保存到 sessionStorage
      try {
        sessionStorage.setItem('assetDetails_scenes', JSON.stringify(assets))
      } catch (error) {
        console.warn('⚠️ 保存 scenes 到 sessionStorage 失败:', error)
      }
      return assets
    }
    
    // 尝试从 sessionStorage 恢复
    try {
      const saved = sessionStorage.getItem('assetDetails_scenes')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('✅ 从 sessionStorage 恢复 scenes 数据')
          return parsed
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 scenes 失败:', error)
    }
    
    // 默认数据
    return [
      { id: '1', name: '外景-公司等候区', type: 'scene', selectionMethod: '通过本地上传' },
    ]
  })

  const [showCharacterSelector, setShowCharacterSelector] = useState(false)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [showSceneSelector, setShowSceneSelector] = useState(false)
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [showItemSelector, setShowItemSelector] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  
  // 批量上传文件输入引用
  const characterBatchUploadRef = useRef<HTMLInputElement>(null)
  const sceneBatchUploadRef = useRef<HTMLInputElement>(null)
  const itemBatchUploadRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<Asset[]>(() => {
    // 优先使用 location.state
    if (state?.analysisResult?.items && state.analysisResult.items.length > 0) {
      const assets = state.analysisResult.items.map((item, index) => ({
        id: `item-${index}`,
        name: item.name,
        type: 'item' as const,
        selectionMethod: '通过本地上传',
      }))
      // 保存到 sessionStorage
      try {
        sessionStorage.setItem('assetDetails_items', JSON.stringify(assets))
      } catch (error) {
        console.warn('⚠️ 保存 items 到 sessionStorage 失败:', error)
      }
      return assets
    }
    
    // 尝试从 sessionStorage 恢复
    try {
      const saved = sessionStorage.getItem('assetDetails_items')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('✅ 从 sessionStorage 恢复 items 数据')
          return parsed
        }
      }
    } catch (error) {
      console.warn('⚠️ 从 sessionStorage 恢复 items 失败:', error)
    }
    
    // 默认数据
    return [
      { id: '1', name: '咖啡', type: 'item', selectionMethod: '通过本地上传' },
    ]
  })
  
  // 当数据变化时，保存到 sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('assetDetails_characters', JSON.stringify(characters))
      sessionStorage.setItem('assetDetails_scenes', JSON.stringify(scenes))
      sessionStorage.setItem('assetDetails_items', JSON.stringify(items))
    } catch (error) {
      console.warn('⚠️ 保存资产数据到 sessionStorage 失败:', error)
    }
  }, [characters, scenes, items])

  // 检测后端服务状态
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'
        
        // 使用 AbortController 实现超时
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3秒超时
        
        const response = await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          setBackendStatus('online')
        } else {
          setBackendStatus('offline')
        }
      } catch (error) {
        console.warn('后端服务未运行:', error)
        setBackendStatus('offline')
      }
    }
    
    checkBackendHealth()
  }, [])

  // 如果从上一页没有传递数据，使用默认数据继续流程
  useEffect(() => {
    if (!state) {
      console.warn('未检测到分析结果，使用默认数据继续流程')
    }
  }, [state])

  const addAsset = (type: 'character' | 'scene' | 'item') => {
    const newAsset: Asset = {
      id: Date.now().toString(),
      name: '',
      type,
      selectionMethod: '通过本地上传',
    }
    if (type === 'character') {
      setCharacters([...characters, newAsset])
    } else if (type === 'scene') {
      setScenes([...scenes, newAsset])
    } else {
      setItems([...items, newAsset])
    }
  }

  const removeAsset = (type: 'character' | 'scene' | 'item', id: string) => {
    if (type === 'character') {
      setCharacters(characters.filter((c) => c.id !== id))
    } else if (type === 'scene') {
      setScenes(scenes.filter((s) => s.id !== id))
    } else {
      setItems(items.filter((i) => i.id !== id))
    }
  }

  const updateAssetName = (type: 'character' | 'scene' | 'item', id: string, name: string) => {
    if (type === 'character') {
      setCharacters(characters.map((c) => (c.id === id ? { ...c, name } : c)))
    } else if (type === 'scene') {
      setScenes(scenes.map((s) => (s.id === id ? { ...s, name } : s)))
    } else {
      setItems(items.map((i) => (i.id === id ? { ...i, name } : i)))
    }
  }

  const updateSelectionMethod = (type: 'character' | 'scene' | 'item', id: string, method: string) => {
    if (type === 'character') {
      setCharacters(characters.map((c) => (c.id === id ? { ...c, selectionMethod: method } : c)))
    } else if (type === 'scene') {
      setScenes(scenes.map((s) => (s.id === id ? { ...s, selectionMethod: method } : s)))
    } else {
      setItems(items.map((i) => (i.id === id ? { ...i, selectionMethod: method } : i)))
    }
  }

  const handleImageUpload = async (type: 'character' | 'scene' | 'item', id: string, file: File) => {
    // 创建本地预览URL（立即显示）
    const imageUrl = URL.createObjectURL(file)
    
    // 从文件名提取资产名称（去掉扩展名）
    const assetName = extractAssetNameFromFileName(file.name)
    
    // 获取项目名称
    const projectName = state?.scriptTitle || sessionStorage.getItem('scriptInput_scriptTitle') || null
    
    // 立即更新UI显示预览
    if (type === 'character') {
      setCharacters(characters.map((c) => {
        if (c.id === id) {
          const updatedChar = { ...c, imageUrl }
          if (assetName && (!c.name || c.name.trim() === '')) {
            updatedChar.name = assetName
          }
          return updatedChar
        }
        return c
      }))
    } else if (type === 'scene') {
      setScenes(scenes.map((s) => {
        if (s.id === id) {
          const updatedScene = { ...s, imageUrl }
          if (assetName && (!s.name || s.name.trim() === '')) {
            updatedScene.name = assetName
          }
          return updatedScene
        }
        return s
      }))
    } else {
      setItems(items.map((i) => {
        if (i.id === id) {
          const updatedItem = { ...i, imageUrl }
          if (assetName && (!i.name || i.name.trim() === '')) {
            updatedItem.name = assetName
          }
          return updatedItem
        }
        return i
      }))
    }
    
    // 异步上传到服务器并保存到项目文件夹
    try {
      const assetNameToUse = assetName || (type === 'character' ? characters.find(c => c.id === id)?.name : 
                                           type === 'scene' ? scenes.find(s => s.id === id)?.name : 
                                           items.find(i => i.id === id)?.name) || `${type}_${Date.now()}`
      
      if (type === 'character') {
        const result = await uploadCharacterImage({
          image: file,
          characterId: id,
          characterName: assetNameToUse,
          projectName: projectName,
        })
        // 更新为COS URL
        setCharacters(characters.map((c) => 
          c.id === id ? { ...c, imageUrl: result.url } : c
        ))
        // 释放本地URL
        URL.revokeObjectURL(imageUrl)
        console.log(`✅ 角色图片已上传并保存到项目文件夹: ${projectName}`, result)
        
        // 不显示提示框，静默保存
        // 触发storage事件，通知其他页面刷新
        try {
          localStorage.setItem('character_uploaded', Date.now().toString())
          setTimeout(() => {
            localStorage.removeItem('character_uploaded')
          }, 100)
        } catch (e) {
          console.warn('无法触发storage事件:', e)
        }
        
        // 触发自定义事件（同页面内通信）
        window.dispatchEvent(new Event('character-uploaded'))
      } else if (type === 'scene') {
        const result = await uploadSceneImage({
          image: file,
          sceneId: id,
          sceneName: assetNameToUse,
          projectName: projectName,
        })
        // 更新为COS URL
        setScenes(scenes.map((s) => 
          s.id === id ? { ...s, imageUrl: result.url } : s
        ))
        // 释放本地URL
        URL.revokeObjectURL(imageUrl)
        console.log(`✅ 场景图片已上传并保存到项目文件夹: ${projectName}`)
        
        // 不显示提示框，静默保存
        // 触发刷新事件
        window.dispatchEvent(new Event('scene-uploaded'))
      } else {
        const result = await uploadItemImage({
          image: file,
          itemId: id,
          itemName: assetNameToUse,
          projectName: projectName,
        })
        // 更新为COS URL
        setItems(items.map((i) => 
          i.id === id ? { ...i, imageUrl: result.url } : i
        ))
        // 释放本地URL
        URL.revokeObjectURL(imageUrl)
        console.log(`✅ 物品图片已上传并保存到项目文件夹: ${projectName}`)
        
        // 不显示提示框，静默保存
        // 触发刷新事件
        window.dispatchEvent(new Event('item-uploaded'))
      }
    } catch (error) {
      console.error('上传图片失败:', error)
      alertError(error instanceof Error ? error.message : '上传失败，请稍后重试', '上传失败')
      // 上传失败时保持本地预览URL
    }
  }

  // 从文件名提取资产名称（去掉扩展名）
  const extractAssetNameFromFileName = (fileName: string): string | null => {
    // 支持的图片扩展名
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
    
    // 转换为小写以便比较
    const lowerFileName = fileName.toLowerCase()
    
    // 检查是否有有效的图片扩展名
    let hasValidExtension = false
    let extension = ''
    for (const ext of imageExtensions) {
      if (lowerFileName.endsWith(ext)) {
        hasValidExtension = true
        extension = ext
        break
      }
    }
    
    if (!hasValidExtension) {
      return null
    }
    
    // 提取文件名（去掉扩展名）
    const nameWithoutExt = fileName.substring(0, fileName.length - extension.length)
    
    // 检查文件名是否标准（不为空，且不包含路径分隔符）
    if (nameWithoutExt && !nameWithoutExt.includes('/') && !nameWithoutExt.includes('\\')) {
      return nameWithoutExt.trim()
    }
    
    return null
  }

  // 批量上传处理函数
  const handleBatchUpload = async (type: 'character' | 'scene' | 'item', files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const fileArray = Array.from(files)
    
    // 获取项目名称
    const projectName = state?.scriptTitle || sessionStorage.getItem('scriptInput_scriptTitle') || null
    
    // 收集所有需要添加的新资产（包含文件引用）
    const newAssets: Array<Asset & { file: File }> = []
    const assetsToUpdate: { id: string; imageUrl: string; file: File; assetName: string }[] = []
    
    // 获取当前资产列表和空资产列表
    let currentAssets: Asset[] = []
    let emptyAssets: Asset[] = []
    
    if (type === 'character') {
      currentAssets = characters
      emptyAssets = characters.filter(c => !c.name || !c.imageUrl)
    } else if (type === 'scene') {
      currentAssets = scenes
      emptyAssets = scenes.filter(s => !s.name || !s.imageUrl)
    } else {
      currentAssets = items
      emptyAssets = items.filter(i => !i.name || !i.imageUrl)
    }
    
    // 处理每个文件
    fileArray.forEach((file, index) => {
      // 从文件名提取资产名称
      const assetName = extractAssetNameFromFileName(file.name)
      
      if (assetName) {
        // 文件名格式标准，自动创建新的资产项
        const newAsset: Asset & { file: File } = {
          id: `${type}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          name: assetName,
          type,
          selectionMethod: '通过本地上传',
          imageUrl: URL.createObjectURL(file),
          file: file,
        }
        newAssets.push(newAsset)
      } else {
        // 文件名格式不标准
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        const imageUrl = URL.createObjectURL(file)
        
        // 优先使用空资产，如果还有空资产可用
        if (emptyAssets.length > newAssets.length + assetsToUpdate.length) {
          const emptyAsset = emptyAssets[newAssets.length + assetsToUpdate.length]
          assetsToUpdate.push({
            id: emptyAsset.id,
            imageUrl: imageUrl,
            file: file,
            assetName: nameWithoutExt || '未命名',
          })
        } else {
          // 创建新资产
          const newAsset: Asset & { file: File } = {
            id: `${type}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            name: nameWithoutExt || '未命名',
            type,
            selectionMethod: '通过本地上传',
            imageUrl: imageUrl,
            file: file,
          }
          newAssets.push(newAsset)
        }
      }
    })
    
    // 一次性更新状态（立即显示预览）
    if (type === 'character') {
      let updatedCharacters = [...characters]
      
      // 更新现有资产
      assetsToUpdate.forEach(({ id, imageUrl }) => {
        updatedCharacters = updatedCharacters.map((c) => 
          c.id === id ? { ...c, imageUrl } : c
        )
      })
      
      // 添加新资产（去掉file属性）
      setCharacters([...updatedCharacters, ...newAssets.map(({ file, ...asset }) => asset)])
    } else if (type === 'scene') {
      let updatedScenes = [...scenes]
      
      // 更新现有资产
      assetsToUpdate.forEach(({ id, imageUrl }) => {
        updatedScenes = updatedScenes.map((s) => 
          s.id === id ? { ...s, imageUrl } : s
        )
      })
      
      // 添加新资产（去掉file属性）
      setScenes([...updatedScenes, ...newAssets.map(({ file, ...asset }) => asset)])
    } else {
      let updatedItems = [...items]
      
      // 更新现有资产
      assetsToUpdate.forEach(({ id, imageUrl }) => {
        updatedItems = updatedItems.map((i) => 
          i.id === id ? { ...i, imageUrl } : i
        )
      })
      
      // 添加新资产（去掉file属性）
      setItems([...updatedItems, ...newAssets.map(({ file, ...asset }) => asset)])
    }
    
    // 异步上传所有图片到服务器并保存到项目文件夹
    const uploadPromises: Promise<void>[] = []
    
    // 上传更新现有资产的图片
    assetsToUpdate.forEach(({ id, file, assetName }) => {
      const uploadPromise = (async () => {
        try {
          const localUrl = type === 'character' ? characters.find(c => c.id === id)?.imageUrl :
                          type === 'scene' ? scenes.find(s => s.id === id)?.imageUrl :
                          items.find(i => i.id === id)?.imageUrl
          
          if (type === 'character') {
            const result = await uploadCharacterImage({
              image: file,
              characterId: id,
              characterName: assetName,
              projectName: projectName,
            })
            setCharacters(prev => prev.map(c => c.id === id ? { ...c, imageUrl: result.url } : c))
            if (localUrl && localUrl.startsWith('blob:')) {
              URL.revokeObjectURL(localUrl)
            }
          } else if (type === 'scene') {
            const result = await uploadSceneImage({
              image: file,
              sceneId: id,
              sceneName: assetName,
              projectName: projectName,
            })
            setScenes(prev => prev.map(s => s.id === id ? { ...s, imageUrl: result.url } : s))
            if (localUrl && localUrl.startsWith('blob:')) {
              URL.revokeObjectURL(localUrl)
            }
          } else {
            const result = await uploadItemImage({
              image: file,
              itemId: id,
              itemName: assetName,
              projectName: projectName,
            })
            setItems(prev => prev.map(i => i.id === id ? { ...i, imageUrl: result.url } : i))
            if (localUrl && localUrl.startsWith('blob:')) {
              URL.revokeObjectURL(localUrl)
            }
          }
        } catch (error) {
          console.error(`上传${type}图片失败:`, error)
        }
      })()
      uploadPromises.push(uploadPromise)
    })
    
    // 上传新资产的图片
    newAssets.forEach((asset) => {
      const uploadPromise = (async () => {
        try {
          if (type === 'character') {
            const result = await uploadCharacterImage({
              image: asset.file,
              characterId: asset.id,
              characterName: asset.name,
              projectName: projectName,
            })
            setCharacters(prev => prev.map(c => c.id === asset.id ? { ...c, imageUrl: result.url } : c))
            if (asset.imageUrl && asset.imageUrl.startsWith('blob:')) {
              URL.revokeObjectURL(asset.imageUrl)
            }
          } else if (type === 'scene') {
            const result = await uploadSceneImage({
              image: asset.file,
              sceneId: asset.id,
              sceneName: asset.name,
              projectName: projectName,
            })
            setScenes(prev => prev.map(s => s.id === asset.id ? { ...s, imageUrl: result.url } : s))
            if (asset.imageUrl && asset.imageUrl.startsWith('blob:')) {
              URL.revokeObjectURL(asset.imageUrl)
            }
          } else {
            const result = await uploadItemImage({
              image: asset.file,
              itemId: asset.id,
              itemName: asset.name,
              projectName: projectName,
            })
            setItems(prev => prev.map(i => i.id === asset.id ? { ...i, imageUrl: result.url } : i))
            if (asset.imageUrl && asset.imageUrl.startsWith('blob:')) {
              URL.revokeObjectURL(asset.imageUrl)
            }
          }
        } catch (error) {
          console.error(`上传${type}图片失败:`, error)
        }
      })()
      uploadPromises.push(uploadPromise)
    })
    
    // 等待所有上传完成
    try {
      await Promise.all(uploadPromises)
      console.log(`✅ 所有${type}图片已上传并保存到项目文件夹: ${projectName}`)
      
      // 触发刷新事件
      if (type === 'character') {
        window.dispatchEvent(new Event('character-uploaded'))
      } else if (type === 'scene') {
        window.dispatchEvent(new Event('scene-uploaded'))
      } else if (type === 'item') {
        window.dispatchEvent(new Event('item-uploaded'))
      }
    } catch (error) {
      console.error(`批量上传${type}图片时出错:`, error)
      alertError('部分图片上传失败，请检查网络连接', '上传警告')
    }
    
    // 清空文件输入，以便下次可以选择相同的文件
    if (type === 'character' && characterBatchUploadRef.current) {
      characterBatchUploadRef.current.value = ''
    } else if (type === 'scene' && sceneBatchUploadRef.current) {
      sceneBatchUploadRef.current.value = ''
    } else if (type === 'item' && itemBatchUploadRef.current) {
      itemBatchUploadRef.current.value = ''
    }
  }

  // 保存所有数据到 sessionStorage 的辅助函数
  const saveAllData = () => {
    try {
      // 保存资产数据
      sessionStorage.setItem('assetDetails_characters', JSON.stringify(characters))
      sessionStorage.setItem('assetDetails_scenes', JSON.stringify(scenes))
      sessionStorage.setItem('assetDetails_items', JSON.stringify(items))
      
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
      if (state?.segments) {
        sessionStorage.setItem('assetDetails_segments', JSON.stringify(state.segments))
      }
      
      console.log('✅ 已保存所有资产数据到 sessionStorage')
    } catch (error) {
      console.warn('⚠️ 保存数据到 sessionStorage 失败:', error)
    }
  }

  const handleSubmit = async () => {
    saveAllData()
    
    // 更新任务进度（第二步完成，进度40%）
    try {
      const taskId = sessionStorage.getItem('current_task_id')
      if (taskId) {
        await updateTask(parseInt(taskId), {
          progress1: 40, // 第二步完成
          progress2: 0,
          isCompleted1: true, // 保持第一步完成状态
        })
        console.log('✅ 任务进度已更新: 40% (第二步完成)')
      }
    } catch (error) {
      console.error('更新任务进度失败:', error)
      // 继续执行，不阻塞流程
    }
    
    navigate('/shot-management', {
      state: {
        segments: state?.segments || [],
        scriptTitle: state?.scriptTitle,
        workStyle: state?.workStyle,
        maxShots: state?.maxShots,
      },
    })
  }

  return (
    <div className="h-screen bg-white text-gray-900 overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 后端服务状态提示 */}
        {backendStatus === 'offline' && (
          <div className="mb-2 bg-red-50 border border-red-200 rounded-lg p-2 mx-4 mt-2">
            <p className="text-red-700 text-sm">
              ⚠️ 提醒管理员启动后端服务
            </p>
          </div>
        )}
        
        {/* 导航栏 */}
        <div className="flex items-center gap-4 px-4 py-2 flex-shrink-0">
          <button
            onClick={() => {
              saveAllData()
              navigate('/script-input', {
                state: {
                  scriptTitle: state?.scriptTitle,
                  workStyle: state?.workStyle,
                  maxShots: state?.maxShots,
                  scriptContent: state?.scriptContent,
                }
              })
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <button
              onClick={() => {
                saveAllData()
                navigate('/script-input', {
                  state: {
                    scriptTitle: state?.scriptTitle,
                    workStyle: state?.workStyle,
                    maxShots: state?.maxShots,
                    scriptContent: state?.scriptContent,
                  }
                })
              }}
              className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">1</span>
              <span>输入剧本(一整集)</span>
            </button>
            <span className="text-gray-600">→</span>
            <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-pink-500 flex items-center justify-center text-xs font-bold">2</span>
              <span className="border-b-2 border-pink-500">资产详情</span>
            </div>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                saveAllData()
                // 尝试从 sessionStorage 恢复必要数据
                let segmentsData = null
                let shotsData = null
                try {
                  const savedSegments = sessionStorage.getItem('shotManagement_segments')
                  if (savedSegments) {
                    segmentsData = JSON.parse(savedSegments)
                  }
                  const savedShots = sessionStorage.getItem('shotManagement_shots')
                  if (savedShots) {
                    shotsData = JSON.parse(savedShots)
                  }
                } catch (error) {
                  console.warn('⚠️ 恢复数据失败:', error)
                }
                navigate('/shot-management', {
                  state: {
                    segments: segmentsData || state?.segments || [],
                    shots: shotsData,
                    scriptTitle: state?.scriptTitle,
                    workStyle: state?.workStyle,
                    maxShots: state?.maxShots,
                  }
                })
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">3</span>
              <span>分镜管理</span>
            </button>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                saveAllData()
                navigate('/image-fusion')
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">4</span>
              <span>融图管理</span>
            </button>
            <span className="text-gray-600">→</span>
            <button
              onClick={() => {
                saveAllData()
                navigate('/video-editing')
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">5</span>
              <span>视频编辑</span>
            </button>
          </div>
        </div>

        {/* 三个竖向列块 - 铺满整个页面，各占1/3 */}
        <div className="flex-1 flex gap-2 overflow-hidden px-2">
          {/* 角色列 - 1/3宽度 */}
          <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden min-w-0">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold">角色</h2>
              <div className="flex items-center gap-2">
                <label 
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm cursor-pointer relative group"
                  title="按住Ctrl选择多张图片"
                >
                  <input
                    ref={characterBatchUploadRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleBatchUpload('character', e.target.files)}
                  />
                  <Upload size={16} />
                  <span>批量上传</span>
                  {/* 悬停提示 - 显示在按钮下方 */}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    按住Ctrl选择多张图片
                    {/* 小三角箭头 */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800"></span>
                  </span>
                </label>
                <button
                  onClick={() => addAsset('character')}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1 text-sm"
                >
                  <Plus size={16} />
                  添加
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* 使用网格布局，每行显示2个角色卡片 */}
              <div className="grid grid-cols-2 gap-3">
              {characters.map((char) => (
                <div
                  key={char.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col relative"
                  >
                    {/* 右上角删除按钮 */}
                    <button
                      onClick={() => removeAsset('character', char.id)}
                      className="absolute top-3 right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 z-40"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="flex justify-between items-start mb-2 pr-8">
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) => updateAssetName('character', char.id, e.target.value)}
                      placeholder="角色名称"
                        className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500"
                      />
                  </div>
                  <select
                    value={char.selectionMethod}
                      onChange={(e) => {
                        updateSelectionMethod('character', char.id, e.target.value)
                        // 如果选择"通过角色选择器"，打开角色选择器
                        if (e.target.value === '通过角色选择器') {
                          setShowCharacterSelector(true)
                          setSelectedCharacterId(char.id)
                        }
                      }}
                      className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs mb-2 focus:outline-none focus:border-purple-500"
                  >
                    <option>通过角色选择器</option>
                    <option>通过本地上传</option>
                  </select>
                    <div className="relative w-full bg-white border border-gray-300 rounded overflow-hidden group" style={{ aspectRatio: '9/16' }}>
                    {char.imageUrl ? (
                      <>
                        <img
                          src={char.imageUrl}
                          alt={char.name || '角色图片'}
                            className="w-full h-full object-cover object-top"
                        />
                          {/* 预览按钮 - hover 时显示 */}
                        <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewImage(char.imageUrl || null)
                            }}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 transition-opacity z-20"
                          >
                            <Eye className="text-white" size={24} />
                          </button>
                          {/* 删除按钮 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                            if (char.imageUrl) {
                              URL.revokeObjectURL(char.imageUrl)
                            }
                            setCharacters(characters.map((c) => (c.id === char.id ? { ...c, imageUrl: undefined } : c)))
                          }}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 z-30"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center cursor-pointer bg-gray-200 rounded"
                          style={{ aspectRatio: '9/16' }}
                          onClick={() => {
                            console.log('点击新增按钮，当前选择方式:', char.selectionMethod)
                            if (char.selectionMethod === '通过角色选择器') {
                              console.log('打开角色选择器，角色ID:', char.id)
                              setShowCharacterSelector(true)
                              setSelectedCharacterId(char.id)
                            } else {
                              console.log('选择方式不是"通过角色选择器"，当前方式:', char.selectionMethod)
                            }
                          }}
                        >
                          {char.selectionMethod === '通过本地上传' ? (
                            <label className="w-full h-full flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                                  if (file) {
                              handleImageUpload('character', char.id, file)
                            }
                          }}
                        />
                              <Plus className="text-gray-400" size={32} />
                      </label>
                          ) : (
                            <Plus className="text-gray-400" size={32} />
                          )}
                        </div>
                      )}
                      {/* 如果有图片，也支持点击重新选择 */}
                      {char.imageUrl && char.selectionMethod === '通过角色选择器' && (
                        <button
                          onClick={() => {
                            setShowCharacterSelector(true)
                            setSelectedCharacterId(char.id)
                          }}
                          className="mt-2 w-full px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                        >
                          重新选择
                        </button>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>

          {/* 场景列 - 1/3宽度 */}
          <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden min-w-0">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold">场景</h2>
              <div className="flex items-center gap-2">
                <label 
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm cursor-pointer relative group"
                  title="按住Ctrl选择多张图片"
                >
                  <input
                    ref={sceneBatchUploadRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleBatchUpload('scene', e.target.files)}
                  />
                  <Upload size={16} />
                  <span>批量上传</span>
                  {/* 悬停提示 - 显示在按钮下方 */}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    按住Ctrl选择多张图片
                    {/* 小三角箭头 */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800"></span>
                  </span>
                </label>
                <button
                  onClick={() => addAsset('scene')}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1 text-sm"
                >
                  <Plus size={16} />
                  添加
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative"
                >
                  {/* 右上角删除按钮 */}
                  <button
                    onClick={() => removeAsset('scene', scene.id)}
                    className="absolute top-4 right-4 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 z-40"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="flex justify-between items-start mb-3 pr-8">
                    <input
                      type="text"
                      value={scene.name}
                      onChange={(e) => updateAssetName('scene', scene.id, e.target.value)}
                      placeholder="场景名称"
                      className="flex-1 px-3 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <select
                    value={scene.selectionMethod}
                    onChange={(e) => {
                      updateSelectionMethod('scene', scene.id, e.target.value)
                      // 如果选择"通过场景选择器"，打开场景选择器
                      if (e.target.value === '通过场景选择器') {
                        setShowSceneSelector(true)
                        setSelectedSceneId(scene.id)
                      }
                    }}
                    className="w-full px-3 py-1 bg-white border border-gray-300 rounded text-sm mb-3 focus:outline-none focus:border-purple-500"
                  >
                    <option>通过场景选择器</option>
                    <option>通过本地上传</option>
                  </select>
                  <div className="relative w-full bg-white border border-gray-300 rounded overflow-hidden group" style={{ aspectRatio: '16/9' }}>
                    {scene.imageUrl ? (
                      <>
                        <img
                          src={scene.imageUrl}
                          alt={scene.name || '场景图片'}
                          className="w-full h-full object-cover"
                        />
                        {/* 预览按钮 - hover 时显示 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewImage(scene.imageUrl || null)
                          }}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 transition-opacity z-20"
                        >
                          <Eye className="text-white" size={24} />
                        </button>
                        {/* 删除按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (scene.imageUrl) {
                              URL.revokeObjectURL(scene.imageUrl)
                            }
                            setScenes(scenes.map((s) => (s.id === scene.id ? { ...s, imageUrl: undefined } : s)))
                          }}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 z-30"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center cursor-pointer bg-gray-200 rounded"
                        onClick={() => {
                          console.log('点击新增按钮，当前选择方式:', scene.selectionMethod)
                          if (scene.selectionMethod === '通过场景选择器') {
                            console.log('打开场景选择器，场景ID:', scene.id)
                            setShowSceneSelector(true)
                            setSelectedSceneId(scene.id)
                          } else {
                            console.log('选择方式不是"通过场景选择器"，当前方式:', scene.selectionMethod)
                          }
                        }}
                      >
                        {scene.selectionMethod === '通过本地上传' ? (
                          <label className="w-full h-full flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                                if (file) {
                              handleImageUpload('scene', scene.id, file)
                            }
                          }}
                        />
                            <Plus className="text-gray-400" size={36} />
                      </label>
                        ) : (
                          <Plus className="text-gray-400" size={36} />
                        )}
                      </div>
                    )}
                    {/* 如果有图片，也支持点击重新选择 */}
                    {scene.imageUrl && scene.selectionMethod === '通过场景选择器' && (
                      <button
                        onClick={() => {
                          setShowSceneSelector(true)
                          setSelectedSceneId(scene.id)
                        }}
                        className="mt-2 w-full px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                      >
                        重新选择
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 物品列 - 1/3宽度 */}
          <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden min-w-0">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold">物品</h2>
              <div className="flex items-center gap-2">
                <label 
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm cursor-pointer relative group"
                  title="按住Ctrl选择多张图片"
                >
                  <input
                    ref={itemBatchUploadRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleBatchUpload('item', e.target.files)}
                  />
                  <Upload size={16} />
                  <span>批量上传</span>
                  {/* 悬停提示 - 显示在按钮下方 */}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    按住Ctrl选择多张图片
                    {/* 小三角箭头 */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800"></span>
                  </span>
                </label>
                <button
                  onClick={() => addAsset('item')}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1 text-sm"
                >
                  <Plus size={16} />
                  添加
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative"
                >
                  {/* 右上角删除按钮 */}
                  <button
                    onClick={() => removeAsset('item', item.id)}
                    className="absolute top-4 right-4 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 z-40"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="flex justify-between items-start mb-3 pr-8">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateAssetName('item', item.id, e.target.value)}
                      placeholder="物品名称"
                      className="flex-1 px-3 py-1 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <select
                    value={item.selectionMethod}
                    onChange={(e) => {
                      updateSelectionMethod('item', item.id, e.target.value)
                      // 如果选择"通过物品选择器"，打开物品选择器
                      if (e.target.value === '通过物品选择器') {
                        setShowItemSelector(true)
                        setSelectedItemId(item.id)
                      }
                    }}
                    className="w-full px-3 py-1 bg-white border border-gray-300 rounded text-sm mb-3 focus:outline-none focus:border-purple-500"
                  >
                    <option>通过物品选择器</option>
                    <option>通过本地上传</option>
                  </select>
                  <div className="relative w-full bg-white border border-gray-300 rounded overflow-hidden group" style={{ aspectRatio: '16/9' }}>
                    {item.imageUrl ? (
                      <>
                        <img
                          src={item.imageUrl}
                          alt={item.name || '物品图片'}
                          className="w-full h-full object-cover"
                        />
                        {/* 预览按钮 - hover 时显示 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewImage(item.imageUrl || null)
                          }}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 transition-opacity z-20"
                        >
                          <Eye className="text-white" size={24} />
                        </button>
                        {/* 删除按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (item.imageUrl) {
                              URL.revokeObjectURL(item.imageUrl)
                            }
                            setItems(items.map((i) => (i.id === item.id ? { ...i, imageUrl: undefined } : i)))
                          }}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 z-30"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center cursor-pointer bg-gray-200 rounded"
                        onClick={() => {
                          console.log('点击新增按钮，当前选择方式:', item.selectionMethod)
                          if (item.selectionMethod === '通过物品选择器') {
                            console.log('打开物品选择器，物品ID:', item.id)
                            setShowItemSelector(true)
                            setSelectedItemId(item.id)
                          } else {
                            console.log('选择方式不是"通过物品选择器"，当前方式:', item.selectionMethod)
                          }
                        }}
                      >
                        {item.selectionMethod === '通过本地上传' ? (
                          <label className="w-full h-full flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                                if (file) {
                              handleImageUpload('item', item.id, file)
                            }
                          }}
                        />
                            <Plus className="text-gray-400" size={36} />
                      </label>
                        ) : (
                          <Plus className="text-gray-400" size={36} />
                        )}
                      </div>
                    )}
                    {/* 如果有图片，也支持点击重新选择 */}
                    {item.imageUrl && item.selectionMethod === '通过物品选择器' && (
                      <button
                        onClick={() => {
                          setShowItemSelector(true)
                          setSelectedItemId(item.id)
                        }}
                        className="mt-2 w-full px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                      >
                        重新选择
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between px-4 py-2 flex-shrink-0">
          <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            刷新资产 (不消耗积分)
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700"
          >
            提交至下一步(消耗10积分)
          </button>
        </div>
      </div>

      {/* 角色选择器模态框 */}
      {showCharacterSelector && (
        <CreateCharacterModal
          onClose={() => {
            setShowCharacterSelector(false)
            setSelectedCharacterId(null)
          }}
          projectName={state?.scriptTitle}
          onCharacterSelect={(character) => {
            if (selectedCharacterId) {
              // 更新选中的角色
              setCharacters(characters.map(c => 
                c.id === selectedCharacterId 
                  ? { ...c, name: character.name, imageUrl: character.image } 
                  : c
              ))
            }
            setShowCharacterSelector(false)
            setSelectedCharacterId(null)
          }}
        />
      )}

      {/* 场景选择器模态框 */}
      {showSceneSelector && (
        <CreateSceneModal
          onClose={() => {
            setShowSceneSelector(false)
            setSelectedSceneId(null)
          }}
          projectName={state?.scriptTitle}
          onSceneSelect={(scene) => {
            if (selectedSceneId) {
              // 更新选中的场景
              setScenes(scenes.map(s => 
                s.id === selectedSceneId 
                  ? { ...s, name: scene.name, imageUrl: scene.image } 
                  : s
              ))
            }
            setShowSceneSelector(false)
            setSelectedSceneId(null)
          }}
        />
      )}

      {/* 物品选择器模态框 */}
      {showItemSelector && (
        <CreateItemModal
          projectName={state?.scriptTitle}
          onClose={() => {
            setShowItemSelector(false)
            setSelectedItemId(null)
          }}
          onItemSelect={(item) => {
            if (selectedItemId) {
              // 更新选中的物品
              setItems(items.map(i => 
                i.id === selectedItemId 
                  ? { ...i, name: item.name, imageUrl: item.image } 
                  : i
              ))
            }
            setShowItemSelector(false)
            setSelectedItemId(null)
          }}
        />
      )}

      {/* 图片预览模态框 */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 - 右上角 */}
            <button
              onClick={() => setPreviewImage(null)}
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
    </div>
  )
}

export default AssetDetails
