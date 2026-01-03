/**
 * Gemini RAG 服务
 * 支持 Chroma 和 Milvus 向量数据库
 * 支持 CLIP + Gemini Embedding 混合方案：
 * - 核心敏感剧本切片：用 CLIP 本地生成向量，存入私有 Milvus
 * - 公开/参考视频素材：用 Gemini Embedding 生成向量，存入同一 Milvus
 * - 检索时合并两类向量结果，注入 Gemini 3 Pro 生成提示词
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import { existsSync } from 'fs'
import { clipService } from './clipService.js'

// 加载 .env 文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 动态导入向量数据库相关模块（如果已安装）
let ChromaClient = null
let MilvusClient = null
let GoogleGenerativeAIEmbeddings = null

try {
  // 尝试导入 Chroma
  const chromadb = await import('chromadb')
  // 对于本地持久化存储，使用 PersistentClient
  ChromaClient = chromadb.PersistentClient || chromadb.ChromaClient
} catch (error) {
  console.warn('⚠️ ChromaDB 未安装，Chroma 功能将不可用')
}

try {
  // 尝试导入 Milvus
  const { MilvusClient: Milvus } = await import('@zilliz/milvus2-sdk-node')
  MilvusClient = Milvus
} catch (error) {
  console.warn('⚠️ @zilliz/milvus2-sdk-node 未安装，Milvus 功能将不可用')
}

try {
  // 尝试导入 langchain-google-genai
  const { GoogleGenerativeAIEmbeddings: Embeddings } = await import('@langchain/google-genai')
  GoogleGenerativeAIEmbeddings = Embeddings
} catch (error) {
  console.warn('⚠️ @langchain/google-genai 未安装，将使用 API 调用方式')
}

/**
 * Gemini RAG 服务类
 */
class GeminiRAGService {
  constructor() {
    this.apiKey = process.env.GEMINI_3_PRO_API_KEY || process.env.GEMINI_3_FLASH_API_KEY
    this.apiHost = process.env.GEMINI_API_HOST || 'https://api.302.ai'
    
    // 向量数据库配置
    this.vectorDbType = process.env.VECTOR_DB_TYPE || 'chroma' // 'chroma' 或 'milvus'
    // 将相对路径转换为绝对路径（Chroma 需要绝对路径）
    // __dirname 指向 services/videoMotionPrompt/，所以需要回到 server 目录
    const rawPath = process.env.GEMINI_RAG_VECTOR_DB_PATH || './data/gemini_rag_vectors'
    this.vectorDbPath = resolve(join(__dirname, '../../'), rawPath)
    this.milvusHost = process.env.MILVUS_HOST || 'localhost'
    this.milvusPort = parseInt(process.env.MILVUS_PORT || '19530')
    
    this.topK = parseInt(process.env.GEMINI_RAG_TOP_K || '5')
    this.similarityThreshold = parseFloat(process.env.GEMINI_RAG_SIMILARITY_THRESHOLD || '0.6')
    
    // 向量数据库客户端
    this.chromaClient = null
    this.milvusClient = null
    this.collection = null
    this.embeddings = null
    this.initialized = false
    
    // 延迟初始化向量数据库（避免在模块加载时阻塞）
    // 使用 setImmediate 确保在模块加载完成后才初始化
    // 使用更严格的错误处理，确保不会导致未捕获的 Promise 错误
    setImmediate(() => {
      // 使用 Promise.resolve 包装，确保所有错误都被捕获
      Promise.resolve().then(async () => {
        try {
          await this.initializeVectorDb()
        } catch (error) {
          const errorMessage = error?.message || String(error)
          console.error('❌ Gemini RAG 服务初始化失败:', errorMessage)
          console.warn('💡 提示：服务将以简化模式运行，部分功能可能不可用')
          // 确保所有客户端都设置为 null，避免后续调用时出错
          this.milvusClient = null
          this.chromaClient = null
        }
        
        // 初始化完成后的回调（可选）
        if (!this.milvusClient && !this.chromaClient && this.vectorDbType === 'milvus') {
          console.log('ℹ️  Gemini RAG 服务以简化模式运行（Milvus 不可用）')
        }
      }).catch(error => {
        // 额外的错误捕获，确保不会导致未捕获的 Promise 错误
        const errorMessage = error?.message || String(error)
        console.error('❌ Gemini RAG 服务初始化异常:', errorMessage)
        this.milvusClient = null
        this.chromaClient = null
      })
    })
  }

  /**
   * 初始化向量数据库（Chroma 或 Milvus）
   */
  async initializeVectorDb() {
    try {
      if (this.vectorDbType === 'milvus') {
        // 使用 try-catch 确保 Milvus 初始化失败不会导致进程崩溃
        try {
          await this.initializeMilvus()
        } catch (error) {
          const errorMessage = error?.message || String(error)
          console.warn(`⚠️ Milvus 初始化失败，将使用简化 RAG 实现:`, errorMessage)
          console.warn('💡 提示：如果不需要 Milvus，请在 .env 中设置 VECTOR_DB_TYPE=chroma')
          this.milvusClient = null
        }
      } else {
        try {
          await this.initializeChroma()
        } catch (error) {
          const errorMessage = error?.message || String(error)
          console.warn(`⚠️ Chroma 初始化失败，将使用简化 RAG 实现:`, errorMessage)
          this.chromaClient = null
        }
      }

      // 初始化 Gemini Embeddings
      if (GoogleGenerativeAIEmbeddings && this.apiKey) {
        try {
          this.embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: this.apiKey,
            modelName: 'models/embedding-001', // Gemini Embedding 模型
          })
        } catch (error) {
          const errorMessage = error?.message || String(error)
          console.warn('⚠️ Gemini Embeddings 初始化失败:', errorMessage)
        }
      }

