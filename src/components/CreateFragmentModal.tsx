import { useState } from 'react'
import { X } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { alert, alertError, alertSuccess } from '../utils/alert'

interface CreateFragmentModalProps {
  onClose: () => void
  onFragmentCreated?: (fragment: { id: string; name: string; description?: string }) => void
}

function CreateFragmentModal({ onClose, onFragmentCreated }: CreateFragmentModalProps) {
  const { projectId } = useParams()
  const [fragmentName, setFragmentName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    // 验证输入
    if (!fragmentName.trim()) {
      alertError('请输入片段名称', '验证失败')
      return
    }

    if (!projectId) {
      alertError('项目ID不存在', '验证失败')
      return
    }

    try {
      setLoading(true)

      // 检查 projectId 是否是数字（数据库ID）
      const numericProjectId = parseInt(projectId, 10)
      if (!isNaN(numericProjectId)) {
        // 如果是数字，调用后端API创建片段（创建分镜）
        try {
          const { AuthService } = await import('../services/auth')
          const token = AuthService.getToken()
          if (!token) {
            throw new Error('未登录，请先登录')
          }

          const API_BASE_URL = (() => {
            if (import.meta.env.VITE_API_BASE_URL !== undefined) {
              return import.meta.env.VITE_API_BASE_URL
            }
            const isProduction = typeof window !== 'undefined' && 
              !window.location.hostname.includes('localhost') && 
              !window.location.hostname.includes('127.0.0.1')
            return isProduction ? '' : 'http://localhost:3002'
          })()

          // 创建分镜（片段对应分镜）
          const response = await fetch(`${API_BASE_URL}/api/projects/${numericProjectId}/shots`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              shotNumber: 1, // 默认分镜号，后端会自动分配
              description: description.trim() || fragmentName.trim(),
              prompt: description.trim() || fragmentName.trim(),
              segment: description.trim() || fragmentName.trim(),
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || '创建片段失败')
          }

          const result = await response.json()
          if (result.success && result.data) {
            const newFragment = {
              id: result.data.id.toString(),
              name: fragmentName.trim(),
              description: description.trim() || undefined,
              projectId: projectId,
              createdAt: result.data.created_at || new Date().toISOString(),
            }

            // 调用回调函数通知父组件
            if (onFragmentCreated) {
              onFragmentCreated({
                id: newFragment.id,
                name: newFragment.name,
                description: newFragment.description,
              })
            }

            // 移除成功弹窗，直接关闭
            onClose()
            return
          } else {
            throw new Error(result.error || '创建片段失败')
          }
        } catch (apiError) {
          console.error('调用后端API创建片段失败:', apiError)
          // API失败时，仍然保存到localStorage作为备用
        }
      }

      // 如果不是数字或API失败，保存到localStorage（兼容模式）
      const newFragment = {
        id: `fragment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: fragmentName.trim(),
        description: description.trim() || undefined,
        projectId: projectId || '',
        createdAt: new Date().toISOString(),
      }

      const storageKey = projectId ? `fragments_${projectId}` : 'fragments'
      const existingFragments = JSON.parse(localStorage.getItem(storageKey) || '[]')
      existingFragments.push(newFragment)
      localStorage.setItem(storageKey, JSON.stringify(existingFragments))

      // 调用回调函数通知父组件
      if (onFragmentCreated) {
        onFragmentCreated({
          id: newFragment.id,
          name: newFragment.name,
          description: newFragment.description,
        })
      }

      // 移除成功弹窗，直接关闭
      onClose()
    } catch (error) {
      console.error('创建片段失败:', error)
      alertError(error instanceof Error ? error.message : '创建片段失败，请稍后重试', '错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg border border-purple-500 w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">创建片段</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <X size={24} />
          </button>
        </div>

        {/* 表单 */}
        <div className="space-y-6">
          {/* 片段名称 */}
          <div>
            <label className="block text-sm mb-2">
              <span className="text-red-500">*</span> 片段名称
            </label>
            <input
              type="text"
              value={fragmentName}
              onChange={(e) => setFragmentName(e.target.value)}
              placeholder="请输入片段名称"
              className="w-full px-4 py-2 bg-white border border-purple-500 rounded-lg focus:outline-none focus:border-purple-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
          </div>

          {/* 片段说明 */}
          <div>
            <label className="block text-sm mb-2">片段说明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入片段说明"
              rows={4}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={loading || !fragmentName.trim()}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '创建中...' : '创建片段'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateFragmentModal
