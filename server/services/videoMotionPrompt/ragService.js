import { config } from './config.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 简单的 RAG 向量检索服务
 * 当前使用基于关键词的检索，未来可升级到向量数据库（ChromaDB/Milvus）
 */
class RAGService {
  constructor() {
    this.vectorDbPath = config.rag.vectorDbPath
    this.topK = config.rag.topK
    this.similarityThreshold = config.rag.similarityThreshold
    this.ensureDataDir()
  }

  /**
   * 确保数据目录存在
   */
  ensureDataDir() {
    // 处理相对路径和绝对路径
    let fullPath
    if (this.vectorDbPath.startsWith('./') || !this.vectorDbPath.startsWith('/')) {
      // 相对路径，从项目根目录或 server 目录开始
      fullPath = join(process.cwd(), this.vectorDbPath)
    } else {
      // 绝对路径
      fullPath = this.vectorDbPath
    }
    
    const dir = dirname(fullPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
      console.log(`📁 已创建 RAG 数据目录: ${dir}`)
    }
    
    // 确保文件目录也存在
    const fileDir = fullPath
    if (!existsSync(fileDir)) {
      mkdirSync(fileDir, { recursive: true })
      console.log(`📁 已创建 RAG 文件目录: ${fileDir}`)
    }
  }

  /**
   * 简单的文本相似度计算（基于关键词匹配）
   * 未来可替换为真正的向量相似度计算
   */
  calculateSimilarity(text1, text2) {
    const words1 = this.extractKeywords(text1)
    const words2 = this.extractKeywords(text2)

    const intersection = words1.filter(word => words2.includes(word))
    const union = [...new Set([...words1, ...words2])]

    return union.length > 0 ? intersection.length / union.length : 0
  }

  /**
   * 提取关键词（简单实现）
   */
  extractKeywords(text) {
    // 移除标点符号，转换为小写
    const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ').toLowerCase()
    // 分词（简单按空格和常见分隔符）
    const words = cleaned.split(/\s+/).filter(w => w.length > 1)
    return words
  }

  /**
   * 检查剧本是否存在
   * @param {string} scriptId - 剧本ID
   * @returns {Promise<boolean>} 是否存在
   */
  async checkScriptExists(scriptId) {
    try {
      // 构建文件路径
      let basePath
      if (this.vectorDbPath.startsWith('./') || !this.vectorDbPath.startsWith('/')) {
        basePath = join(process.cwd(), this.vectorDbPath)
      } else {
        basePath = this.vectorDbPath
      }
      
      const dataPath = join(basePath, `${scriptId}.json`)
      return existsSync(dataPath)
    } catch (error) {
      console.error('检查剧本是否存在失败:', error)
      return false
    }
  }

  /**
   * 存储剧本片段到 RAG 库
   * @param {string} scriptId - 剧本ID
   * @param {Array} segments - 剧本片段数组 [{content: string, shotNumber: number, ...}]
   */
  async storeScriptSegments(scriptId, segments) {
    try {
      // 确保目录存在
      this.ensureDataDir()
      
      // 构建文件路径
      let basePath
      if (this.vectorDbPath.startsWith('./') || !this.vectorDbPath.startsWith('/')) {
        basePath = join(process.cwd(), this.vectorDbPath)
      } else {
        basePath = this.vectorDbPath
      }
      
      const dataPath = join(basePath, `${scriptId}.json`)
      const data = {
        scriptId,
        segments: segments.map(seg => ({
          ...seg,
          keywords: this.extractKeywords(seg.content || ''),
          storedAt: new Date().toISOString(),
        })),
        updatedAt: new Date().toISOString(),
      }

      writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`✅ 已存储 ${segments.length} 个剧本片段到 RAG 库: ${scriptId}`)
      return true
    } catch (error) {
      console.error('存储剧本片段失败:', error)
      return false
    }
  }

  /**
   * 从 RAG 库检索相关剧本片段
   * @param {string} scriptId - 剧本ID
   * @param {string} query - 查询文本（当前分镜的上下文）
   * @param {number} shotNumber - 当前分镜编号
   * @returns {Promise<Array>} 相关片段数组
   */
  async retrieveRelevantSegments(scriptId, query, shotNumber) {
    if (!config.rag.enabled) {
      return []
    }

    try {
      // 构建文件路径
      let basePath
      if (this.vectorDbPath.startsWith('./') || !this.vectorDbPath.startsWith('/')) {
        basePath = join(process.cwd(), this.vectorDbPath)
      } else {
        basePath = this.vectorDbPath
      }
      
      const dataPath = join(basePath, `${scriptId}.json`)
      
      if (!existsSync(dataPath)) {
        console.warn(`⚠️ RAG 数据文件不存在: ${scriptId}`)
        return []
      }

      const data = JSON.parse(readFileSync(dataPath, 'utf-8'))
      const segments = data.segments || []

      // 计算相似度并排序
      const scoredSegments = segments
        .map(seg => {
          // 排除当前分镜本身（支持 "1-5" 格式和数字格式）
          const segShot = seg.shotNumber
          const currentShot = shotNumber
          
          if (typeof segShot === 'string' && segShot === currentShot) {
            return null
          }
          if (segShot === currentShot) {
            return null
          }

          const similarity = this.calculateSimilarity(query, seg.content || '')
          return {
            ...seg,
            similarity,
          }
        })
        .filter(seg => seg !== null && seg.similarity >= this.similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, this.topK)

      console.log(`🔍 RAG 检索: 找到 ${scoredSegments.length} 个相关片段`)
      return scoredSegments
    } catch (error) {
      console.error('RAG 检索失败:', error)
      return []
    }
  }

  /**
   * 获取剧本上下文（当前分镜前后的片段）
   * @param {string} scriptId - 剧本ID
   * @param {string|number} shotNumber - 当前分镜编号（支持 "1-5" 格式或数字）
   * @param {number} contextWindow - 上下文窗口大小（前后各取几个片段）
   * @returns {Promise<Array>} 上下文片段数组
   */
  async getContextWindow(scriptId, shotNumber, contextWindow = 2) {
    try {
      // 构建文件路径
      let basePath
      if (this.vectorDbPath.startsWith('./') || !this.vectorDbPath.startsWith('/')) {
        basePath = join(process.cwd(), this.vectorDbPath)
      } else {
        basePath = this.vectorDbPath
      }
      
      const dataPath = join(basePath, `${scriptId}.json`)
      
      if (!existsSync(dataPath)) {
        return []
      }

      const data = JSON.parse(readFileSync(dataPath, 'utf-8'))
      const segments = data.segments || []

      // 解析 shotNumber（支持 "1-5" 格式或数字）
      let currentEpisode = null
      let currentSegmentIndex = null
      
      if (typeof shotNumber === 'string' && shotNumber.includes('-')) {
        // 格式：集数-片段序号（如 "1-5"）
        const parts = shotNumber.split('-')
        currentEpisode = parseInt(parts[0])
        currentSegmentIndex = parseInt(parts[1])
      } else {
        // 数字格式（兼容旧格式）
        const shotNum = typeof shotNumber === 'string' ? parseInt(shotNumber) : shotNumber
        // 尝试从片段中找到对应的集数
        const currentSeg = segments.find(seg => {
          const segShot = seg.shotNumber
          if (typeof segShot === 'string' && segShot.includes('-')) {
            const segParts = segShot.split('-')
            return parseInt(segParts[1]) === shotNum
          }
          return segShot === shotNum
        })
        if (currentSeg && typeof currentSeg.shotNumber === 'string' && currentSeg.shotNumber.includes('-')) {
          const parts = currentSeg.shotNumber.split('-')
          currentEpisode = parseInt(parts[0])
          currentSegmentIndex = parseInt(parts[1])
        }
      }

      // 获取当前分镜前后的片段
      const contextSegments = segments.filter(seg => {
        const segShot = seg.shotNumber
        
        // 如果当前是集数-片段格式
        if (currentEpisode !== null && currentSegmentIndex !== null) {
          if (typeof segShot === 'string' && segShot.includes('-')) {
            const parts = segShot.split('-')
            const segEpisode = parseInt(parts[0])
            const segSegmentIndex = parseInt(parts[1])
            
            // 同一集内，获取前后片段
            if (segEpisode === currentEpisode) {
              return Math.abs(segSegmentIndex - currentSegmentIndex) <= contextWindow && 
                     segSegmentIndex !== currentSegmentIndex
            }
            // 相邻集的第一/最后一个片段
            if (Math.abs(segEpisode - currentEpisode) === 1) {
              if (segEpisode < currentEpisode) {
                // 上一集的最后几个片段
                const lastSegments = segments
                  .filter(s => {
                    const sShot = s.shotNumber
                    if (typeof sShot === 'string' && sShot.includes('-')) {
                      return parseInt(sShot.split('-')[0]) === segEpisode
                    }
                    return false
                  })
                  .map(s => parseInt(s.shotNumber.split('-')[1]))
                const maxIndex = Math.max(...lastSegments, 0)
                return segSegmentIndex > maxIndex - contextWindow
              } else {
                // 下一集的前几个片段
                return segSegmentIndex <= contextWindow
              }
            }
            return false
          }
        }
        
        // 兼容旧格式（纯数字）
        if (typeof segShot === 'number' || (typeof segShot === 'string' && !segShot.includes('-'))) {
          const segNum = typeof segShot === 'string' ? parseInt(segShot) : segShot
          const currentNum = typeof shotNumber === 'string' ? parseInt(shotNumber) : shotNumber
          return Math.abs(segNum - currentNum) <= contextWindow && segNum !== currentNum
        }
        
        return false
      })

      // 排序：先按集数，再按片段序号
      return contextSegments.sort((a, b) => {
        const aShot = a.shotNumber
        const bShot = b.shotNumber
        
        if (typeof aShot === 'string' && aShot.includes('-') && 
            typeof bShot === 'string' && bShot.includes('-')) {
          const aParts = aShot.split('-')
          const bParts = bShot.split('-')
          const aEp = parseInt(aParts[0])
          const bEp = parseInt(bParts[0])
          if (aEp !== bEp) return aEp - bEp
          return parseInt(aParts[1]) - parseInt(bParts[1])
        }
        
        const aNum = typeof aShot === 'string' ? parseInt(aShot) : aShot
        const bNum = typeof bShot === 'string' ? parseInt(bShot) : bShot
        return aNum - bNum
      })
    } catch (error) {
      console.error('获取上下文窗口失败:', error)
      return []
    }
  }

  /**
   * 清理旧的 RAG 数据
   * @param {number} daysToKeep - 保留天数
   */
  async cleanupOldData(daysToKeep = 30) {
    // 未来实现：清理超过指定天数的数据
    console.log('清理功能待实现')
  }
}

// 导出单例
export const ragService = new RAGService()


