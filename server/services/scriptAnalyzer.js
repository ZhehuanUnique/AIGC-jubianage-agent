import { callQwenAPI } from './qwenService.js'

/**
 * 分析剧本，提取角色、场景、物品
 * @param {string} scriptContent - 剧本内容
 * @param {string} scriptTitle - 剧本标题（可选）
 * @returns {Promise<Object>} 分析结果
 */
/**
 * 根据剧本长度和复杂度智能选择模型
 */
function selectModel(scriptContent) {
  const length = scriptContent.length
  const modelPreference = process.env.QWEN_MODEL || 'qwen-plus' // 默认使用Plus
  
  // 如果明确指定了模型，使用指定模型
  if (modelPreference && ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-flash'].includes(modelPreference)) {
    return modelPreference
  }
  
  // 智能选择策略
  // 长剧本或复杂剧本使用Max
  if (length > 15000 || modelPreference === 'auto-max') {
    return 'qwen-max'
  }
  
  // 短剧本使用Flash
  if (length < 5000) {
    return 'qwen-turbo' // 或 'qwen-flash'
  }
  
  // 默认使用Plus（平衡效果和成本）
  return 'qwen-plus'
}

export async function analyzeScript(scriptContent, scriptTitle = '') {
  // 构建分析提示词
  const prompt = buildAnalysisPrompt(scriptContent, scriptTitle)

  // 智能选择模型
  const model = selectModel(scriptContent)
  console.log(`使用模型: ${model}, 剧本长度: ${scriptContent.length} 字符`)

  // 调用大模型API
  const response = await callQwenAPI(prompt, model)

  // 解析返回结果
  try {
    const result = parseAnalysisResult(response)
    return result
  } catch (error) {
    // 如果解析失败，尝试手动提取
    console.warn('JSON解析失败，尝试手动提取:', error)
    return extractManually(scriptContent, response)
  }
}

/**
 * 构建分析提示词
 */
function buildAnalysisPrompt(scriptContent, scriptTitle) {
  return `你是一个专业的剧本分析专家。请仔细分析以下剧本内容，提取出所有角色（人物）、场景（地点）和物品（道具）。

${scriptTitle ? `剧本标题：${scriptTitle}\n\n` : ''}剧本内容：
${scriptContent}

请按照以下要求进行分析：
1. **角色（人物）**：提取所有出现的角色名称，包括主要角色和次要角色
2. **场景（地点）**：提取所有出现的场景或地点，包括室内、室外、具体地点等
3. **物品（道具）**：提取所有出现的物品、道具、物品等

请以JSON格式返回结果，格式必须严格如下：
{
  "characters": [
    {"name": "角色名称1"},
    {"name": "角色名称2"}
  ],
  "scenes": [
    {"name": "场景名称1"},
    {"name": "场景名称2"}
  ],
  "items": [
    {"name": "物品名称1"},
    {"name": "物品名称2"}
  ]
}

注意：
- 只返回JSON，不要包含其他文字说明
- 角色名称要去重，相同角色只出现一次
- 场景名称要具体，如"日/内 医院诊室"、"夜/外 街道"等
- 物品要具体，避免过于宽泛的描述
- 如果某个类别没有找到，返回空数组[]
`
}

/**
 * 解析大模型返回的JSON结果
 */
function parseAnalysisResult(response) {
  // 尝试提取JSON部分
  let jsonStr = response.trim()
  
  // 如果包含markdown代码块，提取其中的JSON
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1]
  }

  // 尝试找到第一个 { 和最后一个 }
  const firstBrace = jsonStr.indexOf('{')
  const lastBrace = jsonStr.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1)
  }

  const result = JSON.parse(jsonStr)

  // 验证和规范化结果
  return {
    characters: Array.isArray(result.characters) 
      ? result.characters.map(c => ({ name: String(c.name || c).trim() })).filter(c => c.name)
      : [],
    scenes: Array.isArray(result.scenes)
      ? result.scenes.map(s => ({ name: String(s.name || s).trim() })).filter(s => s.name)
      : [],
    items: Array.isArray(result.items)
      ? result.items.map(i => ({ name: String(i.name || i).trim() })).filter(i => i.name)
      : [],
  }
}

/**
 * 手动提取（备用方案）
 */
function extractManually(scriptContent, modelResponse) {
  // 简单的正则提取作为备用
  const characters = []
  const scenes = []
  const items = []

  // 这里可以实现一些基础的规则提取
  // 例如：识别常见的场景格式 "日/内"、"夜/外" 等

  return {
    characters,
    scenes,
    items,
  }
}

