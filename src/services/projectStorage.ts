/**
 * 项目数据存储服务
 * 使用localStorage存储项目数据
 */

export interface Project {
  id: string
  name: string
  createdAt: string
  characters?: Array<{ id: string; name: string; image?: string }>
  scenes?: Array<{ id: string; name: string; image?: string }>
  items?: Array<{ id: string; name: string; image?: string }>
}

const STORAGE_KEY = 'aigc_projects'

/**
 * 获取所有项�?
 */
export function getAllProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('读取项目数据失败:', error)
    return []
  }
}

/**
 * 保存所有项�?
 */
export function saveAllProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch (error) {
    console.error('保存项目数据失败:', error)
  }
}

/**
 * 获取单个项目
 */
export function getProject(projectId: string): Project | null {
  const projects = getAllProjects()
  return projects.find(p => p.id === projectId) || null
}

/**
 * 创建或更新项目（如果项目已存在则更新，不存在则创建）
 */
export function createOrUpdateProject(name: string, analysisResult?: {
  characters?: Array<{ name: string }>
  scenes?: Array<{ name: string }>
  items?: Array<{ name: string }>
}): Project {
  const projects = getAllProjects()
  const existingProject = projects.find(p => p.name === name)
  
  if (existingProject) {
    // 如果项目已存在，更新角色、场景、物品数�?
    const updatedProject: Project = {
      ...existingProject,
      characters: analysisResult?.characters?.map((char, index) => ({
        id: `char_${Date.now()}_${index}`,
        name: char.name,
      })) || existingProject.characters || [],
      scenes: analysisResult?.scenes?.map((scene, index) => ({
        id: `scene_${Date.now()}_${index}`,
        name: scene.name,
      })) || existingProject.scenes || [],
      items: analysisResult?.items?.map((item, index) => ({
        id: `item_${Date.now()}_${index}`,
        name: item.name,
      })) || existingProject.items || [],
    }
    
    const index = projects.findIndex(p => p.id === existingProject.id)
    projects[index] = updatedProject
    saveAllProjects(projects)
    return updatedProject
  } else {
    // 如果项目不存在，创建新项�?
    const newProject: Project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      createdAt: new Date().toISOString(),
      characters: analysisResult?.characters?.map((char, index) => ({
        id: `char_${Date.now()}_${index}`,
        name: char.name,
      })) || [],
      scenes: analysisResult?.scenes?.map((scene, index) => ({
        id: `scene_${Date.now()}_${index}`,
        name: scene.name,
      })) || [],
      items: analysisResult?.items?.map((item, index) => ({
        id: `item_${Date.now()}_${index}`,
        name: item.name,
      })) || [],
    }
    
    projects.push(newProject)
    saveAllProjects(projects)
    return newProject
  }
}

/**
 * 创建新项目（保留原函数以保持兼容性）
 */
export function createProject(name: string, analysisResult?: {
  characters?: Array<{ name: string }>
  scenes?: Array<{ name: string }>
  items?: Array<{ name: string }>
}): Project {
  return createOrUpdateProject(name, analysisResult)
}

/**
 * 更新项目
 */
export function updateProject(projectId: string, updates: Partial<Project>): void {
  const projects = getAllProjects()
  const index = projects.findIndex(p => p.id === projectId)
  if (index !== -1) {
    projects[index] = { ...projects[index], ...updates }
    saveAllProjects(projects)
  }
}

/**
 * 删除项目
 */
export function deleteProject(projectId: string): void {
  const projects = getAllProjects()
  const filtered = projects.filter(p => p.id !== projectId)
  saveAllProjects(filtered)
}

