import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Download, Edit, Trash2, Star, Video, Play } from 'lucide-react'
import VideoEditModal from '../components/VideoEditModal'

interface VideoItem {
  id: number
  shotDescription: string
  imageStatus: string
  videoStatus: string
  isGenerating: boolean
}

function VideoEditing() {
  const navigate = useNavigate()
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [videos] = useState<VideoItem[]>([
    {
      id: 1,
      shotDescription: '开场,交代背景。在高塔上,我和闺密并肩而立,俯瞰着华丽但冰冷的宫城,暗示被困七年的压抑。',
      imageStatus: '正在生成中...',
      videoStatus: '正在生成第1个视频...',
      isGenerating: true,
    },
    {
      id: 2,
      shotDescription: '闺密转过身,脸上带着一种奇异的、解脱般的微笑,告诉我一个"好消息"。',
      imageStatus: '正在生成中...',
      videoStatus: '正在生成第1个视频...',
      isGenerating: true,
    },
    {
      id: 3,
      shotDescription: '闺密说出关键信息的第一部分,她的眼神中透露着一种狂热的光芒',
      imageStatus: '正在生成中...',
      videoStatus: '正在生成第1个视频...',
      isGenerating: true,
    },
  ])

  const handleEdit = (id: number) => {
    setSelectedVideoId(id)
    setIsEditModalOpen(true)
  }

  const handleExportAll = () => {
    // 打开文件管理器，保存到桌面
    const scriptName = '剧本名' // 这里应该从状态中获取
    const fileName = scriptName ? `${scriptName}+分镜视频` : `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}+分镜视频`
    
    // 这里后续实现实际的文件保存逻辑
    console.log('导出视频到桌面:', fileName)
    alert(`视频将保存到桌面，文件名: ${fileName}`)
  }

  const handleExportToCapCut = () => {
    // 导出到剪映草稿文件
    console.log('导出到剪映草稿文件')
    alert('导出到剪映草稿文件功能待实现')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* 导航栏 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/image-fusion')}
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
            <div className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">✓</span>
              <span>4. 融图管理</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-pink-500 flex items-center justify-center text-xs font-bold">5</span>
              <span className="border-b-2 border-pink-500">5. 视频编辑</span>
            </div>
          </div>
          <div className="text-sm text-gray-400">进度: 0%</div>
        </div>

        {/* 表格 */}
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0a0a0a]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">序号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">已确认素材</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">视频素材</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">分镜</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video, index) => (
                <tr key={video.id} className="border-t border-gray-800 hover:bg-[#2a2a2a]">
                  <td className="px-4 py-4">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-20 bg-gradient-to-r from-purple-600 to-purple-700 rounded flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <span className="text-2xl">📷</span>
                          </div>
                          <p className="text-xs text-white">{video.imageStatus}</p>
                        </div>
                      </div>
                      <span className="text-gray-400">→</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-20 bg-gradient-to-r from-purple-600 to-purple-700 rounded flex items-center justify-center">
                        <div className="text-center">
                          <Play className="mx-auto mb-2 text-white" size={24} />
                          <p className="text-xs text-white">{video.videoStatus}</p>
                        </div>
                      </div>
                      <span className="text-gray-400">→</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-300 max-w-md">{video.shotDescription}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(video.id)}
                        className="px-3 py-1 text-purple-400 hover:text-purple-300 text-sm"
                      >
                        编辑
                      </button>
                      <button className="px-3 py-1 text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                        <Download size={16} />
                        下载
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
          <button
            onClick={handleExportAll}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 flex items-center gap-2"
          >
            <Star size={18} />
            导出全部选定视频
          </button>
          <button
            onClick={handleExportToCapCut}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Video size={18} />
            导出选定视频到剪映草稿文件
          </button>
        </div>
      </div>

      <VideoEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedVideoId(null)
        }}
        videoId={selectedVideoId || 0}
      />
    </div>
  )
}

export default VideoEditing

