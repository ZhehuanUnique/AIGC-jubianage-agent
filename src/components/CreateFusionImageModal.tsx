import { useState, useEffect, useRef } from 'react'
import { X, Upload, HelpCircle, Plus, Check, Trash2 } from 'lucide-react'
import { getFusionImageList, FusionImageItem } from '../services/api'
import { AuthService } from '../services/auth'

interface CreateFusionImageModalProps {
  onClose: () => void
  projectId?: number
  onImageSaved?: (imageUrl: string) => void
}

// 模型对垫图的支持配置
const MODEL_IMAGE_SUPPORT: Record<string, { maxImages: number; name: string }> = {
  'nano-banana-pro': { maxImages: 2, name: 'Nano Banana Pro' },
  'flux-2-max': { maxImages: 1, name: 'Flux-2-Max' },
  'flux-2-flex': { maxImages: 1, name: 'Flux-2-Flex' },
  'flux-2-pro': { maxImages: 0, name: 'Flux-2-Pro' },
  'seedream-4-5': { maxImages: 2, name: 'Seedream 4.5' },
  'seedream-4-0': { maxImages: 1, name: 'Seedream 4.0' },
}

const API_BASE_URL = (() => {
  if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
  const isProduction = typeof window !== 'undefined' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1')
  return isProduction ? '' : 'http://localhost:3002'
})()

