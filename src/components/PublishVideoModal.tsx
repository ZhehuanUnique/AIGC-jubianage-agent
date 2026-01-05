import { useState, useEffect, useRef } from 'react'
import { X, Upload, Folder, Video, Loader2 } from 'lucide-react'
import { getProjects, getProjectFragments, publishVideoToCommunity, uploadVideo } from '../services/api'
import { UploadToCommunityModal } from './UploadToCommunityModal'
import { alertError, alertSuccess } from '../utils/alert'

interface Project {
  id: number
  name: string
  description?: string
  createdAt: string
}

interface Fragment {
  id: string
  name: string
  videoUrls?: string[]
}

interface PublishVideoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function PublishVideoModal({ isOpen, onClose, onSuccess }: PublishVideoModalProps) {
  const [step, setStep] = useState<'source' | 'select' | 'upload' | 'info'>('source') // source: 选择来源, select: 选择项目视频, upload: 上传本地视频, info: 填写信息
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [fragments, setFragments] = useState<Fragment[]>([])
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null)
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingFragments, setIsLoadingFragments] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 加载项目列表
  useEffect(() => {
    if (isOpen && step === 'select') {
      loadProjects()
    }
  }, [isOpen, step])

  // 加载项目片段
  useEffect(() => {
    if (isOpen && step === 'select' && selectedProjectId) {
      loadFragments(selectedProjectId)
    }
  }, [isOpen, step, selectedProjectId])

  const loadProjects = async () => {
    try {
      setIsLoadingProjects(true)
      const projectsList = await getProjects()
      setProjects(projectsList)
    } catch (error) {
      console.error('加载项目列表失败:', error)
      alertError(error instanceof Error ? error.message : '加载项目列表失败', '错误')
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const loadFragments = async (projectId: number) => {
    try {
      setIsLoadingFragments(true)
      const fragmentsList = await getProjectFragments(projectId)
      
      // 过滤掉没有视频的片段
      const fragmentsWithVideos = fragmentsList.filter(f => f.videoUrls && f.videoUrls.length > 0)
      
      // 对每个片段的 videoUrls 进行去重，确保每个视频URL只出现一次
      const deduplicatedFragments = fragmentsWithVideos.map(fragment => ({
        ...fragment,
        videoUrls: Array.from(new Set(fragment.videoUrls || []))
      }))
      
      setFragments(deduplicatedFragments)
    } catch (error) {
      console.error('加载片段列表失败:', error)
      alertError(error instanceof Error ? error.message : '加载片段列表失败', '错误')
    } finally {
      setIsLoadingFragments(false)
    }
  }

  const handleSourceSelect = (source: 'project' | 'local') => {
    if (source === 'project') {
      setStep('select')
    } else {
      setStep('upload')
    }
  }

  const handleProjectSelect = (projectId: number) => {
    setSelectedProjectId(projectId)
  }

  const handleVideoSelect = (videoUrl: string, fragmentName: string) => {
    setSelectedVideoUrl(videoUrl)
    setSelectedVideoTitle(fragmentName)
    setStep('info')
    setShowInfoModal(true)
  }

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      alertError('请选择视频文件', '文件类型错误')
      return
    }

    // 上传本地视频到COS
    handleLocalVideoUpload(file)
  }

  const handleLocalVideoUpload = async (file: File) => {
    try {
      setIsUploading(true)
      setUploadProgress(0)

      const result = await uploadVideo(file, undefined, undefined, (progress) => {
        setUploadProgress(progress)
      })

      setSelectedVideoUrl(result.url)
      setSelectedVideoTitle(file.name.replace(/\.[^/.]+$/, '')) // 使用文件名（去掉扩展名）作为默认标题
      setIsUploading(false)
      setStep('info')
      setShowInfoModal(true)
    } catch (error) {
      console.error('上传视频失败:', error)
      alertError(error instanceof Error ? error.message : '上传视频失败，请稍后重试', '上传失败')
      setIsUploading(false)
    }
  }

  const handleInfoConfirm = async (data: { title: string; description?: string; tags?: string[] }) => {
    if (!selectedVideoUrl) {
      alertError('视频URL不存在', '错误')
      return
    }

    try {
      await publishVideoToCommunity({
        videoUrl: selectedVideoUrl,
        title: data.title || selectedVideoTitle,
        description: data.description,
        tags: data.tags,
        projectId: selectedProjectId || undefined,
      })

      alertSuccess('视频已发布到社区', '发布成功')
      setShowInfoModal(false)
      handleClose()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('发布视频失败:', error)
      alertError(error instanceof Error ? error.message : '发布视频失败，请稍后重试', '发布失败')
    }
  }

  const handleClose = () => {
    setStep('source')
    setSelectedProjectId(null)
    setFragments([])
    setSelectedVideoUrl(null)
    setSelectedVideoTitle('')
    setShowInfoModal(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 animate-scaleIn max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="p-6 pb-4 relative border-b border-gray-200">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-gray-800 pr-8">
              {step === 'source' && '发布作品'}
              {step === 'select' && '选择项目视频'}
              {step === 'upload' && '上传本地视频'}
            </h3>
          </div>

          {/* 内容 */}
          <div className="p-6">
            {step === 'source' && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-6">请选择视频来源：</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSourceSelect('project')}
                    className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all flex flex-col items-center gap-3"
                  >
                    <Folder className="w-12 h-12 text-purple-600" />
                    <span className="font-medium text-gray-800">选择项目视频</span>
                    <span className="text-sm text-gray-500 text-center">从项目管理中选择已生成的视频</span>
                  </button>
                  <button
                    onClick={() => handleSourceSelect('local')}
                    className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all flex flex-col items-center gap-3"
                  >
                    <Upload className="w-12 h-12 text-purple-600" />
                    <span className="font-medium text-gray-800">上传本地视频</span>
                    <span className="text-sm text-gray-500 text-center">从本地上传视频文件</span>
                  </button>
                </div>
              </div>
            )}

            {step === 'select' && (
              <div className="space-y-4">
                {/* 返回按钮 */}
                <button
                  onClick={() => setStep('source')}
                  className="text-purple-600 hover:text-purple-700 flex items-center gap-2 mb-4"
                >
                  <X size={18} />
                  <span>返回</span>
                </button>

                {/* 项目列表 */}
                {isLoadingProjects ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>暂无项目</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">选择项目：</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleProjectSelect(project.id)}
                          className={`w-full p-3 text-left border rounded-lg transition-all ${
                            selectedProjectId === project.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-300 hover:border-purple-300'
                          }`}
                        >
                          <div className="font-medium text-gray-800">{project.name}</div>
                          {project.description && (
                            <div className="text-sm text-gray-500 mt-1">{project.description}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 片段/视频列表 */}
                {selectedProjectId && (
                  <div className="mt-6 space-y-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">选择视频：</label>
                    {isLoadingFragments ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                      </div>
                    ) : fragments.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        <p>该项目暂无视频</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {(() => {
                          // 收集所有唯一的视频URL，确保每个视频只显示一次
                          const seenVideoUrls = new Set<string>()
                          const videoList: Array<{ videoUrl: string; fragmentName: string; fragmentId: string }> = []
                          
                          fragments.forEach((fragment) => {
                            fragment.videoUrls?.forEach((videoUrl) => {
                              if (!seenVideoUrls.has(videoUrl)) {
                                seenVideoUrls.add(videoUrl)
                                videoList.push({
                                  videoUrl,
                                  fragmentName: fragment.name,
                                  fragmentId: fragment.id,
                                })
                              }
                            })
                          })
                          
                          return videoList.map((item, index) => (
                            <button
                              key={`${item.fragmentId}-${item.videoUrl}`}
                              onClick={() => handleVideoSelect(item.videoUrl, item.fragmentName)}
                              className="w-full p-3 text-left border border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all flex items-center gap-3"
                            >
                              <Video className="w-5 h-5 text-purple-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-800 truncate">
                                  {item.fragmentName}
                                </div>
                                <div className="text-xs text-gray-500 truncate mt-1">
                                  {item.videoUrl.substring(0, 50)}...
                                </div>
                              </div>
                            </button>
                          ))
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 'upload' && (
              <div className="space-y-4">
                {/* 返回按钮 */}
                <button
                  onClick={() => setStep('source')}
                  className="text-purple-600 hover:text-purple-700 flex items-center gap-2 mb-4"
                >
                  <X size={18} />
                  <span>返回</span>
                </button>

                {/* 上传区域 */}
                {isUploading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">上传中... {uploadProgress}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-500 transition-colors">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleLocalFileSelect}
                      className="hidden"
                      ref={fileInputRef}
                    />
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">点击选择视频文件</p>
                    <p className="text-sm text-gray-500 mb-4">支持 MP4、AVI、MOV 等格式</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      选择文件
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 信息填写模态框 */}
      <UploadToCommunityModal
        isOpen={showInfoModal}
        defaultTitle={selectedVideoTitle}
        onConfirm={handleInfoConfirm}
        onCancel={() => {
          setShowInfoModal(false)
          setStep('source')
        }}
      />
    </>
  )
}