      console.log(`✅ Gemini RAG 服务初始化完成（使用 ${this.vectorDbType.toUpperCase()}）`)
    } catch (error) {
      const errorMessage = error?.message || String(error)
      console.warn(`⚠️ 向量数据库初始化失败，使用简化 RAG 实现:`, errorMessage)
      console.warn('💡 提示：如果不需要向量数据库，可以忽略此警告')
      // 确保即使初始化失败，服务仍然可用（使用简化模式）
      this.milvusClient = null
      this.chromaClient = null
    }
  }

  /**
   * 初始化 Chroma 客户端
   */
  async initializeChroma() {
    if (!ChromaClient) {
      console.warn('⚠️ ChromaDB 未安装，Chroma 功能将不可用')
      return
    }

    try {
      // 对于本地持久化存储，使用 path 参数
      // 确保路径是绝对路径且目录存在
      const { existsSync, mkdirSync } = await import('fs')
      if (!existsSync(this.vectorDbPath)) {
        mkdirSync(this.vectorDbPath, { recursive: true })
      }

      // 初始化 Chroma 客户端（本地持久化模式）
      // PersistentClient 用于本地文件存储
      const chromadb = await import('chromadb')
      if (chromadb.PersistentClient) {
        this.chromaClient = new chromadb.PersistentClient({
          path: this.vectorDbPath,
        })
      } else {
        // 兼容旧版本，使用 ChromaClient
        this.chromaClient = new ChromaClient({
          path: this.vectorDbPath,
        })
      }
    } catch (error) {
      throw new Error(`Chroma 初始化失败: ${error.message}`)
    }
  }

  /**
   * 初始化 Milvus 客户端
   */
  async initializeMilvus() {
    if (!MilvusClient) {
      console.warn('⚠️ Milvus SDK 未安装，Milvus 功能将不可用')
      return
    }

    try {
      // 初始化 Milvus 客户端
      this.milvusClient = new MilvusClient({
        address: `${this.milvusHost}:${this.milvusPort}`,
      })

      // 测试连接（使用超时避免长时间等待）
      // 使用 Promise.race 和更长的超时时间，给 Milvus 足够的启动时间
      // 注意：hasCollection 调用可能会抛出未捕获的错误，需要更严格的错误处理
      let connectionTest
      try {
        connectionTest = Promise.race([
          Promise.resolve().then(async () => {
            try {
              return await this.milvusClient.hasCollection({
                collection_name: 'test_connection',
              })
            } catch (err) {
              // 捕获 hasCollection 的错误，包括 gRPC 错误
              throw err
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('连接超时')), 15000) // 增加到15秒，给 Milvus 足够的启动时间
          )
        ])
      } catch (error) {
        // 如果 Promise.race 本身出错，直接处理
        const errorMessage = error?.message || String(error)
        console.warn(`⚠️ Milvus 连接测试初始化失败:`, errorMessage)
        this.milvusClient = null
        return
      }

      try {
        await connectionTest
        console.log('✅ Milvus 连接成功')
      } catch (error) {
        // 连接失败是正常的（如果集合不存在或服务未启动），但至少说明客户端已创建
        const errorMessage = error?.message || String(error)
        const errorCode = error?.code || ''
        if (errorCode === 14 || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('连接超时') || errorMessage.includes('No connection')) {
          console.warn(`⚠️ Milvus 服务未运行或无法连接 (${this.milvusHost}:${this.milvusPort})`)
          console.warn('💡 提示：如果不需要 Milvus，请在 .env 中设置 VECTOR_DB_TYPE=chroma')
          console.warn('💡 如果需要 Milvus，请等待 30-60 秒让 Milvus 完全启动后重试')
          // 设置 this.milvusClient = null，避免后续调用时出错
          this.milvusClient = null
        } else {
          console.log('✅ Milvus 客户端已创建（连接测试失败，但客户端可用）')
        }
      }
    } catch (error) {
      // 捕获所有初始化错误，确保不会导致进程崩溃
      const errorMessage = error?.message || String(error)
      console.error('❌ Milvus 客户端初始化失败:', errorMessage)
      console.warn('💡 提示：如果不需要 Milvus，请在 .env 中设置 VECTOR_DB_TYPE=chroma')
      console.warn('💡 如果需要 Milvus，请确保 Docker 中的 Milvus 服务正在运行')
      this.milvusClient = null
    }
  }

  /**
   * 使用 Gemini Embedding API 生成向量
   * @param {string} text - 文本
   * @returns {Promise<number[]>} 向量
   */
  async generateEmbedding(text) {
    try {
      // 如果 langchain 可用，使用它
      if (this.embeddings) {
        const result = await this.embeddings.embedQuery(text)
        return result
      }

      // 否则使用 API 调用（如果 302.ai 支持）
      // 注意：302.ai 可能不直接支持 embedding API，这里使用简化实现
      console.warn('⚠️ 使用简化 embedding 实现')
      return this.simpleEmbedding(text)
    } catch (error) {
      console.error('生成 embedding 失败:', error)
      return this.simpleEmbedding(text)
    }
  }

  /**
   * 简化的 embedding 实现（作为后备方案）
   * @param {string} text - 文本
   * @returns {number[]} 向量
   */
  simpleEmbedding(text) {
    // 简单的词频向量（作为后备方案）
    const words = text.toLowerCase().split(/\s+/)
    const vector = new Array(128).fill(0)
    words.forEach((word, index) => {
      const hash = this.simpleHash(word)
      vector[hash % 128] += 1
    })
    // 归一化
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    return norm > 0 ? vector.map(val => val / norm) : vector
  }

  /**
   * 简单的字符串哈希
   */
  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  /**
   * 存储剧本片段到向量数据库
   * 支持混合方案：
   * - 敏感剧本切片：使用 CLIP 本地生成向量
   * - 公开素材：使用 Gemini Embedding 生成向量
   * @param {string} scriptId - 剧本ID
   * @param {Array} segments - 剧本片段数组
   * @param {Object} options - 存储选项
   * @param {boolean} options.useClip - 是否使用 CLIP（用于敏感数据，默认 false）
   */
  async storeScriptSegments(scriptId, segments, options = {}) {
    const { useClip = false } = options

    if (this.vectorDbType === 'milvus') {
      return await this.storeScriptSegmentsToMilvus(scriptId, segments, { useClip })
    } else {
      return await this.storeScriptSegmentsToChroma(scriptId, segments, { useClip })
    }
  }

  /**
   * 存储剧本片段到 Chroma
   * @param {string} scriptId - 剧本ID
   * @param {Array} segments - 剧本片段数组
   * @param {Object} options - 存储选项
   */
  async storeScriptSegmentsToChroma(scriptId, segments, options = {}) {
    try {
      if (!this.chromaClient) {
        console.warn('⚠️ Chroma 未初始化，跳过存储')
        return false
      }

      // 获取或创建集合
      const collectionName = `script_${scriptId}`
      try {
        this.collection = await this.chromaClient.getOrCreateCollection({
          name: collectionName,
        })
      } catch (error) {
        console.error('创建 Chroma 集合失败:', error)
        return false
      }

      // 为每个片段生成 embedding 并存储
      const ids = []
      const embeddings = []
      const documents = []
      const metadatas = []

      for (const segment of segments) {
        const content = segment.content || segment.segment || ''
        const shotNumber = segment.shotNumber || 0
        
        // 根据选项选择 embedding 方法
        let embedding
        if (options.useClip) {
          // 使用 CLIP 本地生成向量（用于敏感数据）
          embedding = await clipService.generateEmbedding(content)
        } else {
          // 使用 Gemini Embedding（用于公开数据）
          embedding = await this.generateEmbedding(content)
        }
        
        ids.push(`segment_${shotNumber}`)
        embeddings.push(embedding)
        documents.push(content)
        metadatas.push({
          shotNumber,
          scriptId,
          embeddingType: options.useClip ? 'clip' : 'gemini', // 标记使用的 embedding 类型
          ...segment,
        })
      }

      // 批量添加到 Chroma
      await this.collection.add({
        ids,
        embeddings,
        documents,
        metadatas,
      })

      console.log(`✅ 已存储 ${segments.length} 个剧本片段到 Chroma: ${collectionName}`)
      return true
    } catch (error) {
      console.error('存储剧本片段到 Chroma 失败:', error)
      return false
    }
  }

  /**
   * 存储剧本片段到 Milvus
   * @param {string} scriptId - 剧本ID
   * @param {Array} segments - 剧本片段数组
   * @param {Object} options - 存储选项
   */
  async storeScriptSegmentsToMilvus(scriptId, segments, options = {}) {
    try {
      if (!this.milvusClient) {
        console.warn('⚠️ Milvus 未初始化，跳过存储')
        return false
      }

      const collectionName = `script_${scriptId}`
      // 统一使用 768 维（Gemini 的维度），CLIP 向量会填充到 768 维
      const dimension = 768

      // 检查集合是否存在，不存在则创建
      const hasCollection = await this.milvusClient.hasCollection({
        collection_name: collectionName,
      })

      if (!hasCollection.value) {
        // 创建集合（统一使用 768 维）
        await this.milvusClient.createCollection({
          collection_name: collectionName,
          description: `Script segments for ${scriptId}`,
          fields: [
            {
              name: 'id',
              description: 'Segment ID',
              data_type: 5, // INT64
              is_primary_key: true,
              auto_id: false,
            },
            {
              name: 'embedding',
              description: 'Vector embedding',
              data_type: 101, // FLOAT_VECTOR
              dim: dimension, // 统一 768 维
            },
            {
              name: 'content',
              description: 'Segment content',
              data_type: 21, // VARCHAR
              max_length: 4096,
            },
            {
              name: 'shotNumber',
              description: 'Shot number',
              data_type: 5, // INT64
            },
            {
              name: 'scriptId',
              description: 'Script ID',
              data_type: 21, // VARCHAR
              max_length: 256,
            },
            {
              name: 'embeddingType',
              description: 'Embedding type (clip or gemini)',
              data_type: 21, // VARCHAR
              max_length: 16,
            },
          ],
        })

        // 创建索引
        await this.milvusClient.createIndex({
          collection_name: collectionName,
          field_name: 'embedding',
          index_type: 'IVF_FLAT',
          metric_type: 'L2',
          params: { nlist: 1024 },
        })

        console.log(`✅ 已创建 Milvus 集合: ${collectionName}`)
      }

      // 准备数据
      const entities = []
      for (const segment of segments) {
        const content = segment.content || segment.segment || ''
        const shotNumber = segment.shotNumber || 0
        
        // 根据选项选择 embedding 方法
        let embedding
        if (options.useClip) {
          embedding = await clipService.generateEmbedding(content)
          // CLIP 是 512 维，需要填充到 768 维（与 Gemini 统一）
          if (embedding.length === 512) {
            // 使用零填充到 768 维
            const padding = new Array(768 - 512).fill(0)
            embedding = [...embedding, ...padding]
          }
        } else {
          embedding = await this.generateEmbedding(content)
          // Gemini 应该是 768 维，如果不是则填充
          if (embedding.length < 768) {
            const padding = new Array(768 - embedding.length).fill(0)
            embedding = [...embedding, ...padding]
          } else if (embedding.length > 768) {
            // 如果超过 768 维，截断
            embedding = embedding.slice(0, 768)
          }
        }
        
        entities.push({
          id: shotNumber,
          embedding: embedding,
          content: content,
          shotNumber: shotNumber,
          scriptId: scriptId,
          embeddingType: options.useClip ? 'clip' : 'gemini',
        })
      }

      // 插入数据
      await this.milvusClient.insert({
        collection_name: collectionName,
        data: entities,
      })

      // 加载集合到内存
      await this.milvusClient.loadCollection({
        collection_name: collectionName,
      })

      console.log(`✅ 已存储 ${segments.length} 个剧本片段到 Milvus: ${collectionName}`)
      return true
    } catch (error) {
      console.error('存储剧本片段到 Milvus 失败:', error)
      return false
    }
  }

  /**
   * 从向量数据库检索相关片段（支持混合检索）
   * @param {string} scriptId - 剧本ID
   * @param {string} query - 查询文本
   * @param {number} shotNumber - 当前分镜编号
   * @param {Object} options - 检索选项
   * @param {boolean} options.mergeResults - 是否合并 CLIP 和 Gemini 的检索结果（默认 true）
   * @returns {Promise<Array>} 相关片段数组
   */
  async retrieveRelevantSegments(scriptId, query, shotNumber, options = {}) {
    const { mergeResults = true } = options

    if (this.vectorDbType === 'milvus') {
      return await this.retrieveRelevantSegmentsFromMilvus(scriptId, query, shotNumber, { mergeResults })
    } else {
      return await this.retrieveRelevantSegmentsFromChroma(scriptId, query, shotNumber, { mergeResults })
    }
  }

  /**
   * 从 Chroma 检索相关片段（支持混合检索）
   * @param {string} scriptId - 剧本ID
   * @param {string} query - 查询文本
   * @param {number} shotNumber - 当前分镜编号
   * @param {Object} options - 检索选项
   */
  async retrieveRelevantSegmentsFromChroma(scriptId, query, shotNumber, options = {}) {
    try {
      if (!this.chromaClient) {
        console.warn('⚠️ Chroma 未初始化，返回空结果')
        return []
      }

      const collectionName = `script_${scriptId}`
      
      try {
        this.collection = await this.chromaClient.getCollection({
          name: collectionName,
        })
      } catch (error) {
        console.warn(`⚠️ 集合 ${collectionName} 不存在，返回空结果`)
        return []
      }

      // 如果启用混合检索，同时使用 CLIP 和 Gemini 检索
      let allSegments = []
      
      if (options.mergeResults) {
        // 使用 CLIP 检索（敏感数据）
        const clipQueryEmbedding = await clipService.generateEmbedding(query)
        const clipResults = await this.collection.query({
          queryEmbeddings: [clipQueryEmbedding],
          nResults: this.topK,
          where: {
            scriptId: scriptId,
            embeddingType: 'clip',
          },
        })
        
        // 使用 Gemini 检索（公开数据）
        const geminiQueryEmbedding = await this.generateEmbedding(query)
        const geminiResults = await this.collection.query({
          queryEmbeddings: [geminiQueryEmbedding],
          nResults: this.topK,
          where: {
            scriptId: scriptId,
            embeddingType: 'gemini',
          },
        })
        
        // 合并结果
        allSegments = this.mergeRetrievalResults(clipResults, geminiResults, 'chroma')
      } else {
        // 只使用 Gemini 检索
        const queryEmbedding = await this.generateEmbedding(query)
        const results = await this.collection.query({
          queryEmbeddings: [queryEmbedding],
          nResults: this.topK,
          where: {
            scriptId: scriptId,
          },
        })
        allSegments = this.parseChromaResults(results)
      }

      // 解析结果
      const segments = allSegments.filter(seg => seg.similarity >= this.similarityThreshold)
      
      // 按相似度排序
      segments.sort((a, b) => b.similarity - a.similarity)
      
      // 限制返回数量
      const finalSegments = segments.slice(0, this.topK)

      console.log(`✅ 从 Chroma 检索到 ${finalSegments.length} 个相关片段`)
      return finalSegments
    } catch (error) {
      console.error('从 Chroma 检索失败:', error)
      return []
    }
  }

  /**
   * 获取上下文窗口（当前分镜前后的片段）
   * @param {string} scriptId - 剧本ID
   * @param {number} shotNumber - 当前分镜编号
   * @param {number} windowSize - 窗口大小（前后各多少个片段）
   * @returns {Promise<Array>} 上下文片段数组
   */
  async getContextWindow(scriptId, shotNumber, windowSize = 2) {
    try {
      if (this.vectorDbType === 'milvus') {
        return await this.getContextWindowFromMilvus(scriptId, shotNumber, windowSize)
      } else {
        return await this.getContextWindowFromChroma(scriptId, shotNumber, windowSize)
      }
    } catch (error) {
      console.error('获取上下文窗口失败:', error)
      return []
    }
  }

  /**
   * 从 Chroma 获取上下文窗口
   */
  async getContextWindowFromChroma(scriptId, shotNumber, windowSize) {
    if (!this.chromaClient) {
      return []
    }

    const collectionName = `script_${scriptId}`
    
    try {
      this.collection = await this.chromaClient.getCollection({
        name: collectionName,
      })
    } catch (error) {
      return []
    }

    // 获取所有片段
    const allResults = await this.collection.get({
      where: {
        scriptId: scriptId,
      },
    })

    // 筛选当前分镜前后的片段
    const contextSegments = []
    if (allResults.ids) {
      for (let i = 0; i < allResults.ids.length; i++) {
        const metadata = allResults.metadatas?.[i] || {}
        const segmentShotNumber = metadata.shotNumber || 0
        
        if (Math.abs(segmentShotNumber - shotNumber) <= windowSize) {
          contextSegments.push({
            shotNumber: segmentShotNumber,
            content: allResults.documents?.[i] || '',
            ...metadata,
          })
        }
      }
    }

    // 按分镜编号排序
    contextSegments.sort((a, b) => a.shotNumber - b.shotNumber)
    return contextSegments
  }

  /**
   * 从 Milvus 获取上下文窗口
   */
  async getContextWindowFromMilvus(scriptId, shotNumber, windowSize) {
    if (!this.milvusClient) {
      return []
    }

    const collectionName = `script_${scriptId}`
    
    try {
      const hasCollection = await this.milvusClient.hasCollection({
        collection_name: collectionName,
      })
      
      if (!hasCollection.value) {
        return []
      }

      // 查询范围内的片段
      const minShot = shotNumber - windowSize
      const maxShot = shotNumber + windowSize
      
      const results = await this.milvusClient.query({
        collection_name: collectionName,
        expr: `scriptId == "${scriptId}" && shotNumber >= ${minShot} && shotNumber <= ${maxShot}`,
        output_fields: ['content', 'shotNumber', 'scriptId', 'embeddingType'],
      })

      const contextSegments = (results.data || []).map(entity => ({
        shotNumber: entity.shotNumber || 0,
        content: entity.content || '',
        scriptId: entity.scriptId,
        embeddingType: entity.embeddingType,
      }))

      // 按分镜编号排序
      contextSegments.sort((a, b) => a.shotNumber - b.shotNumber)
      return contextSegments
    } catch (error) {
      console.error('从 Milvus 获取上下文窗口失败:', error)
      return []
    }
  }

  /**
   * 解析 Chroma 检索结果
   * @param {Object} results - Chroma 查询结果
   * @returns {Array} 片段数组
   */
  parseChromaResults(results) {
    const segments = []
    if (results.ids && results.ids[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const distance = results.distances?.[0]?.[i] || 0
        const document = results.documents?.[0]?.[i] || ''
        const metadata = results.metadatas?.[0]?.[i] || {}
        
        const similarity = 1 - Math.min(distance, 1)
        segments.push({
          shotNumber: metadata.shotNumber || 0,
          content: document,
          similarity,
          ...metadata,
        })
      }
    }
    return segments
  }

  /**
   * 解析 Milvus 检索结果
   * @param {Object} results - Milvus 查询结果
   * @returns {Array} 片段数组
   */
  parseMilvusResults(results) {
    const segments = []
    if (results.results && results.results.length > 0) {
      const result = results.results[0]
      if (result.ids && result.ids.length > 0) {
        for (let i = 0; i < result.ids.length; i++) {
          const distance = result.distances?.[i] || 0
          const entity = result.entities?.[i] || {}
          
          const similarity = 1 - Math.min(distance, 1)
          segments.push({
            shotNumber: entity.shotNumber || 0,
            content: entity.content || '',
            similarity,
            scriptId: entity.scriptId,
            embeddingType: entity.embeddingType,
          })
        }
      }
    }
    return segments
  }

  /**
   * 合并 CLIP 和 Gemini 的检索结果
   * @param {Object} clipResults - CLIP 检索结果
   * @param {Object} geminiResults - Gemini 检索结果
   * @param {string} dbType - 数据库类型 ('chroma' 或 'milvus')
   * @returns {Array} 合并后的片段数组
   */
  mergeRetrievalResults(clipResults, geminiResults, dbType) {
    const clipSegments = dbType === 'chroma' 
      ? this.parseChromaResults(clipResults)
      : this.parseMilvusResults(clipResults)
    
    const geminiSegments = dbType === 'chroma'
      ? this.parseChromaResults(geminiResults)
      : this.parseMilvusResults(geminiResults)
    
    // 合并结果，去重（基于 shotNumber）
    const mergedMap = new Map()
    
    // 添加 CLIP 结果（敏感数据，优先级稍高）
    clipSegments.forEach(seg => {
      const key = seg.shotNumber
      if (!mergedMap.has(key) || mergedMap.get(key).similarity < seg.similarity) {
        mergedMap.set(key, { ...seg, source: 'clip' })
      }
    })
    
    // 添加 Gemini 结果（公开数据）
    geminiSegments.forEach(seg => {
      const key = seg.shotNumber
      if (!mergedMap.has(key) || mergedMap.get(key).similarity < seg.similarity) {
        mergedMap.set(key, { ...seg, source: 'gemini' })
      }
    })
    
    // 转换为数组并按相似度排序
    return Array.from(mergedMap.values()).sort((a, b) => b.similarity - a.similarity)
  }
}

// 导出单例
export const geminiRagService = new GeminiRAGService()