function CreateFusionImageModal({ onClose, projectId, onImageSaved }: CreateFusionImageModalProps) {
  const [leftVisible, setLeftVisible] = useState(false)
  const [rightVisible, setRightVisible] = useState(false)
  const [imageList, setImageList] = useState<FusionImageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('nano-banana-pro')
  const [imageName, setImageName] = useState('')
  const [description, setDescription] = useState('')
  const [imageSize, setImageSize] = useState('1536x1024')
  const [submitting, setSubmitting] = useState(false)
  
  const [poseImage, setPoseImage] = useState<{ url: string; file?: File } | null>(null)
  const [effectImage, setEffectImage] = useState<{ url: string; file?: File } | null>(null)
  const [characterImage, setCharacterImage] = useState<{ url: string; file?: File } | null>(null)
  const [sceneImage, setSceneImage] = useState<{ url: string; file?: File } | null>(null)
  const [itemImage, setItemImage] = useState<{ url: string; file?: File } | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  
  const poseInputRef = useRef<HTMLInputElement>(null)
  const effectInputRef = useRef<HTMLInputElement>(null)
  const characterInputRef = useRef<HTMLInputElement>(null)
  const sceneInputRef = useRef<HTMLInputElement>(null)
  const itemInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLeftVisible(true)
    setTimeout(() => setRightVisible(true), 200)
    loadImageList()
  }, [])

  const loadImageList = async () => {
    try {
      setLoading(true)
      const images = await getFusionImageList()
      setImageList(images)
    } catch (error) {
      console.error('加载图片列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setRightVisible(false)
    setTimeout(() => {
      setLeftVisible(false)
      setTimeout(() => onClose(), 300)
    }, 200)
  }

  const getUploadedImageCount = () => {
    let count = 0
    if (poseImage) count++
    if (effectImage) count++
    if (characterImage) count++
    if (sceneImage) count++
    if (itemImage) count++
    return count
  }

  const getAvailableModels = () => {
    const uploadedCount = getUploadedImageCount()
    return Object.entries(MODEL_IMAGE_SUPPORT).filter(([_, config]) => config.maxImages >= uploadedCount)
  }

  const handleLocalImageUpload = async (
    file: File,
    setImage: React.Dispatch<React.SetStateAction<{ url: string; file?: File } | null>>,
    assetType: string
  ) => {
    try {
      const localUrl = URL.createObjectURL(file)
      setImage({ url: localUrl, file })
      
      const token = AuthService.getToken()
      if (!token) return

      const formData = new FormData()
      formData.append('image', file)
      formData.append('assetType', assetType)
      if (projectId) formData.append('projectId', projectId.toString())

      const response = await fetch(`${API_BASE_URL}/api/upload-fusion-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.url) {
          setImage({ url: result.data.url })
          URL.revokeObjectURL(localUrl)
        }
      }
    } catch (error) {
      console.error('上传图片失败:', error)
    }
  }

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<{ url: string; file?: File } | null>>,
    assetType: string
  ) => {
    const file = e.target.files?.[0]
    if (file) handleLocalImageUpload(file, setImage, assetType)
    e.target.value = ''
  }

  const clearImage = (setImage: React.Dispatch<React.SetStateAction<{ url: string; file?: File } | null>>) => {
    setImage(null)
  }

  const handleImageSelect = async (imageUrl: string) => {
    if (selectedImageUrl === imageUrl) {
      setSelectedImageUrl(null)
      return
    }
    
    setSelectedImageUrl(imageUrl)
    
    if (projectId && onImageSaved) {
      try {
        const token = AuthService.getToken()
        if (!token) return

        const response = await fetch(`${API_BASE_URL}/api/fragments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId,
            name: imageName || '融合生图',
            imageUrl: imageUrl,
            type: 'fusion-image',
          }),
        })

        if (response.ok) {
          onImageSaved(imageUrl)
        }
      } catch (error) {
        console.error('保存到素材库失败:', error)
      }
    }
  }

  useEffect(() => {
    const availableModels = getAvailableModels()
    const isCurrentModelAvailable = availableModels.some(([key]) => key === selectedModel)
    if (!isCurrentModelAvailable && availableModels.length > 0) {
      setSelectedModel(availableModels[0][0])
    }
  }, [poseImage, effectImage, characterImage, sceneImage, itemImage])

  const renderAssetBox = (
    asset: string,
    image: { url: string; file?: File } | null,
    setImage: React.Dispatch<React.SetStateAction<{ url: string; file?: File } | null>>,
    inputRef: React.RefObject<HTMLInputElement>,
    assetType: string
  ) => {
    const isUploadType = asset === '姿势' || asset === '特效'
    
    return (
      <div key={asset} className="relative">
        <label className="block text-xs mb-1.5 flex items-center gap-1">
          {asset}
          {isUploadType && (
            <div className="relative group">
              <HelpCircle size={12} className="text-gray-600 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                可上传线稿图或灰度图
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
        </label>
        <input type="file" ref={inputRef} accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, setImage, assetType)} />
        <div 
          className="h-20 bg-white border border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500 relative overflow-hidden"
          onClick={() => inputRef.current?.click()}
        >
          {image ? (
            <>
              <img src={image.url} alt={asset} className="w-full h-full object-cover" />
              <button onClick={(e) => { e.stopPropagation(); clearImage(setImage) }} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                <Trash2 size={12} />
              </button>
            </>
          ) : (
            <div className="text-center">
              {isUploadType ? <><Upload size={18} className="mx-auto mb-0.5 text-gray-600" /><span className="text-gray-600 text-xs">点击上传</span></> : <><Plus size={18} className="mx-auto mb-0.5 text-gray-600" /><span className="text-gray-600 text-xs">新增</span></>}
            </div>
          )}
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!description.trim()) { alert('请输入描述'); return }
    setSubmitting(true)
    try {
      const token = AuthService.getToken()
      if (!token) { alert('请先登录'); return }

      const response = await fetch(`${API_BASE_URL}/api/fusion-image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model: selectedModel, name: imageName, description, size: imageSize, poseImage: poseImage?.url, effectImage: effectImage?.url, characterImage: characterImage?.url, sceneImage: sceneImage?.url, itemImage: itemImage?.url, projectId }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) { loadImageList(); setDescription(''); setImageName('') }
        else alert(result.error || '生成失败')
      } else alert('生成失败，请稍后重试')
    } catch (error) {
      console.error('提交任务失败:', error)
      alert('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const availableModels = getAvailableModels()
  const uploadedCount = getUploadedImageCount()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={handleClose}>
      <div className={`absolute left-0 top-0 bottom-0 w-2/3 bg-white border-r border-purple-500 overflow-y-auto transition-transform duration-300 ${leftVisible ? 'translate-x-0' : '-translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">在线融合生图</h2>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-900"><X size={24} /></button>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm mb-2"><span className="text-red-500">*</span> 创作模式{uploadedCount > 0 && <span className="text-xs text-gray-500 ml-2">(已上传{uploadedCount}张图片，部分模型已隐藏)</span>}</label>
              <select className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                {availableModels.map(([key, config]) => (<option key={key} value={key}>{config.name} {config.maxImages > 0 ? `(支持${config.maxImages}张垫图)` : '(不支持垫图)'}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2">图片名称(用于搜索)</label>
              <input type="text" placeholder="图片名称(用于搜索)" value={imageName} onChange={(e) => setImageName(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500" />
            </div>
            <div className="grid grid-cols-5 gap-3">
              {renderAssetBox('角色', characterImage, setCharacterImage, characterInputRef, 'character')}
              {renderAssetBox('场景', sceneImage, setSceneImage, sceneInputRef, 'scene')}
              {renderAssetBox('物品', itemImage, setItemImage, itemInputRef, 'item')}
              {renderAssetBox('姿势', poseImage, setPoseImage, poseInputRef, 'pose')}
              {renderAssetBox('特效', effectImage, setEffectImage, effectInputRef, 'effect')}
            </div>
            <div>
              <label className="block text-sm mb-2"><span className="text-red-500">*</span> 描述</label>
              <div className="mb-2"><button className="px-4 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">一键填入提示词框架</button></div>
              <textarea placeholder="结合上传元素，描述希望如何融合生成，描述涵盖每个元素及其关系" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm mb-2"><span className="text-red-500">*</span> 图像尺寸</label>
              <div className="flex gap-4">
                {['1536x1024', '1024x1024', '1024x1536', 'auto'].map((size) => (<label key={size} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="size" value={size} checked={imageSize === size} onChange={(e) => setImageSize(e.target.value)} className="text-purple-600" /><span>{size === 'auto' ? '自动' : size}</span></label>))}
              </div>
            </div>
            <div className="flex justify-end">
              <button className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleSubmit} disabled={submitting || !description.trim()}>{submitting ? '提交中...' : '提交任务 (消耗10积分)'}</button>
            </div>
          </div>
        </div>
      </div>
      <div className={`absolute right-0 top-0 bottom-0 w-1/3 bg-white border-l border-purple-500 overflow-y-auto transition-transform duration-300 ${rightVisible ? 'translate-x-0' : 'translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">融合生图看板</h2>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-900"><X size={24} /></button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-full"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div><p className="text-gray-500">加载中...</p></div></div>
          ) : imageList.length === 0 ? (
            <div className="flex items-center justify-center h-full"><div className="text-center"><div className="w-32 h-32 mx-auto mb-4 bg-white rounded-lg flex items-center justify-center"><div className="text-gray-500 text-4xl">💻</div></div><p className="text-gray-500">暂无数据</p></div></div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {imageList.map((image, index) => (
                <div key={image.key || index} className={`relative group cursor-pointer ${selectedImageUrl === image.url ? 'ring-2 ring-purple-500 ring-offset-2' : ''}`} onClick={() => handleImageSelect(image.url)}>
                  <img src={image.url} alt={`融合生图 ${index + 1}`} className="w-full h-48 object-cover rounded-lg border border-gray-200 hover:border-purple-500 transition-colors" />
                  {selectedImageUrl === image.url && (<div className="absolute bottom-2 right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center"><Check size={14} className="text-white" /></div>)}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="truncate">{new Date(image.lastModified).toLocaleString('zh-CN')}</p>
                    {selectedImageUrl === image.url && <p className="text-purple-300 text-xs mt-1">已保存到素材库</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreateFusionImageModal
