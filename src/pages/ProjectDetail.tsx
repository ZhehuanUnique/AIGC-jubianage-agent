import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SidebarNavigation from '../components/SidebarNavigation'

function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="fragments" />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4">
          <button
            onClick={() => navigate('/project-management')}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            返回
          </button>
        </div>
        <div className="flex-1 p-6">
          <p className="text-gray-600">项目详情页面 - 项目ID: {projectId}</p>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetail






