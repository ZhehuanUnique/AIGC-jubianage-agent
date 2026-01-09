import { useState, useEffect } from 'react'
import { X, Upload, FolderOpen } from 'lucide-react'
import { createOrUpdateProject, getProjects } from '../services/api'
import { alertError, alertSuccess } from '../utils/alert'
import { uploadImageToCOS } from '../services/cosUpload'

interface CreateProjectModalProps {
  onClose: () => void
  onProjectCreated?: () => void
  parentProject?: { id: number; name: string; path: string } | null
}

interface ProjectOption {
  id: number
  name: string
  path: string
}

function CreateProjectModal({ onClose, onProjectCreated, parentProject }: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState('')
  const [selectedParentId, setSelectedParentId] = useState<number | null>(parentProject?.id || null)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [projects, setProjects] = useState<ProjectOption[]>([])

  // 加载项目列表用于选择父项目
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectList = await getProjects()
        setProjects(projectList.map((p: any) => ({
          id: p.id,
          name: p.name,
          path: p.path || '/'
        })))
      } catch (error) {
        console.error('加载项目列表失败:', error)
      }
    }
    loadProjects()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      alertError('请输入项目名称', '错误')
      return
    }

    setIsSubmitting(true)

    try {
      let coverUrl: string | undefined

      // 如果有封面图，先上传到COS
      if (coverImage) {
        setIsUploading(true)
        try {
          const result = await uploadImageToCOS(coverImage, 'project-covers')
          coverUrl = result.url
        } catch (uploadError) {
          console.error('上传封面图失败:', uploadError)
          // 继续创建项目，只是没有封面
        } finally {
          setIsUploading(false)
        }
      }

      // 调用 API 创建项目
      await createOrUpdateProject({
        name: projectName.trim(),
        parentId: selectedParentId || undefined,
        coverUrl,
      })

      alertSuccess('项目创建成功！', '成功')
      
      if (onProjectCreated) {
        onProjectCreated()
      }
      
      onClose()
    } catch (error) {
      console.error('创建项目失败:', error)
      alertError(
        error instanceof Error ? error.message : '创建项目失败，请稍后重试',
        '错误'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // 计算完整路径预览
  const getFullPath = () => {
    if (!selectedParentId) return `/${projectName || '新项目'}`
    const parent = projects.find(p => p.id === selectedParentId)
    if (!parent) return `/${projectName || '新项目'}`
    const parentPath = parent.path === '/' ? `/${parent.name}` : `${parent.path}/${parent.name}`
    return `${parentPath}/${projectName || '新项目'}`
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

          {/* 项目路径（父项目选择） */}
          <div>
            <label className="block text-sm mb-2">
              <FolderOpen size={14} className="inline mr-1" />
              项目路径
            </label>
            <select
              value={selectedParentId || ''}
              onChange={(e) => setSelectedParentId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="">根目录 /</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.path === '/' ? `/${project.name}` : `${project.path}/${project.name}`}
                </option>
              ))}
            </select>
            {/* 路径预览 */}
            <div className="mt-2 text-sm text-gray-500">
              完整路径: <span className="text-purple-600 font-medium">{getFullPath()}</span>
            </div>
          </div>

          {/* 上传封面图 */}
          <div>
            <label className="block text-sm mb-2">上传项目封面图（最佳尺寸: 16:9）</label>
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
                        e.preventDefault()
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
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center cursor-pointer hover:from-pink-600 hover:to-purple-700 transition-all">
                      <Upload size={24} className="text-white" />
                    </div>
                    <p className="text-gray-600 text-sm">单击或拖动文件到此区域进行上传</p>
                    <p className="text-gray-500 text-xs">支持JPG / JPEG / PNG格式，推荐16:9比例</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !projectName.trim()}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? '上传封面中...' : isSubmitting ? '创建中...' : '创建项目'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateProjectModal
