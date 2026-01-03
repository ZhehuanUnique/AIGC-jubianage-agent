// 生产环境使用相对路径，开发环境使用完整URL
// 使用运行时检测，确保生产环境使用相对路径
const API_BASE_URL = (() => {
  // 如果设置了环境变量，优先使用
  if (import.meta.env.VITE_API_BASE_URL !== undefined) {
    return import.meta.env.VITE_API_BASE_URL
  }
  // 运行时检测：如果当前域名不是 localhost，使用相对路径
  const isProduction = typeof window !== 'undefined' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1')
  return isProduction ? '' : 'http://localhost:3002'
})()

// 导入认证服务以获取token
import { AuthService } from './auth'

export interface ScriptAnalysisResult {
  characters: Array<{ name: string }>
  scenes: Array<{ name: string }>
  items: Array<{ name: string }>
  scriptContent?: string
}

export interface AnalyzeScriptRequest {
  scriptContent: string
  scriptTitle?: string
  model?: string // 指定使用的模型，默认 qwen-max
  workStyle?: string // 作品风格
  workBackground?: string // 作品背景
}

export interface ScriptSegment {
  shotNumber: number
  segment: string
  prompt?: string // 分镜提示词
  description?: string // 分镜描述
}

export interface SegmentScriptResult {
  segments: ScriptSegment[]
  totalShots: number
}

export interface Task {
  id: number
  project_id?: number
  title: string
  description: string
  date: string
  progress1: number
  progress2: number
  is_completed1: boolean
  mode?: string
  is_expanded?: boolean
  created_at?: string
  updated_at?: string
  project_name?: string
  script_content?: string
  analysis_result?: ScriptAnalysisResult
  work_style?: string
}

/**
 * 获取所有任务
 */
export async function getTasks(): Promise<Task[]> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('登录已过期，请重新登录')
      }
      // 检查是否是网络连接错误
      if (response.status === 0 || response.type === 'error') {
        throw new Error('无法连接到后端服务器')
      }
      // 其他HTTP错误
      const errorText = await response.text()
      let errorMessage = '获取任务列表失败'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {
        // 如果无法解析JSON，使用默认错误消息
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || '获取任务列表失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      // 检查是否是网络连接错误
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('ERR_INTERNET_DISCONNECTED') ||
          error.name === 'TypeError') {
        throw new Error('无法连接到后端服务器')
      }
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 获取所有项目
 */
export async function getProjects(): Promise<Array<{
  id: number
  name: string
  scriptTitle?: string
  workStyle?: string
  workBackground?: string
  createdAt?: string
  updatedAt?: string
}>> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取项目列表失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || '获取项目列表失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 创建或更新项目
 */
export async function createOrUpdateProject(params: {
  name: string
  scriptTitle?: string
  scriptContent?: string
  workStyle?: string
  workBackground?: string
  analysisResult?: ScriptAnalysisResult
  segments?: ScriptSegment[] // 分镜数据
}): Promise<{ id: number; name: string; scriptTitle?: string; scriptContent?: string; workStyle?: string; analysisResult?: ScriptAnalysisResult }> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '创建/更新项目失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '创建/更新项目失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 删除项目
 */
export async function deleteProject(projectId: number | string): Promise<void> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '删除项目失败')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '删除项目失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 创建任务
 */
export async function createTask(params: {
  projectId?: number
  title: string
  description?: string
  date?: string
  progress1?: number
  progress2?: number
  isCompleted1?: boolean
  mode?: string
}): Promise<Task> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        project_id: params.projectId,
        title: params.title,
        description: params.description,
        date: params.date,
        progress1: params.progress1 || 0,
        progress2: params.progress2 || 0,
        is_completed1: params.isCompleted1 || false,
        mode: params.mode || 'image',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '创建任务失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '创建任务失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 更新任务
 */
export async function updateTask(taskId: number, updates: {
  progress1?: number
  progress2?: number
  isCompleted1?: boolean
  [key: string]: any
}): Promise<Task> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const body: any = {}
    if (updates.progress1 !== undefined) body.progress1 = updates.progress1
    if (updates.progress2 !== undefined) body.progress2 = updates.progress2
    if (updates.isCompleted1 !== undefined) body.is_completed1 = updates.isCompleted1
    Object.keys(updates).forEach(key => {
      if (key !== 'progress1' && key !== 'progress2' && key !== 'isCompleted1') {
        body[key] = updates[key]
      }
    })

    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '更新任务失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '更新任务失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 删除任务
 */
export async function deleteTask(taskId: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '删除任务失败')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '删除任务失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 分析剧本文本
 */
export async function analyzeScriptText(request: AnalyzeScriptRequest): Promise<ScriptAnalysisResult> {
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
      throw new Error(error.error || '分析剧本失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '分析剧本失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 分析剧本文件
 */
export async function analyzeScriptFile(
  file: File,
  model: string = 'qwen-max',
  workStyle?: string,
  workBackground?: string
): Promise<ScriptAnalysisResult & { scriptContent: string }> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)
    if (workStyle) formData.append('workStyle', workStyle)
    if (workBackground) formData.append('workBackground', workBackground)

    const response = await fetch(`${API_BASE_URL}/api/analyze-script-file`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '分析文件失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '分析文件失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 切分剧本
 */
export async function segmentScript(request: {
  scriptContent: string
  scriptTitle?: string
  model?: string
  generatePrompts?: boolean
  workStyle?: string
  workBackground?: string
}): Promise<SegmentScriptResult> {
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
      throw new Error(error.error || '切分剧本失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '切分剧本失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 检查RAG脚本
 */
export async function checkRAGScript(scriptId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rag/check-script/${scriptId}`)
    
    if (!response.ok) {
      return false
    }

    const result = await response.json()
    return result.exists || false
  } catch (error) {
    return false
  }
}

/**
 * 生成图片请求接口
 */
export interface GenerateImageRequest {
  prompt: string
  model: string
  resolution?: string
  aspectRatio?: string
  negativePrompt?: string
  seed?: number
}

/**
 * 图片任务状态接口
 */
export interface ImageTaskStatus {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  imageUrl?: string
  error?: string
}

/**
 * 生成图片
 */
export async function generateImage(request: GenerateImageRequest): Promise<ImageTaskStatus> {
  try {
    const token = AuthService.getToken()
    const response = await fetch(`${API_BASE_URL}/api/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '生成图片失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '生成图片失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 获取图片任务状态
 */
/**
 * 提交 Midjourney Upscale 任务
 */
export async function submitMidjourneyUpscale(params: {
  button: { customId?: string; label?: string; [key: string]: any }
  resultUrl?: string
}): Promise<{ taskId: string; status: string; message: string }> {
  try {
    const token = AuthService.getToken()
    const response = await fetch(`${API_BASE_URL}/api/midjourney/upscale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '提交 Upscale 任务失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '提交 Upscale 任务失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

export async function getImageTaskStatus(
  taskId: string,
  model?: string,
  resolution?: '1K' | '2K' | '4K',
  resultUrl?: string,
  projectName?: string
): Promise<ImageTaskStatus> {
  try {
    const token = AuthService.getToken()
    
    // 构建查询参数
    const params = new URLSearchParams()
    if (model) {
      params.append('model', model)
    }
    if (resolution) {
      params.append('resolution', resolution)
    }
    if (resultUrl) {
      params.append('resultUrl', resultUrl)
    }
    if (projectName) {
      params.append('projectName', projectName)
    }
    
    const url = `${API_BASE_URL}/api/image-task/${taskId}${params.toString() ? `?${params.toString()}` : ''}`
    
    const response = await fetch(url, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取任务状态失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '获取任务状态失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 上传角色图片
 */
export async function uploadCharacterImage(params: {
  image: File
  projectId?: string
  characterId?: string
  characterName?: string
  projectName?: string
}): Promise<{ url: string; key: string; characterId: string; projectId: string }> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const formData = new FormData()
    formData.append('image', params.image)
    if (params.projectId) formData.append('projectId', params.projectId)
    if (params.characterId) formData.append('characterId', params.characterId)
    if (params.characterName) formData.append('characterName', params.characterName)
    if (params.projectName) formData.append('projectName', params.projectName)

    const response = await fetch(`${API_BASE_URL}/api/upload-character-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '上传角色图片失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '上传角色图片失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 上传场景图片
 */
export async function uploadSceneImage(params: {
  image: File
  projectId?: string
  sceneId?: string
  sceneName?: string
  projectName?: string
}): Promise<{ url: string; key: string; sceneId: string; projectId: string }> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const formData = new FormData()
    formData.append('image', params.image)
    if (params.projectId) formData.append('projectId', params.projectId)
    if (params.sceneId) formData.append('sceneId', params.sceneId)
    if (params.sceneName) formData.append('sceneName', params.sceneName)
    if (params.projectName) formData.append('projectName', params.projectName)

    const response = await fetch(`${API_BASE_URL}/api/upload-scene-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '上传场景图片失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '上传场景图片失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 上传物品图片
 */
export async function uploadItemImage(params: {
  image: File
  projectId?: string
  itemId?: string
  itemName?: string
  projectName?: string
}): Promise<{ url: string; key: string; itemId: string; projectId: string }> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const formData = new FormData()
    formData.append('image', params.image)
    if (params.projectId) formData.append('projectId', params.projectId)
    if (params.itemId) formData.append('itemId', params.itemId)
    if (params.itemName) formData.append('itemName', params.itemName)
    if (params.projectName) formData.append('projectName', params.projectName)

    const response = await fetch(`${API_BASE_URL}/api/upload-item-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '上传物品图片失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '上传物品图片失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 上传资产图片（base64格式）
 */
export async function uploadAssetImage(params: {
  base64Image: string
  assetType: 'characters' | 'scenes' | 'items'
  assetId?: string
  assetName?: string
  projectId?: string
  projectName?: string
}): Promise<{ url: string; key: string; assetId: string; projectId: string }> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    // 将前端的复数形式转换为后端的单数形式
    const assetTypeMap: Record<'characters' | 'scenes' | 'items', 'character' | 'scene' | 'item'> = {
      'characters': 'character',
      'scenes': 'scene',
      'items': 'item',
    }

    const response = await fetch(`${API_BASE_URL}/api/upload-asset-base64-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...params,
        assetType: assetTypeMap[params.assetType],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '上传资产图片失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '上传资产图片失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 获取项目角色列表
 */
export async function getProjectCharacters(projectId: number): Promise<Array<{ id: number | string; name: string; image?: string; image_url?: string }>> {
  try {
    const token = AuthService.getToken()
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/characters`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取角色列表失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || '获取角色列表失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 获取项目分镜列表
 */
export async function getProjectShots(projectId: number): Promise<Array<{
  id: number
  shotNumber: number
  description: string
  prompt: string
  segment: string
  style: string
  sceneDescription?: string
  visualFocus?: string
  model?: string
  aspectRatio?: string
  quantity?: number
  thumbnailImage?: string
  createdAt?: string
  updatedAt?: string
}>> {
  try {
    const token = AuthService.getToken()
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/shots`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取分镜列表失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || '获取分镜列表失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 获取项目场景列表
 */
export async function getProjectScenes(projectId: number): Promise<Array<{ id: number; name: string; image?: string }>> {
  try {
    const token = AuthService.getToken()
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/scenes`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取场景列表失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || '获取场景列表失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 获取项目物品列表
 */
export async function getProjectItems(projectId: number): Promise<Array<{ id: number; name: string; image?: string }>> {
  try {
    const token = AuthService.getToken()
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/items`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取物品列表失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || '获取物品列表失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 获取项目片段列表（包含视频）
 */
export async function getProjectFragments(projectId: number): Promise<Array<{ id: string; name: string; description?: string; imageUrl?: string; videoUrls?: string[] }>> {
  try {
    const token = AuthService.getToken()
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/fragments`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取片段列表失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || '获取片段列表失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 获取用户的所有生成资产（用于跨设备同步）
 */
export async function getGeneratedAssets(params?: {
  projectId?: number
  assetType?: 'image' | 'video'
  assetCategory?: 'character' | 'scene' | 'item' | 'shot'
}): Promise<Array<{
  id: number
  projectId: number
  assetType: string
  assetName: string
  assetCategory: string
  cosUrl: string
  cosKey: string
  thumbnailUrl?: string
  fileSize?: number
  mimeType?: string
  model?: string
  prompt?: string
  metadata?: any
  status: string
  createdAt: string
  updatedAt: string
}>> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const queryParams = new URLSearchParams()
    if (params?.projectId) queryParams.append('projectId', params.projectId.toString())
    if (params?.assetType) queryParams.append('assetType', params.assetType)
    if (params?.assetCategory) queryParams.append('assetCategory', params.assetCategory)

    const url = `${API_BASE_URL}/api/generated-assets${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取生成资产列表失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || '获取生成资产列表失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 删除角色
 */
export async function deleteCharacter(characterId: number): Promise<void> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/characters/${characterId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '删除角色失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 删除场景
 */
export async function deleteScene(sceneId: number): Promise<void> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/scenes/${sceneId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '删除场景失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 删除物品
 */
export async function deleteItem(itemId: number): Promise<void> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '删除物品失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 生成视频运动提示词
 */
export async function generateVideoMotionPrompt(params: {
  scriptId: string
  shotNumber: number
  query: string
  workStyle?: string
  workBackground?: string
}): Promise<{ prompt: string }> {
  try {
    const token = AuthService.getToken()
    const response = await fetch(`${API_BASE_URL}/api/generate-video-motion-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '生成视频提示词失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '生成视频提示词失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 从图片生成视频
 */
export async function generateVideoFromImage(params: {
  imageUrl: string
  prompt: string
  model?: string
  duration?: number
}): Promise<{ taskId: string }> {
  try {
    const token = AuthService.getToken()
    const response = await fetch(`${API_BASE_URL}/api/generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '生成视频失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '生成视频失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 获取视频任务状态
 */
export async function getVideoTaskStatus(
  taskId: string, 
  model?: string,
  projectName?: string,
  shotId?: string | number
): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  videoUrl?: string
  error?: string
}> {
  try {
    const token = AuthService.getToken()
    const params = new URLSearchParams()
    if (model) {
      params.append('model', model)
    }
    if (projectName) {
      params.append('projectName', projectName)
    }
    if (shotId) {
      params.append('shotId', shotId.toString())
    }
    const url = `${API_BASE_URL}/api/video-task/${taskId}${params.toString() ? `?${params.toString()}` : ''}`
    const response = await fetch(url, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取视频任务状态失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || '获取视频任务状态失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

// ... existing code ...

/**
 * 打开Photoshop
 */
export async function openPhotoshop(params: {
  autoCreateProject?: boolean
  autoImportPoster?: boolean
  posterUrl?: string
  projectName?: string
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const token = AuthService.getToken()
    const response = await fetch(`${API_BASE_URL}/api/open-photoshop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '打开Photoshop失败')
    }

    const result = await response.json()
    return result
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 上传视频
 */
export async function uploadVideo(
  file: File,
  projectId?: string,
  fragmentId?: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; key: string }> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const formData = new FormData()
    formData.append('video', file)
    if (projectId) formData.append('projectId', projectId)
    if (fragmentId) formData.append('fragmentId', fragmentId)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100)
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText)
            if (result.success) {
              resolve(result.data)
            } else {
              reject(new Error(result.error || '上传视频失败'))
            }
          } catch (error) {
            reject(new Error('解析响应失败'))
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText)
            reject(new Error(error.error || '上传视频失败'))
          } catch {
            reject(new Error(`上传失败: ${xhr.status}`))
          }
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('网络错误，请检查服务器连接'))
      })

      xhr.open('POST', `${API_BASE_URL}/api/upload-video`)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 导入视频到剪映
 */
export async function importVideosToJianying(params: {
  projectName: string
  videoUrls: string[]
  addToTrack?: boolean
  autoSave?: boolean
}): Promise<{
  success: boolean
  message?: string
  draft_id?: string
  added_count?: number
  error?: string
}> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/jianying/import-videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '导入视频到剪映失败')
    }

    const result = await response.json()
    return result
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 改创图片项接口
 */
export interface ImageRecreationItem {
  key: string
  url: string
  size?: number
  lastModified?: string
}

/**
 * 获取改创图片列表
 */
export async function getImageRecreationList(): Promise<ImageRecreationItem[]> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/image-recreation/list`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取图片列表失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || '获取图片列表失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 融合图片项接口
 */
export interface FusionImageItem {
  key: string
  url: string
  size?: number
  lastModified?: string
}

/**
 * 获取融合图片列表
 */
export async function getFusionImageList(): Promise<FusionImageItem[]> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/fusion-image/list`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取融合图片列表失败')
    }

    const result = await response.json()
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || '获取融合图片列表失败')
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 导出图片到桌面
 * @param imageUrls - 图片URL列表
 * @param scriptName - 剧本名称
 * @returns 导出结果
 */
export async function exportImagesToDesktop(
  imageUrls: string[],
  scriptName: string
): Promise<{
  success: boolean
  message?: string
  folderPath?: string
  folderName?: string
  downloadedFiles?: Array<{ fileName: string; size: number }>
  errors?: Array<{ index: number; url: string; error: string }>
  error?: string
}> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/export-images-to-desktop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        imageUrls,
        scriptName,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '导出图片失败')
    }

    const result = await response.json()
    return result
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 导出视频到桌面
 * @param videoUrls - 视频URL列表
 * @param scriptName - 剧本名称
 * @returns 导出结果
 */
export async function exportVideosToDesktop(
  videoUrls: string[],
  scriptName: string
): Promise<{
  success: boolean
  message?: string
  folderPath?: string
  folderName?: string
  downloadedFiles?: Array<{ fileName: string; size: number }>
  errors?: Array<{ index: number; url: string; error: string }>
  error?: string
}> {
  try {
    const token = AuthService.getToken()
    if (!token) {
      throw new Error('未登录，请先登录')
    }

    const response = await fetch(`${API_BASE_URL}/api/export-videos-to-desktop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        videoUrls,
        scriptName,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '导出视频失败')
    }

    const result = await response.json()
    return result
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

// 首尾帧生视频相关 API
export async function generateFirstLastFrameVideo(formData: FormData): Promise<{ success: boolean; data?: { taskId: string }; error?: string }> {
  const token = AuthService.getToken()
  if (!token) {
    return { success: false, error: '未登录，请先登录' }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/first-last-frame-video/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // FormData 会自动设置 Content-Type: multipart/form-data
      },
      body: formData,
    })

    const data = await response.json()
    if (!response.ok) {
      return { success: false, error: data.error || '生成首尾帧视频失败' }
    }
    return { success: true, data: data.data }
  } catch (error: any) {
    console.error('调用首尾帧视频生成API失败:', error)
    return { success: false, error: error.message || '生成首尾帧视频失败' }
  }
}

export async function getFirstLastFrameVideoStatus(taskId: string, projectId: string): Promise<{ success: boolean; data?: { status: string; videoUrl?: string; errorMessage?: string }; error?: string }> {
  const token = AuthService.getToken()
  if (!token) {
    return { success: false, error: '未登录，请先登录' }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/first-last-frame-video/status/${taskId}?projectId=${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      return { success: false, error: data.error || '查询首尾帧视频状态失败' }
    }
    return { success: true, data: data.data }
  } catch (error: any) {
    console.error('查询首尾帧视频状态API失败:', error)
    return { success: false, error: error.message || '查询首尾帧视频状态失败' }
  }
}

export async function getFirstLastFrameVideos(projectId: number): Promise<Array<{
  id: string
  taskId: string
  status: string
  videoUrl?: string
  firstFrameUrl?: string | null
  lastFrameUrl?: string | null
  model: string
  resolution: string
  ratio: string
  duration: number
  text?: string | null
  createdAt: string
}>> {
  const token = AuthService.getToken()
  if (!token) {
    throw new Error('未登录，请先登录')
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/first-last-frame-videos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || '获取首尾帧视频历史失败')
    }
    
    if (data.success && data.data) {
      return data.data
    }
    return []
  } catch (error: any) {
    console.error('获取首尾帧视频历史API失败:', error)
    throw error
  }
}
