import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { Plus, Search, Sparkles, ArrowLeft } from 'lucide-react'
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/project-management')}
              className="back-button"
            >
              <svg height="16" width="16" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M874.690416 495.52477c0 11.2973-9.168824 20.466124-20.466124 20.466124l-604.773963 0 188.083679 188.083679c7.992021 7.992021 7.992021 20.947078 0 28.939099-4.001127 3.990894-9.240455 5.996574-14.46955 5.996574-5.239328 0-10.478655-1.995447-14.479783-5.996574l-223.00912-223.00912c-3.837398-3.837398-5.996574-9.046027-5.996574-14.46955 0-5.433756 2.159176-10.632151 5.996574-14.46955l223.019353-223.029586c7.992021-7.992021 20.957311-7.992021 28.949332 0 7.992021 8.002254 7.992021 20.957311 0 28.949332l-188.073446 188.073446 604.753497 0C865.521592 475.058646 874.690416 484.217237 874.690416 495.52477z"></path></svg>
              <span>返回</span>
            </button>
            <h2 className="text-xl font-semibold">图片改创</h2>
          </div>
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

