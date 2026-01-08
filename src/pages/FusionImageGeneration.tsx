import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { Plus, Search, Image as ImageIcon } from 'lucide-react'
import CreateFusionImageModal from '../components/CreateFusionImageModal'

function FusionImageGeneration() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="fusion" />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">融合生图</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索融合生图"
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="flex gap-6">
            {/* 左侧新建图片卡片 */}
            <div
              onClick={() => setShowCreateModal(true)}
              className="w-64 h-48 bg-gray-50 border-2 border-dashed border-pink-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 transition-all"
            >
              <ImageIcon className="text-pink-500 mb-2" size={48} />
              <span className="text-pink-400 font-medium">新建图片</span>
            </div>
          </div>
        </div>
      </div>

      {/* 创建融合图片模态框 */}
      {showCreateModal && <CreateFusionImageModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}

export default FusionImageGeneration

