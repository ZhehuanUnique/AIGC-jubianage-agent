import { useState } from 'react'
import { X } from 'lucide-react'

interface ModeSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (mode: 'fusion' | 'image') => void
}

function ModeSelectionModal({ isOpen, onClose, onConfirm }: ModeSelectionModalProps) {
  const [selectedMode, setSelectedMode] = useState<'fusion' | 'image'>('fusion')

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-50 rounded-lg p-6 w-[500px] border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-gray-900 text-xl font-semibold">创建任务模式选择</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <label className="text-gray-900 text-sm mb-2 block">
            * 请选择任务模式 <span className="text-gray-600">(?)</span>
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedMode('fusion')}
              className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                selectedMode === 'fusion'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-gray-900 shadow-lg'
                  : 'bg-gray-100 text-gray-900 border border-gray-600'
              }`}
            >
              融生视频模式
            </button>
            <button
              onClick={() => setSelectedMode('image')}
              className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                selectedMode === 'image'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-gray-900 shadow-lg'
                  : 'bg-gray-100 text-gray-900 border border-gray-600'
              }`}
            >
              图生视频模式
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-[#3a3a3a] transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(selectedMode)}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-gray-900 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModeSelectionModal

