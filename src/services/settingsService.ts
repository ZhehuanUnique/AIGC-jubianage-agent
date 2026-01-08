/**
 * 用户设置服务
 * 管理用户的个性化设置，存储在 localStorage 中
 */

export interface UserSettings {
  // 剪映设置
  jianying: {
    autoCreateProject: boolean // 是否自动新建项目
    autoImportVideos: boolean // 是否自动导入所有生成的分镜视频
    importLocation: 'material' | 'track' // 导入位置：'material' 素材库, 'track' 轨道
  }
  // Photoshop 设置
  photoshop: {
    autoCreateProject: boolean // 是否自动新建项目
    autoImportPoster: boolean // 是否自动导入海报图到最上面的图层
  }
  // 审片设置
  videoReview: {
    defaultMode: 'preview' | 'review' // 默认模式：'preview' 预览, 'review' 审片
  }
  // 工作流设置
  workflow: {
    enterKeySubmit: boolean // Enter键代替鼠标点击"下一步"，同时换行快捷键变更为Ctrl+Enter
  }
  // 首尾帧生视频设置
  firstLastFrame: {
    bottomBarMode: 'auto' | 'fixed' // 底部栏模式：'auto' 自动收缩, 'fixed' 固定显示
  }
}

const SETTINGS_KEY = 'user_settings'

// 默认设置
const DEFAULT_SETTINGS: UserSettings = {
  jianying: {
    autoCreateProject: false,
    autoImportVideos: false,
    importLocation: 'material', // 默认导入到素材库
  },
  photoshop: {
    autoCreateProject: false,
    autoImportPoster: false,
  },
  videoReview: {
    defaultMode: 'preview', // 默认预览模式
  },
  workflow: {
    enterKeySubmit: false, // 默认关闭Enter键提交
  },
  firstLastFrame: {
    bottomBarMode: 'auto', // 默认自动收缩
  },
}

/**
 * 获取用户设置
 */
export function getUserSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // 合并默认设置，确保新添加的字段有默认值
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        jianying: {
          ...DEFAULT_SETTINGS.jianying,
          ...parsed.jianying,
        },
        photoshop: {
          ...DEFAULT_SETTINGS.photoshop,
          ...parsed.photoshop,
        },
        videoReview: {
          ...DEFAULT_SETTINGS.videoReview,
          ...parsed.videoReview,
        },
        workflow: {
          ...DEFAULT_SETTINGS.workflow,
          ...parsed.workflow,
        },
        firstLastFrame: {
          ...DEFAULT_SETTINGS.firstLastFrame,
          ...parsed.firstLastFrame,
        },
      }
    }
  } catch (error) {
    console.error('读取用户设置失败:', error)
  }
  return DEFAULT_SETTINGS
}

/**
 * 保存用户设置
 */
export function saveUserSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('保存用户设置失败:', error)
    throw new Error('保存设置失败')
  }
}

/**
 * 更新用户设置（部分更新）
 */
export function updateUserSettings(updates: Partial<UserSettings>): void {
  const current = getUserSettings()
  const updated = {
    ...current,
    ...updates,
    jianying: {
      ...current.jianying,
      ...updates.jianying,
    },
    photoshop: {
      ...current.photoshop,
      ...updates.photoshop,
    },
    videoReview: {
      ...current.videoReview,
      ...updates.videoReview,
    },
    workflow: {
      ...current.workflow,
      ...updates.workflow,
    },
    firstLastFrame: {
      ...current.firstLastFrame,
      ...updates.firstLastFrame,
    },
  }
  saveUserSettings(updated)
}

/**
 * 重置为默认设置
 */
export function resetUserSettings(): void {
  saveUserSettings(DEFAULT_SETTINGS)
}


