import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { Plus, Search, Sparkles } from 'lucide-react'
import CreateImageRecreationModal from '../components/CreateImageRecreationModal'

function ImageRecreation() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [initialImageUrl, setInitialImageUrl] = useState<string | null>(null)

  // 检查是否有从其他页面传递的图片URL
  useEffect(() => {
    const imageUrl = sessionStorage.getItem('recreation_image_url')
    if (imageUrl) {
      setInitialImageUrl(imageUrl)
      setShowCreateModal(true)
      // 清除sessionStorage，避免下次进入时自动打开
      sessionStorage.removeItem('recreation_image_url')
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="recreation" />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">图片改创</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索图片改创"
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="flex gap-6">
            {/* 左侧新建图片改创卡片 */}
            <div
              onClick={() => setShowCreateModal(true)}
              className="w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:from-pink-600 hover:to-purple-700 transition-all"
            >
              <Sparkles className="text-gray-900 mb-2" size={48} />
              <span className="text-gray-900 font-medium">图片改创</span>
            </div>

            {/* 右侧空状�?*/}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-gray-500 text-4xl">💻</div>
                </div>
                <p className="text-gray-500">暂无数据</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 创建图片改创模态框 */}
      {showCreateModal && (
        <CreateImageRecreationModal 
          onClose={() => {
            setShowCreateModal(false)
            setInitialImageUrl(null)
          }}
          initialImageUrl={initialImageUrl || undefined}
        />
      )}
    </div>
  )
}

export default ImageRecreation

