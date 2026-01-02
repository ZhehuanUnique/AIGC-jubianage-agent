import { useState, useEffect } from 'react'
import { X, Upload, HelpCircle, Plus } from 'lucide-react'
import { getFusionImageList, FusionImageItem } from '../services/api'

interface CreateFusionImageModalProps {
  onClose: () => void
}

function CreateFusionImageModal({ onClose }: CreateFusionImageModalProps) {
  const [leftVisible, setLeftVisible] = useState(false)
  const [rightVisible, setRightVisible] = useState(false)
  const [imageList, setImageList] = useState<FusionImageItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLeftVisible(true)
    setTimeout(() => {
      setRightVisible(true)
    }, 200)
    
    // 加载图片列表
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
      setTimeout(() => {
        onClose()
      }, 300)
    }, 200)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={handleClose}>
      {/* 左侧窗口 - 在线融合生图 */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2/3 bg-white border-r border-purple-500 overflow-y-auto transition-transform duration-300 ${
          leftVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">在线融合生图</h2>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* 创作模式 */}
            <div>
              <label className="block text-sm mb-2">
                <span className="text-red-500">*</span> 创作模式
              </label>
              <select className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500">
                <option>星融1.0(理解力极强，融合力极强，表情丰富...)</option>
              </select>
            </div>

            {/* 图片名称 */}
            <div>
              <label className="block text-sm mb-2">图片名称(用于搜索)</label>
              <input
                type="text"
                placeholder="图片名称(用于搜索)"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* 资产选择区域 */}
            <div className="grid grid-cols-5 gap-3">
              {['角色', '场景', '物品', '姿势', '特效'].map((asset) => (
                <div key={asset} className="relative">
                  <label className="block text-xs mb-1.5 flex items-center gap-1">
                    {asset}
                    <HelpCircle size={12} className="text-gray-600" />
                  </label>
                  <div className="h-20 bg-white border border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500">
                    <div className="text-center">
                      <Plus size={18} className="mx-auto mb-0.5 text-gray-600" />
                      <span className="text-gray-600 text-xs">
                        {asset === '姿势' || asset === '特效' ? '点击上传' : '新增'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm mb-2">
                <span className="text-red-500">*</span> 描述
              </label>
              <div className="mb-2">
                <button className="px-4 py-1 bg-purple-600 text-white rounded text-sm">一键填入提示词框架</button>
              </div>
              <textarea
                placeholder="结合上传元素，描述希望如何融合生成，描述涵盖每个元素及其关系"
                rows={6}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* 图像尺寸 */}
            <div>
              <label className="block text-sm mb-2">
                <span className="text-red-500">*</span> 图像尺寸
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="size" value="1536x1024" defaultChecked className="text-purple-600" />
                  <span>1536x1024</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="size" value="1024x1024" className="text-purple-600" />
                  <span>1024x1024</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="size" value="1024x1536" className="text-purple-600" />
                  <span>1024x1536</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="size" value="auto" className="text-purple-600" />
                  <span>自动</span>
                </label>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end">
              <button className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all">
                提交任务 (消耗10积分)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧窗口 - 融合生图看板 */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-1/3 bg-white border-l border-purple-500 overflow-y-auto transition-transform duration-300 ${
          rightVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">融合生图看板</h2>
            <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-500">加载中...</p>
              </div>
            </div>
          ) : imageList.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-white rounded-lg flex items-center justify-center">
                  <div className="text-gray-500 text-4xl">💻</div>
                </div>
                <p className="text-gray-500">暂无数据</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {imageList.map((image, index) => (
                <div key={image.key || index} className="relative group">
                  <img
                    src={image.url}
                    alt={`融合生图 ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200 hover:border-purple-500 transition-colors cursor-pointer"
                    onClick={() => window.open(image.url, '_blank')}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="truncate">{new Date(image.lastModified).toLocaleString('zh-CN')}</p>
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
