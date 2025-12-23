import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Film, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import ModeSelectionModal from '../components/ModeSelectionModal'

interface Task {
  id: number
  title: string
  date: string
  description: string
  progress1: number
  progress2: number
  isCompleted1: boolean
  isExpanded: boolean
}

function TaskList() {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tasks] = useState<Task[]>([
    {
      id: 20869,
      title: '任务 #20869 图生视频模式 1',
      date: '2025/12/23',
      description: '和傅北川结婚的第三年，他出轨了一个叫苏绵绵的年轻大学生。我生病了，流鼻血，医生说我只能活到明年春天，药很贵...',
      progress1: 0,
      progress2: 0,
      isCompleted1: false,
      isExpanded: true,
    },
    {
      id: 18791,
      title: '任务 #18791 图生视频模式 芸3',
      date: '2025/12/20',
      description: '穿书第七年，我的好闺蜜告诉我，只要这具身体死了，我们就能回到原来的世界。然后她从高楼上跳了下去...',
      progress1: 100,
      progress2: 0,
      isCompleted1: true,
      isExpanded: true,
    },
    {
      id: 18787,
      title: '任务 #18787 图生视频模式 芸2',
      date: '2025/12/20',
      description: '穿书第七年，我的好闺蜜告诉我，只要这具身体死了，我们就能回到原来的世界。然后她从高楼上跳了下去...',
      progress1: 0,
      progress2: 0,
      isCompleted1: false,
      isExpanded: true,
    },
  ])

  const handleCreateTask = () => {
    setIsModalOpen(true)
  }

  const handleModeConfirm = (mode: 'fusion' | 'image') => {
    setIsModalOpen(false)
    if (mode === 'image') {
      navigate('/script-input')
    }
  }

  const toggleExpand = (taskId: number) => {
    // 这里可以更新任务展开状态
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">剧本任务列表</h1>
          <button
            onClick={handleCreateTask}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
          >
            创建任务
          </button>
        </div>

        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h2 className="text-lg font-semibold">{task.title}</h2>
                    <span className="text-gray-400 text-sm">{task.date}</span>
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      {task.isExpanded ? '收起' : '展开'}
                    </button>
                  </div>
                  {task.isExpanded && (
                    <div className="mt-2">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {task.description}
                      </p>
                      <button className="text-purple-400 text-sm mt-2 hover:text-purple-300">
                        展开更多
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Play className="text-green-500" size={20} />
                      <div className="w-32 bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            task.isCompleted1 ? 'bg-green-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${task.progress1}%` }}
                        />
                      </div>
                      {task.isCompleted1 ? (
                        <span className="text-green-500 text-xs">✓</span>
                      ) : (
                        <span className="text-xs">{task.progress1}%</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Film className="text-purple-500" size={20} />
                      <div className="w-32 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${task.progress2}%` }}
                        />
                      </div>
                      <span className="text-xs">{task.progress2}%</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center items-center gap-2 mt-6">
          <button className="text-gray-400 hover:text-white">
            <ChevronDown size={20} />
          </button>
          <span className="px-4 py-2 bg-purple-600 rounded text-white">1</span>
          <button className="text-gray-400 hover:text-white">
            <ChevronUp size={20} />
          </button>
        </div>
      </div>

      <ModeSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleModeConfirm}
      />
    </div>
  )
}

export default TaskList

