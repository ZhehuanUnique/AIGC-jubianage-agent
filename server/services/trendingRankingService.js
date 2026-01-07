/**
 * 榜单生成服务
 * 使用 Gemini 3.0 Pro 进行联网搜索，生成动态漫榜和AI短剧榜
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 加载 .env 文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

/**
 * 获取 Gemini API Key
 * @param {string} modelType - 模型类型 ('flash' 或 'pro')
 */
function getGeminiApiKey(modelType = 'flash') {
  if (modelType === 'flash') {
    return process.env.GEMINI_3_FLASH_API_KEY || process.env.GEMINI_3_PRO_API_KEY
  } else {
    return process.env.GEMINI_3_PRO_API_KEY || process.env.GEMINI_3_FLASH_API_KEY
  }
}

/**
 * 获取要使用的模型类型（可通过环境变量配置，默认使用 flash）
 */
function getModelType() {
  return process.env.TRENDING_RANKING_MODEL_TYPE || 'flash' // 默认使用 flash，更快更便宜
}

/**
 * 获取模型名称（用于 API 请求）
 * @param {string} modelType - 模型类型 ('flash' 或 'pro')
 */
function getModelName(modelType) {
  const modelMap = {
    'flash': 'gemini-2.5-flash-preview-05-20', // 302.ai 可用的 Flash 模型
    'pro': 'gemini-2.5-pro-preview-06-05', // 302.ai 可用的 Pro 模型
  }
  return modelMap[modelType] || modelMap['flash']
}

/**
 * 获取 API Host
 */
function getApiHost() {
  return process.env.GEMINI_API_HOST || 'https://api.302.ai'
}

/**
 * 调用 Gemini 3.0 Pro API（使用 302.ai）
 * @param {string} prompt - 提示词
 * @param {Object} options - 选项
 * @returns {Promise<string>} API返回的文本内容
 */
async function callGeminiAPI(prompt, options = {}) {
  const modelType = getModelType() // 默认使用 flash
  const apiKey = getGeminiApiKey(modelType)
  const apiHost = getApiHost()
  
  const {
    temperature = 0.7,
    maxTokens = 4000,
    model: customModel, // 允许自定义模型
  } = options

  // 如果没有指定自定义模型，使用配置的模型类型
  const model = customModel || getModelName(modelType)

  try {
    console.log(`🤖 调用 Gemini ${modelType === 'flash' ? '3.0 Flash' : '3.0 Pro'} API 生成榜单... (模型: ${model})`)

    const requestBody = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      // 注意：302.ai 可能不支持 tools 参数，需要在 prompt 中明确要求联网搜索
    }

    const response = await fetch(`${apiHost}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error('Gemini API密钥无效，请检查 GEMINI_3_PRO_API_KEY 环境变量')
      }
      
      throw new Error(`Gemini API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    if (!content) {
      throw new Error('API响应中未找到生成的内容')
    }

    return content.trim()
  } catch (error) {
    console.error('❌ Gemini API调用错误:', error)
    throw error
  }
}

/**
 * 生成动态漫榜
 * @returns {Promise<Array>} 榜单数据数组
 */
export async function generateAnimeRanking() {
  const prompt = `请使用联网搜索功能（如果可用），搜索并整理当前最热门的动态漫画相关话题和作品。如果没有联网搜索功能，请基于你的知识库生成一个包含10个条目的榜单。

要求：
1. 每个条目包含：标题（关键词）、热度标签（"新"、"热"或null）、排名
2. 标题应该是当前最热门、最受关注的动态漫画相关话题
3. 按照热度从高到低排序
4. 返回JSON格式，格式如下：
[
  {"keyword": "话题标题", "tag": "新"或"热"或null, "rank": 1},
  {"keyword": "话题标题", "tag": "新"或"热"或null, "rank": 2},
  ...
]

请确保返回的是有效的JSON数组，不要包含任何其他文字说明。`

  try {
    const response = await callGeminiAPI(prompt, {
      temperature: 0.5, // 降低温度以获得更稳定的结果
      maxTokens: 2000,
    })

    // 尝试从响应中提取JSON
    let jsonStr = response
    
    // 如果响应包含代码块，提取JSON部分
    const jsonMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    } else {
      // 尝试直接查找JSON数组
      const arrayMatch = response.match(/\[[\s\S]*?\]/)
      if (arrayMatch) {
        jsonStr = arrayMatch[0]
      }
    }

    const ranking = JSON.parse(jsonStr)
    
    // 验证和规范化数据
    if (!Array.isArray(ranking)) {
      throw new Error('返回的数据不是数组格式')
    }

    return ranking.slice(0, 10).map((item, index) => ({
      keyword: item.keyword || item.title || `动态漫画话题 ${index + 1}`,
      tag: item.tag || null,
      rank: item.rank || index + 1,
      views: item.views || Math.floor(Math.random() * 100000) + 10000, // 如果没有浏览量，生成一个随机数
    }))
  } catch (error) {
    console.error('❌ 生成动态漫榜失败:', error)
    // 返回默认数据作为后备
    return [
      { keyword: '动态漫画行业新动态', tag: '新', rank: 1, views: 50000 },
      { keyword: '热门动态漫画作品推荐', tag: '热', rank: 2, views: 45000 },
      { keyword: '动态漫画制作技术突破', tag: null, rank: 3, views: 40000 },
      { keyword: '动态漫画市场分析', tag: null, rank: 4, views: 35000 },
      { keyword: '动态漫画创作工具更新', tag: '新', rank: 5, views: 30000 },
      { keyword: '动态漫画IP开发', tag: null, rank: 6, views: 25000 },
      { keyword: '动态漫画平台政策', tag: null, rank: 7, views: 20000 },
      { keyword: '动态漫画用户增长', tag: null, rank: 8, views: 15000 },
      { keyword: '动态漫画内容创新', tag: null, rank: 9, views: 10000 },
      { keyword: '动态漫画技术趋势', tag: null, rank: 10, views: 5000 },
    ]
  }
}

/**
 * 生成AI短剧榜
 * @returns {Promise<Array>} 榜单数据数组
 */
export async function generateAIRealRanking() {
  const prompt = `请使用联网搜索功能（如果可用），搜索并整理当前最热门的AI短剧相关话题、作品和趋势。请优先从以下数据源获取信息，按重要性排序：
1. 红果短剧 - 优先搜索红果短剧平台的热门短剧榜单和话题
2. 剧查查 - 搜索剧查查平台对应名称的榜单数据
3. 抖音短剧 - 搜索抖音平台上的热门短剧内容和话题
4. 快手短剧 - 搜索快手平台上的热门短剧内容和话题
5. Bilibili - 搜索Bilibili平台上的短剧相关内容

如果没有联网搜索功能，请基于你的知识库生成一个包含10个条目的榜单。

要求：
1. 每个条目包含：标题（关键词）、热度标签（"新"、"热"或null）、排名
2. 标题应该是当前最热门、最受关注的AI短剧相关话题、作品名称或趋势
3. 内容应该聚焦于AI生成的短剧、AI短剧制作技术、热门AI短剧作品等
4. 按照热度从高到低排序
5. 返回JSON格式，格式如下：
[
  {"keyword": "话题标题", "tag": "新"或"热"或null, "rank": 1},
  {"keyword": "话题标题", "tag": "新"或"热"或null, "rank": 2},
  ...
]

请确保返回的是有效的JSON数组，不要包含任何其他文字说明。`

  try {
    const response = await callGeminiAPI(prompt, {
      temperature: 0.5,
      maxTokens: 2000,
    })

    // 尝试从响应中提取JSON
    let jsonStr = response
    
    // 如果响应包含代码块，提取JSON部分
    const jsonMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    } else {
      // 尝试直接查找JSON数组
      const arrayMatch = response.match(/\[[\s\S]*?\]/)
      if (arrayMatch) {
        jsonStr = arrayMatch[0]
      }
    }

    const ranking = JSON.parse(jsonStr)
    
    // 验证和规范化数据
    if (!Array.isArray(ranking)) {
      throw new Error('返回的数据不是数组格式')
    }

    return ranking.slice(0, 10).map((item, index) => ({
      keyword: item.keyword || item.title || `AI短剧话题 ${index + 1}`,
      tag: item.tag || null,
      rank: item.rank || index + 1,
      views: item.views || Math.floor(Math.random() * 100000) + 10000,
    }))
  } catch (error) {
    console.error('❌ 生成AI短剧榜失败:', error)
    // 返回默认数据作为后备
    return [
      { keyword: 'AI短剧制作技术突破', tag: '热', rank: 1, views: 80000 },
      { keyword: '红果短剧热门作品推荐', tag: '新', rank: 2, views: 75000 },
      { keyword: 'AI短剧创作工具更新', tag: null, rank: 3, views: 70000 },
      { keyword: '抖音短剧热门话题', tag: null, rank: 4, views: 65000 },
      { keyword: '快手短剧新作品', tag: '新', rank: 5, views: 60000 },
      { keyword: 'AI短剧市场分析', tag: null, rank: 6, views: 55000 },
      { keyword: 'Bilibili短剧内容', tag: null, rank: 7, views: 50000 },
      { keyword: 'AI短剧行业动态', tag: null, rank: 8, views: 45000 },
      { keyword: '剧查查榜单热门', tag: null, rank: 9, views: 40000 },
      { keyword: 'AI短剧未来趋势', tag: null, rank: 10, views: 35000 },
    ]
  }
}

/**
 * 更新榜单数据
 * @param {string} rankingType - 榜单类型 ('anime' 或 'ai-real'，其中 'ai-real' 对应 AI短剧榜)
 * @returns {Promise<Array>} 更新后的榜单数据
 */
export async function updateRanking(rankingType) {
  if (rankingType === 'anime') {
    return await generateAnimeRanking()
  } else if (rankingType === 'ai-real') {
    return await generateAIRealRanking()
  } else {
    throw new Error(`不支持的榜单类型: ${rankingType}`)
  }
}

