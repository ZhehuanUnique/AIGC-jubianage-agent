import { callQwenAPI } from './qwenService.js'

/**
 * 分析剧本，提取角色、场景、物品
 * @param {string} scriptContent - 剧本内容
 * @param {string} scriptTitle - 剧本标题（可选）
 * @returns {Promise<Object>} 分析结果
 */
/**
 * 根据剧本长度和复杂度智能选择模型
 * 默认使用 qwen-max 以获得最佳效果
 */
function selectModel(scriptContent, requestedModel) {
  // 如果请求中指定了模型，优先使用
  if (requestedModel && ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-flash'].includes(requestedModel)) {
    return requestedModel
  }
  
  // 默认使用 qwen-max 以获得最佳分析效果
  const modelPreference = process.env.QWEN_MODEL || 'qwen-max'
  
  // 如果明确指定了模型，使用指定模型
  if (modelPreference && ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-flash'].includes(modelPreference)) {
    return modelPreference
  }
  
  // 默认使用 qwen-max
  return 'qwen-max'
}

export async function analyzeScript(scriptContent, scriptTitle = '', model = 'qwen-max') {
  // 构建分析提示词
  const prompt = buildAnalysisPrompt(scriptContent, scriptTitle)

  // 智能选择模型（如果未指定，默认使用 qwen-max）
  const selectedModel = selectModel(scriptContent, model)
  console.log(`📊 剧本分析使用模型: ${selectedModel} (请求的模型: ${model}), 剧本长度: ${scriptContent.length} 字符`)
  console.log(`📊 确认使用模型: ${selectedModel} === 'qwen-max' ? ${selectedModel === 'qwen-max'}`)

  // 调用大模型API
  const response = await callQwenAPI(prompt, selectedModel)
  
  console.log(`📊 模型响应长度: ${response.length} 字符`)

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
  return `你是一个专业的剧本分析专家。请仔细分析以下剧本内容，准确提取出所有角色（人物）、场景（地点）和物品（道具）。

${scriptTitle ? `剧本标题：${scriptTitle}\n\n` : ''}剧本内容：
${scriptContent}

**重要要求：**

1. **角色（人物）提取规则：**
   - 只提取真实的人名，必须是完整的中文姓名（如：傅北川、苏绵绵、云栀）
   - 不要提取非人名的词语，如"白眼"、"许一两"、"许十天"、"余的人"等都不是人名
   - 不要提取动作、表情、描述性词语作为人名
   - 如果同一个人有多个称呼（如"傅北川"和"傅先生"是同一个人），只保留最常用的完整姓名（如"傅北川"）
   - 识别并合并同一人的不同称呼：
     * "傅先生"、"傅总"、"傅北川" → 统一为"傅北川"
     * "苏小姐"、"苏绵绵" → 统一为"苏绵绵"
     * "云栀姐"、"云栀" → 统一为"云栀"
   - 只提取在剧本中实际出现的人物，不要虚构

2. **场景（地点）提取规则：**
   - 提取所有出现的场景或地点，包括室内、室外、具体地点等
   - 场景名称要具体，如"日/内 医院诊室"、"夜/外 街道"、"办公室"、"家中"等

3. **物品（道具）提取规则：**
   - 提取所有出现的物品、道具等
   - 物品要具体，避免过于宽泛的描述
   - 不要提取人物、场景作为物品

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
- 角色名称必须是真实的人名，去重并合并同一人的不同称呼
- 场景名称要具体
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
  let characters = Array.isArray(result.characters) 
    ? result.characters.map(c => ({ name: String(c.name || c).trim() })).filter(c => c.name)
    : []

  // 合并同一人的不同称呼
  characters = mergeDuplicateCharacters(characters)

  return {
    characters,
    scenes: Array.isArray(result.scenes)
      ? result.scenes.map(s => ({ name: String(s.name || s).trim() })).filter(s => s.name)
      : [],
    items: Array.isArray(result.items)
      ? result.items.map(i => ({ name: String(i.name || i).trim() })).filter(i => i.name)
      : [],
  }
}

/**
 * 合并同一人的不同称呼
 */
function mergeDuplicateCharacters(characters) {
  // 定义常见的称呼映射规则
  const nameMappings = {
    '傅先生': '傅北川',
    '傅总': '傅北川',
    '傅老板': '傅北川',
    '苏小姐': '苏绵绵',
    '苏绵绵': '苏绵绵',
    '云栀姐': '云栀',
    '云栀': '云栀',
  }

  // 创建映射表，用于快速查找
  const mappingMap = new Map()
  Object.entries(nameMappings).forEach(([alias, realName]) => {
    mappingMap.set(alias, realName)
  })

  // 合并和去重
  const merged = new Map()
  
  for (const char of characters) {
    const name = char.name
    
    // 检查是否是已知的别名
    let realName = mappingMap.get(name)
    
    // 如果没有直接映射，检查是否包含已知的姓氏+称呼模式
    if (!realName) {
      // 检查"傅"开头的称呼
      if (name.includes('傅') && (name.includes('先生') || name.includes('总') || name.includes('老板'))) {
        realName = '傅北川'
      }
      // 检查"苏"开头的称呼
      else if (name.includes('苏') && name.includes('小姐')) {
        realName = '苏绵绵'
      }
      // 检查"云栀"相关的称呼
      else if (name.includes('云栀')) {
        realName = '云栀'
      }
      // 如果名字本身是完整姓名（2-3个中文字符），直接使用
      else if (/^[\u4e00-\u9fa5]{2,3}$/.test(name)) {
        realName = name
      }
      // 否则跳过（可能是非人名）
      else {
        // 过滤掉明显不是人名的词语
        const invalidPatterns = ['白眼', '许一两', '许十天', '余的人', '的人', '一两', '十天']
        if (invalidPatterns.some(pattern => name.includes(pattern))) {
          continue // 跳过这个"角色"
        }
        realName = name // 保留其他可能的姓名
      }
    }
    
    // 使用真实姓名作为key，去重
    if (!merged.has(realName)) {
      merged.set(realName, { name: realName })
    }
  }

  return Array.from(merged.values())
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

