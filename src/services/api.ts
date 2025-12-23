const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'

export interface ScriptAnalysisResult {
  characters: Array<{ name: string }>
  scenes: Array<{ name: string }>
  items: Array<{ name: string }>
  scriptContent?: string
}

export interface AnalyzeScriptRequest {
  scriptContent: string
  scriptTitle?: string
}

export interface ScriptSegment {
  shotNumber: number
  segment: string
}

export interface SegmentScriptResult {
  segments: ScriptSegment[]
  totalShots: number
}

/**
 * 分析剧本文本
 */
export async function analyzeScriptText(
  request: AnalyzeScriptRequest
): Promise<ScriptAnalysisResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '分析失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '分析失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 分析剧本文件（docx）
 */
export async function analyzeScriptFile(
  file: File
): Promise<ScriptAnalysisResult & { scriptContent: string }> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/api/analyze-script-file`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '文件分析失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '文件分析失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 剧本切分 - 将剧本切分为多个片段
 */
export async function segmentScript(
  request: AnalyzeScriptRequest
): Promise<SegmentScriptResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/segment-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '剧本切分失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '剧本切分失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 健康检查
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`)
    return response.ok
  } catch {
    return false
  }
}

export interface GenerateVideoRequest {
  image?: File
  imageUrl?: string
  model?: string
  resolution?: '480p' | '720p' | '1080p'
  duration?: number
}

export interface VideoTaskResult {
  taskId: string
  videoUrl?: string
  status: string
  message: string
}

export interface VideoTaskStatus {
  taskId: string
  status: string
  videoUrl?: string
  progress: number
  message: string
}

/**
 * 图生视频 - 上传图片生成视频
 */
export async function generateVideoFromImage(
  request: GenerateVideoRequest
): Promise<VideoTaskResult> {
  try {
    const formData = new FormData()
    
    if (request.image) {
      formData.append('image', request.image)
    } else if (request.imageUrl) {
      formData.append('imageUrl', request.imageUrl)
    } else {
      throw new Error('请提供图片文件或图片URL')
    }

    if (request.model) {
      formData.append('model', request.model)
    }
    if (request.resolution) {
      formData.append('resolution', request.resolution)
    }
    if (request.duration) {
      formData.append('duration', request.duration.toString())
    }

    const response = await fetch(`${API_BASE_URL}/api/generate-video`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '图生视频失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '图生视频失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 查询视频生成任务状态
 */
export async function getVideoTaskStatus(taskId: string): Promise<VideoTaskStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/video-task/${taskId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '查询任务状态失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '查询任务状态失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

