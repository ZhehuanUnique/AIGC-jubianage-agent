import { useState, useEffect } from 'react'
import { X, Loader2, Shield } from 'lucide-react'
import { alertSuccess, alertError } from '../utils/alert'

interface UserPermissionModalProps {
  isOpen: boolean
  onClose: () => void
  userId: number
  username: string
}

// 可用的图片生成模型
const IMAGE_MODELS = [
  { name: 'nano-banana-pro', label: 'Nano Banana Pro' },
  { name: 'midjourney-v7-t2i', label: 'Midjourney V7' },
  { name: 'flux-pro', label: 'Flux Pro' },
  { name: 'flux-dev', label: 'Flux Dev' },
  { name: 'seedream-3.0', label: 'Seedream 3.0' },
]

// 可用的视频生成模型
const VIDEO_MODELS = [
  { name: 'doubao-seedance-1-5-pro-251215', label: '豆包 Seedance 1.5 Pro' },
  { name: 'volcengine-video-3.0-pro', label: '即梦 3.0 Pro' },
  { name: 'seedance-3.0-lite', label: '即梦 3.0 Lite' },
  { name: 'minimax-hailuo-02', label: 'Hailuo 02' },
  { name: 'minimax-hailuo-2.3', label: 'Hailuo 2.3' },
  { name: 'minimax-hailuo-2.3-fast', label: 'Hailuo 2.3 Fast' },
  { name: 'kling-2.6', label: 'Kling 2.6' },
  { name: 'kling-o1', label: 'Kling O1' },
  { name: 'veo3.1', label: 'Veo 3.1' },
  { name: 'veo3.1-pro', label: 'Veo 3.1 Pro' },
  { name: 'viduq2-turbo', label: 'Vidu Q2 Turbo' },
  { name: 'viduq2-pro', label: 'Vidu Q2 Pro' },
]

const API_BASE_URL = (() => {
  if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
  const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
  return isProduction ? '' : 'http://localhost:3002'
})()

function UserPermissionModal({ isOpen, onClose, userId, username }: UserPermissionModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // 存储启用的模型（勾选=启用）
  const [enabledImageModels, setEnabledImageModels] = useState<string[]>([])
  const [enabledVideoModels, setEnabledVideoModels] = useState<string[]>([])

  // 获取 token
  const getToken = () => localStorage.getItem('auth_token') || ''

  // 加载用户权限
  const loadPermissions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/model-permissions`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      })
      const result = await response.json()
      if (result.success) {
        // 获取禁用的模型列表
        const disabledImageModels: string[] = []
        const disabledVideoModels: string[] = []
        result.data.forEach((item: { modelType: string; modelName: string }) => {
          if (item.modelType === 'image') {
            disabledImageModels.push(item.modelName)
          } else if (item.modelType === 'video') {
            disabledVideoModels.push(item.modelName)
          }
        })
        // 计算启用的模型（所有模型 - 禁用的模型）
        setEnabledImageModels(IMAGE_MODELS.map(m => m.name).filter(name => !disabledImageModels.includes(name)))
        setEnabledVideoModels(VIDEO_MODELS.map(m => m.name).filter(name => !disabledVideoModels.includes(name)))
      } else {
        // 如果没有权限记录，默认全部启用
        setEnabledImageModels(IMAGE_MODELS.map(m => m.name))
        setEnabledVideoModels(VIDEO_MODELS.map(m => m.name))
      }
    } catch (error) {
      console.error('加载用户权限失败:', error)
      // 出错时默认全部启用
      setEnabledImageModels(IMAGE_MODELS.map(m => m.name))
      setEnabledVideoModels(VIDEO_MODELS.map(m => m.name))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      loadPermissions()
    }
  }, [isOpen, userId])

  // 切换图片模型启用状态
  const toggleImageModel = (modelName: string) => {
    setEnabledImageModels(prev => 
      prev.includes(modelName) 
        ? prev.filter(m => m !== modelName)
        : [...prev, modelName]
    )
  }

  // 切换视频模型启用状态
  const toggleVideoModel = (modelName: string) => {
    setEnabledVideoModels(prev => 
      prev.includes(modelName) 
        ? prev.filter(m => m !== modelName)
        : [...prev, modelName]
    )
  }

  // 全选/取消全选图片模型
  const toggleAllImageModels = () => {
    if (enabledImageModels.length === IMAGE_MODELS.length) {
      setEnabledImageModels([])
    } else {
      setEnabledImageModels(IMAGE_MODELS.map(m => m.name))
    }
  }

  // 全选/取消全选视频模型
  const toggleAllVideoModels = () => {
    if (enabledVideoModels.length === VIDEO_MODELS.length) {
      setEnabledVideoModels([])
    } else {
      setEnabledVideoModels(VIDEO_MODELS.map(m => m.name))
    }
  }

  // 保存权限设置
  const handleSave = async () => {
    setSaving(true)
    try {
      // 计算禁用的模型（所有模型 - 启用的模型）
      const disabledImageModels = IMAGE_MODELS.map(m => m.name).filter(name => !enabledImageModels.includes(name))
      const disabledVideoModels = VIDEO_MODELS.map(m => m.name).filter(name => !enabledVideoModels.includes(name))
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/model-permissions/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          disabledModels: {
            image: disabledImageModels,
            video: disabledVideoModels,
          },
        }),
      })
      
      const result = await response.json()
      if (result.success) {
        alertSuccess('权限设置已保存')
        onClose()
      } else {
        alertError(result.error || '保存失败')
      }
    } catch (error) {
      console.error('保存权限失败:', error)
      alertError('保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="text-purple-600" size={20} />
            <h3 className="text-lg font-semibold">权限设置 - {username}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-purple-600" size={32} />
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                ✅ 勾选的模型表示启用，该用户可以使用这些模型。未勾选的模型将被禁用。
              </p>

              {/* 图片生成模型 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    图片生成模型
                  </h4>
                  <button
                    onClick={toggleAllImageModels}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    {enabledImageModels.length === IMAGE_MODELS.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_MODELS.map(model => (
                    <label 
                      key={model.name}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        enabledImageModels.includes(model.name)
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={enabledImageModels.includes(model.name)}
                        onChange={() => toggleImageModel(model.name)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className={`text-sm ${enabledImageModels.includes(model.name) ? 'text-green-700' : 'text-gray-500'}`}>
                        {model.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 视频生成模型 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    视频生成模型
                  </h4>
                  <button
                    onClick={toggleAllVideoModels}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    {enabledVideoModels.length === VIDEO_MODELS.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {VIDEO_MODELS.map(model => (
                    <label 
                      key={model.name}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        enabledVideoModels.includes(model.name)
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={enabledVideoModels.includes(model.name)}
                        onChange={() => toggleVideoModel(model.name)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className={`text-sm ${enabledVideoModels.includes(model.name) ? 'text-green-700' : 'text-gray-500'}`}>
                        {model.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                保存中...
              </>
            ) : (
              '保存设置'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserPermissionModal
