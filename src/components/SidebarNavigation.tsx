import { useNavigate, useParams } from 'react-router-dom'
import { 
  Film, 
  User, 
  Image as ImageIcon, 
  Box, 
  Layers, 
  Sparkles, 
  Music, 
  Megaphone, 
  BarChart3,
  FileText,
  Users,
  TrendingUp
} from 'lucide-react'

interface SidebarNavigationProps {
  activeTab: string
}

function SidebarNavigation({ activeTab }: SidebarNavigationProps) {
  const navigate = useNavigate()
  const { projectId } = useParams()

  const menuItems = [
    { id: 'fragments', label: '片段管理', icon: Film, path: `/project/${projectId}/fragments` },
    { id: 'characters', label: '角色管理', icon: User, path: `/project/${projectId}/characters` },
    { id: 'scenes', label: '场景管理', icon: ImageIcon, path: `/project/${projectId}/scenes` },
    { id: 'items', label: '物品管理', icon: Box, path: `/project/${projectId}/items` },
    { id: 'fusion', label: '融合生图', icon: Layers, path: `/project/${projectId}/fusion` },
    { id: 'recreation', label: '图片改创', icon: Sparkles, path: `/project/${projectId}/recreation` },
    { id: 'voice', label: '音色创作', icon: Music, path: `/project/${projectId}/voice` },
    { id: 'promotion', label: '推广创作', icon: Megaphone, path: `/project/${projectId}/promotion` },
    { id: 'analytics', label: '数据分析', icon: BarChart3, path: `/project/${projectId}/analytics` },
  ]

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen p-4">
      <div className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default SidebarNavigation






