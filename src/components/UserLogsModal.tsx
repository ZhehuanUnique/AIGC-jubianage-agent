import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { UserApi, type OperationLog } from '../services/userApi'

interface UserLogsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: number
  username: string
}

function UserLogsModal({ isOpen, onClose, userId, username }: UserLogsModalProps) {
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    if (isOpen && userId) {
      loadLogs()
    }
  }, [isOpen, userId, page])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await UserApi.getUserOperationLogs(userId, pageSize, (page - 1) * pageSize)
      setLogs(result.logs)
      setTotal(result.total)
    } catch (error) {
      console.error('加载操作日志失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-[90vw] max-w-6xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold">用户操作日志</h2>
            <p className="text-sm text-gray-600 mt-1">用户: {username}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-purple-600" size={32} />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">暂无操作日志</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{log.operationName}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.status === 'success' 
                            ? 'bg-green-100 text-green-700' 
                            : log.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '进行中'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>操作类型: {log.operationType}</div>
                        {log.resourceType && <div>资源类型: {log.resourceType}</div>}
                        {log.description && <div>描述: {log.description}</div>}
                        {log.errorMessage && (
                          <div className="text-red-600">错误: {log.errorMessage}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-purple-600">
                        {log.pointsConsumed.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">积分</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserLogsModal
