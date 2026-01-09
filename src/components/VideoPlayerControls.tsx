import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, PictureInPicture2, ChevronUp } from 'lucide-react'

interface VideoPlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  resolution?: string
  onPlayPause: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onMuteToggle: () => void
  onFullscreen: () => void
  onPictureInPicture?: () => void
  showExpandButton?: boolean
  onExpand?: () => void
}

export function VideoPlayerControls({
  videoRef,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  resolution = '720p',
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreen,
  onPictureInPicture,
  showExpandButton = true,
  onExpand,
}: VideoPlayerControlsProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const progressRef = useRef<HTMLDivElement>(null)
  const speedMenuRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)

  const speeds = [0.5, 1, 1.5, 2]

  // 格式化时间
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 处理进度条点击
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const newTime = percentage * duration
    onSeek(newTime)
  }

  // 处理倍速切换
  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed)
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
    setShowSpeedMenu(false)
  }

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false)
      }
      if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
      {/* 点击展开按钮 */}
      {showExpandButton && onExpand && (
        <div className="flex justify-center pb-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onExpand()
            }}
            className="px-4 py-1.5 bg-black/60 hover:bg-black/80 text-white text-sm rounded border border-white/30 transition-colors flex items-center gap-1"
          >
            点击展开
          </button>
        </div>
      )}

      {/* 控制栏 */}
      <div className="px-3 pb-3 pt-2">
        {/* 进度条 */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-1 bg-white/30 rounded-full cursor-pointer mb-3 group"
        >
          <div
            className="h-full bg-white rounded-full relative transition-all"
            style={{ width: `${progress}%` }}
          >
            {/* 进度条拖动点 */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* 控制按钮行 */}
        <div className="flex items-center justify-between text-white text-sm">
          {/* 左侧：播放/暂停 + 时间 */}
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPlayPause()
              }}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </button>
            <span className="text-white/90 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* 右侧：倍速 + 分辨率 + 小窗 + 全屏 + 音量 */}
          <div className="flex items-center gap-2">
            {/* 倍速 */}
            <div className="relative" ref={speedMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSpeedMenu(!showSpeedMenu)
                }}
                className="px-2 py-1 hover:bg-white/20 rounded transition-colors text-white/90"
              >
                倍速
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg py-2 min-w-[80px] shadow-xl">
                  {speeds.map((speed) => (
                    <button
                      key={speed}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSpeedChange(speed)
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-white/20 transition-colors ${
                        playbackRate === speed ? 'text-purple-400' : 'text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 分辨率 */}
            <span className="px-2 py-1 text-white/90">{resolution}</span>

            {/* 小窗播放 */}
            {onPictureInPicture && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPictureInPicture()
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
                title="小窗播放"
              >
                <PictureInPicture2 size={18} />
              </button>
            )}

            {/* 全屏 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFullscreen()
              }}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
              title="全屏"
            >
              <Maximize size={18} />
            </button>

            {/* 音量 */}
            <div className="relative" ref={volumeRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMuteToggle()
                }}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              {showVolumeSlider && (
                <div 
                  className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-3 shadow-xl"
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      e.stopPropagation()
                      onVolumeChange(parseInt(e.target.value))
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayerControls
