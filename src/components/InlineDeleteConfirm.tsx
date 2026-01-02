import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface InlineDeleteConfirmProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  message?: string
  anchorElement?: HTMLElement | null
}

function InlineDeleteConfirm({ 
  isOpen, 
  onClose, 
  onConfirm, 
  message,
  anchorElement 
}: InlineDeleteConfirmProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && anchorElement && popupRef.current) {
      const rect = anchorElement.getBoundingClientRect()
      const popup = popupRef.current
      const popupRect = popup.getBoundingClientRect()
      
      // 计算位置：优先显示在按钮上方，如果空间不够则显示在下方
      const spaceAbove = rect.top
      const spaceBelow = window.innerHeight - rect.bottom
      const popupHeight = popupRect.height || 150 // 估算高度
      
      let top: number
      if (spaceBelow >= popupHeight || spaceBelow > spaceAbove) {
        // 显示在按钮下方
        top = rect.bottom + window.scrollY + 5
      } else {
        // 显示在按钮上方
        top = rect.top + window.scrollY - popupHeight - 5
      }
      
      // 水平位置：尽量在按钮右侧，如果空间不够则调整
      const spaceRight = window.innerWidth - rect.right
      const popupWidth = popupRect.width || 320
      
      let left: number
      if (spaceRight >= popupWidth) {
        // 显示在按钮右侧
        left = rect.right + window.scrollX + 10
      } else if (rect.left >= popupWidth) {
        // 显示在按钮左侧
        left = rect.left + window.scrollX - popupWidth - 10
      } else {
        // 居中显示
        left = rect.left + window.scrollX + (rect.width / 2) - (popupWidth / 2)
      }
      
      popup.style.top = `${top}px`
      popup.style.left = `${left}px`
    }
  }, [isOpen, anchorElement])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-[59]"
        onClick={onClose}
      />
      
      {/* 确认框 */}
      <div 
        ref={popupRef}
        className="fixed z-[60] bg-white rounded-lg border border-gray-300 shadow-xl p-4 min-w-[320px]"
        style={{ 
          top: anchorElement ? undefined : '50%',
          left: anchorElement ? undefined : '50%',
          transform: anchorElement ? 'none' : 'translate(-50%, -50%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="text-yellow-600" size={20} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">删除提醒</h3>
      </div>
      <p className="text-gray-700 mb-4 ml-11">
        {message || '确认删除该分镜的视频吗?删除后积分不会返还。'}
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          否
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
        >
          是
        </button>
      </div>
      </div>
    </>
  )
}

export default InlineDeleteConfirm

