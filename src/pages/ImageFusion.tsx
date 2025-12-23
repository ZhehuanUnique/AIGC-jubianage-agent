import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Eye, Check, Star, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import ImageSelectionModal from '../components/ImageSelectionModal'

interface FusionItem {
  id: number
  image: string
  videoPrompt: string
  model: string
  resolution: string
  duration: number
  selected: boolean
}

function ImageFusion() {
  const navigate = useNavigate()
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [fusions] = useState<FusionItem[]>([
    {
      id: 1,
      image: '/placeholder-image.jpg',
      videoPrompt: '真人电影风格,风轻轻吹拂,两人的长发和衣角微微飘动。她们静静地站着,没有任何交流,气氛沉静而压抑。镜头缓慢从两人身后向前推进,越过她们的肩膀,展现下方的宫城全貌。',
      model: '即梦AI-视频生成3.0',
      resolution: '720p',
      duration: 5,
      selected: false,
    },
    {
      id: 2,
      image: '/placeholder-image.jpg',
      videoPrompt: '真人电影风格,画面描述...',
      model: '即梦AI-视频生成3.0',
      resolution: '720p',
      duration: 5,
      selected: false,
    },
    {
      id: 3,
      image: '/placeholder-image.jpg',
      videoPrompt: '真人电影风格,画面描述...',
      model: '即梦AI-视频生成3.0',
      resolution: '720p',
      duration: 5,
      selected: false,
    },
    {
      id: 4,
      image: '/placeholder-image.jpg',
      videoPrompt: '真人电影风格,画面描述...',
      model: '即梦AI-视频生成3.0',
      resolution: '720p',
      duration: 5,
      selected: false,
    },
  ])

  const [globalModel, setGlobalModel] = useState('即梦AI-视频生成3.0')
  const [globalResolution, setGlobalResolution] = useState('720p')
  const [globalDuration, setGlobalDuration] = useState(5)
  const [globalQuantity, setGlobalQuantity] = useState(1)
  const [progress, setProgress] = useState(100)

  const handlePreview = (id: number) => {
    // 预览图片逻辑
    console.log('预览图片:', id)
  }

  const handleOperate = (id: number) => {
    setSelectedRow(id)
    setIsImageModalOpen(true)
  }

  const handleSubmit = () => {
    navigate('/video-editing')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* 导航栏 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/shot-management')}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">✓</span>
              <span>1. 输入剧本(一整集)</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">✓</span>
              <span>2. 资产详情</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">✓</span>
              <span>3. 分镜管理</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-pink-500 flex items-center justify-center text-xs font-bold">4</span>
              <span className="border-b-2 border-pink-500">4. 融图管理</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="px-4 py-2 bg-[#2a2a2a] rounded-lg text-gray-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2a2a2a] text-gray-400 flex items-center justify-center text-xs font-bold">5</span>
              <span>5. 视频编辑</span>
            </div>
          </div>
        </div>

        {/* 全局设置 */}
        <div className="bg-[#1a1a1a] rounded-lg p-4 mb-6 border border-gray-800">
          <div className="flex items-center gap-6">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">模型</label>
              <select
                value={globalModel}
                onChange={(e) => setGlobalModel(e.target.value)}
                className="px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded text-sm focus:outline-none focus:border-purple-500"
              >
                <option>即梦AI-视频生成3.0</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">分辨率</label>
              <select
                value={globalResolution}
                onChange={(e) => setGlobalResolution(e.target.value)}
                className="px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded text-sm focus:outline-none focus:border-purple-500"
              >
                <option>720p</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">时长</label>
              <select
                value={globalDuration}
                onChange={(e) => setGlobalDuration(parseInt(e.target.value))}
                className="px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded text-sm focus:outline-none focus:border-purple-500"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">数量</label>
              <select
                value={globalQuantity}
                onChange={(e) => setGlobalQuantity(parseInt(e.target.value))}
                className="px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded text-sm focus:outline-none focus:border-purple-500"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-1 block">进度</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-green-500 text-sm">✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* 表格 */}
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0a0a0a]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">序号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">已确认素材</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">视频提示词</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">模型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">分辨率</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">时长(秒)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {fusions.map((fusion, index) => (
                <tr key={fusion.id} className="border-t border-gray-800 hover:bg-[#2a2a2a]">
                  <td className="px-4 py-4">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="relative w-24 h-16 bg-[#0a0a0a] rounded border border-gray-700 group cursor-pointer">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gray-500 text-xs">图片</span>
                      </div>
                      <button
                        onClick={() => handlePreview(fusion.id)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 transition-opacity"
                      >
                        <Eye className="text-white" size={20} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-300 line-clamp-2 max-w-md">
                      {fusion.videoPrompt}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm">{fusion.model}</td>
                  <td className="px-4 py-4 text-sm">{fusion.resolution}</td>
                  <td className="px-4 py-4 text-sm">{fusion.duration}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOperate(fusion.id)}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                      >
                        操作
                      </button>
                      <button className="text-gray-400 hover:text-red-500">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between items-center mt-6">
          <button className="px-6 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] flex items-center gap-2">
            <Star size={18} />
            导出选定图片
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            提交至下一步 (消耗230积分)
          </button>
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
    </div>
  )
}

export default ImageFusion

