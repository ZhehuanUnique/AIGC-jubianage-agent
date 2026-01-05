import { callQwenAPI } from './qwenService.js'

/**
 * 为剧本片段生成详细的分镜提示词
 * @param {string} segment - 剧本片段内容
 * @param {number} shotNumber - 分镜编号
 * @param {string} model - 使用的模型名称，默认 'qwen-max'
 * @param {string} workStyle - 作品风格，如 '真人电影风格', '2d动漫风', '3d动漫风'
 * @param {string} workBackground - 作品背景，如 '古代', '现代', '未来', '中古世纪', '异世界穿越', '末世'
 * @returns {Promise<{prompt: string, description: string}>} 返回分镜提示词和描述
 */
export async function generateShotPrompt(segment, shotNumber, model = 'qwen-max', workStyle = '真人电影风格', workBackground = '现代') {
  if (!segment || segment.trim().length === 0) {
    throw new Error('剧本片段内容不能为空')
  }

  console.log(`🎬 开始为分镜 ${shotNumber} 生成提示词，片段长度: ${segment.length} 字符，风格: ${workStyle}，背景: ${workBackground}`)

  // 根据作品背景生成风格描述
  const backgroundStyleMap = {
    '古代': '古风风格，传统建筑，古典服饰，古代场景元素',
    '现代': '近现代写实风格，现代建筑，现代服饰，现代生活场景',
    '未来': '科技科幻风格，未来建筑，科技感服饰，科幻场景元素，高科技设备',
    '中古世纪': '中古世纪欧洲风格，中世纪建筑，骑士盔甲，城堡场景，欧洲古典元素',
    '末世': '末世风格，废墟场景，破败建筑，末世氛围，荒凉感'
  }

  const backgroundStyle = backgroundStyleMap[workBackground] || '现代写实风格'

  // 构建专业的分镜提示词生成提示
  const prompt = `你是一名大师级别专业的影视导演，根据以下剧本片段的剧情，详细规划分镜脚本，规避开太暴力血腥的画面。

**重要设定：**
- 作品风格：${workStyle}
- 作品背景：${workBackground}（${backgroundStyle}）

要求：
1. 将剧本片段切分为多个分镜，每句话对应两个分镜。
2. 为每个分镜写出详细的中文文生图融图提示词。
3. 融图提示词必须严格按照以下固定格式生成，不要有任何额外文字或解释：
   景别：[景别描述]
   主体: [主体描述]
   风格: [${workStyle}，${backgroundStyle}]
   构图: [构图描述]
   氛围：[氛围描述]
4. 画面比例为横屏16:9。
5. 规避任何暴力血腥的画面。
6. **必须严格遵循作品背景设定**：所有场景、物品、服饰、建筑等元素都必须符合"${workBackground}"的背景设定。

剧本片段：
${segment}

请开始生成分镜提示词：`

  try {
    // 调用大模型API
    const response = await callQwenAPI(prompt, model)
    
    console.log(`🎬 模型响应（前300字符）: ${response.substring(0, 300)}...`)

    // 尝试从响应中提取提示词（按照固定格式）
    let result = {
      prompt: '',
      description: segment.substring(0, 50) + '...', // 默认使用片段前50字符作为描述
    }
    
    // 尝试提取按照固定格式的提示词
    // 格式：景别：... 主体: ... 风格: ... 构图: ... 氛围：...
    const promptPattern = /景别[：:]\s*([^\n]+?)\s*主体[：:]\s*([^\n]+?)\s*风格[：:]\s*([^\n]+?)\s*构图[：:]\s*([^\n]+?)\s*氛围[：:]\s*([^\n]+?)(?:\n|$)/s
    const match = response.match(promptPattern)
    
    if (match) {
      // 找到了格式化的提示词
      result.prompt = `景别：${match[1].trim()}。主体: ${match[2].trim()}。风格: ${match[3].trim()}。构图: ${match[4].trim()}。氛围：${match[5].trim()}。`
    } else {
      // 尝试提取JSON格式
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.prompt) {
            result.prompt = parsed.prompt
          }
          if (parsed.description) {
            result.description = parsed.description
          }
        } catch (e) {
          console.warn('JSON解析失败，使用备用方法:', e.message)
          result.prompt = extractPromptFromResponse(response, segment)
        }
      } else {
        // 如果没有找到JSON，尝试从响应中提取
        result.prompt = extractPromptFromResponse(response, segment)
      }
    }

    // 验证提示词是否包含必要要素
    if (!result.prompt || result.prompt.length < 30) {
      console.warn('⚠️ 生成的提示词太短，使用备用方法')
      result.prompt = generateFallbackPrompt(segment)
    }

    console.log(`✅ 分镜 ${shotNumber} 提示词生成完成`)
    
    return result
  } catch (error) {
    console.error(`❌ 分镜 ${shotNumber} 提示词生成错误:`, error)
    // 如果API调用失败，使用备用方法
    return {
      prompt: generateFallbackPrompt(segment),
      description: segment.substring(0, 50) + '...',
    }
  }
}

/**
 * 从模型响应中提取提示词
 */
function extractPromptFromResponse(response, segment) {
  // 尝试查找包含"景别"、"主体"等关键词的部分
  const lines = response.split('\n')
  let promptLines = []
  let foundPrompt = false

  for (const line of lines) {
    if (line.includes('景别') || line.includes('主体') || line.includes('风格') || line.includes('构图') || line.includes('氛围')) {
      foundPrompt = true
    }
    if (foundPrompt) {
      promptLines.push(line.trim())
      // 如果已经收集了足够的内容，可以停止
      if (promptLines.length > 5 && line.includes('氛围')) {
        break
      }
    }
  }

  if (promptLines.length > 0) {
    return promptLines.join(' ')
  }

  // 如果找不到，使用备用方法
  return generateFallbackPrompt(segment)
}

/**
 * 备用方法：生成基础提示词
 */
function generateFallbackPrompt(segment) {
  // 根据片段内容生成基础提示词
  const keywords = extractKeywords(segment)
  
  return `景别：中景。主体: ${keywords.characters || '人物'}。风格: 三维动漫风。构图: 三分法构图。氛围：${keywords.mood || '温馨'}。画面描述：${segment.substring(0, 100)}...`
}

/**
 * 从片段中提取关键词
 */
function extractKeywords(segment) {
  const keywords = {
    characters: [],
    mood: '温馨',
  }

  // 简单提取人物名称（通过常见模式）
  const namePattern = /[傅苏陆赵李王张刘陈杨黄周吴徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程魏薛吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹][\u4e00-\u9fa5]{1,2}/g
  const names = segment.match(namePattern)
  if (names) {
    keywords.characters = [...new Set(names)].slice(0, 3).join('、')
  }

  // 根据内容判断氛围
  if (segment.includes('开心') || segment.includes('快乐') || segment.includes('笑')) {
    keywords.mood = '轻松愉快'
  } else if (segment.includes('悲伤') || segment.includes('哭') || segment.includes('难过')) {
    keywords.mood = '悲伤沉重'
  } else if (segment.includes('紧张') || segment.includes('害怕') || segment.includes('恐惧')) {
    keywords.mood = '紧张压抑'
  } else if (segment.includes('浪漫') || segment.includes('爱') || segment.includes('情')) {
    keywords.mood = '温馨浪漫'
  }

  return keywords
}

