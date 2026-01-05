import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface UploadToCommunityModalProps {
  isOpen: boolean
  defaultTitle?: string
  onConfirm: (data: { title: string; description?: string; tags?: string[] }) => void
  onCancel: () => void
}

export function UploadToCommunityModal({
  isOpen,
  defaultTitle = '',
  onConfirm,
  onCancel,
}: UploadToCommunityModalProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle)
      setDescription('')
      setTags('')
      // 聚焦到标题输入框
      setTimeout(() => {
        titleInputRef.current?.focus()
        titleInputRef.current?.select()
      }, 100)
    }
  }, [isOpen, defaultTitle])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!title.trim()) {
      return
    }
    const tagsArray = tags.trim() ? tags.split(',').map(t => t.trim()).filter(t => t) : undefined
    onConfirm({
      title: title.trim(),
      description: description.trim() || undefined,
      tags: tagsArray,
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scaleIn max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-6 pb-4 relative border-b border-gray-200">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
          <h3 className="text-xl font-bold text-gray-800 pr-8">
            上传到社区
          </h3>
        </div>

        {/* 表单内容 */}
        <div className="p-6 space-y-4">
          {/* 视频标题 */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              视频标题
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入视频标题"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) {
                  handleConfirm()
                }
              }}
            />
          </div>

          {/* 视频描述 */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              视频描述
              <span className="text-gray-400 text-xs ml-1">（可选）</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入视频描述"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
            />
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              标签
              <span className="text-gray-400 text-xs ml-1">（可选）</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如：标签1, 标签2, 标签3"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) {
                  handleConfirm()
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">多个标签请用逗号分隔</p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!title.trim()}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
              !title.trim()
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

