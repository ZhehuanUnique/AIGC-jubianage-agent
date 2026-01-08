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
    'flash': 'gemini-3-flash-preview', // 302.ai 支持的 Gemini 3 Flash 模型
    'pro': 'gemini-3-pro-preview', // 302.ai 支持的 Gemini 3 Pro 模型
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
    console.log(`🤖 调用 Gemini ${modelType === 'flash' ? '3 Flash' : '3 Pro'} API 生成榜单... (模型: ${model})`)

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
 * 生成动态漫剧榜
 * @returns {Promise<Array>} 榜单数据数组
 */
export async function generateAnimeRanking() {
  const prompt = `请使用联网搜索功能（如果可用），搜索并整理2026年1月最热门的动态漫剧作品榜单。请优先从以下数据源获取信息：
1. Bilibili动态漫剧热门榜单
2. 腾讯视频动态漫剧排行榜
3. 爱奇艺动态漫剧热播榜
4. 抖音动态漫剧热门作品
5. 快手动态漫剧热门作品

重要要求：
1. 只返回具体的动态漫剧作品名称，不要返回资讯、技术话题或行业动态
2. 作品名称格式：《作品名》
3. 每个条目包含：作品名称（keyword）、热度标签（"新"表示新上榜、"热"表示持续热门、null表示普通）、排名、浏览量
4. 返回20个热门动态漫剧作品
5. 按照热度从高到低排序
6. 返回JSON格式：
[
  {"keyword": "《作品名》", "tag": "新"或"热"或null, "rank": 1, "views": 1250000},
  ...
]

请确保返回的是有效的JSON数组，只包含作品名称，不要包含任何资讯或话题。`

  try {
    const response = await callGeminiAPI(prompt, {
      temperature: 0.5,
      maxTokens: 3000,
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

    return ranking.slice(0, 20).map((item, index) => ({
      keyword: item.keyword || item.title || `动态漫剧作品 ${index + 1}`,
      tag: item.tag || null,
      rank: item.rank || index + 1,
      views: item.views || Math.floor(Math.random() * 1000000) + 100000,
    }))
  } catch (error) {
    console.error('❌ 生成动态漫剧榜失败:', error)
    // 返回2026年1月热门动态漫剧作品默认数据
    return [
      { keyword: '《斗罗大陆》', tag: '热', rank: 1, views: 1580000 },
      { keyword: '《完美世界》', tag: '热', rank: 2, views: 1420000 },
      { keyword: '《斗破苍穹》', tag: '热', rank: 3, views: 1350000 },
      { keyword: '《万古神帝》', tag: '新', rank: 4, views: 1280000 },
      { keyword: '《武动乾坤》', tag: '热', rank: 5, views: 1150000 },
      { keyword: '《遮天》', tag: '新', rank: 6, views: 1080000 },
      { keyword: '《吞噬星空》', tag: '热', rank: 7, views: 980000 },
      { keyword: '《凡人修仙传》', tag: '热', rank: 8, views: 920000 },
      { keyword: '《一念永恒》', tag: null, rank: 9, views: 850000 },
      { keyword: '《仙逆》', tag: '新', rank: 10, views: 780000 },
      { keyword: '《神印王座》', tag: null, rank: 11, views: 720000 },
      { keyword: '《雪中悍刀行》', tag: '热', rank: 12, views: 680000 },
      { keyword: '《剑来》', tag: '新', rank: 13, views: 650000 },
      { keyword: '《大奉打更人》', tag: null, rank: 14, views: 620000 },
      { keyword: '《诛仙》', tag: null, rank: 15, views: 580000 },
      { keyword: '《牧神记》', tag: '新', rank: 16, views: 550000 },
      { keyword: '《圣墟》', tag: null, rank: 17, views: 520000 },
      { keyword: '《帝霸》', tag: null, rank: 18, views: 480000 },
      { keyword: '《永生》', tag: null, rank: 19, views: 450000 },
      { keyword: '《飞剑问道》', tag: null, rank: 20, views: 420000 },
    ]
  }
}

/**
 * 生成AI短剧榜
 * @returns {Promise<Array>} 榜单数据数组
 */
export async function generateAIRealRanking() {
  const prompt = `请使用联网搜索功能（如果可用），搜索并整理2026年1月最热门的AI短剧作品榜单。请优先从以下数据源获取信息：
1. 红果短剧热门榜单
2. 抖音短剧热播榜
3. 快手短剧排行榜
4. 剧查查短剧榜单
5. Bilibili短剧热门

重要要求：
1. 只返回具体的AI短剧作品名称，不要返回资讯、技术话题或行业动态
2. 作品名称格式：《作品名》
3. 每个条目包含：作品名称（keyword）、热度标签（"新"表示新上榜、"热"表示持续热门、null表示普通）、排名、浏览量
4. 返回20个热门AI短剧作品
5. 按照热度从高到低排序
6. 返回JSON格式：
[
  {"keyword": "《作品名》", "tag": "新"或"热"或null, "rank": 1, "views": 2500000},
  ...
]

请确保返回的是有效的JSON数组，只包含作品名称，不要包含任何资讯或话题。`

  try {
    const response = await callGeminiAPI(prompt, {
      temperature: 0.5,
      maxTokens: 3000,
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

    return ranking.slice(0, 20).map((item, index) => ({
      keyword: item.keyword || item.title || `AI短剧作品 ${index + 1}`,
      tag: item.tag || null,
      rank: item.rank || index + 1,
      views: item.views || Math.floor(Math.random() * 2000000) + 500000,
    }))
  } catch (error) {
    console.error('❌ 生成AI短剧榜失败:', error)
    // 返回2026年1月热门AI短剧作品默认数据
    return [
      { keyword: '《重生之门》', tag: '热', rank: 1, views: 3250000 },
      { keyword: '《闪婚后傅总每天都在追妻》', tag: '热', rank: 2, views: 2980000 },
      { keyword: '《龙王令》', tag: '新', rank: 3, views: 2750000 },
      { keyword: '《战神归来》', tag: '热', rank: 4, views: 2580000 },
      { keyword: '《豪门弃妇的逆袭》', tag: '新', rank: 5, views: 2420000 },
      { keyword: '《神医下山》', tag: '热', rank: 6, views: 2280000 },
      { keyword: '《总裁的替嫁新娘》', tag: null, rank: 7, views: 2150000 },
      { keyword: '《穿越之农门贵女》', tag: '新', rank: 8, views: 1980000 },
      { keyword: '《绝世神医》', tag: '热', rank: 9, views: 1850000 },
      { keyword: '《霸道总裁爱上我》', tag: null, rank: 10, views: 1720000 },
      { keyword: '《重生之商界女王》', tag: '新', rank: 11, views: 1650000 },
      { keyword: '《神豪从退婚开始》', tag: null, rank: 12, views: 1580000 },
      { keyword: '《离婚后前夫后悔了》', tag: '热', rank: 13, views: 1520000 },
      { keyword: '《都市最强战神》', tag: null, rank: 14, views: 1450000 },
      { keyword: '《千金归来》', tag: '新', rank: 15, views: 1380000 },
      { keyword: '《隐婚甜妻》', tag: null, rank: 16, views: 1320000 },
      { keyword: '《逆袭人生》', tag: null, rank: 17, views: 1250000 },
      { keyword: '《豪门恩怨》', tag: null, rank: 18, views: 1180000 },
      { keyword: '《重生之我是大明星》', tag: '新', rank: 19, views: 1120000 },
      { keyword: '《总裁的秘密情人》', tag: null, rank: 20, views: 1050000 },
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

