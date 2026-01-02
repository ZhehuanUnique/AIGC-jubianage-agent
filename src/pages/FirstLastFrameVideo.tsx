import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { ArrowLeft, Upload, Play, Loader2, CheckCircle, XCircle, Download } from 'lucide-react'
import { alertSuccess, alertError } from '../utils/alert'

interface VideoTask {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  firstFrameUrl: string
  lastFrameUrl: string
  model: string
  resolution: string
  ratio: string
  duration: number
  text?: string
  createdAt: string
}

function FirstLastFrameVideo() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  
  const [firstFrameFile, setFirstFrameFile] = useState<File | null>(null)
  const [lastFrameFile, setLastFrameFile] = useState<File | null>(null)
  const [firstFramePreview, setFirstFramePreview] = useState<string | null>(null)
  const [lastFramePreview, setLastFramePreview] = useState<string | null>(null)
  
  const [model, setModel] = useState('doubao-seedance-1-5-pro-251215')
  const [resolution, setResolution] = useState('720p')
  const [ratio, setRatio] = useState('16:9')
  const [duration, setDuration] = useState(5)
  const [text, setText] = useState('')
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [tasks, setTasks] = useState<VideoTask[]>([])
  const [selectedTask, setSelectedTask] = useState<VideoTask | null>(null)

  // 处理首帧图片上传
  const handleFirstFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alertError('请上传图片文件', '文件类型错误')
        return
      }
      setFirstFrameFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setFirstFramePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // 处理尾帧图片上传
  const handleLastFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alertError('请上传图片文件', '文件类型错误')
        return
      }
      setLastFrameFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLastFramePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // 生成视频
  const handleGenerate = async () => {
    if (!firstFrameFile || !lastFrameFile) {
      alertError('请上传首帧和尾帧图片', '缺少文件')
      return
    }

    if (!projectId) {
      alertError('项目ID不存在', '错误')
      return
    }

    setIsGenerating(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        alertError('请先登录', '未登录')
        return
      }

      // 创建 FormData
      const formData = new FormData()
      formData.append('firstFrame', firstFrameFile)
      formData.append('lastFrame', lastFrameFile)
      formData.append('projectId', projectId)
      formData.append('model', model)
      formData.append('resolution', resolution)
      formData.append('ratio', ratio)
      formData.append('duration', duration.toString())
      if (text) {
        formData.append('text', text)
      }

      const response = await fetch(`${API_BASE_URL}/api/first-last-frame-video/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        alertSuccess('视频生成任务已提交，正在处理中...', '任务已提交')
        
        // 添加任务到列表
        const newTask: VideoTask = {
          id: result.data.taskId,
          status: 'pending',
          firstFrameUrl: firstFramePreview || '',
          lastFrameUrl: lastFramePreview || '',
          model,
          resolution,
          ratio,
          duration,
          text: text || undefined,
          createdAt: new Date().toISOString(),
        }
        setTasks(prev => [newTask, ...prev])
        setSelectedTask(newTask)
        
        // 开始轮询任务状态
        pollTaskStatus(result.data.taskId)
      } else {
        alertError(result.error || '生成失败', '错误')
      }
    } catch (error) {
      console.error('生成视频失败:', error)
      alertError(error instanceof Error ? error.message : '生成失败，请稍后重试', '错误')
    } finally {
      setIsGenerating(false)
    }
  }

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    if (!projectId) return
    
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'
    const token = localStorage.getItem('auth_token')
    
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/first-last-frame-video/status/${taskId}?projectId=${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        const result = await response.json()

        if (result.success) {
          const task = result.data
          
          // 更新任务状态
          setTasks(prev => prev.map(t => 
            t.id === taskId 
              ? { ...t, status: task.status, videoUrl: task.videoUrl }
              : t
          ))

          // 如果任务完成，更新选中的任务
          if (task.status === 'completed' && task.videoUrl) {
            setSelectedTask(prev => prev?.id === taskId 
              ? { ...prev, status: 'completed', videoUrl: task.videoUrl }
              : prev
            )
            alertSuccess('视频生成完成！', '成功')
            return // 停止轮询
          }

          // 如果任务失败，停止轮询
          if (task.status === 'failed') {
            alertError(task.error || '视频生成失败', '失败')
            return
          }

          // 如果还在处理中，继续轮询
          if (task.status === 'pending' || task.status === 'processing') {
            setTimeout(poll, 3000) // 3秒后再次查询
          }
        }
      } catch (error) {
        console.error('查询任务状态失败:', error)
        setTimeout(poll, 5000) // 5秒后重试
      }
    }

    poll()
  }

  // 下载视频
  const handleDownload = (videoUrl: string, taskId: string) => {
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = `first-last-frame-video-${taskId}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="fragments" />
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/project/${projectId}/fragments`)}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              返回
            </button>
            <h2 className="text-xl font-semibold">首尾帧生视频</h2>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 gap-6">
              {/* 左侧：上传和配置 */}
              <div className="space-y-6">
                {/* 首帧上传 */}
                <div>
                  <label className="block text-sm font-medium mb-2">首帧图片</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {firstFramePreview ? (
                      <div className="relative">
                        <img
                          src={firstFramePreview}
                          alt="首帧预览"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setFirstFrameFile(null)
                            setFirstFramePreview(null)
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer">
                        <Upload size={32} className="text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">点击上传首帧图片</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFirstFrameUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* 尾帧上传 */}
                <div>
                  <label className="block text-sm font-medium mb-2">尾帧图片</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {lastFramePreview ? (
                      <div className="relative">
                        <img
                          src={lastFramePreview}
                          alt="尾帧预览"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setLastFrameFile(null)
                            setLastFramePreview(null)
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer">
                        <Upload size={32} className="text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">点击上传尾帧图片</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLastFrameUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* 配置选项 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">模型</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                    >
                      <option value="doubao-seedance-1-5-pro-251215">即梦AI-视频生成3.5pro</option>
                      <option value="doubao-seedance-1-0-pro-250528">即梦AI-视频生成3.0pro</option>
                      <option value="doubao-seedance-1-0-lite-i2v-250428">即梦AI-视频生成3.0pro (Lite)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">分辨率</label>
                      <select
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      >
                        <option value="480p">480p</option>
                        <option value="720p">720p</option>
                        <option value="1080p">1080p</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">宽高比</label>
                      <select
                        value={ratio}
                        onChange={(e) => setRatio(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      >
                        <option value="16:9">16:9</option>
                        <option value="4:3">4:3</option>
                        <option value="1:1">1:1</option>
                        <option value="3:4">3:4</option>
                        <option value="9:16">9:16</option>
                        <option value="21:9">21:9</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">时长（秒）</label>
                    <input
                      type="number"
                      min="2"
                      max="12"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">文本提示词（可选）</label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="描述视频的运动和效果..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      rows={3}
                    />
                  </div>
                </div>

                {/* 生成按钮 */}
                <button
                  onClick={handleGenerate}
                  disabled={!firstFrameFile || !lastFrameFile || isGenerating}
                  className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      生成视频
                    </>
                  )}
                </button>
              </div>

              {/* 右侧：任务列表和预览 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">生成历史</h3>
                
                {tasks.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    暂无生成记录
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTask?.id === task.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">任务 {task.id.substring(0, 8)}</span>
                          <div className="flex items-center gap-2">
                            {task.status === 'pending' && (
                              <Loader2 size={16} className="animate-spin text-yellow-500" />
                            )}
                            {task.status === 'processing' && (
                              <Loader2 size={16} className="animate-spin text-blue-500" />
                            )}
                            {task.status === 'completed' && (
                              <CheckCircle size={16} className="text-green-500" />
                            )}
                            {task.status === 'failed' && (
                              <XCircle size={16} className="text-red-500" />
                            )}
                          </div>
                        </div>
                        
                        {task.videoUrl && (
                          <div className="mt-2">
                            <video
                              src={task.videoUrl}
                              className="w-full rounded-lg"
                              controls
                              muted
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(task.videoUrl!, task.id)
                              }}
                              className="mt-2 w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                            >
                              <Download size={16} />
                              下载视频
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FirstLastFrameVideo

