import { useEffect, useRef, useState } from 'react'

interface PosterCarouselProps {
  posterFolder: '7：10' | '3：4'
}

function PosterCarousel({ posterFolder }: PosterCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollSpeed, setScrollSpeed] = useState(-1) // 负数表示从右往左，正数表示从左往右
  const animationRef = useRef<number>()
  const lastScrollTimeRef = useRef<number>(0)

  // 获取海报图片列表
  const getPosterImages = () => {
    // 7:10 比例的海报
    const posters710 = [
      '/poster/7：10/《斩诡成神：从契约S级女皇开始》海报7x10.png',
      '/poster/7：10/20251212-210409.jpg',
      '/poster/7：10/20251223-182419.jpg',
      '/poster/7：10/20251223-212215.jpg',
      '/poster/7：10/20251226-135120.jpg',
      '/poster/7：10/7b10..jpg',
      '/poster/7：10/7比10 海报比例1.png',
      '/poster/7：10/7比10.jpg',
      '/poster/7：10/海报(7-10).png',
      '/poster/7：10/海报7-10.png',
      '/poster/7：10/海报二.jpg',
    ]

    // 3:4 比例的海报（放在7:10的壳子里）
    const posters34 = [
      '/poster/3：4/1111.png',
      '/poster/3：4/20251114-104251.png',
      '/poster/3：4/20251114-104304.png',
      '/poster/3：4/img_v3_02s8_5d8939cb-b9b1-48b5-bda5-99a6d195f09g.png',
      '/poster/3：4/海报.png',
      '/poster/3：4/海报3-4.png',
    ]

    return posterFolder === '7：10' ? posters710 : posters34
  }

  const posters = getPosterImages()
  const is34 = posterFolder === '3：4'

  // 自动滚动动画
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (containerRef.current && !isDragging) {
        const deltaTime = timestamp - lastScrollTimeRef.current
        if (deltaTime >= 16) { // 约60fps
          containerRef.current.scrollLeft += scrollSpeed * 0.5
          lastScrollTimeRef.current = timestamp
        }
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    lastScrollTimeRef.current = performance.now()
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [scrollSpeed, isDragging])

  // 处理无限循环滚动
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (isDragging) return // 拖动时不处理循环

      const itemWidth = 280 + 16 // 卡片宽度 + gap
      const totalItems = posters.length * 3 // 3组重复
      const totalWidth = itemWidth * totalItems

      // 当滚动到第二组的末尾时，重置到第二组的开头（实现无缝循环）
      if (scrollSpeed < 0) {
        // 从右往左
        const secondGroupEnd = itemWidth * posters.length * 2
        if (container.scrollLeft >= secondGroupEnd - container.clientWidth) {
          container.scrollLeft = itemWidth * posters.length
        }
      } else {
        // 从左往右
        const secondGroupStart = itemWidth * posters.length
        if (container.scrollLeft <= secondGroupStart) {
          container.scrollLeft = itemWidth * posters.length * 2 - container.clientWidth
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [scrollSpeed, isDragging, posters.length])

  // 初始化滚动位置到第二组（中间组）
  useEffect(() => {
    if (containerRef.current) {
      const itemWidth = 280 + 16
      containerRef.current.scrollLeft = itemWidth * posters.length
    }
  }, [posters.length])

  // 鼠标按下
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - containerRef.current.offsetLeft)
    setScrollLeft(containerRef.current.scrollLeft)
  }

  // 鼠标移动
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()
    const x = e.pageX - containerRef.current.offsetLeft
    const walk = (x - startX) * 2 // 拖动速度倍数
    containerRef.current.scrollLeft = scrollLeft - walk

    // 根据拖动方向改变滚动速度
    const deltaX = x - startX
    if (Math.abs(deltaX) > 10) {
      // 如果拖动超过10px，改变滚动方向
      setScrollSpeed(deltaX > 0 ? 1 : -1)
    }
  }

  // 鼠标释放
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 鼠标离开
  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className="flex overflow-x-hidden gap-4 cursor-grab active:cursor-grabbing"
      style={{
        scrollBehavior: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* 复制海报列表以实现无缝循环（3组） */}
      {[...posters, ...posters, ...posters].map((poster, index) => (
        <div
          key={`${poster}-${index}`}
          className="flex-shrink-0 bg-gray-900 rounded-lg overflow-hidden"
          style={{
            width: '280px',
            height: '400px',
            aspectRatio: '7/10',
          }}
        >
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <img
              src={poster}
              alt={`海报 ${index + 1}`}
              className={is34 ? 'w-full h-full object-contain' : 'w-full h-full object-cover'}
              style={is34 ? {
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              } : {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                // 如果图片加载失败，显示占位符
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-500 text-sm">图片加载失败</div>'
                }
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default PosterCarousel

