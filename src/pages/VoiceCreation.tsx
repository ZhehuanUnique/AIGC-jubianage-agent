import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { 
  Mic, Play, Pause, Download, Loader2, Volume2, VolumeX, 
  Upload, ChevronLeft, ChevronRight, RotateCcw, X, Music
} from 'lucide-react'
import { getVoices, generateSpeech, checkIndexTtsHealth, type Voice } from '../services/indexTtsApi'
import { alert, alertError, alertWarning } from '../utils/alert'
import AudioWaveform from '../components/AudioWaveform'
import HamsterLoader from '../components/HamsterLoader'

// 情感控制方式
type EmotionControlMethod = 0 | 1 | 2 | 3 // 0: 与参考音频相同, 1: 单独情感参考音频, 2: 情感向量, 3: 情感描述文本

function VoiceCreation() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  
  // 基础状态
  const [text, setText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  
  // 音色参考音频
  const [referenceAudioUrl, setReferenceAudioUrl] = useState<string | null>(null)
  const [referenceAudioFile, setReferenceAudioFile] = useState<File | null>(null)
  const [referenceAudioElement, setReferenceAudioElement] = useState<HTMLAudioElement | null>(null)
  const [isReferencePlaying, setIsReferencePlaying] = useState(false)
  const [referenceCurrentTime, setReferenceCurrentTime] = useState(0)
  const [referenceDuration, setReferenceDuration] = useState(0)
  const [referenceVolume, setReferenceVolume] = useState(100)
  const [referencePlaybackSpeed, setReferencePlaybackSpeed] = useState(1)
  
  // 生成结果音频
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)
  const [generatedAudioElement, setGeneratedAudioElement] = useState<HTMLAudioElement | null>(null)
  const [isGeneratedPlaying, setIsGeneratedPlaying] = useState(false)
  const [generatedCurrentTime, setGeneratedCurrentTime] = useState(0)
  const [generatedDuration, setGeneratedDuration] = useState(0)
  const [generatedVolume, setGeneratedVolume] = useState(100)
  const [generatedPlaybackSpeed, setGeneratedPlaybackSpeed] = useState(1)
  
  // 功能设置
  const [emotionControlMethod, setEmotionControlMethod] = useState<EmotionControlMethod>(0)
  const [emotionReferenceAudioUrl, setEmotionReferenceAudioUrl] = useState<string | null>(null)
  const [emotionReferenceFile, setEmotionReferenceFile] = useState<File | null>(null)
  const [emotionRandom, setEmotionRandom] = useState(false)
  const [emotionWeight, setEmotionWeight] = useState(0.65)
  
  // 情感向量（8个情绪）
  const [emotionVectors, setEmotionVectors] = useState({
    joy: 0,      // 欢喜
    anger: 0,   // 愤怒
    sadness: 0, // 悲哀
    fear: 0,     // 恐惧
    disgust: 0,  // 厌恶
    low: 0,      // 低落
    surprise: 0, // 惊喜
    calm: 0,     // 平静
  })
  
  // 情感描述文本
  const [emotionText, setEmotionText] = useState('')
  
  // 高级设置
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  
  const referenceAudioInputRef = useRef<HTMLInputElement>(null)
  const emotionAudioInputRef = useRef<HTMLInputElement>(null)

  // 检查服务状态
  useEffect(() => {
    checkServiceStatus()
  }, [])

  const checkServiceStatus = async () => {
    setServiceStatus('checking')
    try {
      const isHealthy = await checkIndexTtsHealth()
      setServiceStatus(isHealthy ? 'online' : 'offline')
    } catch (error) {
      setServiceStatus('offline')
    }
  }

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 处理音色参考音频上传
  const handleReferenceAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('audio/')) {
        alertError('请上传音频文件', '文件类型错误')
        return
      }
      setReferenceAudioFile(file)
      const url = URL.createObjectURL(file)
      setReferenceAudioUrl(url)
      
      // 创建音频元素
      const audio = new Audio(url)
      audio.onloadedmetadata = () => {
        setReferenceDuration(audio.duration)
      }
      audio.ontimeupdate = () => {
        setReferenceCurrentTime(audio.currentTime)
      }
      audio.onended = () => {
        setIsReferencePlaying(false)
      }
      setReferenceAudioElement(audio)
    }
  }

  // 情感参考音频相关状态
  const [emotionAudioElement, setEmotionAudioElement] = useState<HTMLAudioElement | null>(null)
  const [isEmotionPlaying, setIsEmotionPlaying] = useState(false)
  const [emotionCurrentTime, setEmotionCurrentTime] = useState(0)
  const [emotionDuration, setEmotionDuration] = useState(0)
  const [emotionPlaybackSpeed, setEmotionPlaybackSpeed] = useState(1)

  // 处理情感参考音频上传
  const handleEmotionAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('audio/')) {
        alertError('请上传音频文件', '文件类型错误')
        return
      }
      setEmotionReferenceFile(file)
      const url = URL.createObjectURL(file)
      setEmotionReferenceAudioUrl(url)
      
      // 创建音频元素
      const audio = new Audio(url)
      audio.onloadedmetadata = () => {
        setEmotionDuration(audio.duration)
      }
      audio.ontimeupdate = () => {
        setEmotionCurrentTime(audio.currentTime)
      }
      audio.onended = () => {
        setIsEmotionPlaying(false)
      }
      setEmotionAudioElement(audio)
    }
  }

  // 播放/暂停情感参考音频
  const handleEmotionPlayPause = () => {
    if (!emotionAudioElement) return
    
    if (isEmotionPlaying) {
      emotionAudioElement.pause()
      setIsEmotionPlaying(false)
    } else {
      emotionAudioElement.play()
      setIsEmotionPlaying(true)
    }
  }

  // 更新情感音频播放速度
  useEffect(() => {
    if (emotionAudioElement) {
      emotionAudioElement.playbackRate = emotionPlaybackSpeed
    }
  }, [emotionPlaybackSpeed, emotionAudioElement])

  // 播放/暂停音色参考音频
  const handleReferencePlayPause = () => {
    if (!referenceAudioElement) return
    
    if (isReferencePlaying) {
      referenceAudioElement.pause()
      setIsReferencePlaying(false)
    } else {
      referenceAudioElement.play()
      setIsReferencePlaying(true)
    }
  }

  // 播放/暂停生成结果音频
  const handleGeneratedPlayPause = () => {
    if (!generatedAudioElement) return
    
    if (isGeneratedPlaying) {
      generatedAudioElement.pause()
      setIsGeneratedPlaying(false)
    } else {
      generatedAudioElement.play()
      setIsGeneratedPlaying(true)
    }
  }

  // 切换音色参考音频静音
  const handleReferenceToggleMute = () => {
    if (!referenceAudioElement) return
    const newMuted = referenceAudioElement.muted
    referenceAudioElement.muted = !newMuted
  }

  // 切换生成结果音频静音
  const handleGeneratedToggleMute = () => {
    if (!generatedAudioElement) return
    const newMuted = generatedAudioElement.muted
    generatedAudioElement.muted = !newMuted
  }

  // 更新播放速度
  useEffect(() => {
    if (referenceAudioElement) {
      referenceAudioElement.playbackRate = referencePlaybackSpeed
    }
  }, [referencePlaybackSpeed, referenceAudioElement])

  useEffect(() => {
    if (generatedAudioElement) {
      generatedAudioElement.playbackRate = generatedPlaybackSpeed
    }
  }, [generatedPlaybackSpeed, generatedAudioElement])

  // 生成语音
  const handleGenerate = async () => {
    if (!text.trim()) {
      alertWarning('请输入要转换的文本')
      return
    }

    if (!referenceAudioFile && !referenceAudioUrl) {
      alertWarning('请上传音色参考音频')
      return
    }

    setIsGenerating(true)
    try {
      // 准备音色参考音频（base64）
      let referenceAudioBase64: string | undefined
      if (referenceAudioFile) {
        const reader = new FileReader()
        referenceAudioBase64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            if (reader.result) {
              resolve(reader.result as string)
            } else {
              reject(new Error('读取音频文件失败'))
            }
          }
          reader.onerror = reject
          reader.readAsDataURL(referenceAudioFile)
        })
      }

      // 准备情感参考音频（base64）
      let emotionReferenceAudioBase64: string | undefined
      if (emotionReferenceFile && emotionControlMethod === 1) {
        const reader = new FileReader()
        emotionReferenceAudioBase64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            if (reader.result) {
              resolve(reader.result as string)
            } else {
              reject(new Error('读取情感音频文件失败'))
            }
          }
          reader.onerror = reject
          reader.readAsDataURL(emotionReferenceFile)
        })
      }

      // 准备情感向量
      let emotionVectorsArray: number[] | undefined = undefined
      if (emotionControlMethod === 2) {
        emotionVectorsArray = [
          emotionVectors.joy,
          emotionVectors.anger,
          emotionVectors.sadness,
          emotionVectors.fear,
          emotionVectors.disgust,
          emotionVectors.low,
          emotionVectors.surprise,
          emotionVectors.calm,
        ]
      }

      // 调用API生成语音
      const result = await generateSpeech({
        text: text.trim(),
        voiceId: 'default',
        speed: 1.0,
        pitch: 0,
        format: 'wav',
        referenceAudio: referenceAudioBase64,
        emotionControlMethod,
        emotionReferenceAudio: emotionReferenceAudioBase64,
        emotionWeight: (emotionControlMethod === 1 || emotionControlMethod === 2 || emotionControlMethod === 3) ? emotionWeight : undefined,
        emotionVectors: emotionControlMethod === 2 ? emotionVectorsArray : undefined,
        emotionText: emotionControlMethod === 3 ? emotionText : undefined,
        emotionRandom: emotionControlMethod === 2 ? emotionRandom : undefined,
      })

      if (result.success && result.audioUrl) {
        setGeneratedAudioUrl(result.audioUrl)
        
        // 创建音频元素
        const audio = new Audio(result.audioUrl)
        audio.onloadedmetadata = () => {
          setGeneratedDuration(audio.duration)
        }
        audio.ontimeupdate = () => {
          setGeneratedCurrentTime(audio.currentTime)
        }
        audio.onended = () => {
          setIsGeneratedPlaying(false)
        }
        setGeneratedAudioElement(audio)
        
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

  // 清除音色参考音频
  const clearReferenceAudio = () => {
    if (referenceAudioUrl) {
      URL.revokeObjectURL(referenceAudioUrl)
    }
    if (referenceAudioElement) {
      referenceAudioElement.pause()
      referenceAudioElement.src = ''
    }
    setReferenceAudioUrl(null)
    setReferenceAudioFile(null)
    setReferenceAudioElement(null)
    setIsReferencePlaying(false)
    setReferenceCurrentTime(0)
    setReferenceDuration(0)
    if (referenceAudioInputRef.current) {
      referenceAudioInputRef.current.value = ''
    }
  }

  // 清除情感参考音频
  const clearEmotionAudio = () => {
    if (emotionReferenceAudioUrl) {
      URL.revokeObjectURL(emotionReferenceAudioUrl)
    }
    if (emotionAudioElement) {
      emotionAudioElement.pause()
      emotionAudioElement.src = ''
    }
    setEmotionReferenceAudioUrl(null)
    setEmotionReferenceFile(null)
    setEmotionAudioElement(null)
    setIsEmotionPlaying(false)
    setEmotionCurrentTime(0)
    setEmotionDuration(0)
    if (emotionAudioInputRef.current) {
      emotionAudioInputRef.current.value = ''
    }
  }

  // 重置情感向量
  const resetEmotionVectors = () => {
    setEmotionVectors({
      joy: 0,
      anger: 0,
      sadness: 0,
      fear: 0,
      disgust: 0,
      low: 0,
      surprise: 0,
      calm: 0,
    })
  }

  // 重置情感权重
  const resetEmotionWeight = () => {
    setEmotionWeight(0.65)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="voice" />
      <div className="flex-1 flex flex-col">
        {/* 顶部标题栏 */}
        <div className="border-b border-gray-200 px-6 py-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/project-management')}
                className="back-button"
              >
                <svg height="16" width="16" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M874.690416 495.52477c0 11.2973-9.168824 20.466124-20.466124 20.466124l-604.773963 0 188.083679 188.083679c7.992021 7.992021 7.992021 20.947078 0 28.939099-4.001127 3.990894-9.240455 5.996574-14.46955 5.996574-5.239328 0-10.478655-1.995447-14.479783-5.996574l-223.00912-223.00912c-3.837398-3.837398-5.996574-9.046027-5.996574-14.46955 0-5.433756 2.159176-10.632151 5.996574-14.46955l223.019353-223.029586c7.992021-7.992021 20.957311-7.992021 28.949332 0 7.992021 8.002254 7.992021 20.957311 0 28.949332l-188.073446 188.073446 604.753497 0C865.521592 475.058646 874.690416 484.217237 874.690416 495.52477z"></path></svg>
                <span>返回</span>
              </button>
              <h2 className="text-xl font-semibold">音色创作</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                serviceStatus === 'online' ? 'bg-green-500' : 
                serviceStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span className="text-sm text-gray-600">
                {serviceStatus === 'online' ? '服务在线' : 
                 serviceStatus === 'offline' ? '服务离线' : '检查中...'}
              </span>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          {/* 三栏布局：音色参考音频 | 文本输入 | 生成结果 */}
          <div className="max-w-7xl mx-auto grid grid-cols-3 gap-6 mb-6">
            {/* 左侧：音色参考音频 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">音色参考音频</div>
              
              {!referenceAudioUrl ? (
                <div
                  onClick={() => referenceAudioInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <div className="text-sm text-gray-600 mb-1">将音频拖放到此处</div>
                  <div className="text-xs text-gray-400 mb-1">- 或 -</div>
                  <div className="text-sm text-gray-600">点击上传</div>
                  <input
                    ref={referenceAudioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleReferenceAudioUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 音频波形 */}
                  <AudioWaveform
                    audioUrl={referenceAudioUrl}
                    audioElement={referenceAudioElement}
                    currentTime={referenceCurrentTime}
                    duration={referenceDuration}
                    color="#ff6b35"
                    height={80}
                  />
                  
                  {/* 时间显示 */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatTime(referenceCurrentTime)}</span>
                    <span>{formatTime(referenceDuration)}</span>
                  </div>
                  
                  {/* 播放控制 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReferenceToggleMute}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Volume2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setReferencePlaybackSpeed(prev => prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      {referencePlaybackSpeed}x
                    </button>
                    <button
                      onClick={() => referenceAudioElement && (referenceAudioElement.currentTime = Math.max(0, referenceAudioElement.currentTime - 5))}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={handleReferencePlayPause}
                      className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                    >
                      {isReferencePlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={() => referenceAudioElement && (referenceAudioElement.currentTime = Math.min(referenceAudioElement.duration || 0, referenceAudioElement.currentTime + 5))}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => {
                        if (referenceAudioElement) {
                          referenceAudioElement.loop = !referenceAudioElement.loop
                        }
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="循环播放"
                    >
                      <RotateCcw className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={clearReferenceAudio}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors ml-auto"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  
                  {/* 上传和录音按钮 */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => referenceAudioInputRef.current?.click()}
                      className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      上传
                    </button>
                    <button
                      className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      录音
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 中间：文本输入 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">文本</div>
              <div className="text-xs text-gray-500 mb-2">当前模型版本2.0</div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="请输入目标文本"
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim() || !referenceAudioUrl || serviceStatus !== 'online'}
                className="w-full mt-4 bg-gray-800 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isGenerating ? (
                  <>
                    <HamsterLoader size={4} />
                    <span>生成中...</span>
                  </>
                ) : (
                  '生成语音'
                )}
              </button>
            </div>

            {/* 右侧：生成结果 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">生成结果</div>
              
              {!generatedAudioUrl ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <Music className="w-12 h-12 mx-auto text-gray-400" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 音频波形 */}
                  <AudioWaveform
                    audioUrl={generatedAudioUrl}
                    audioElement={generatedAudioElement}
                    currentTime={generatedCurrentTime}
                    duration={generatedDuration}
                    color="#ff6b35"
                    height={80}
                  />
                  
                  {/* 时间显示 */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatTime(generatedCurrentTime)}</span>
                    <span>{formatTime(generatedDuration)}</span>
                  </div>
                  
                  {/* 播放控制 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGeneratedToggleMute}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Volume2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setGeneratedPlaybackSpeed(prev => prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      {generatedPlaybackSpeed}x
                    </button>
                    <button
                      onClick={() => generatedAudioElement && (generatedAudioElement.currentTime = Math.max(0, generatedAudioElement.currentTime - 5))}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={handleGeneratedPlayPause}
                      className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                    >
                      {isGeneratedPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={() => generatedAudioElement && (generatedAudioElement.currentTime = Math.min(generatedAudioElement.duration || 0, generatedAudioElement.currentTime + 5))}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => {
                        if (generatedAudioUrl) {
                          const link = document.createElement('a')
                          link.href = generatedAudioUrl
                          link.download = `voice_${Date.now()}.wav`
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        }
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors ml-auto"
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 功能设置区域 */}
          <div className="max-w-7xl mx-auto bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-700">功能设置</div>
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {showAdvancedSettings ? '收起' : '展开'}
              </button>
            </div>

            {/* 情感控制方式 */}
            <div className="mb-6">
              <div className="text-sm font-medium text-gray-700 mb-3">情感控制方式</div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: 0, label: '与参考音频的音色相同' },
                  { value: 1, label: '使用单独的情感参考音频' },
                  { value: 2, label: '使用情感向量控制' },
                  { value: 3, label: '使用情感描述文本控制' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      emotionControlMethod === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="emotionControl"
                      value={option.value}
                      checked={emotionControlMethod === option.value}
                      onChange={(e) => setEmotionControlMethod(parseInt(e.target.value) as EmotionControlMethod)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                      emotionControlMethod === option.value
                        ? 'border-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {emotionControlMethod === option.value && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 根据选择显示不同的控制选项 */}
            {emotionControlMethod === 1 && (
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-700 mb-3">上传情感参考音频</div>
                {!emotionReferenceAudioUrl ? (
                  <div
                    onClick={() => emotionAudioInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm text-gray-600">点击上传情感参考音频</div>
                    <input
                      ref={emotionAudioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleEmotionAudioUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AudioWaveform
                      audioUrl={emotionReferenceAudioUrl}
                      audioElement={emotionAudioElement}
                      currentTime={emotionCurrentTime}
                      duration={emotionDuration}
                      color="#ff6b35"
                      height={60}
                    />
                    
                    {/* 时间显示 */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatTime(emotionCurrentTime)}</span>
                      <span>{formatTime(emotionDuration)}</span>
                    </div>
                    
                    {/* 播放控制 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => emotionAudioElement && (emotionAudioElement.muted = !emotionAudioElement.muted)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Volume2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setEmotionPlaybackSpeed(prev => prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        {emotionPlaybackSpeed}x
                      </button>
                      <button
                        onClick={() => emotionAudioElement && (emotionAudioElement.currentTime = Math.max(0, emotionAudioElement.currentTime - 5))}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={handleEmotionPlayPause}
                        className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                      >
                        {isEmotionPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={() => emotionAudioElement && (emotionAudioElement.currentTime = Math.min(emotionAudioElement.duration || 0, emotionAudioElement.currentTime + 5))}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={clearEmotionAudio}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors ml-auto"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {emotionControlMethod === 2 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-700">情感随机采样</div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emotionRandom}
                      onChange={(e) => setEmotionRandom(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      emotionRandom ? 'bg-blue-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        emotionRandom ? 'translate-x-4' : 'translate-x-0.5'
                      } mt-0.5`} />
                    </div>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    { key: 'joy', label: '欢喜' },
                    { key: 'anger', label: '愤怒' },
                    { key: 'sadness', label: '悲哀' },
                    { key: 'fear', label: '恐惧' },
                    { key: 'disgust', label: '厌恶' },
                    { key: 'low', label: '低落' },
                    { key: 'surprise', label: '惊喜' },
                    { key: 'calm', label: '平静' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{label}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.05"
                            value={emotionVectors[key as keyof typeof emotionVectors]}
                            onChange={(e) => setEmotionVectors(prev => ({
                              ...prev,
                              [key]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => setEmotionVectors(prev => ({ ...prev, [key]: 0 }))}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <RotateCcw className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={emotionVectors[key as keyof typeof emotionVectors]}
                        onChange={(e) => setEmotionVectors(prev => ({
                          ...prev,
                          [key]: parseFloat(e.target.value)
                        }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>0</span>
                        <span>1</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {emotionControlMethod === 3 && (
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="text-xs text-blue-800">
                    说明：此功能处于测试阶段，结果可能不太稳定。
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-700 mb-2">情感描述文本</div>
                <div className="text-xs text-gray-500 mb-2">
                  例如：极度愤怒、非常高兴、危险在悄悄逼近
                </div>
                <textarea
                  value={emotionText}
                  onChange={(e) => setEmotionText(e.target.value)}
                  placeholder="请输入情绪描述(或留空以自动使用目标文本作为情绪描述)"
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                />
              </div>
            )}

            {/* 情感权重（选项1、2、3都显示） */}
            {(emotionControlMethod === 1 || emotionControlMethod === 2 || emotionControlMethod === 3) && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-700">情感权重</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={emotionWeight}
                      onChange={(e) => setEmotionWeight(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={resetEmotionWeight}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={emotionWeight}
                    onChange={(e) => setEmotionWeight(parseFloat(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${emotionWeight * 100}%, #e5e7eb ${emotionWeight * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                    <span>0</span>
                    <span>1</span>
                  </div>
                </div>
              </div>
            )}

            {/* 高级生成参数设置 */}
            {showAdvancedSettings && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="text-sm font-medium text-gray-700 mb-4">高级生成参数设置</div>
                <div className="text-xs text-gray-500">
                  高级参数设置功能待实现...
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
