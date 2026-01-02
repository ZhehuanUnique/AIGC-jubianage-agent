import { callQwenAPI } from './qwenService.js'
import { generateShotPrompt } from './shotPromptGenerator.js'

/**
 * 将剧本切分为多个片段，每个片段对应一个分镜，并生成详细的分镜提示词
 * @param {string} scriptContent - 完整剧本内容
 * @param {string} scriptTitle - 剧本标题（可选）
 * @param {string} model - 使用的模型名称，默认 'qwen-max'，可选 'qwen-plus'
 * @param {boolean} generatePrompts - 是否生成分镜提示词，默认 true
 * @param {string} workStyle - 作品风格，如 '真人电影风格', '2d动漫风', '3d动漫风'
 * @param {string} workBackground - 作品背景，如 '古代', '现代', '未来', '中古世纪', '异世界穿越', '末世'
 * @returns {Promise<Array<{segment: string, shotNumber: number, prompt?: string, description?: string}>>} 返回切分后的片段数组，包含分镜提示词
 */
export async function segmentScript(scriptContent, scriptTitle = '', model = 'qwen-max', generatePrompts = true, workStyle = '真人电影风格', workBackground = '现代') {
  if (!scriptContent || scriptContent.trim().length === 0) {
    throw new Error('剧本内容不能为空')
  }

  console.log('📝 开始切分剧本，长度:', scriptContent.length, '字符')
  console.log('📝 作品风格:', workStyle, '作品背景:', workBackground)

  // 根据作品背景生成风格描述
  const backgroundStyleMap = {
    '古代': '古风风格，传统建筑，古典服饰，古代场景元素',
    '现代': '近现代写实风格，现代建筑，现代服饰，现代生活场景',
    '未来': '科技科幻风格，未来建筑，科技感服饰，科幻场景元素，高科技设备',
    '中古世纪': '中古世纪欧洲风格，中世纪建筑，骑士盔甲，城堡场景，欧洲古典元素',
    '异世界穿越': '异世界穿越风格，奇幻建筑，魔法元素，天马行空的设定，可以是真人风格也可以是动漫风格',
    '末世': '末世风格，废墟场景，破败建筑，末世氛围，荒凉感'
  }

  const backgroundStyle = backgroundStyleMap[workBackground] || '现代写实风格'

  // 构建提示词 - 每句话对应两个分镜
  const prompt = `你是一名大师级别专业的影视导演，根据上述剧本的剧情，详细规划分镜脚本，规避开太暴力血腥的画面。

**重要设定：**
- 作品风格：${workStyle}
- 作品背景：${workBackground}（${backgroundStyle}）

**重要要求：每句话必须对应两个分镜！**

切分规则：
1. 仔细阅读剧本，识别每一句话（以句号、问号、感叹号、换行为分隔）
2. 对于每一句话，必须生成两个分镜片段
3. 如果一句话较长，可以按照动作、对话、场景等逻辑切分为两个分镜
4. 如果一句话较短，两个分镜可以是同一句话的不同视角或不同时刻
5. 每个片段应该适合制作一个5-10秒的视频分镜
6. 规避开太暴力血腥的画面，使用更温和的表达方式
7. 不要遗漏任何内容，所有片段合起来应该是完整的剧本
8. **必须严格遵循作品背景设定**：所有场景、物品、服饰、建筑等元素都必须符合"${workBackground}"的背景设定

示例：
如果剧本中有："听说傅北川很爱很爱我，苏绵绵不服气地撇撇嘴，朝我翻了个白眼。"
应该切分为两个分镜：
- 分镜1："听说傅北川很爱很爱我，苏绵绵不服气地撇撇嘴"
- 分镜2："苏绵绵朝我翻了个白眼"

请按照以下JSON格式返回结果，不要添加任何其他文字说明：
{
  "segments": [
    {
      "shotNumber": 1,
      "segment": "第一个片段的完整内容"
    },
    {
      "shotNumber": 2,
      "segment": "第二个片段的完整内容"
    }
  ]
}

剧本标题：${scriptTitle || '未命名剧本'}

剧本内容：
${scriptContent}

请开始切分，确保每句话对应两个分镜，并严格遵循"${workBackground}"的背景设定：`

  try {
    // 调用大模型API（使用指定的模型）
    const response = await callQwenAPI(prompt, model)
    
    console.log('📝 模型响应:', response.substring(0, 200) + '...')

    // 尝试解析JSON响应
    let segments = []
    
    // 尝试提取JSON部分
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.segments && Array.isArray(parsed.segments)) {
          segments = parsed.segments
        }
      } catch (e) {
        console.warn('JSON解析失败，尝试其他方式:', e.message)
      }
    }

    // 如果JSON解析失败，尝试按行切分
    if (segments.length === 0) {
      console.log('⚠️ JSON解析失败，使用备用切分方法')
      segments = fallbackSegmentScript(scriptContent)
    }

    // 验证片段完整性
    const allSegmentsText = segments.map(s => s.segment).join('')
    if (allSegmentsText.length < scriptContent.length * 0.8) {
      console.warn('⚠️ 片段可能不完整，使用备用切分方法')
      segments = fallbackSegmentScript(scriptContent)
    }

    console.log(`✅ 剧本切分完成，共 ${segments.length} 个片段`)

    // 如果需要生成分镜提示词
    if (generatePrompts) {
      console.log('🎬 开始为每个片段生成分镜提示词...')
      const segmentsWithPrompts = []
      
      for (const segment of segments) {
        try {
          const promptResult = await generateShotPrompt(segment.segment, segment.shotNumber, model, workStyle, workBackground)
          segmentsWithPrompts.push({
            ...segment,
            prompt: promptResult.prompt,
            description: promptResult.description,
          })
          // 添加短暂延迟，避免API限流
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.warn(`⚠️ 分镜 ${segment.shotNumber} 提示词生成失败，使用默认值:`, error.message)
          segmentsWithPrompts.push({
            ...segment,
            prompt: `景别：中景。主体: 人物。风格: 三维动漫风。构图: 三分法构图。氛围：温馨。画面描述：${segment.segment.substring(0, 100)}...`,
            description: segment.segment.substring(0, 50) + '...',
          })
        }
      }
      
      console.log(`✅ 所有分镜提示词生成完成`)
      return segmentsWithPrompts
    }
    
    return segments
  } catch (error) {
    console.error('❌ 剧本切分错误:', error)
    // 如果API调用失败，使用备用方法
    console.log('⚠️ 使用备用切分方法')
    return fallbackSegmentScript(scriptContent)
  }
}

/**
 * 备用切分方法：按句子和标点符号切分，每句话对应两个分镜
 */
function fallbackSegmentScript(scriptContent) {
  const segments = []
  
  // 按句子切分（中文句号、问号、感叹号、换行等）
  const sentences = scriptContent
    .split(/[。！？\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  console.log(`📝 识别到 ${sentences.length} 个句子`)

  let shotNumber = 1
  const minSegmentLength = 10 // 最小片段长度（降低要求，确保短句也能切分）

  // 每句话对应两个分镜
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    
    if (sentence.length === 0) continue

    // 每句话都生成两个分镜
    if (sentence.length >= minSegmentLength * 2) {
      // 如果句子足够长，尝试在中间切分
      const midPoint = Math.floor(sentence.length / 2)
      
      // 优先在逗号、分号处切分
      let splitPoint = -1
      const commaIndex = sentence.indexOf('，', midPoint - 30)
      const semicolonIndex = sentence.indexOf('；', midPoint - 30)
      const pauseIndex = sentence.indexOf('、', midPoint - 30)
      
      if (commaIndex > 0 && commaIndex < sentence.length - minSegmentLength) {
        splitPoint = commaIndex + 1
      } else if (semicolonIndex > 0 && semicolonIndex < sentence.length - minSegmentLength) {
        splitPoint = semicolonIndex + 1
      } else if (pauseIndex > 0 && pauseIndex < sentence.length - minSegmentLength) {
        splitPoint = pauseIndex + 1
      } else {
        // 如果没有找到合适的标点，在中间位置切分
        splitPoint = midPoint
      }
      
      // 确保切分后的两部分都足够长
      if (splitPoint >= minSegmentLength && sentence.length - splitPoint >= minSegmentLength) {
        // 切分为两个分镜
        segments.push({
          shotNumber: shotNumber++,
          segment: sentence.substring(0, splitPoint).trim()
        })
        segments.push({
          shotNumber: shotNumber++,
          segment: sentence.substring(splitPoint).trim()
        })
      } else {
        // 如果无法切分，仍然生成两个分镜（使用完整句子）
        segments.push({
          shotNumber: shotNumber++,
          segment: sentence
        })
        segments.push({
          shotNumber: shotNumber++,
          segment: sentence // 第二个分镜使用相同内容，但可以有不同的视角
        })
      }
    } else if (sentence.length >= minSegmentLength) {
      // 短句子也生成两个分镜
      segments.push({
        shotNumber: shotNumber++,
        segment: sentence
      })
      segments.push({
        shotNumber: shotNumber++,
        segment: sentence
      })
    } else {
      // 非常短的句子，合并到上一个片段，但仍然确保每句话有两个分镜
      if (segments.length >= 2) {
        // 如果已经有分镜，将短句添加到最后一个分镜
        segments[segments.length - 1].segment += '。' + sentence
      } else {
        // 如果没有分镜，创建两个
        segments.push({
          shotNumber: shotNumber++,
          segment: sentence
        })
        segments.push({
          shotNumber: shotNumber++,
          segment: sentence
        })
      }
    }
  }

  // 确保至少有两个片段（每句话对应两个分镜）
  if (segments.length === 0) {
    // 如果完全没有句子，按段落切分
    const paragraphs = scriptContent.split(/\n\n+/).filter(p => p.trim().length > 0)
    for (const para of paragraphs) {
      segments.push({
        shotNumber: shotNumber++,
        segment: para.trim()
      })
      segments.push({
        shotNumber: shotNumber++,
        segment: para.trim()
      })
    }
  }

  // 如果只有一个片段，确保至少有两个分镜
  if (segments.length === 1) {
    const firstSegment = segments[0].segment
    const midPoint = Math.floor(firstSegment.length / 2)
    const commaIndex = firstSegment.indexOf('，', midPoint - 30)
    const splitPoint = commaIndex > 0 ? commaIndex + 1 : midPoint
    
    if (splitPoint > 10 && firstSegment.length - splitPoint > 10) {
      segments[0].segment = firstSegment.substring(0, splitPoint).trim()
      segments.push({
        shotNumber: 2,
        segment: firstSegment.substring(splitPoint).trim()
      })
    } else {
      segments.push({
        shotNumber: 2,
        segment: firstSegment
      })
    }
  }

  console.log(`📝 备用切分方法完成，共 ${segments.length} 个片段（每句话对应两个分镜）`)
  
  return segments
}

