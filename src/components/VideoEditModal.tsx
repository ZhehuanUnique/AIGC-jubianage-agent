import { useState, useEffect } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

interface VideoEditModalProps {
  isOpen: boolean
  onClose: () => void
  videoId: number
  videoPrompt?: string // 视频提示词（从 RAG 库生成）
}

function VideoEditModal({ isOpen, onClose, videoId, videoPrompt }: VideoEditModalProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(1)
  const [model, setModel] = useState('volcengine-video-3.0-pro')
  const [duration, setDuration] = useState(5)
  const [resolution, setResolution] = useState('720p')
  const [quantity, setQuantity] = useState(1)
  const [prompt, setPrompt] = useState(
    videoPrompt || '真人电影风格，风轻轻吹过，两人的长发和衣角微微飘动。她们静静地站着，没有任何交流，气氛沉静而压抑。镜头缓慢从两人身后向前推进，越过她们的肩膀，展现下方的宫城全貌。'
  )
  
  // 当 videoPrompt prop 变化时，更新 prompt
  useEffect(() => {
    if (videoPrompt) {
      setPrompt(videoPrompt)
    }
  }, [videoPrompt])

  const images = Array.from({ length: 5 }, (_, i) => i + 1)

  const handleSubmit = () => {
    // 提交任务逻辑
    console.log('提交视频编辑任务')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-[90vw] h-[90vh] flex flex-col border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">× 第{videoId}个</h2>
          <div className="text-lg font-semibold">视频素材</div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧列表 */}
          <div className="w-64 border-r border-gray-200 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold mb-4">视频编辑</h3>
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className={`p-2 rounded cursor-pointer ${
                    item === videoId ? 'bg-purple-600' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  <div className="w-full h-16 bg-gradient-to-r from-purple-600 to-purple-700 rounded mb-2 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-1 mx-auto">
                        <span className="text-xs">📹</span>
                      </div>
                      <p className="text-xs text-white">正在生成...</p>
                    </div>
                  </div>
                  <div className={`text-xs text-center ${item === videoId ? 'text-white' : 'text-gray-700'}`}>序号 {item}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧主内容 */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            {/* 视频预览区域 */}
            <div className="relative mb-6">
              <div className="w-full h-64 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <span className="text-4xl">🎬</span>
                  </div>
                  <p className="text-white">您无需停留等待 正在生成第{videoId}个视频...</p>
                </div>
              </div>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70">
                <ChevronLeft size={20} className="text-white" />
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70">
                <ChevronRight size={20} className="text-white" />
              </button>
            </div>

            {/* 配置选项 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">
                  模型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value="volcengine-video-3.0-pro">即梦-3.0Pro</option>
                  <option value="doubao-seedance-1-5-pro-251215">即梦-3.5Pro</option>
                  <option value="viduq2-turbo">Vidu Q2 Turbo</option>
                  <option value="viduq2-pro">Vidu Q2 Pro</option>
                  <option value="veo3.1">Veo3.1</option>
                  <option value="veo3.1-pro">Veo3.1-Pro</option>
                  <option value="minimax-hailuo-02">Hailuo-02</option>
                  <option value="minimax-hailuo-2.3">Hailuo-2.3</option>
                  <option value="minimax-hailuo-2.3-fast">Hailuo-2.3-fast</option>
                  <option value="minimax-i2v-01-live">Hailuo-01-Live</option>
                  <option value="minimax-i2v-01-director">Hailuo-01-Director</option>
                  <option value="minimax-s2v-01">Hailuo-S2V</option>
                  <option value="kling-2.6">Kling-2.6</option>
                  <option value="kling-o1">Kling-O1</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2">
                    时长 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  >
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    分辨率 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  >
                    <option>720p</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    数量 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">被选定的图片</label>
                <div className="flex gap-2">
                  {images.map((imgId) => (
                    <div
                      key={imgId}
                      onClick={() => setSelectedImage(imgId)}
                      className={`relative w-24 h-16 bg-white border-2 rounded cursor-pointer ${
                        selectedImage === imgId
                          ? 'border-purple-500'
                          : 'border-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gray-500 text-xs">图片 {imgId}</span>
                      </div>
                      {selectedImage === imgId && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">视频提示词</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                  rows={6}
                />
                <div className="flex gap-2 mt-2">
                  <button className="px-4 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
                    一键填入提示词框架
                  </button>
                  <button className="px-4 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
                    恢复提示词
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            关闭
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700"
          >
            提交任务 (消耗10积分)
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoEditModal
