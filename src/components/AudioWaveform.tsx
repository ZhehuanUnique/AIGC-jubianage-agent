import { useEffect, useRef, useState } from 'react'

interface AudioWaveformProps {
  audioUrl: string | null
  audioElement: HTMLAudioElement | null
  currentTime: number
  duration: number
  color?: string
  height?: number
}

export default function AudioWaveform({ 
  audioUrl, 
  audioElement, 
  currentTime, 
  duration,
  color = '#ff6b35',
  height = 80
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // 初始化音频分析
  useEffect(() => {
    if (!audioUrl || !audioElement) {
      setWaveformData([])
      return
    }

    const initAudioAnalysis = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = audioContext.createMediaElementSource(audioElement)
        const analyser = audioContext.createAnalyser()
        
        analyser.fftSize = 2048
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)
        analyser.connect(audioContext.destination)
        
        audioContextRef.current = audioContext
        analyserRef.current = analyser
        
        // 实时分析音频并生成波形数据
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        
        const updateWaveform = () => {
          if (!analyser) return
          
          analyser.getByteFrequencyData(dataArray)
          
          // 将频率数据转换为波形条
          const bars = 200
          const step = Math.floor(bufferLength / bars)
          const waveform: number[] = []
          
          for (let i = 0; i < bars; i++) {
            const index = i * step
            const value = dataArray[index] / 255
            waveform.push(value)
          }
          
          setWaveformData(waveform)
          animationFrameRef.current = requestAnimationFrame(updateWaveform)
        }
        
        updateWaveform()
      } catch (error) {
        console.error('初始化音频分析失败:', error)
        // 生成默认波形
        const defaultData: number[] = []
        for (let i = 0; i < 200; i++) {
          defaultData.push(Math.random() * 0.4 + 0.2)
        }
        setWaveformData(defaultData)
      }
    }

    initAudioAnalysis()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [audioUrl, audioElement])

  // 绘制波形
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || waveformData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 获取容器宽度
    const container = containerRef.current
    const width = container ? container.offsetWidth : 800
    canvas.width = width
    canvas.height = height

    const barCount = waveformData.length
    const barWidth = width / barCount
    const progress = duration > 0 ? currentTime / duration : 0
    const progressX = width * progress

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 绘制波形
    waveformData.forEach((value, index) => {
      const x = index * barWidth
      const barHeight = Math.max(2, value * height * 0.8) // 最小高度2px
      const y = (height - barHeight) / 2

      // 判断是否在进度之前
      const isBeforeProgress = x < progressX

      ctx.fillStyle = isBeforeProgress ? color : `${color}80` // 进度前用实色，进度后用半透明
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
    })

    // 绘制进度线
    if (progressX > 0 && progressX < width) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(progressX, 0)
      ctx.lineTo(progressX, height)
      ctx.stroke()
    }
  }, [waveformData, currentTime, duration, color, height])

  // 响应窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const width = containerRef.current.offsetWidth
        canvasRef.current.width = width
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  if (!audioUrl) {
    return (
      <div className="w-full bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-gray-400 text-sm">暂无音频</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full relative bg-gray-50 rounded" style={{ height: `${height}px` }}>
      <canvas
        ref={canvasRef}
        height={height}
        className="w-full h-full"
      />
    </div>
  )
}

