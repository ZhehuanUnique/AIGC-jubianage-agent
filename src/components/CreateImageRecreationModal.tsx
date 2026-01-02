import { useState, useEffect, useRef } from 'react'
import { X, Upload, HelpCircle, Plus } from 'lucide-react'
import { getImageRecreationList, ImageRecreationItem } from '../services/api'
import { alertError } from '../utils/alert'

interface CreateImageRecreationModalProps {
  onClose: () => void
  initialImageUrl?: string // 从外部传入的初始图片URL
}

function CreateImageRecreationModal({ onClose, initialImageUrl }: CreateImageRecreationModalProps) {
  const [leftVisible, setLeftVisible] = useState(false)
  const [rightVisible, setRightVisible] = useState(false)
  const [influenceLevel, setInfluenceLevel] = useState(1)
  const [quantity, setQuantity] = useState(1)
  const [imageList, setImageList] = useState<ImageRecreationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(initialImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLeftVisible(true)
    setTimeout(() => {
      setRightVisible(true)
    }, 200)
    
    // 加载图片列表
    loadImageList()
    
    // 如果有初始图片URL，设置到上传图片区域
    if (initialImageUrl) {
      setUploadedImageUrl(initialImageUrl)
    }
  }, [initialImageUrl])
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alertError('请上传图片文件', '文件类型错误')
      return
    }

    // 创建预览URL
    const url = URL.createObjectURL(file)
    setUploadedImageUrl(url)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const loadImageList = async () => {
    try {
      setLoading(true)
      const images = await getImageRecreationList()
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
      {/* 左侧窗口 - 在线改创图片 */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2/3 bg-white border-r border-purple-500 overflow-y-auto transition-transform duration-300 ${
          leftVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">在线改创图片</h2>
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
                <option>星移1.0</option>
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

            {/* 上传本地图片、场景、选择图片、改创图片 */}
            <div className="grid grid-cols-4 gap-3">
              {['上传本地图片', '场景', '选择图片', '改创图片'].map((item) => (
                <div key={item}>
                  <label className="block text-xs mb-1.5 flex items-center gap-1">
                    {item}
                    <HelpCircle size={12} className="text-gray-600" />
                  </label>
                  {item === '上传本地图片' ? (
                    <div 
                      onClick={handleUploadClick}
                      className="h-20 bg-white border border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500 relative overflow-hidden"
                    >
                      {uploadedImageUrl ? (
                        <img 
                          src={uploadedImageUrl} 
                          alt="上传的图片" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center">
                          <Plus size={18} className="mx-auto mb-0.5 text-gray-600" />
                          <span className="text-gray-600 text-xs">点击上传</span>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="h-20 bg-white border border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500">
                      <div className="text-center">
                        <Plus size={18} className="mx-auto mb-0.5 text-gray-600" />
                        <span className="text-gray-600 text-xs">新增</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 提示词 */}
            <div>
              <label className="block text-sm mb-2">
                <span className="text-red-500">*</span> 提示词
              </label>
              <div className="mb-2">
                <button className="px-4 py-1 bg-purple-600 text-white rounded text-sm">一键填入提示词框架</button>
              </div>
              <textarea
                placeholder="通过提示词描述希望如何改创图片"
                rows={6}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* 影响程度 */}
            <div>
              <label className="block text-sm mb-2 flex items-center gap-1">
                <span className="text-red-500">*</span> 影响程度
                <HelpCircle size={14} className="text-gray-600" />
              </label>
              <div className="flex items-center gap-2">
                {['轻微', '轻微+', '中等', '较强', '强烈', '极强'].map((level, index) => (
                  <button
                    key={level}
                    onClick={() => setInfluenceLevel(index + 1)}
                    className={`flex-1 px-2 py-1 rounded text-sm ${
                      influenceLevel === index + 1
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-600'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* 生成数量 */}
            <div>
              <label className="block text-sm mb-2">
                <span className="text-red-500">*</span> 生成数量
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setQuantity(num)}
                    className={`flex-1 px-4 py-2 rounded ${
                      quantity === num
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-600'
                    }`}
                  >
                    {num}
                  </button>
                ))}
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

      {/* 右侧窗口 - 改创图片看板 */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-1/3 bg-white border-l border-purple-500 overflow-y-auto transition-transform duration-300 ${
          rightVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">改创图片看板</h2>
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
                    alt={`改创图片 ${index + 1}`}
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

export default CreateImageRecreationModal
