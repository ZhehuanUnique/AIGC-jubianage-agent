import { useState } from 'react'
import { X, Upload } from 'lucide-react'

interface CreateProjectModalProps {
  onClose: () => void
}

function CreateProjectModal({ onClose }: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = () => {
    // TODO: 实现创建项目逻辑
    console.log('创建项目:', { projectName, projectDescription, coverImage })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg border border-purple-500 w-full max-w-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">创建项目</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <X size={24} />
          </button>
        </div>

        {/* 表单 */}
        <div className="space-y-6">
          {/* 项目名称 */}
          <div>
            <label className="block text-sm mb-2">
              <span className="text-red-500">*</span> 项目名称
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="请输入项目名称"
              className="w-full px-4 py-2 bg-white border border-purple-500 rounded-lg focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* 项目说明 */}
          <div>
            <label className="block text-sm mb-2">项目说明</label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="请填写项目说明"
              rows={4}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* 上传封面图 */}
          <div>
            <label className="block text-sm mb-2">上传项目封面图（最佳尺寸:4:3）</label>
            <div className="border-2 border-dashed border-purple-500 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleImageUpload}
                className="hidden"
                id="cover-upload"
              />
              <label htmlFor="cover-upload" className="cursor-pointer">
                {previewUrl ? (
                  <div className="relative">
                    <img src={previewUrl} alt="预览" className="max-h-64 mx-auto rounded" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCoverImage(null)
                        setPreviewUrl(null)
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-lg bg-purple-600 flex items-center justify-center">
                      <Upload size={24} className="text-white" />
                    </div>
                    <p className="text-gray-600 text-sm">单击或拖动文件到此区域进行上传</p>
                    <p className="text-gray-500 text-xs">支持JPG / JPEG / PNG格式</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
            >
              创建项目
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateProjectModal
