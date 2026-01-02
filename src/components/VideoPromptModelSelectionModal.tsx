import { useState } from 'react'
import { X } from 'lucide-react'

interface VideoPromptModelSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (model: string) => void
}

// 可用的视频提示词生成模型
const VIDEO_PROMPT_MODELS = [
  { id: 'ollama-qwen3-vl-8b', name: 'Ollama Qwen3-VL:8b (本地)', description: '本地部署的视觉模型，支持RAG' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', description: '快速响应，支持图片分析' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', description: '高质量输出，支持图片分析' },
]

function VideoPromptModelSelectionModal({ isOpen, onClose, onSelect }: VideoPromptModelSelectionModalProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (selectedModel) {
      onSelect(selectedModel)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">选择视频提示词生成模型</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {VIDEO_PROMPT_MODELS.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => setSelectedModel(model.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedModel === model.id
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-gray-900">{model.name}</div>
              <div className="text-sm text-gray-500 mt-1">{model.description}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedModel}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              selectedModel
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoPromptModelSelectionModal





