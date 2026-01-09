/**
 * 视频卡片骨架屏组件 - 微博风格
 */
export function VideoCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
      {/* 头部：头像 + 用户名 */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      </div>

      {/* 标题/描述区域 */}
      <div className="px-4 pb-3">
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>

      {/* 视频区域 */}
      <div className="aspect-video bg-gray-200" />

      {/* 底部互动区域 */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-6">
        <div className="h-4 bg-gray-200 rounded w-12" />
        <div className="h-4 bg-gray-200 rounded w-12" />
        <div className="h-4 bg-gray-200 rounded w-12" />
      </div>
    </div>
  )
}

/**
 * 多个骨架屏
 */
export function VideoCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, index) => (
        <VideoCardSkeleton key={index} />
      ))}
    </div>
  )
}

export default VideoCardSkeleton
