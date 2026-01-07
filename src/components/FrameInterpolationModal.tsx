import { useState, useEffect, useMemo } from 'react'
import { X, Info } from 'lucide-react'

interface FrameInterpolationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (targetFps: number, method: 'rife' | 'ffmpeg') => void
  currentFps?: number // 当前视频帧率（如果已知）
}

export function FrameInterpolationModal({
  isOpen,
  onClose,
  onConfirm,
  currentFps = 24, // 默认24 FPS
}: FrameInterpolationModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'rife' | 'ffmpeg'>('rife')
  const [selectedFps, setSelectedFps] = useState<number>(30)

  // 根据技术选择计算可用的帧率选项
  const fpsOptions = useMemo(() => {
    if (selectedMethod === 'rife') {
      // RIFE使用2的幂次倍数：2x, 4x, 8x等
      const multipliers = [2, 4, 8] // 可以扩展到16等
      return multipliers.map(mult => ({
        value: Math.round(currentFps * mult),
        label: `${Math.round(currentFps * mult)} FPS (${mult}x)`,
        multiplier: mult,
      }))
    } else {
      // FFmpeg固定选项：30和60 FPS
      return [
        { value: 30, label: '30 FPS', multiplier: null },
        { value: 60, label: '60 FPS', multiplier: null },
      ]
    }
  }, [selectedMethod, currentFps])

  // 当技术选择改变时，自动选择第一个可用选项
  useEffect(() => {
    if (fpsOptions.length > 0) {
      setSelectedFps(fpsOptions[0].value)
    }
  }, [selectedMethod, currentFps]) // 移除fpsOptions依赖，避免循环

  // 当弹窗打开时，重置选择
  useEffect(() => {
    if (isOpen) {
      setSelectedMethod('rife')
      // 计算初始fpsOptions（RIFE模式）
      const initialMultipliers = [2, 4, 8]
      const initialFps = Math.round(currentFps * initialMultipliers[0])
      setSelectedFps(initialFps)
    }
  }, [isOpen, currentFps]) // 移除fpsOptions依赖，避免循环

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(selectedFps, selectedMethod)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">视频补帧</h3>
            <Info size={16} className="text-gray-400" />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 当前帧率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              当前帧率
            </label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
              {currentFps} FPS
            </div>
          </div>

          {/* 技术选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              技术选择
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedMethod('rife')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedMethod === 'rife'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                RIFE
              </button>
              <button
                onClick={() => setSelectedMethod('ffmpeg')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedMethod === 'ffmpeg'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                FFmpeg
              </button>
            </div>
            {selectedMethod === 'rife' && (
              <p className="mt-2 text-xs text-gray-500">
                使用RIFE进行补帧，基于2的幂次倍数（2x, 4x, 8x）
              </p>
            )}
            {selectedMethod === 'ffmpeg' && (
              <p className="mt-2 text-xs text-gray-500">
                使用FFmpeg进行补帧，支持精确帧率控制
              </p>
            )}
          </div>

          {/* 调整至 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              调整至
            </label>
            <div className="space-y-2">
              {fpsOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedFps(option.value)}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    selectedFps === option.value
                      ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            立即生成
          </button>
        </div>
      </div>
    </div>
  )
}

