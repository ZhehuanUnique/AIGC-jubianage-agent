import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { Mic, Play, Pause, Download, Loader2, Volume2, VolumeX, Maximize, ChevronsRight, Settings, Film } from 'lucide-react'
import { getVoices, generateSpeech, checkIndexTtsHealth, type Voice } from '../services/indexTtsApi'
import { alert, alertError, alertWarning } from '../utils/alert'

function VoiceCreation() {
  const { projectId } = useParams()
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [text, setText] = useState('')
  const [speed, setSpeed] = useState(1.0)
  const [pitch, setPitch] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [isImporting, setIsImporting] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoop, setIsLoop] = useState(false)

  // 检查服务状态
  useEffect(() => {
    checkServiceStatus()
    loadVoices()
  }, [])

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果用户在输入框中，不处理快捷键
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // 如果没有音频，不处理快捷键
      if (!audioUrl || !audioElement) {
        return
      }

      switch (e.key) {
        case ' ': // 空格键：播放/暂停
          e.preventDefault()
          if (isPlaying) {
            audioElement.pause()
            setIsPlaying(false)
          } else {
            audioElement.play()
            setIsPlaying(true)
          }
          break
        case 'ArrowLeft': // 左方向键：后退5秒
          e.preventDefault()
          audioElement.currentTime = Math.max(0, audioElement.currentTime - 5)
          break
        case 'ArrowRight': // 右方向键：前进5秒
          e.preventDefault()
          audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 5)
          break
        case 'ArrowUp': // 上方向键：增加音量
          e.preventDefault()
          const currentVol = audioElement.volume * 100
          const newVolumeUp = Math.min(100, currentVol + 10)
          setVolume(newVolumeUp)
          audioElement.volume = newVolumeUp / 100
          if (isMuted) {
            setIsMuted(false)
          }
          break
        case 'ArrowDown': // 下方向键：减少音量
          e.preventDefault()
          const currentVolDown = audioElement.volume * 100
          const newVolumeDown = Math.max(0, currentVolDown - 10)
          setVolume(newVolumeDown)
          audioElement.volume = newVolumeDown / 100
          if (newVolumeDown === 0) {
            setIsMuted(true)
          }
          break
        case 'f':
        case 'F': // F键：全屏
          e.preventDefault()
          const playerContainer = document.getElementById('audio-player-container')
          if (playerContainer) {
            if (!isFullscreen) {
              if (playerContainer.requestFullscreen) {
                playerContainer.requestFullscreen()
              } else if ((playerContainer as any).webkitRequestFullscreen) {
                (playerContainer as any).webkitRequestFullscreen()
              }
              setIsFullscreen(true)
            } else {
              if (document.exitFullscreen) {
                document.exitFullscreen()
              } else if ((document as any).webkitExitFullscreen) {
                (document as any).webkitExitFullscreen()
              }
              setIsFullscreen(false)
            }
          }
          break
        case 'Escape': // ESC键：退出全屏
          if (isFullscreen) {
            e.preventDefault()
            if (document.exitFullscreen) {
              document.exitFullscreen()
            } else if ((document as any).webkitExitFullscreen) {
              (document as any).webkitExitFullscreen()
            }
            setIsFullscreen(false)
          }
          break
        case 'm':
        case 'M': // M键：静音/取消静音
          e.preventDefault()
          if (isMuted) {
            audioElement.volume = volume / 100
            setIsMuted(false)
          } else {
            audioElement.volume = 0
            setIsMuted(true)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [audioUrl, audioElement, isPlaying, volume, isMuted, isFullscreen])

  // 音频元素事件监听
  useEffect(() => {
    if (audioElement) {
      const handleTimeUpdate = () => {
        setCurrentTime(audioElement.currentTime)
      }
      const handleLoadedMetadata = () => {
        setDuration(audioElement.duration)
      }
      const handleEnded = () => {
        setIsPlaying(false)
        if (isLoop) {
          audioElement.currentTime = 0
          audioElement.play()
          setIsPlaying(true)
        }
      }

      audioElement.addEventListener('timeupdate', handleTimeUpdate)
      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata)
      audioElement.addEventListener('ended', handleEnded)

      return () => {
        audioElement.removeEventListener('timeupdate', handleTimeUpdate)
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audioElement.removeEventListener('ended', handleEnded)
      }
    }
  }, [audioElement, isLoop])

  const checkServiceStatus = async () => {
    setServiceStatus('checking')
    try {
      const isHealthy = await checkIndexTtsHealth()
      setServiceStatus(isHealthy ? 'online' : 'offline')
    } catch (error) {
      setServiceStatus('offline')
    }
  }

  const loadVoices = async () => {
    try {
      const voicesList = await getVoices()
      setVoices(voicesList)
      if (voicesList.length > 0 && !selectedVoice) {
        setSelectedVoice(voicesList[0].id)
      }
    } catch (error) {
      console.error('加载音色列表失败:', error)
      alertError('加载音色列表失败，请检查 IndexTTS2.5 服务是否运行')
    }
  }

  const handleGenerate = async () => {
    if (!text.trim()) {
      alertWarning('请输入要转换的文本')
      return
    }

    if (!selectedVoice) {
      alertWarning('请选择音色')
      return
    }

    setIsGenerating(true)
    try {
      const result = await generateSpeech({
        text: text.trim(),
        voiceId: selectedVoice,
        speed,
        pitch,
        format: 'wav',
      })

      if (result.success && result.audioUrl) {
        setAudioUrl(result.audioUrl)
        alert('语音生成成功！')
      } else if (result.success && result.audioData) {
        // 如果是 base64 数据，转换为 blob URL
        const audioBlob = base64ToBlob(result.audioData, 'audio/wav')
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        alert('语音生成成功！')
      } else {
        throw new Error(result.error || '生成失败')
      }
    } catch (error) {
      console.error('生成语音失败:', error)
      alertError(error instanceof Error ? error.message : '生成语音失败，请检查服务是否正常运行')
    } finally {
      setIsGenerating(false)
    }
  }

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  const handlePlay = () => {
    if (!audioUrl) return

    if (audioElement) {
      if (isPlaying) {
        audioElement.pause()
        setIsPlaying(false)
      } else {
        audioElement.play()
        setIsPlaying(true)
      }
    } else {
      const audio = new Audio(audioUrl)
      audio.volume = volume / 100
      audio.loop = isLoop
      audio.onended = () => {
        setIsPlaying(false)
        if (isLoop) {
          audio.currentTime = 0
          audio.play()
          setIsPlaying(true)
        }
      }
      audio.onerror = () => {
        alertError('音频播放失败')
        setIsPlaying(false)
      }
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime)
      }
      audio.onloadedmetadata = () => {
        setDuration(audio.duration)
      }
      setAudioElement(audio)
      audio.play()
      setIsPlaying(true)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value)
    setVolume(newVolume)
    if (audioElement) {
      audioElement.volume = newVolume / 100
      if (newVolume === 0) {
        setIsMuted(true)
      } else if (isMuted) {
        setIsMuted(false)
      }
    }
  }

  const handleToggleMute = () => {
    if (!audioElement) return
    
    if (isMuted) {
      audioElement.volume = volume / 100
      setIsMuted(false)
    } else {
      audioElement.volume = 0
      setIsMuted(true)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioElement || !duration) return
    
    const progressBar = e.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    
    audioElement.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleSeek = (seconds: number) => {
    if (!audioElement) return
    const currentDuration = audioElement.duration || duration || 0
    audioElement.currentTime = Math.max(0, Math.min(currentDuration, audioElement.currentTime + seconds))
  }

  const handleToggleFullscreen = () => {
    const playerContainer = document.getElementById('audio-player-container')
    if (!playerContainer) return

    if (!isFullscreen) {
      if (playerContainer.requestFullscreen) {
        playerContainer.requestFullscreen()
      } else if ((playerContainer as any).webkitRequestFullscreen) {
        (playerContainer as any).webkitRequestFullscreen()
      } else if ((playerContainer as any).mozRequestFullScreen) {
        (playerContainer as any).mozRequestFullScreen()
      } else if ((playerContainer as any).msRequestFullscreen) {
        (playerContainer as any).msRequestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      handleExitFullscreen()
    }
  }

  const handleExitFullscreen = () => {
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

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isCurrentlyFullscreen)
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleDownload = () => {
    if (!audioUrl) return

    const link = document.createElement('a')
    link.href = audioUrl
    link.download = `voice_${Date.now()}.wav`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImportToJianying = async () => {
    if (!audioUrl) {
      alertWarning('请先生成语音')
      return
    }

    if (!text.trim()) {
      alertWarning('请输入文本内容')
      return
    }

    setIsImporting(true)
    try {
      const token = localStorage.getItem('token')
      const projectName = `语音项目_${Date.now()}`
      
      // 如果 audioUrl 是 blob URL，需要先转换为可访问的 URL
      let finalAudioUrl = audioUrl
      if (audioUrl.startsWith('blob:')) {
        // 如果是 blob URL，需要先转换为 base64 或上传到服务器
        // 这里我们读取 blob 并转换为 base64
        try {
          const response = await fetch(audioUrl)
          const blob = await response.blob()
          const reader = new FileReader()
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              if (reader.result) {
                resolve(reader.result as string)
              } else {
                reject(new Error('读取 blob 失败'))
              }
            }
            reader.onerror = reject
          })
          reader.readAsDataURL(blob)
          finalAudioUrl = await base64Promise
        } catch (error) {
          alertError('无法处理音频文件，请先下载音频文件，然后使用本地文件导入')
          setIsImporting(false)
          return
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/jianying/generate-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectName,
          audioUrl: finalAudioUrl,
          text: text.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '导入剪映失败')
      }

      const result = await response.json()
      alert(`剪映草稿文件已生成！\n路径: ${result.draftPath}\n\n请在剪映中打开该草稿文件。`, '导入成功')
    } catch (error) {
      console.error('导入剪映失败:', error)
      alertError(error instanceof Error ? error.message : '导入剪映失败，请稍后重试')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="voice" />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">音色创作</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                serviceStatus === 'online' ? 'bg-green-500' : 
                serviceStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span className="text-sm text-gray-600">
                {serviceStatus === 'online' ? '服务在线' : 
                 serviceStatus === 'offline' ? '服务离线' : '检查中...'}
              </span>
              <button
                onClick={checkServiceStatus}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                刷新
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {serviceStatus === 'offline' && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                ⚠️ IndexTTS2.5 服务未运行，请先启动服务：
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                运行：<code className="bg-yellow-100 px-2 py-1 rounded">启动IndexTTS2.5服务.bat</code>
              </p>
            </div>
          )}

          <div className="max-w-4xl mx-auto space-y-6">
            {/* 文本输入 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                输入文本
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="请输入要转换为语音的文本..."
                className="w-full h-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="mt-2 text-sm text-gray-500">
                字符数：{text.length}
              </div>
            </div>

            {/* 音色选择 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择音色
              </label>
              {voices.length > 0 ? (
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} {voice.description ? `- ${voice.description}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-gray-500">
                  正在加载音色列表...
                </div>
              )}
            </div>

            {/* 参数设置 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-gray-600" />
                <label className="text-sm font-medium text-gray-700">参数设置</label>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    语速：{speed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    音调：{pitch > 0 ? '+' : ''}{pitch}
                  </label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={pitch}
                    onChange={(e) => setPitch(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !text.trim() || serviceStatus !== 'online'}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  生成语音
                </>
              )}
            </button>

            {/* 导入剪映按钮 */}
            {audioUrl && (
              <button
                onClick={handleImportToJianying}
                disabled={isImporting || !audioUrl}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>
                    <Film className="w-5 h-5" />
                    导入剪映
                  </>
                )}
              </button>
            )}

            {/* 音频播放器 */}
            {audioUrl && (
              <div id="audio-player-container" className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Volume2 className="w-5 h-5 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">生成的音频</label>
                </div>
                
                <div className="space-y-4">
                  {/* 播放控制 */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePlay}
                      className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors"
                      title="播放/暂停 (空格键)"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleSeek(5)}
                      className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      title="快进5秒 (右方向键)"
                    >
                      <ChevronsRight className="w-5 h-5 text-gray-700" />
                    </button>
                    
                    <span className="text-sm text-gray-600 min-w-[50px]">
                      {formatTime(currentTime)}
                    </span>
                    
                    {/* 进度条 */}
                    <div 
                      onClick={handleProgressClick}
                      className="flex-1 h-2 bg-gray-300 rounded-full relative cursor-pointer"
                      title="点击跳转到指定位置"
                    >
                      <div 
                        className="h-full bg-purple-600 rounded-full transition-all" 
                        style={{ 
                          width: duration > 0 ? `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%` : '0%'
                        }}
                      ></div>
                    </div>
                    
                    <span className="text-sm text-gray-600 min-w-[50px]">
                      {formatTime(duration)}
                    </span>
                    
                    {/* 单曲循环 */}
                    <button
                      onClick={() => {
                        setIsLoop(!isLoop)
                        if (audioElement) {
                          audioElement.loop = !isLoop
                        }
                      }}
                      className={`px-3 py-1 rounded text-sm border transition-colors ${
                        isLoop 
                          ? 'bg-purple-100 border-purple-300 text-purple-700' 
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      title="单曲循环"
                    >
                      单
                    </button>
                    
                    {/* 全屏 */}
                    <button
                      onClick={handleToggleFullscreen}
                      className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      title="全屏 (F键)"
                    >
                      <Maximize className="w-5 h-5 text-gray-700" />
                    </button>
                    
                    {/* 音量控制 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleMute}
                        className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        title="静音/取消静音 (M键或点击喇叭图标)"
                      >
                        {isMuted ? (
                          <VolumeX className="w-5 h-5 text-gray-700" />
                        ) : (
                          <Volume2 className="w-5 h-5 text-gray-700" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                        title="音量 (上下方向键)"
                      />
                    </div>
                    
                    {/* 下载按钮 */}
                    <button
                      onClick={handleDownload}
                      className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors"
                      title="下载音频"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* 快捷键提示 */}
                  <div className="text-xs text-gray-500 space-x-4">
                    <span>空格: 播放/暂停</span>
                    <span>← →: 前进/后退</span>
                    <span>↑ ↓: 音量</span>
                    <span>F: 全屏</span>
                    <span>ESC: 退出全屏</span>
                    <span>M: 静音</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceCreation
