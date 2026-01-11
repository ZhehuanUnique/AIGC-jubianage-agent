import { useState, useEffect } from 'react'
import { X, Info, Zap, Cloud, Server } from 'lucide-react'

interface SuperResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (provider: 'tencent' | 'vidu' | 'realesrgan', resolution: string) => void
  currentResolution?: string // 当前视频分辨率（如果已知）
  isLoadingResolution?: boolean // 是否正在加载分辨率
}

// 超分辨率提供商配置
const providers = [
  {
    id: 'tencent' as const,
    name: '腾讯云数据万象',
    icon: Cloud,
    description: '云端处理，速度快，稳定可靠',
    resolutions: ['1080p', '2K', '4K'],
    recommended: true,
    badge: '推荐',
  },
  {
    id: 'vidu' as const,
    name: 'Vidu HD',
    icon: Zap,
    description: 'AI智能超清，画质优秀',
    resolutions: ['1080p', '2K', '4K', '8K'],
    recommended: false,
    badge: 'AI增强',
  },
  {
    id: 'realesrgan' as const,
    name: 'Real-ESRGAN',
    icon: Server,
    description: '本地部署，开源免费',
    resolutions: ['2x', '4x'],
    recommended: false,
    badge: '本地',
  },
]

export function SuperResolutionModal({
  isOpen,
  onClose,
  onConfirm,
  currentResolution,
  isLoadingResolution = false,
}: SuperResolutionModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<'tencent' | 'vidu' | 'realesrgan'>('tencent')
  const [selectedResolution, setSelectedResolution] = useState<string>('1080p')

  // 获取当前选中提供商的配置
  const currentProvider = providers.find(p => p.id === selectedProvider)!

  // 当提供商改变时，自动选择第一个可用分辨率
  useEffect(() => {
    if (currentProvider.resolutions.length > 0) {
      setSelectedResolution(currentProvider.resolutions[0])
    }
  }, [selectedProvider])

  // 当弹窗打开时，重置选择
  useEffect(() => {
    if (isOpen) {
      setSelectedProvider('tencent')
      setSelectedResolution('1080p')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(selectedProvider, selectedResolution)
    onClose()
  }

  // 骨架屏加载组件
  const SkeletonLoader = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  )

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">视频超分辨率</h3>
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
          {/* 当前分辨率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              当前分辨率
            </label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900 min-h-[40px] flex items-center">
              {isLoadingResolution || currentResolution === undefined ? (
                <SkeletonLoader className="h-5 w-24" />
              ) : (
                currentResolution || '未知'
              )}
            </div>
          </div>

          {/* 技术选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              超分辨率技术
            </label>
            <div className="space-y-2">
              {providers.map((provider) => {
                const Icon = provider.icon
                return (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all flex items-start gap-3 ${
                      selectedProvider === provider.id
                        ? 'bg-purple-50 border-2 border-purple-500 shadow-sm'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedProvider === provider.id ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${selectedProvider === provider.id ? 'text-purple-700' : 'text-gray-900'}`}>
                          {provider.name}
                        </span>
                        {provider.badge && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            provider.recommended 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {provider.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{provider.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 目标分辨率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目标分辨率
            </label>
            <div className="flex flex-wrap gap-2">
              {currentProvider.resolutions.map((resolution) => (
                <button
                  key={resolution}
                  onClick={() => setSelectedResolution(resolution)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedResolution === resolution
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {resolution}
                </button>
              ))}
            </div>
            {selectedProvider === 'realesrgan' && (
              <p className="mt-2 text-xs text-gray-500">
                Real-ESRGAN 使用倍数放大（2x = 2倍，4x = 4倍）
              </p>
            )}
            {selectedProvider === 'vidu' && selectedResolution === '8K' && (
              <p className="mt-2 text-xs text-amber-600">
                ⚠️ 8K 分辨率处理时间较长，请耐心等待
              </p>
            )}
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
            开始处理
          </button>
        </div>
      </div>
    </div>
  )
}
