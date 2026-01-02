/**
 * 按集数切分剧本并导入到 RAG 库
 * 
 * 切分逻辑：
 * 1. 首先按照集数标识切分（"1."、"第一集"、"第1集"等）
 * 2. 第一集之前的内容作为"第0集"
 * 3. "番外"作为最后一集+1
 * 4. shotNumber 格式：
 *    - 集数级别：0, 1, 2, ..., N
 *    - 片段级别：0-1, 0-2, 1-1, 1-9 等（集数-片段序号）
 * 
 * 使用方法：
 * node server/services/videoMotionPrompt/import-script-by-episode.js
 */

import { parseDocx } from '../../utils/docxParser.js'
import { ragService } from './ragService.js'
import { existsSync } from 'fs'

// 剧本文件路径
const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\安萌.docx'
const scriptId = 'anmeng' // RAG 库中的剧本ID

/**
 * 检测集数标识
 * 支持格式：
 * - "1."、"2."、"3." 等
 * - "第一集"、"第二集"、"第三集" 等
 * - "第1集"、"第2集"、"第3集" 等
 * - "番外"
 */
function detectEpisodeMarkers(text) {
  const markers = []
  
  // 匹配 "1."、"2." 等（数字+点）
  const numberDotPattern = /^(\d+)\.\s*$/gm
  let match
  while ((match = numberDotPattern.exec(text)) !== null) {
    markers.push({
      position: match.index,
      episode: parseInt(match[1]),
      type: 'number-dot',
      text: match[0]
    })
  }
  
  // 匹配 "第一集"、"第二集" 等
  const chineseNumberPattern = /^(第[一二三四五六七八九十百千万]+集)\s*$/gm
  while ((match = chineseNumberPattern.exec(text)) !== null) {
    const chineseNum = match[1]
    // 简单转换（可以扩展更完整的转换）
    let episodeNum = 0
    if (chineseNum.includes('一')) episodeNum = 1
    else if (chineseNum.includes('二')) episodeNum = 2
    else if (chineseNum.includes('三')) episodeNum = 3
    else if (chineseNum.includes('四')) episodeNum = 4
    else if (chineseNum.includes('五')) episodeNum = 5
    else if (chineseNum.includes('六')) episodeNum = 6
    else if (chineseNum.includes('七')) episodeNum = 7
    else if (chineseNum.includes('八')) episodeNum = 8
    else if (chineseNum.includes('九')) episodeNum = 9
    else if (chineseNum.includes('十')) episodeNum = 10
    
    markers.push({
      position: match.index,
      episode: episodeNum,
      type: 'chinese-number',
      text: match[0]
    })
  }
  
  // 匹配 "第1集"、"第2集" 等
  const numberPattern = /^(第(\d+)集)\s*$/gm
  while ((match = numberPattern.exec(text)) !== null) {
    markers.push({
      position: match.index,
      episode: parseInt(match[2]),
      type: 'number',
      text: match[0]
    })
  }
  
  // 匹配 "番外"
  const extraPattern = /^(番外)\s*$/gm
  while ((match = extraPattern.exec(text)) !== null) {
    markers.push({
      position: match.index,
      episode: -1, // 特殊标记，后续处理
      type: 'extra',
      text: match[0]
    })
  }
  
  // 按位置排序
  markers.sort((a, b) => a.position - b.position)
  
  return markers
}

/**
 * 将中文数字转换为阿拉伯数字（简化版）
 */
function chineseToNumber(chinese) {
  const map = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
  }
  // 这里可以扩展更完整的转换逻辑
  for (const [ch, num] of Object.entries(map)) {
    if (chinese.includes(ch)) return num
  }
  return 0
}

/**
 * 按集数切分剧本
 */
function segmentByEpisodes(text) {
  const markers = detectEpisodeMarkers(text)
  
  if (markers.length === 0) {
    // 没有找到集数标识，整个作为第0集
    return [{
      episode: 0,
      content: text,
      startPos: 0,
      endPos: text.length
    }]
  }
  
  const episodes = []
  
  // 处理第一集之前的内容（第0集）
  if (markers[0].position > 0) {
    episodes.push({
      episode: 0,
      content: text.substring(0, markers[0].position).trim(),
      startPos: 0,
      endPos: markers[0].position
    })
  }
  
  // 处理每一集
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]
    const nextMarker = markers[i + 1]
    
    let episodeNum = marker.episode
    // 如果是番外，需要确定是第几集
    if (episodeNum === -1) {
      // 番外作为最后一集+1
      const maxEpisode = Math.max(...markers.filter(m => m.episode !== -1).map(m => m.episode), 0)
      episodeNum = maxEpisode + 1
    }
    
    const startPos = marker.position + marker.text.length
    const endPos = nextMarker ? nextMarker.position : text.length
    
    const content = text.substring(startPos, endPos).trim()
    
    if (content.length > 0) {
      episodes.push({
        episode: episodeNum,
        content: content,
        startPos: startPos,
        endPos: endPos,
        marker: marker.text
      })
    }
  }
  
  return episodes
}

/**
 * 在单集内切分片段（按段落）
 */
function segmentEpisodeContent(content) {
  // 按段落切分（双换行或单换行）
  const paragraphs = content
    .split(/\n\s*\n/) // 双换行分隔段落
    .map(p => p.trim())
    .filter(p => p.length > 0)
  
  // 如果段落太少，尝试按单换行切分
  if (paragraphs.length < 2) {
    return content
      .split(/\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
  }
  
  return paragraphs
}

/**
 * 生成 shotNumber（格式：集数-片段序号）
 */
function generateShotNumber(episode, segmentIndex) {
  return `${episode}-${segmentIndex + 1}`
}

async function importScriptToRAG() {
  console.log('📚 按集数切分剧本并导入到 RAG 库...\n')

  try {
    // 步骤 1: 检查文件是否存在
    console.log('1️⃣ 检查文件...')
    if (!existsSync(scriptFilePath)) {
      console.error(`❌ 文件不存在: ${scriptFilePath}`)
      return
    }
    console.log(`✅ 找到文件: ${scriptFilePath}\n`)

    // 步骤 2: 解析 DOCX 文件
    console.log('2️⃣ 解析 DOCX 文件...')
    const scriptContent = await parseDocx(scriptFilePath)
    
    if (!scriptContent || scriptContent.trim().length === 0) {
      console.error('❌ 文件内容为空或无法解析')
      return
    }
    
    console.log(`✅ 解析成功，剧本长度: ${scriptContent.length} 字符\n`)

    // 步骤 3: 检测集数标识
    console.log('3️⃣ 检测集数标识...')
    const markers = detectEpisodeMarkers(scriptContent)
    console.log(`✅ 找到 ${markers.length} 个集数标识`)
    if (markers.length > 0) {
      console.log('   前5个标识:')
      markers.slice(0, 5).forEach(m => {
        console.log(`   - 位置 ${m.position}: "${m.text}" (第${m.episode === -1 ? '番外' : m.episode}集)`)
      })
    }
    console.log('')

    // 步骤 4: 按集数切分
    console.log('4️⃣ 按集数切分...')
    const episodes = segmentByEpisodes(scriptContent)
    console.log(`✅ 切分完成，共 ${episodes.length} 集`)
    episodes.forEach(ep => {
      console.log(`   - 第${ep.episode}集: ${ep.content.length} 字符`)
    })
    console.log('')

    // 步骤 5: 在每集内切分片段
    console.log('5️⃣ 在每集内切分片段...')
    const allSegments = []
    
    for (const episode of episodes) {
      const segments = segmentEpisodeContent(episode.content)
      console.log(`   第${episode.episode}集: ${segments.length} 个片段`)
      
      segments.forEach((content, index) => {
        allSegments.push({
          episode: episode.episode,
          segmentIndex: index + 1,
          shotNumber: generateShotNumber(episode.episode, index),
          content: content,
        })
      })
    }
    
    console.log(`✅ 总共 ${allSegments.length} 个片段\n`)

    // 步骤 6: 准备存储到 RAG 库的数据
    console.log('6️⃣ 准备存储数据...')
    const segmentsForRAG = allSegments.map(seg => ({
      shotNumber: seg.shotNumber,
      episode: seg.episode,
      segmentIndex: seg.segmentIndex,
      content: seg.content,
      prompt: '', // 可以后续手动添加
      description: '', // 可以后续手动添加
    }))
    
    console.log(`✅ 数据准备完成`)
    console.log(`   示例片段: ${segmentsForRAG[0].shotNumber} - ${segmentsForRAG[0].content.substring(0, 50)}...`)
    if (segmentsForRAG.length > 1) {
      console.log(`   示例片段: ${segmentsForRAG[1].shotNumber} - ${segmentsForRAG[1].content.substring(0, 50)}...`)
    }
    console.log('')

    // 步骤 7: 存储到 RAG 库
    console.log('7️⃣ 存储到 RAG 库...')
    const storeResult = await ragService.storeScriptSegments(scriptId, segmentsForRAG)
    
    if (!storeResult) {
      console.error('❌ 存储到 RAG 库失败')
      return
    }
    
    console.log(`✅ 成功存储 ${segmentsForRAG.length} 个片段到 RAG 库`)
    console.log(`   RAG 库 ID: ${scriptId}`)
    console.log(`   存储路径: ./data/rag_vectors/${scriptId}.json`)
    console.log(`   集数统计:`)
    const episodeStats = {}
    segmentsForRAG.forEach(seg => {
      if (!episodeStats[seg.episode]) {
        episodeStats[seg.episode] = 0
      }
      episodeStats[seg.episode]++
    })
    Object.keys(episodeStats).sort((a, b) => parseInt(a) - parseInt(b)).forEach(ep => {
      console.log(`   - 第${ep}集: ${episodeStats[ep]} 个片段`)
    })
    console.log('')

    // 步骤 8: 验证存储
    console.log('8️⃣ 验证存储...')
    if (segmentsForRAG.length > 0) {
      const testRetrieval = await ragService.retrieveRelevantSegments(
        scriptId,
        segmentsForRAG[0].content,
        segmentsForRAG[0].shotNumber
      )
      
      console.log(`✅ 验证成功，检索到 ${testRetrieval.length} 个相关片段`)
    }
    console.log('')

    console.log('🎉 导入完成！\n')
    console.log('📋 使用说明：')
    console.log(`   在生成视频运动提示词时，使用 scriptId: "${scriptId}"`)
    console.log(`   shotNumber 格式: "集数-片段序号" (如: "0-1", "1-5", "2-3")`)
    console.log(`   系统会自动从 RAG 库检索相关片段和上下文\n`)

  } catch (error) {
    console.error('❌ 导入失败:', error.message)
    console.error(error.stack)
  }
}

// 运行导入
importScriptToRAG()

