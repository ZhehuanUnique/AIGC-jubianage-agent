import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface InputPromptModalProps {
  isOpen: boolean
  title: string
  label: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function InputPromptModal({
  isOpen,
  title,
  label,
  defaultValue = '',
  placeholder = '',
  required = false,
  onConfirm,
  onCancel,
}: InputPromptModalProps) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue)
      // 聚焦到输入框
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, defaultValue])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && value.trim()) {
        onConfirm(value.trim())
      }
    }

    window.addEventListener('keydown', handleEscape)
    window.addEventListener('keydown', handleEnter)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('keydown', handleEnter)
    }
  }, [isOpen, value, onConfirm, onCancel])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (required && !value.trim()) {
      return
    }
    onConfirm(value.trim())
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-6 pb-4 relative">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {title}
          </h3>
          <label className="block text-sm text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) {
                handleConfirm()
              }
            }}
          />
        </div>

        {/* 底部按钮 */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={required && !value.trim()}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
              required && !value.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

