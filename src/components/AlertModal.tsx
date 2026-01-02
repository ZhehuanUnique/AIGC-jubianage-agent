import { useEffect } from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

export type AlertType = 'info' | 'success' | 'warning' | 'error'

interface AlertModalProps {
  isOpen: boolean
  title?: string
  message: string
  type?: AlertType
  onClose: () => void
  showCloseButton?: boolean
}

export function AlertModal({
  isOpen,
  title,
  message,
  type = 'info',
  onClose,
  showCloseButton = true,
}: AlertModalProps) {
  // 按 ESC 键关闭
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const typeConfig = {
    info: {
      icon: Info,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      titleColor: 'text-blue-800',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      titleColor: 'text-green-800',
      buttonColor: 'bg-green-600 hover:bg-green-700',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      titleColor: 'text-yellow-800',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      titleColor: 'text-red-800',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
  }

  const config = typeConfig[type]
  const Icon = config.icon
  const defaultTitle = {
    info: '提示',
    success: '成功',
    warning: '警告',
    error: '错误',
  }[type]

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`${config.bgColor} ${config.borderColor} border-2 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scaleIn`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-6 pb-4 relative">
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          )}
          <div className="flex items-start gap-4">
            <Icon className={`${config.iconColor} w-6 h-6 flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <h3 className={`${config.titleColor} text-xl font-bold mb-2`}>
                {title || defaultTitle}
              </h3>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 pb-6 flex justify-end">
          <button
            onClick={onClose}
            className={`${config.buttonColor} text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

// 便捷函数：显示提示框
let alertModalHandler: ((props: Omit<AlertModalProps, 'isOpen' | 'onClose'>) => void) | null = null

export function setAlertModalHandler(
  handler: (props: Omit<AlertModalProps, 'isOpen' | 'onClose'>) => void
) {
  alertModalHandler = handler
}

export function showAlert(
  message: string,
  type: AlertType = 'info',
  title?: string
) {
  if (alertModalHandler) {
    alertModalHandler({ message, type, title })
  } else {
    // 降级到原生 alert
    window.alert(message)
  }
}


