import { callQwenAPI } from './qwenService.js'

/**
 * 将剧本切分为多个片段，每个片段对应一个分镜
 * @param {string} scriptContent - 完整剧本内容
 * @param {string} scriptTitle - 剧本标题（可选）
 * @returns {Promise<Array<{segment: string, shotNumber: number}>>} 返回切分后的片段数组
 */
export async function segmentScript(scriptContent, scriptTitle = '') {
  if (!scriptContent || scriptContent.trim().length === 0) {
    throw new Error('剧本内容不能为空')
  }

  console.log('📝 开始切分剧本，长度:', scriptContent.length, '字符')

  // 构建提示词
  const prompt = `你是一个专业的剧本分析助手。请将以下剧本内容切分为多个片段，每个片段对应一个视频分镜。

要求：
1. 根据剧本的自然段落、场景转换、对话切换等逻辑进行切分
2. 每个片段应该是一个相对完整的情节单元
3. 片段之间应该有清晰的逻辑分隔
4. 不要遗漏任何内容，所有片段合起来应该是完整的剧本
5. 每个片段应该适合制作一个5-10秒的视频分镜

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

请开始切分：`

  try {
    // 调用qwen-plus模型
    const response = await callQwenAPI(prompt, 'qwen-plus')
    
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
    
    return segments
  } catch (error) {
    console.error('❌ 剧本切分错误:', error)
    // 如果API调用失败，使用备用方法
    console.log('⚠️ 使用备用切分方法')
    return fallbackSegmentScript(scriptContent)
  }
}

/**
 * 备用切分方法：按段落和标点符号切分
 */
function fallbackSegmentScript(scriptContent) {
  const segments = []
  const lines = scriptContent.split(/\n+/).filter(line => line.trim().length > 0)
  
  let currentSegment = ''
  let shotNumber = 1
  const minSegmentLength = 50 // 最小片段长度
  const maxSegmentLength = 500 // 最大片段长度

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (line.length === 0) continue

    // 如果当前片段加上新行会超过最大长度，或者遇到明显的场景分隔
    if (currentSegment.length + line.length > maxSegmentLength || 
        line.match(/^(第[一二三四五六七八九十]+场|场景|转场|切换|——|===)/)) {
      if (currentSegment.length >= minSegmentLength) {
        segments.push({
          shotNumber: shotNumber++,
          segment: currentSegment.trim()
        })
        currentSegment = line
      } else {
        currentSegment += '\n' + line
      }
    } else {
      currentSegment += (currentSegment ? '\n' : '') + line
    }
  }

  // 添加最后一个片段
  if (currentSegment.trim().length >= minSegmentLength) {
    segments.push({
      shotNumber: shotNumber++,
      segment: currentSegment.trim()
    })
  } else if (segments.length > 0) {
    // 如果最后一个片段太短，合并到上一个片段
    segments[segments.length - 1].segment += '\n' + currentSegment.trim()
  }

  // 确保至少有一个片段
  if (segments.length === 0) {
    segments.push({
      shotNumber: 1,
      segment: scriptContent.trim()
    })
  }

  return segments
}

