import { useState } from 'react'
import { X, Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

interface ImageSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  rowId: number
}

function ImageSelectionModal({ isOpen, onClose, rowId }: ImageSelectionModalProps) {
  const [selectedImages, setSelectedImages] = useState<number[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // 模拟图片数据
  const images = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    url: `/placeholder-${i + 1}.jpg`,
  }))

  const toggleImageSelection = (imageId: number) => {
    setSelectedImages((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
    )
  }

  const handleSubmit = () => {
    // 提交任务逻辑
    console.log('提交任务，选中的图片', selectedImages)
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
          <h2 className="text-xl font-semibold">第{rowId}行</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧列表 */}
          <div className="w-64 border-r border-gray-200 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold mb-4">分镜融图列表</h3>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className={`p-2 rounded cursor-pointer ${
                    item === rowId ? 'bg-purple-600 text-white' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  <div className="w-full h-16 bg-gray-700 rounded mb-2"></div>
                  <div className="text-xs text-center">序号 {item}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧主内容 */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">图片素材</h3>

            {/* 图片画廊 */}
            <div className="relative mb-6">
              <div className="flex gap-4 overflow-x-auto pb-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={`relative flex-shrink-0 w-32 h-20 bg-white border-2 rounded cursor-pointer ${
                      selectedImages.includes(image.id)
                        ? 'border-purple-500'
                        : 'border-gray-300 hover:border-gray-600'
                    }`}
                    onClick={() => toggleImageSelection(image.id)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-gray-500 text-xs">图片 {image.id}</span>
                    </div>
                    {selectedImages.includes(image.id) && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                    {selectedImages.includes(image.id) && (
                      <div className="absolute top-1 left-1 bg-purple-500 text-white text-xs px-1 rounded">
                        选定第{selectedImages.indexOf(image.id) + 1}个
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setCurrentImageIndex((prev) => Math.max(0, prev - 1))}
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() =>
                  setCurrentImageIndex((prev) => Math.min(images.length - 1, prev + 1))
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* 配置选项 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">模型</label>
                <select className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500">
                  <option value="doubao-seedance-1-5-pro-251215">即梦AI-视频生成3.5pro</option>
                  <option value="volcengine-video-3.0-pro">即梦AI-视频生成3.0 Pro</option>
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

              <div>
                <label className="block text-sm mb-2">数量</label>
                <select className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500">
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">比例</label>
                <select className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500">
                  <option>16:9</option>
                  <option>9:16</option>
                  <option>1:1</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">场景</label>
                <div className="flex gap-2">
                  <div className="relative w-20 h-20 bg-white border border-gray-300 rounded">
                    <button className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                      ×
                    </button>
                  </div>
                  <button className="w-20 h-20 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-purple-500">
                    <div className="text-center">
                      <Plus size={20} className="mx-auto mb-1 text-gray-600" />
                      <span className="text-gray-600 text-xs">新增</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">角色</label>
                <div className="flex gap-2">
                  <div className="relative w-20 h-20 bg-white border border-gray-300 rounded">
                    <button className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                      ×
                    </button>
                  </div>
                  <div className="relative w-20 h-20 bg-white border border-gray-300 rounded">
                    <button className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                      ×
                    </button>
                  </div>
                  <button className="w-20 h-20 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-purple-500">
                    <div className="text-center">
                      <Plus size={20} className="mx-auto mb-1 text-gray-600" />
                      <span className="text-gray-600 text-xs">新增</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">图片提示词</label>
                <textarea
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                  rows={8}
                  defaultValue={'真人电影风格，画面描述：在华丽而高耸的古风塔顶，两个身着素雅古装的女主（"我"和"闺密"）并肩站立，凭栏远眺。下方是连绵的宫殿屋顶，显得宏伟而压抑。风吹动她们的发丝和衣袂。视觉重点：观众视线聚焦于两人眺望远方的落寞背影，通过大远景和引导线构图强调她们的渺小与孤独。整体呈现清冷的灰蓝色调，暗示压抑的心情。构图(Composition): 引导线构图。景别(Shot Scale): 大远景(Extreme Long Shot)。机位(Camera Position): 轴线后侧机位。角度(Angle): 俯视(High Angle)。镜头类型(Lens Type): 广角镜头 (Wide-Angle Lens)。光线(Lighting): 阴天的柔和天光(Overcast Soft Light)。'}
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

export default ImageSelectionModal
