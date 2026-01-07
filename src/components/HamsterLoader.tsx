import React from 'react'

interface HamsterLoaderProps {
  size?: number // 字体大小，默认 14px
  className?: string
}

/**
 * 仓鼠在轮子里跑的加载动画组件
 * 基于 https://uiverse.io/Nawsome/wet-mayfly-23
 */
export default function HamsterLoader({ size = 14, className = '' }: HamsterLoaderProps) {
  return (
    <div 
      aria-label="Orange and tan hamster running in a metal wheel" 
      role="img" 
      className={`wheel-and-hamster ${className}`}
      style={{ fontSize: `${size}px` }}
    >
      <div className="wheel"></div>
      <div className="hamster">
        <div className="hamster__body">
          <div className="hamster__head">
            <div className="hamster__ear"></div>
            <div className="hamster__eye"></div>
            <div className="hamster__nose"></div>
          </div>
          <div className="hamster__limb hamster__limb--fr"></div>
          <div className="hamster__limb hamster__limb--fl"></div>
          <div className="hamster__limb hamster__limb--br"></div>
          <div className="hamster__limb hamster__limb--bl"></div>
          <div className="hamster__tail"></div>
        </div>
      </div>
      <div className="spoke"></div>
    </div>
  )
}

