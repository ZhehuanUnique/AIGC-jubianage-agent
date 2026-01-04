import { useState, useEffect } from 'react'
import { X, Download, Edit, Trash2, Star, Video, Play, Plus, ChevronLeft, ChevronRight, Check, Eye } from 'lucide-react'
import VideoEditModal from './VideoEditModal'
import CreateSceneModal from './CreateSceneModal'
import CreateCharacterModal from './CreateCharacterModal'
import { alert, alertInfo, alertWarning } from '../utils/alert'

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

interface VideoEditingDrawerProps {
  isOpen: boolean
  onClose: () => void
  fusion: FusionItem | null
  allFusions: FusionItem[]
  allImageAssets: string[]
  onFusionUpdate?: (updatedFusion: FusionItem) => void
  onFusionsUpdate?: (updatedFusions: FusionItem[]) => void
}

function VideoEditingDrawer({
  isOpen,
  onClose,
  fusion,
  allFusions,
  allImageAssets,
  onFusionUpdate,
  onFusionsUpdate,
}: VideoEditingDrawerProps) {
  const [visible, setVisible] = useState(false)
  const [currentFusion, setCurrentFusion] = useState<FusionItem | null>(fusion)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [imageScrollIndex, setImageScrollIndex] = useState(0)
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set())
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
  // 视频生成配置
  const [videoModel, setVideoModel] = useState('volcengine-video-3.0-pro')
  const [videoQuantity, setVideoQuantity] = useState(1)
  const [videoRatio, setVideoRatio] = useState('16:9')
  const [selectedScenes, setSelectedScenes] = useState<Array<{ id: string; name: string; image?: string }>>([])
  const [selectedCharacters, setSelectedCharacters] = useState<Array<{ id: string; name: string; image?: string }>>([])
  
  // 选择器模态框状态
  const [showSceneSelector, setShowSceneSelector] = useState(false)
  const [showCharacterSelector, setShowCharacterSelector] = useState(false)
  
  // 项目名称（用于角色选择器）
  const [projectName, setProjectName] = useState<string>('')
  
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // 当抽屉打开时，初始化数据
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setCurrentFusion(fusion)
      if (fusion) {
        setVideoModel(fusion.model)
        setVideoQuantity(fusion.quantity)
        // 找到当前fusion对应的图片索引
        const index = allImageAssets.findIndex(img => img === fusion.image)
        if (index >= 0) {
          setSelectedImageIndex(index)
        }
      }
    } else {
      setVisible(false)
    }
  }, [isOpen, fusion, allImageAssets])

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

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => {
      onClose()
    }, 300)
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
    return model === 'doubao-seedance-1-5-pro-251215'
  }

  // 辅助函数：判断是否是 Kling 模型
  const isKlingModel = (model: string): boolean => {
    return model === 'kling-2.6-5s' || model === 'kling-2.6-10s' || model === 'kling-o1'
  }

  // 辅助函数：判断是否是火山引擎即梦AI模型
  const isVolcengineModel = (model: string): boolean => {
    return model === 'volcengine-video-3.0-pro' || model === 'doubao-seedance-3.0-pro'
  }

  // 辅助函数：获取可用的分辨率选项
  const getAvailableResolutions = (model: string): string[] => {
    if (isHailuoModel(model)) {
      return ['720p', '1080p']
    } else if (isViduV2Model(model)) {
      return ['360p', '540p', '720p', '1080p']
    } else if (isVeo3Model(model)) {
      return ['720p', '1080p']
    } else if (isSeedanceModel(model)) {
      return ['480p', '720p', '1080p']
    } else if (isKlingModel(model)) {
      // Kling 模型：支持 720p(768p) 和 1080p
      return ['720p', '1080p']
    } else if (isVolcengineModel(model)) {
      // 火山引擎即梦AI-3.0 Pro：支持 480p, 720p, 1080p
      return ['480p', '720p', '1080p']
    }
    return ['480p', '720p', '1080p']
  }

  // 辅助函数：获取可用的时长选项
  const getAvailableDurations = (model: string, resolution: string): number[] => {
    if (isHailuoModel(model)) {
      if (resolution === '1080p') {
        return [6]
      } else if (resolution === '720p') {
        return [6, 10]
      }
    } else if (isViduV2Model(model)) {
      return [5, 10]
    } else if (isVeo3Model(model)) {
      return [5, 10]
    } else if (isSeedanceModel(model)) {
      return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    } else if (isKlingModel(model)) {
      // Kling 模型：2.6-5s 固定5秒，2.6-10s 固定10秒，O1 支持自定义时长
      if (model === 'kling-2.6-5s') {
        return [5]
      } else if (model === 'kling-2.6-10s') {
        return [10]
      } else if (model === 'kling-o1') {
        // Kling-O1 支持自定义时长，返回常用选项
        return [5, 10, 15, 20]
      }
    } else if (isVolcengineModel(model)) {
      // 火山引擎即梦AI-3.0 Pro：支持 2~12 秒
      return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    }
    return [5, 10]
  }

  const handleImageScroll = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setImageScrollIndex(Math.max(0, imageScrollIndex - 1))
    } else {
      setImageScrollIndex(Math.min(allImageAssets.length - 5, imageScrollIndex + 1))
    }
  }

  const handleAddScene = () => {
    setShowSceneSelector(true)
  }

  const handleRemoveScene = (index: number) => {
    setSelectedScenes(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddCharacter = () => {
    setShowCharacterSelector(true)
  }

  const handleRemoveCharacter = (index: number) => {
    setSelectedCharacters(prev => prev.filter((_, i) => i !== index))
  }
  
  const handleSceneSelect = (scene: { id: string; name: string; image?: string }) => {
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

  // 更新fusion并通知父组件
  const updateFusion = (updates: Partial<FusionItem>) => {
    if (!currentFusion) return
    
    const updated = { ...currentFusion, ...updates }
    setCurrentFusion(updated)
    
    // 更新所有fusions列表
    const updatedFusions = allFusions.map(f => 
      f.id === currentFusion.id ? updated : f
    )
    
    // 通知父组件
    if (onFusionUpdate) {
      onFusionUpdate(updated)
    }
    if (onFusionsUpdate) {
      onFusionsUpdate(updatedFusions)
    }
    
    // 保存到sessionStorage
    try {
      sessionStorage.setItem('imageFusion_fusions', JSON.stringify(updatedFusions))
    } catch (error) {
      console.warn('⚠️ 保存fusions失败:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" 
      onClick={handleClose}
    >
      {/* 右侧窗口 - 视频编辑 */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-2/3 bg-white border-l border-purple-500 overflow-y-auto transition-transform duration-300 ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">视频编辑</h2>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>

          {currentFusion ? (
            <div className="space-y-6">
              {/* 左侧：分镜融图列表 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">分镜融图列表</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allFusions.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        setCurrentFusion(f)
                        setVideoModel(f.model)
                        setVideoQuantity(f.quantity)
                        const index = allImageAssets.findIndex(img => img === f.image)
                        if (index >= 0) {
                          setSelectedImageIndex(index)
                        }
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        currentFusion?.id === f.id
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white border-gray-300 hover:border-purple-400'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">序号 {f.shotNumber}</div>
                      <div className={`w-full h-20 rounded border ${
                        currentFusion?.id === f.id ? 'border-white' : 'border-gray-300'
                      } overflow-hidden`}>
                        {f.image && f.image !== '/placeholder-image.jpg' ? (
                          <img 
                            src={f.image} 
                            alt={`分镜${f.shotNumber}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">暂无图片</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 图片素材 */}
              <div>
                <label className="text-sm font-semibold mb-2 block">图片素材</label>
                <div className="relative">
                  {allImageAssets.length > 5 && imageScrollIndex > 0 && (
                    <button
                      onClick={() => handleImageScroll('left')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <div className="flex gap-3 overflow-hidden">
                    {allImageAssets.slice(imageScrollIndex, imageScrollIndex + 5).map((image, index) => {
                      const actualIndex = imageScrollIndex + index
                      const isSelected = selectedImages.has(actualIndex)
                      return (
                        <div
                          key={actualIndex}
                          className={`relative flex-shrink-0 w-24 h-24 rounded border-2 overflow-hidden cursor-pointer transition-all group ${
                            isSelected
                              ? 'border-purple-600 ring-2 ring-purple-300'
                              : selectedImageIndex === actualIndex
                              ? 'border-purple-400'
                              : 'border-gray-300 hover:border-purple-300'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            // 切换选中状态
                            setSelectedImages(prev => {
                              const next = new Set(prev)
                              if (next.has(actualIndex)) {
                                next.delete(actualIndex)
                              } else {
                                next.add(actualIndex)
                              }
                              return next
                            })
                            // 同时更新当前选中的索引（用于预览）
                            setSelectedImageIndex(actualIndex)
                            // 更新当前fusion的图片
                            updateFusion({ image: allImageAssets[actualIndex] })
                          }}
                        >
                          <img 
                            src={image} 
                            alt={`图片${actualIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {/* 鼠标悬停显示眼睛图标 */}
                          <div 
                            className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewImage(image)
                            }}
                          >
                            <Eye 
                              size={24} 
                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" 
                            />
                          </div>
                          {/* 选中标记：右下角对勾 */}
                          {isSelected && (
                            <div className="absolute bottom-0 right-0 bg-purple-600 text-white rounded-tl-lg p-1 z-10">
                              <Check size={14} className="text-white" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {allImageAssets.length > 5 && imageScrollIndex < allImageAssets.length - 5 && (
                    <button
                      onClick={() => handleImageScroll('right')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100"
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* 模型 */}
              <div>
                <label className="text-sm font-semibold mb-2 block">模型</label>
                <select
                  value={videoModel}
                  onChange={(e) => {
                    const newModel = e.target.value
                    setVideoModel(newModel)
                    
                    const availableResolutions = getAvailableResolutions(newModel)
                    let newResolution = currentFusion.resolution
                    if (!availableResolutions.includes(currentFusion.resolution)) {
                      newResolution = availableResolutions[0] || '720p'
                    }
                    
                    const availableDurations = getAvailableDurations(newModel, newResolution)
                    let newDuration = currentFusion.duration
                    if (!availableDurations.includes(currentFusion.duration)) {
                      const closestDuration = availableDurations.reduce((prev, curr) => 
                        Math.abs(curr - currentFusion.duration) < Math.abs(prev - currentFusion.duration) ? curr : prev
                      )
                      newDuration = closestDuration || availableDurations[0] || 5
                    }
                    
                    updateFusion({ 
                      model: newModel,
                      resolution: newResolution,
                      duration: newDuration
                    })
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="volcengine-video-3.0-pro">即梦AI-视频生成3.0pro</option>
                  <option value="doubao-seedance-1-5-pro-251215">即梦AI-视频生成3.5pro</option>
                  <option value="viduq2-turbo">ViduQ2-Turbo</option>
                  <option value="veo3.1">Google Veo3.1</option>
                  <option value="veo3.1-pro">Google Veo3.1-Pro</option>
                  <option value="minimax-hailuo-02">MiniMax Hailuo-02</option>
                  <option value="minimax-hailuo-2.3">MiniMax Hailuo-2.3</option>
                  <option value="minimax-hailuo-2.3-fast">MiniMax Hailuo-2.3-fast</option>
                  <option value="kling-2.6-5s">Kling-2.6-5秒</option>
                  <option value="kling-2.6-10s">Kling-2.6-10秒</option>
                  <option value="kling-o1">Kling-O1</option>
                </select>
              </div>

              {/* 数量 */}
              <div>
                <label className="text-sm font-semibold mb-2 block">数量</label>
                <select
                  value={videoQuantity}
                  onChange={(e) => {
                    const newQuantity = parseInt(e.target.value)
                    setVideoQuantity(newQuantity)
                    updateFusion({ quantity: newQuantity })
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>

              {/* 比例 */}
              <div>
                <label className="text-sm font-semibold mb-2 block">比例</label>
                <select
                  value={videoRatio}
                  onChange={(e) => setVideoRatio(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="16:9">16:9</option>
                  <option value="1:1">1:1</option>
                  <option value="9:16">9:16</option>
                  <option value="21:9">21:9</option>
                </select>
              </div>

              {/* 场景和角色 - 横向排列 */}
              <div className="flex gap-6">
                {/* 场景 */}
                <div className="flex-1">
                  <label className="text-sm font-semibold mb-2 block">场景</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedScenes.map((scene, index) => (
                      <div key={scene.id || index} className="relative w-20 h-20 bg-gray-200 rounded border border-gray-300 overflow-hidden">
                        {scene.image ? (
                          <img src={scene.image} alt={scene.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-gray-600">{scene.name}</span>
                          </div>
                        )}
                        <button
                          onClick={() => handleRemoveScene(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddScene}
                      className="w-20 h-20 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-purple-400 transition-colors"
                    >
                      <Plus size={24} className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">新增</span>
                    </button>
                  </div>
                </div>

                {/* 角色 */}
                <div className="flex-1">
                  <label className="text-sm font-semibold mb-2 block">角色</label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedCharacters.map((character, index) => (
                      <div key={character.id || index} className="relative w-20 h-20 bg-gray-200 rounded border border-gray-300 overflow-hidden">
                        {character.image ? (
                          <img src={character.image} alt={character.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-gray-600">{character.name}</span>
                          </div>
                        )}
                        <button
                          onClick={() => handleRemoveCharacter(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddCharacter}
                      className="w-20 h-20 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-purple-400 transition-colors"
                    >
                      <Plus size={24} className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">新增</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 视频提示词 */}
              <div>
                <label className="text-sm font-semibold mb-2 block">视频提示词</label>
                <textarea
                  value={currentFusion.videoPrompt}
                  onChange={(e) => {
                    updateFusion({ videoPrompt: e.target.value })
                  }}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                  rows={6}
                  placeholder="输入视频提示词，描述视频的运动、镜头、氛围等..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  提示：视频提示词由AI自动生成，您可以在此进行修改和微调
                </p>
              </div>

              {/* 生成视频按钮 */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {selectedImages.size > 0 ? (
                    <span className="text-purple-600 font-semibold">已选中 {selectedImages.size} 张图片</span>
                  ) : (
                    <span>请选择要生成视频的图片（可多选）</span>
                  )}
                </div>
                <button 
                  onClick={() => {
                    if (selectedImages.size === 0) {
                      alertWarning('请至少选择一张图片')
                      return
                    }
                    const selectedImageUrls = Array.from(selectedImages).map(idx => allImageAssets[idx])
                    console.log('选中的图片:', selectedImageUrls)
                    alertInfo(`将使用 ${selectedImages.size} 张图片生成视频\n图片URLs: ${selectedImageUrls.join(', ')}`)
                    // TODO: 调用视频生成API
                  }}
                  disabled={selectedImages.size === 0}
                  className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    selectedImages.size > 0
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Video size={18} />
                  生成视频 ({selectedImages.size})
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              未选择分镜
            </div>
          )}
        </div>
      </div>

      <VideoEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedVideoId(null)
        }}
        videoId={selectedVideoId || 0}
        videoPrompt={selectedVideoId ? allFusions.find(f => f.id === selectedVideoId)?.videoPrompt : undefined}
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
      
      {/* 图片预览模态框 - 全屏黑色背景，右上角有X */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          {/* 关闭按钮 - 右上角 */}
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 border border-white border-opacity-30 text-white flex items-center justify-center transition-all z-10"
          >
            <X size={24} />
          </button>
          
          {/* 图片容器 - 居中，最大尺寸限制 */}
          <div 
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="预览图片"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoEditingDrawer



