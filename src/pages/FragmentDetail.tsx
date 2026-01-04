import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Edit2, Save, X } from 'lucide-react'
import { alert } from '../utils/alert'

interface Fragment {
  id: string
  name: string
  description?: string
  imageUrl?: string
  videoUrls?: string[]
}

function FragmentDetail() {
  const { projectId, fragmentId } = useParams()
  const navigate = useNavigate()
  const [fragment, setFragment] = useState<Fragment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  // 加载片段详情
  useEffect(() => {
    loadFragment()
  }, [projectId, fragmentId])

  const loadFragment = async () => {
    if (!projectId || !fragmentId) return

    try {
      setIsLoading(true)
      
      // 从API加载片段详情
      const API_BASE_URL = (() => {
        if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
        const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
        return isProduction ? '' : 'http://localhost:3002'
      })()
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        alert('请先登录', 'warning')
        navigate('/login')
        return
      }

      // 从项目片段列表中查找当前片段
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/fragments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('加载片段失败')
      }

      const result = await response.json()
      if (result.success && result.data) {
        const foundFragment = result.data.find((f: Fragment) => f.id === fragmentId)
        if (foundFragment) {
          setFragment(foundFragment)
          setEditedName(foundFragment.name)
          setEditedDescription(foundFragment.description || '')
        } else {
          alert('片段不存在', 'error')
          navigate(`/project/${projectId}/fragments`)
        }
      }
    } catch (error) {
      console.error('加载片段详情失败:', error)
      alert('加载片段详情失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // 保存编辑
  const handleSave = async () => {
    if (!fragment || !projectId) return

    try {
      const API_BASE_URL = (() => {
        if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
        const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
        return isProduction ? '' : 'http://localhost:3002'
      })()
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        alert('请先登录', 'warning')
        return
      }

      // 更新片段信息（这里需要后端API支持）
      // 暂时只更新本地状态
      setFragment({
        ...fragment,
        name: editedName,
        description: editedDescription,
      })
      setIsEditing(false)
      alert('保存成功', 'success')
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败', 'error')
    }
  }

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // 点击进度条调整进度
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const newTime = percentage * duration
    setCurrentTime(newTime)
    videoRef.current.currentTime = newTime
  }

  // 切换全屏
  const handleToggleFullscreen = () => {
    if (!videoRef.current) return
    
    const element = videoRef.current
    if (!isFullscreen) {
      if (element.requestFullscreen) {
        element.requestFullscreen()
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen()
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen()
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  // 调整音量
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100
      if (newVolume > 0 && isMuted) {
        setIsMuted(false)
        videoRef.current.muted = false
      }
    }
  }

  // 切换静音
  const handleToggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted
      setIsMuted(newMuted)
      videoRef.current.muted = newMuted
    }
  }

  // 跳转到审片页面
  const handleGoToReview = () => {
    if (projectId && fragmentId) {
      navigate(`/project/${projectId}/fragments/${fragmentId}/review`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    )
  }

  if (!fragment) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">片段不存在</div>
      </div>
    )
  }

  const currentVideoUrl = fragment.videoUrls && fragment.videoUrls.length > 0 
    ? fragment.videoUrls[currentVideoIndex] 
    : null

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* 顶部导航 */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/project/${projectId}/fragments`)}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            返回
          </button>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="片段名称"
              />
              <button
                onClick={handleSave}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Save size={18} />
                保存
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditedName(fragment.name)
                  setEditedDescription(fragment.description || '')
                }}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
              >
                <X size={18} />
                取消
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">{fragment.name}</h1>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <Edit2 size={18} />
                编辑
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleGoToReview}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          审片
        </button>
      </div>

      <div className="flex flex-col p-6">
        {/* 视频播放器 */}
        <div className="w-full bg-gray-900 rounded-lg mb-4 overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {currentVideoUrl ? (
            <video
              ref={videoRef}
              src={currentVideoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={(e) => {
                const video = e.currentTarget
                if (video.duration && video.duration > 0) {
                  setCurrentTime(video.currentTime)
                }
              }}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget
                setDuration(video.duration)
                setCurrentTime(0)
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">暂无视频</p>
                <p className="text-sm">该片段还没有关联的视频</p>
              </div>
            </div>
          )}
        </div>

        {/* 视频列表（如果有多个视频） */}
        {fragment.videoUrls && fragment.videoUrls.length > 1 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">视频列表</h3>
            <div className="flex gap-2 overflow-x-auto">
              {fragment.videoUrls.map((url, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentVideoIndex(index)
                    if (videoRef.current) {
                      videoRef.current.src = url
                      videoRef.current.load()
                    }
                  }}
                  className={`px-3 py-1 rounded text-sm ${
                    index === currentVideoIndex
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  视频 {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 播放控制 */}
        {currentVideoUrl && (
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (isPlaying) {
                      videoRef.current.pause()
                    } else {
                      videoRef.current.play()
                    }
                  }
                }}
                className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center hover:bg-purple-700"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
              <div
                ref={progressBarRef}
                onClick={handleProgressClick}
                className="flex-1 h-2 bg-gray-300 rounded-full cursor-pointer"
              >
                <div
                  className="h-full bg-purple-600 rounded-full transition-all"
                  style={{
                    width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                  }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{formatTime(duration)}</span>
              <button
                onClick={handleToggleFullscreen}
                className="w-10 h-10 rounded-full bg-gray-50 border border-gray-300 flex items-center justify-center hover:bg-gray-100"
              >
                <Maximize size={18} />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMute}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* 片段描述 */}
        {isEditing ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
              rows={4}
              placeholder="请输入片段描述..."
            />
          </div>
        ) : (
          fragment.description && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">描述</h3>
              <p className="text-gray-600">{fragment.description}</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default FragmentDetail

