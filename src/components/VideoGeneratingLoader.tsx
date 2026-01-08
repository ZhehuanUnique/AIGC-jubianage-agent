/**
 * 视频生成中加载动画组件
 * 用于首尾帧生视频页面，显示在正在生成的视频首帧图片上
 */
function VideoGeneratingLoader() {
  return (
    <div className="video-generating-loader-wrapper">
      <div className="video-generating-loader-content">
        <span className="video-generating-letter">生</span>
        <span className="video-generating-letter">成</span>
        <span className="video-generating-letter">中</span>
        <span className="video-generating-letter">.</span>
        <span className="video-generating-letter">.</span>
        <span className="video-generating-letter">.</span>
        <div className="video-generating-loader"></div>
      </div>
    </div>
  )
}

export default VideoGeneratingLoader
