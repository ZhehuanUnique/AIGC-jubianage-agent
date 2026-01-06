import { useState, useEffect } from 'react'
import { X, Download, Edit, Star, Play, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { alertInfo } from '../utils/alert'

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

interface VideoEditDrawerProps {
  isOpen: boolean
  onClose: () => void
  fusion: FusionItem | null
  allFusions: FusionItem[]
  onFusionUpdate?: (updatedFusion: FusionItem) => void
}

function VideoEditDrawer({
  isOpen,
  onClose,
  fusion,
  allFusions,
  onFusionUpdate,
}: VideoEditDrawerProps) {
  const [visible, setVisible] = useState(false)
  const [currentFusion, setCurrentFusion] = useState<FusionItem | null>(fusion)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isStarred, setIsStarred] = useState(false)
  
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
  
  // 视频配置
  const [videoModel, setVideoModel] = useState('volcengine-video-3.0-pro')
  const [videoDuration, setVideoDuration] = useState(5)
  const [videoResolution, setVideoResolution] = useState('720p')
  const [videoQuantity, setVideoQuantity] = useState(1)
  const [videoPrompt, setVideoPrompt] = useState('')

  // 当抽屉打开时，初始化数据
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setCurrentFusion(fusion)
      if (fusion) {
        setVideoModel(fusion.model)
        setVideoDuration(fusion.duration)
        setVideoResolution(fusion.resolution)
        setVideoQuantity(fusion.quantity)
        setVideoPrompt(fusion.videoPrompt)
        // 找到当前fusion在所有fusions中的索引
        const index = allFusions.findIndex(f => f.id === fusion.id)
        setCurrentVideoIndex(index >= 0 ? index : 0)
      }
    } else {
      setVisible(false)
    }
  }, [isOpen, fusion, allFusions])

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      const prevFusion = allFusions[currentVideoIndex - 1]
      setCurrentFusion(prevFusion)
      setCurrentVideoIndex(currentVideoIndex - 1)
      if (prevFusion) {
        setVideoModel(prevFusion.model)
        setVideoDuration(prevFusion.duration)
        setVideoResolution(prevFusion.resolution)
        setVideoQuantity(prevFusion.quantity)
        setVideoPrompt(prevFusion.videoPrompt)
      }
    }
  }

  const handleNextVideo = () => {
    if (currentVideoIndex < allFusions.length - 1) {
      const nextFusion = allFusions[currentVideoIndex + 1]
      setCurrentFusion(nextFusion)
      setCurrentVideoIndex(currentVideoIndex + 1)
      if (nextFusion) {
        setVideoModel(nextFusion.model)
        setVideoDuration(nextFusion.duration)
        setVideoResolution(nextFusion.resolution)
        setVideoQuantity(nextFusion.quantity)
        setVideoPrompt(nextFusion.videoPrompt)
      }
    }
  }

  const handleSelectFusion = (selectedFusion: FusionItem, index: number) => {
    setCurrentFusion(selectedFusion)
    setCurrentVideoIndex(index)
    setVideoModel(selectedFusion.model)
    setVideoDuration(selectedFusion.duration)
    setVideoResolution(selectedFusion.resolution)
    setVideoQuantity(selectedFusion.quantity)
    setVideoPrompt(selectedFusion.videoPrompt)
  }

  const handleSubmit = () => {
    if (!currentFusion) return
    
    const updatedFusion: FusionItem = {
      ...currentFusion,
      model: videoModel,
      duration: videoDuration,
      resolution: videoResolution,
      quantity: videoQuantity,
      videoPrompt: videoPrompt,
    }
    
    if (onFusionUpdate) {
      onFusionUpdate(updatedFusion)
    }
    
    alertInfo('视频配置已更新')
    handleClose()
  }

  // 获取当前视频URL
  const currentVideoUrl = currentFusion?.videoUrls && currentFusion.videoUrls.length > 0
    ? currentFusion.videoUrls[currentVideoIndex] || currentFusion.videoUrls[0]
    : null

  // 获取已确认的视频URL
  const confirmedVideoUrl = currentFusion?.videoUrls && currentFusion.videoUrls.length > 0
    ? currentFusion.videoUrls[0]
    : null

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex"
      onClick={handleClose}
    >
      {/* 左侧：视频列表 */}
      <div
        className={`w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto transition-transform duration-300 ${
          visible ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">视频编辑</h3>
          
          {/* 标签页 */}
          <div className="flex gap-2 mb-4">
            <button className="px-3 py-1 bg-purple-600 text-white rounded text-sm">序号</button>
            <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm">已确认素材</button>
          </div>

          {/* 视频列表 */}
          <div className="space-y-3">
            {allFusions.map((f, index) => {
              const videoUrl = f.videoUrls && f.videoUrls.length > 0 ? f.videoUrls[0] : null
              const isSelected = currentFusion?.id === f.id
              
              return (
                <div
                  key={f.id}
                  onClick={() => handleSelectFusion(f, index)}
                  className={`p-2 rounded border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-100 border-purple-500'
                      : 'bg-white border-gray-300 hover:border-purple-400'
                  }`}
                >
                  <div className="text-xs text-gray-600 mb-1">序号 {f.shotNumber}</div>
                  <div 
                    className="relative w-full bg-gray-200 rounded overflow-hidden group"
                    style={{ 
                      aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1',
                      minHeight: '96px' // 保持最小高度
                    }}
                  >
                    {videoUrl ? (
                      <>
                        <video
                          src={videoUrl}
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
                          <Play size={16} className="text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-xs">暂无视频</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 右侧：视频编辑区域 */}
      <div
        className={`flex-1 bg-white overflow-y-auto transition-transform duration-300 ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
                <X size={24} />
              </button>
              <span className="text-lg font-semibold">第{currentVideoIndex + 1}行</span>
              <div className="flex items-center gap-2">
                <Check className="text-purple-600" size={20} />
                <span className="text-purple-600 text-sm">输入</span>
              </div>
            </div>
          </div>

          {currentFusion && (
            <div className="space-y-6">
              {/* 视频素材 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">视频素材</h3>
                
                {/* 视频预览 */}
                <div 
                  className="relative w-full bg-gray-100 rounded-lg overflow-hidden mb-4"
                  style={{ 
                    aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1',
                    maxHeight: '600px' // 限制最大高度
                  }}
                >
                  {currentVideoUrl ? (
                    <>
                      <video
                        src={currentVideoUrl}
                        className="w-full h-full object-contain"
                        controls
                      />
                      {/* 导航箭头 */}
                      {currentVideoIndex > 0 && (
                        <button
                          onClick={handlePreviousVideo}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full flex items-center justify-center text-white transition-all"
                        >
                          <ChevronLeft size={24} />
                        </button>
                      )}
                      {currentVideoIndex < allFusions.length - 1 && (
                        <button
                          onClick={handleNextVideo}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full flex items-center justify-center text-white transition-all"
                        >
                          <ChevronRight size={24} />
                        </button>
                      )}
                      {/* 操作按钮 */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <button className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
                          对口型
                        </button>
                        <button className="p-2 bg-gray-800 bg-opacity-80 text-white rounded hover:bg-opacity-100">
                          <Download size={16} />
                        </button>
                        <button className="p-2 bg-gray-800 bg-opacity-80 text-white rounded hover:bg-opacity-100">
                          <Edit size={16} />
                        </button>
                      </div>
                      {/* 星标 */}
                      <button
                        onClick={() => setIsStarred(!isStarred)}
                        className="absolute top-4 right-4 p-2 bg-gray-800 bg-opacity-80 text-yellow-400 rounded hover:bg-opacity-100"
                      >
                        <Star size={20} className={isStarred ? 'fill-current' : ''} />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400">暂无视频</span>
                    </div>
                  )}
                </div>

                {/* 配置选项 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      模型 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={videoModel}
                      onChange={(e) => setVideoModel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-purple-500"
                    >
                      <option value="volcengine-video-3.0-pro">即梦-3.0Pro</option>
                      <option value="viduq2-turbo">ViduQ2-Turbo</option>
                      <option value="veo3.1">Google Veo3.1</option>
                      <option value="veo3.1-pro">Google Veo3.1-Pro</option>
                      <option value="minimax-hailuo-02">MiniMax Hailuo-02</option>
                      <option value="minimax-hailuo-2.3">MiniMax Hailuo-2.3</option>
                      <option value="minimax-hailuo-2.3-fast">MiniMax Hailuo-2.3-fast</option>
                      <option value="kling-2.6">Kling-2.6</option>
                      <option value="kling-o1">Kling-O1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      时长 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-purple-500"
                      min="1"
                      max="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      分辨率 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={videoResolution}
                      onChange={(e) => setVideoResolution(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-purple-500"
                    >
                      <option value="360p">360p</option>
                      <option value="480p">480p</option>
                      <option value="720p">720p</option>
                      <option value="1080p">1080p</option>
                      <option value="1080-pro">1080-pro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      数量 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={videoQuantity}
                      onChange={(e) => setVideoQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-purple-500"
                      min="1"
                      max="2"
                    />
                  </div>
                </div>

                {/* 被选定的图片 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">被选定的图片</label>
                  <div 
                    className="bg-gray-200 rounded border border-gray-300 overflow-hidden"
                    style={{ 
                      aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1',
                      width: '128px' // 保持 w-32 的宽度
                    }}
                  >
                    {currentFusion.image && currentFusion.image !== '/placeholder-image.jpg' ? (
                      <img
                        src={currentFusion.image}
                        alt="选定的图片"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-xs">暂无图片</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 提示词 */}
                <div>
                  <label className="block text-sm font-medium mb-2">提示词</label>
                  <div className="flex gap-2 mb-2">
                    <button className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
                      一键填入提示词框架
                    </button>
                    <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">
                      恢复提示词
                    </button>
                  </div>
                  <textarea
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                    rows={6}
                    placeholder="输入视频提示词..."
                  />
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  关闭
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  提交任务 (消耗7积分)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoEditDrawer


