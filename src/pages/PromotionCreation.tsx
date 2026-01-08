import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SidebarNavigation from '../components/SidebarNavigation'
import { FileText, Music, Upload, X, Loader2, RefreshCw } from 'lucide-react'
import { SunoApi } from '../services/sunoApi'
import { MusicGptApi } from '../services/musicGptApi'
import { getMusicList, deleteMusicFile } from '../services/musicApi'
import { alert, alertError, alertWarning, alertInfo, alertSuccess } from '../utils/alert'
import { AuthService } from '../services/auth'
import { getUserSettings } from '../services/settingsService'
import { openPhotoshop } from '../services/api'
import HamsterLoader from '../components/HamsterLoader'

interface Poster {
  id: string
  url: string
  aspectRatio: '2:3' | '3:4' | '7:10'
  isUploaded: boolean // 是否为上传的图片
  width?: number // 图片宽度
  height?: number // 图片高度
}

function PromotionCreation() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [activeSubTab, setActiveSubTab] = useState<'poster' | 'music'>('poster')
  const [posterPrompt, setPosterPrompt] = useState('')
  const [generatedPosterPrompt, setGeneratedPosterPrompt] = useState('')
  const [themeSongPrompt, setThemeSongPrompt] = useState('')
  const [generatedThemeSongPrompt, setGeneratedThemeSongPrompt] = useState('')
  const [generatedLyrics, setGeneratedLyrics] = useState('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'2:3' | '3:4' | '7:10'>('2:3')
  const [posters, setPosters] = useState<Poster[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 配乐创作相关状态
  const [musicProvider, setMusicProvider] = useState<'suno' | 'musicgpt'>('suno') // 音乐生成服务提供商
  const [musicModel, setMusicModel] = useState<'V4' | 'V4_5' | 'V4_5PLUS' | 'V4_5ALL' | 'V5'>('V5') // Suno模型版本
  const [musicDuration, setMusicDuration] = useState(10) // 音乐时长（秒，仅MusicGPT支持）
  const [musicTitle, setMusicTitle] = useState('')
  const [musicStyle, setMusicStyle] = useState('')
  const [isInstrumental, setIsInstrumental] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [generatingMusic, setGeneratingMusic] = useState(false)
  const [generatingLyrics, setGeneratingLyrics] = useState(false)
  const [musicList, setMusicList] = useState<Array<{
    taskId: string
    title?: string
    audio_url?: string
    original_url?: string
    image_url?: string
    status?: string
    lyrics?: string
    generating?: boolean
    provider?: 'suno' | 'musicgpt'
    saved?: boolean // 是否已保存到 COS
  }>>([])
  const [savedMusicList, setSavedMusicList] = useState<Array<{
    id: number
    title: string
    prompt: string
    provider: 'suno' | 'musicgpt'
    cos_url: string
    original_url: string
    created_at: string
  }>>([])
  const [loadingSavedMusic, setLoadingSavedMusic] = useState(false)

  // 加载已保存的音乐列表
  useEffect(() => {
    if (activeSubTab === 'music') {
      loadSavedMusic()
    }
  }, [activeSubTab, projectId])

  const loadSavedMusic = async () => {
    setLoadingSavedMusic(true)
    try {
      const list = await getMusicList(projectId ? parseInt(projectId) : undefined)
      setSavedMusicList(list.map(m => ({
        id: m.id,
        title: m.title,
        prompt: m.prompt,
        provider: m.provider,
        cos_url: m.cos_url,
        original_url: m.original_url,
        created_at: m.created_at,
      })))
    } catch (error) {
      console.error('加载已保存音乐失败:', error)
    } finally {
      setLoadingSavedMusic(false)
    }
  }

  // 删除已保存的音乐
  const handleDeleteSavedMusic = async (musicId: number) => {
    if (!confirm('确定要删除这首音乐吗？')) {
      return
    }

    try {
      await deleteMusicFile(musicId)
      setSavedMusicList(prev => prev.filter(m => m.id !== musicId))
      alert('音乐已删除', 'success')
    } catch (error: any) {
      alertError(error.message || '删除失败')
    }
  }

  // 打开Photoshop
  const handleOpenPhotoshop = async () => {
    try {
      const settings = getUserSettings()
      
      // 获取当前页面的海报图URL
      let posterUrl: string | undefined
      if (settings.photoshop.autoImportPoster) {
        // 优先从当前选中的比例的海报图中获取第一个
        const currentPosters = posters.filter(poster => poster.aspectRatio === selectedAspectRatio)
        if (currentPosters.length > 0) {
          // 使用第一个海报图
          posterUrl = currentPosters[0].url
          console.log('📸 找到海报图:', posterUrl)
        } else if (posters.length > 0) {
          // 如果没有当前比例的海报，使用任意一个
          posterUrl = posters[0].url
          console.log('📸 使用第一个海报图:', posterUrl)
        } else {
          // 尝试从 sessionStorage 获取（兼容旧逻辑）
          const savedPoster = sessionStorage.getItem('promotion_poster_url')
          if (savedPoster) {
            posterUrl = savedPoster
            console.log('📸 从 sessionStorage 获取海报图:', posterUrl)
          } else {
            console.warn('⚠️ 未找到海报图，将只打开Photoshop')
          }
        }
      }

      // 调用后端API
      const result = await openPhotoshop({
        autoCreateProject: settings.photoshop.autoCreateProject,
        autoImportPoster: settings.photoshop.autoImportPoster && !!posterUrl,
        posterUrl: posterUrl,
        projectName: projectId || '新项目',
      })

      if (result.success) {
        if (settings.photoshop.autoCreateProject && settings.photoshop.autoImportPoster && posterUrl) {
          alertSuccess('正在打开Photoshop并导入海报图...', '成功')
        } else if (settings.photoshop.autoImportPoster && !posterUrl) {
          alertWarning('未找到海报图，只打开Photoshop。请先上传或生成海报图。', '提示')
        } else {
          alertInfo('正在打开Photoshop...')
        }
      } else {
        alertError(result.error || '无法打开Photoshop', '打开失败')
      }
    } catch (error) {
      console.error('打开Photoshop时出错:', error)
      alertError(error instanceof Error ? error.message : '无法自动打开Photoshop，请手动打开应用', '错误')
    }
  }

  // 检测图片宽高比并分类
  const detectAspectRatio = (width: number, height: number): '2:3' | '3:4' | '7:10' => {
    const ratio = width / height
    
    // 2:3 = 0.6667, 3:4 = 0.75, 7:10 = 0.7
    // 计算与各个比例的差值，选择最接近的
    const ratios = {
      '2:3': Math.abs(ratio - 2/3),
      '3:4': Math.abs(ratio - 3/4),
      '7:10': Math.abs(ratio - 7/10),
    }
    
    // 找到差值最小的比例
    const closest = Object.entries(ratios).reduce((min, [key, value]) => 
      value < min[1] ? [key, value] : min
    )
    
    return closest[0] as '2:3' | '3:4' | '7:10'
  }

  // 处理图片上传
  const handleImageUpload = (files: File[]) => {
    files.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string
        
        // 创建图片对象以获取真实尺寸
        const img = new Image()
        img.onload = () => {
          const width = img.width
          const height = img.height
          const aspectRatio = detectAspectRatio(width, height)
          
          const newPoster: Poster = {
            id: `${Date.now()}-${index}`,
            url: imageUrl,
            aspectRatio,
            isUploaded: true,
            width,
            height,
          }
          
          setPosters(prev => [...prev, newPoster])
        }
        img.onerror = () => {
          console.error('图片加载失败:', file.name)
        }
        img.src = imageUrl
      }
      reader.readAsDataURL(file)
    })
  }

  // 生成歌词
  const handleGenerateLyrics = async () => {
    if (!themeSongPrompt.trim()) {
      alert('请输入主题曲需求描述', 'warning')
      return
    }

    setGeneratingLyrics(true)
    try {
      const result = await SunoApi.generateLyrics({
        prompt: themeSongPrompt,
      })
      
      if (result.success && result.data.taskId) {
        // 开始轮询查询歌词生成状态
        pollLyricsStatus(result.data.taskId)
      }
    } catch (error: any) {
      alertError(error.message || '生成歌词失败')
    } finally {
      setGeneratingLyrics(false)
    }
  }

  // 轮询查询歌词状态
  const pollLyricsStatus = async (taskId: string) => {
    const maxAttempts = 30 // 最多查询30次（约2.5分钟）
    let attempts = 0

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setGeneratedLyrics('歌词生成超时，请重试')
        return
      }

      try {
        const result = await SunoApi.getLyricsDetails(taskId)
        
        if (result.success && result.data) {
          const lyricsData = result.data
          if (lyricsData.status === 'complete' && lyricsData.lyrics) {
            setGeneratedLyrics(lyricsData.lyrics)
            setGeneratedThemeSongPrompt(themeSongPrompt) // 使用输入的提示词作为主题曲提示词
          } else if (lyricsData.status === 'failed') {
            setGeneratedLyrics('歌词生成失败，请重试')
          } else {
            attempts++
            setTimeout(poll, 5000) // 每5秒查询一次
          }
        }
      } catch (error) {
        console.error('查询歌词状态失败:', error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          setGeneratedLyrics('查询歌词状态失败，请重试')
        }
      }
    }

    // 首次查询延迟2秒
    setTimeout(poll, 2000)
  }

  // 生成音乐
  const handleGenerateMusic = async () => {
    if (musicProvider === 'suno') {
      // Suno API
      if (customMode) {
        if (!musicTitle.trim() || !musicStyle.trim()) {
          alert('自定义模式下，请填写音乐标题和风格', 'warning')
          return
        }
        if (!isInstrumental && !themeSongPrompt.trim()) {
          alert('非纯音乐模式下，请填写提示词（作为歌词）', 'warning')
          return
        }
      } else {
        if (!themeSongPrompt.trim()) {
          alert('请输入主题曲需求描述', 'warning')
          return
        }
      }

      setGeneratingMusic(true)
      try {
        const request: any = {
          customMode,
          instrumental: isInstrumental,
          model: musicModel,
          prompt: themeSongPrompt,
        }

        if (customMode) {
          request.style = musicStyle
          request.title = musicTitle
        }

        const result = await SunoApi.generateMusic(request)
        
        if (result.success && result.data.taskId) {
          // 添加到音乐列表
          const newMusic = {
            taskId: result.data.taskId,
            title: customMode ? musicTitle : undefined,
            generating: true,
            status: 'generating',
            provider: 'suno',
            saved: false,
          }
          setMusicList(prev => [...prev, newMusic])
          
          // 开始轮询查询音乐生成状态
          pollMusicStatus(result.data.taskId, 'suno')
        }
      } catch (error: any) {
        alertError(error.message || '生成音乐失败')
      } finally {
        setGeneratingMusic(false)
      }
    } else {
      // MusicGPT
      if (!themeSongPrompt.trim()) {
        alert('请输入主题曲需求描述', 'warning')
        return
      }

      setGeneratingMusic(true)
      try {
        const result = await MusicGptApi.generateMusic({
          prompt: themeSongPrompt,
          secs: musicDuration,
        })
        
        if (result.success && result.data) {
          // 添加到音乐列表（优先使用 COS URL）
          const newMusic = {
            taskId: result.data.id || Date.now().toString(),
            title: themeSongPrompt.substring(0, 20),
            audio_url: result.data.cos_url || result.data.audio_url, // 优先使用 COS URL
            original_url: result.data.original_url || result.data.audio_url,
            generating: false,
            status: 'complete',
            provider: 'musicgpt',
            saved: !!result.data.cos_url, // 标记是否已保存到 COS
          }
          setMusicList(prev => [...prev, newMusic])
          
          // 如果已保存到 COS，刷新已保存列表
          if (result.data.cos_url) {
            loadSavedMusic()
            alert('音乐生成成功并已保存到云端！', 'success')
          } else {
            alert('音乐生成成功！', 'success')
          }
        }
      } catch (error: any) {
        alertError(error.message || '生成音乐失败')
      } finally {
        setGeneratingMusic(false)
      }
    }
  }

  // 轮询查询音乐状态
  const pollMusicStatus = async (taskId: string, provider: 'suno' | 'musicgpt' = 'suno') => {
    if (provider === 'musicgpt') {
      // MusicGPT是同步的，不需要轮询
      return
    }
    const maxAttempts = 60 // 最多查询60次（约5分钟）
    let attempts = 0

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setMusicList(prev => prev.map(m => 
          m.taskId === taskId ? { ...m, generating: false, status: 'timeout' } : m
        ))
        return
      }

      try {
        const result = await SunoApi.getMusicDetails(taskId)
        
        if (result.success && result.data) {
          const musicData = result.data
          setMusicList(prev => prev.map(m => 
            m.taskId === taskId ? {
              ...m,
              ...musicData,
              // 优先使用 COS URL
              audio_url: musicData.cos_url || musicData.audio_url,
              original_url: musicData.original_url || musicData.audio_url,
              generating: musicData.status !== 'complete',
              status: musicData.status || 'generating',
              saved: !!musicData.cos_url, // 标记是否已保存到 COS
            } : m
          ))

          // 如果生成完成，显示提示并刷新已保存列表
          if (musicData.status === 'complete') {
            if (musicData.cos_url) {
              loadSavedMusic() // 刷新已保存列表
              alert('音乐生成完成并已保存到云端！', 'success')
            } else {
              alert('音乐生成完成！', 'success')
            }
          }

          // 如果还没完成，继续轮询
          if (musicData.status !== 'complete' && musicData.status !== 'failed') {
            attempts++
            setTimeout(poll, 5000) // 每5秒查询一次
          }
        }
      } catch (error) {
        console.error('查询音乐状态失败:', error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        }
      }
    }

    // 首次查询延迟2秒
    setTimeout(poll, 2000)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="promotion" />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/project-management')}
              className="back-button"
            >
              <svg height="16" width="16" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024"><path d="M874.690416 495.52477c0 11.2973-9.168824 20.466124-20.466124 20.466124l-604.773963 0 188.083679 188.083679c7.992021 7.992021 7.992021 20.947078 0 28.939099-4.001127 3.990894-9.240455 5.996574-14.46955 5.996574-5.239328 0-10.478655-1.995447-14.479783-5.996574l-223.00912-223.00912c-3.837398-3.837398-5.996574-9.046027-5.996574-14.46955 0-5.433756 2.159176-10.632151 5.996574-14.46955l223.019353-223.029586c7.992021-7.992021 20.957311-7.992021 28.949332 0 7.992021 8.002254 7.992021 20.957311 0 28.949332l-188.073446 188.073446 604.753497 0C865.521592 475.058646 874.690416 484.217237 874.690416 495.52477z"></path></svg>
              <span>返回</span>
            </button>
            <h2 className="text-xl font-semibold">推广创作</h2>
          </div>
          {/* 子栏导航 */}
          <div className="flex gap-4 mt-4 border-b border-gray-200">
            <button
              onClick={() => setActiveSubTab('poster')}
              className={`px-4 py-2 flex items-center gap-2 ${
                activeSubTab === 'poster'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText size={18} />
              海报创作
            </button>
            <button
              onClick={() => setActiveSubTab('music')}
              className={`px-4 py-2 flex items-center gap-2 ${
                activeSubTab === 'music'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Music size={18} />
              配乐创作
            </button>
          </div>
        </div>
        <div className="flex-1 p-6 space-y-8">
          {/* 海报创作 */}
          {activeSubTab === 'poster' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText size={20} />
              海报创作
            </h3>
            <div>
              <label className="block text-sm mb-2">请描述您的海报需求（可不填），例如：风格、元素、标题字体等...</label>
              <textarea
                value={posterPrompt}
                onChange={(e) => setPosterPrompt(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                placeholder="请描述您的海报需求..."
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGeneratedPosterPrompt('生成的海报提示词示例...')}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                获取海报提示词
              </button>
              <button
                onClick={handleOpenPhotoshop}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <RefreshCw size={16} />
                导入PS
              </button>
            </div>
            
            {/* 比例选择器 */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-700">海报比例:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedAspectRatio('2:3')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedAspectRatio === '2:3'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-500'
                  }`}
                >
                  2:3
                </button>
                <button
                  onClick={() => setSelectedAspectRatio('3:4')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedAspectRatio === '3:4'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-500'
                  }`}
                >
                  3:4
                </button>
                <button
                  onClick={() => setSelectedAspectRatio('7:10')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedAspectRatio === '7:10'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-500'
                  }`}
                >
                  7:10
                </button>
              </div>
            </div>
            
            {generatedPosterPrompt && (
              <div>
                <label className="block text-sm mb-2">生成的海报提示词:</label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg min-h-[100px]">
                  {generatedPosterPrompt || '生成的海报提示词将显示在这里...'}
                </div>
              </div>
            )}
            
            {/* 上传本地图片 */}
            <div className="flex items-center gap-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files
                    if (files && files.length > 0) {
                      handleImageUpload(Array.from(files))
                    }
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center gap-2"
                >
                  <Upload size={18} />
                  上传本地图片
                </button>
              </div>
              <p className="text-sm text-red-500">Tips：导入本地所有图片，可自动按照尺寸分类哦</p>
            </div>
            
            {/* 海报网格 */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              {posters
                .filter(poster => poster.aspectRatio === selectedAspectRatio)
                .map((poster) => (
                  <div key={poster.id} className="relative group">
                    <div
                      className={`${
                        selectedAspectRatio === '2:3' 
                          ? 'aspect-[2/3]' 
                          : selectedAspectRatio === '3:4'
                          ? 'aspect-[3/4]'
                          : 'aspect-[7/10]'
                      } bg-gray-50 border border-gray-200 rounded-lg overflow-hidden`}
                    >
                      <img
                        src={poster.url}
                        alt="海报"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setPosters(posters.filter(p => p.id !== poster.id))
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
            </div>
          </div>
          )}

          {/* 配乐创作 */}
          {activeSubTab === 'music' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Music size={20} />
              主题曲
            </h3>
            <div>
              <label className="block text-sm mb-2">请描述您的主题曲需求（可不填），例如：风格、情感、节奏等...</label>
              <textarea
                value={themeSongPrompt}
                onChange={(e) => setThemeSongPrompt(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                placeholder="请描述您的主题曲需求..."
              />
            </div>
            {/* 服务提供商和模型选择 */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm mb-2 font-medium">音乐生成服务:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMusicProvider('suno')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      musicProvider === 'suno'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-500'
                    }`}
                  >
                    Suno V5
                  </button>
                  <button
                    onClick={() => setMusicProvider('musicgpt')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      musicProvider === 'musicgpt'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-500'
                    }`}
                  >
                    MusicGPT (本地)
                  </button>
                </div>
              </div>
              
              {musicProvider === 'suno' && (
                <div>
                  <label className="block text-sm mb-2 font-medium">Suno 模型版本:</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5'] as const).map((model) => (
                      <button
                        key={model}
                        onClick={() => setMusicModel(model)}
                        className={`px-3 py-1 rounded text-sm transition-all ${
                          musicModel === model
                            ? 'bg-purple-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-500'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    V4: 最长4分钟 | V4_5/V4_5PLUS/V4_5ALL: 最长8分钟 | V5: 最新模型
                  </p>
                </div>
              )}
              
              {musicProvider === 'musicgpt' && (
                <div>
                  <label className="block text-sm mb-2 font-medium">音乐时长（秒）:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={musicDuration}
                      onChange={(e) => setMusicDuration(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-700 w-12 text-right">{musicDuration}秒</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    MusicGPT支持精确控制时长（1-30秒），生成速度更快
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              {musicProvider === 'suno' && (
                <button
                  onClick={handleGenerateLyrics}
                  disabled={generatingLyrics || !themeSongPrompt}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {generatingLyrics ? (
                    <>
                      <HamsterLoader size={4} />
                      <span>生成中...</span>
                    </>
                  ) : (
                    '生成歌词'
                  )}
                </button>
              )}
              <button
                onClick={handleGenerateMusic}
                disabled={generatingMusic || (!themeSongPrompt && !customMode)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generatingMusic ? (
                  <>
                    <HamsterLoader size={4} />
                    <span>生成中...</span>
                  </>
                ) : (
                  '生成音乐'
                )}
              </button>
            </div>
            
            {/* 高级选项 */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customMode"
                  checked={customMode}
                  onChange={(e) => setCustomMode(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="customMode" className="text-sm text-gray-700">自定义模式（需要提供风格和标题）</label>
              </div>
              {customMode && (
                <>
                  <div>
                    <label className="block text-sm mb-2">音乐标题:</label>
                    <input
                      type="text"
                      value={musicTitle}
                      onChange={(e) => setMusicTitle(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      placeholder="请输入音乐标题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">音乐风格:</label>
                    <input
                      type="text"
                      value={musicStyle}
                      onChange={(e) => setMusicStyle(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      placeholder="例如：流行、古典、电子、摇滚等"
                    />
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="instrumental"
                  checked={isInstrumental}
                  onChange={(e) => setIsInstrumental(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="instrumental" className="text-sm text-gray-700">纯音乐（无歌词）</label>
              </div>
            </div>
            {generatedThemeSongPrompt && (
              <>
                <div>
                  <label className="block text-sm mb-2">生成的主题曲提示词:</label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg min-h-[100px]">
                    {generatedThemeSongPrompt || '生成的主题曲提示词将显示在这里...'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2">生成的歌词:</label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg min-h-[200px]">
                    {generatedLyrics}
                  </div>
                </div>
              </>
            )}
            {/* 生成的音乐列表 */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              {musicList.length === 0 ? (
                <div className="col-span-3 text-center text-gray-500 py-8">
                  暂无生成的音乐，点击"生成音乐"开始创作
                </div>
              ) : (
                musicList.map((music, index) => (
                  <div key={music.taskId || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="mb-2 text-sm text-gray-700">{music.title || `音乐 ${index + 1}`}</div>
                    {music.status === 'complete' && music.audio_url ? (
                      <>
                        {music.lyrics && (
                          <div className="mb-2 text-xs text-gray-600 line-clamp-2">{music.lyrics.substring(0, 50)}...</div>
                        )}
                        <div className="flex items-center gap-2">
                          <audio
                            src={music.audio_url}
                            controls
                            className="flex-1"
                            onLoadedMetadata={(e) => {
                              const audio = e.target as HTMLAudioElement
                              const duration = audio.duration
                              const minutes = Math.floor(duration / 60)
                              const seconds = Math.floor(duration % 60)
                              // 可以在这里更新显示的时间
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <HamsterLoader size={3} />
                        <span className="text-xs text-gray-600">
                          {music.generating ? '生成中...' : music.status || '等待中...'}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* 已保存的音乐列表 */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Music size={20} />
                  已保存的音乐
                </h3>
                <button
                  onClick={loadSavedMusic}
                  disabled={loadingSavedMusic}
                  className="text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400 flex items-center gap-1"
                >
                  {loadingSavedMusic ? (
                    <>
                      <HamsterLoader size={3} />
                      <span>加载中...</span>
                    </>
                  ) : (
                    '刷新'
                  )}
                </button>
              </div>
              
              {loadingSavedMusic ? (
                <div className="text-center text-gray-500 py-8 flex flex-col items-center">
                  <HamsterLoader size={8} />
                  <span className="mt-2">加载中...</span>
                </div>
              ) : savedMusicList.length === 0 ? (
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-gray-200">
                  暂无已保存的音乐
                  <div className="text-xs text-gray-400 mt-2">
                    生成的音乐会自动保存到云端
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {savedMusicList.map((music) => (
                    <div key={music.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700">{music.title}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(music.created_at).toLocaleDateString('zh-CN')}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {music.provider === 'suno' ? 'Suno' : 'MusicGPT'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSavedMusic(music.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="删除"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {music.prompt && (
                        <div className="mb-2 text-xs text-gray-600 line-clamp-2">
                          {music.prompt.substring(0, 50)}...
                        </div>
                      )}
                      <audio
                        src={music.cos_url}
                        controls
                        className="w-full"
                      />
                      <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                        <span>✓</span>
                        <span>已保存到云端</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PromotionCreation
