import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  message?: string
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, message }: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="text-yellow-600" size={24} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">删除提醒</h3>
        </div>
        <p className="text-gray-700 mb-6 ml-13">
          {message || '确认删除该分镜的视频吗?删除后积分不会返还。'}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmModal


