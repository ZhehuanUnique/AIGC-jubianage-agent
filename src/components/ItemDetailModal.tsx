import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Zap, Trash2, Upload, Check } from 'lucide-react'
import { alert, alertError, alertInfo } from '../utils/alert'

interface ItemDetailModalProps {
  item: {
    id: string
    name: string
    image?: string
  }
  onClose: () => void
  onImageUpload?: (itemId: string, imageUrl: string) => void
  onDelete?: (itemId: string) => void
}

function ItemDetailModal({ item, onClose, onImageUpload, onDelete }: ItemDetailModalProps) {
  const navigate = useNavigate()
  const { projectId } = useParams()
  
  // 检查是否是有效的图片URL（排除默认占位图）
  const hasValidImage = item.image && 
    !item.image.startsWith('/item') && 
    item.image !== '/item1.jpg'
  const [imageUrl, setImageUrl] = useState<string | null>(hasValidImage ? item.image : null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alertError('请上传图片文件', '文件类型错误')
      return
    }

    // 创建预览URL
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setUploadedFile(file)
  }

  const handleConfirm = () => {
    if (!imageUrl) return
    
    // 通知父组件
    if (onImageUpload) {
      onImageUpload(item.id, imageUrl)
    }
    
    // 清空上传的文件状态
    setUploadedFile(null)
    alertInfo('图片已上传', '成功')
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDelete = () => {
    if (window.confirm(`确定要删除物品"${item.name}"吗？`)) {
      if (onDelete) {
        onDelete(item.id)
      }
      onClose()
    }
  }

  const handleRecreate = () => {
    if (!imageUrl) {
      alertError('请先上传图片', '提示')
      return
    }
    
    // 跳转到图片改创页面，并传递图片URL
    if (projectId) {
      // 将图片URL存储到sessionStorage，供图片改创页面使用
      sessionStorage.setItem('recreation_image_url', imageUrl)
      navigate(`/project/${projectId}/recreation`)
      onClose()
    } else {
      alertError('无法获取项目ID', '错误')
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" 
      onClick={onClose}
    >
      <div
        className="relative flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 - 左上角 */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 z-10"
        >
          <X size={20} />
        </button>

        {/* 图片容器 - 居中 */}
        {imageUrl ? (
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
            <img
              src={imageUrl}
              alt={item.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            
            {/* 右下角按钮组 - 紧贴图片 */}
            <div className="absolute bottom-0 right-0 flex gap-2 z-10 m-2">
              <button
                onClick={handleRecreate}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-lg"
              >
                <Zap size={16} />
                一键改创
              </button>
              {uploadedFile && (
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-lg"
                >
                  <Check size={16} />
                  确认
                </button>
              )}
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2 shadow-lg"
              >
                <Trash2 size={16} />
                删除物品
              </button>
            </div>
          </div>
        ) : (
          /* 没有图片时显示上传提示 */
          <div className="bg-white rounded-lg p-8 max-w-md text-center">
            <Upload size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">该物品暂无图片</h3>
            <p className="text-gray-600 mb-6">请先上传本地图片</p>
            <button
              onClick={handleUploadClick}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              上传图片
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ItemDetailModal

