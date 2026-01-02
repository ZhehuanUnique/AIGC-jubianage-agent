/**
 * 简单导入剧本到 RAG 库（不调用模型分析）
 * 直接读取 DOCX 文件，按行或段落切分，手动添加到 RAG 库
 * 
 * 使用方法：
 * node server/services/videoMotionPrompt/simple-import-script.js
 */

import { parseDocx } from '../../utils/docxParser.js'
import { ragService } from './ragService.js'
import { existsSync } from 'fs'

// 剧本文件路径
const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\安萌.docx'
const scriptId = 'anmeng' // RAG 库中的剧本ID

/**
 * 简单的文本切分（按段落或句子）
 */
function simpleSegment(text) {
  // 按段落切分（双换行或单换行）
  const paragraphs = text
    .split(/\n\s*\n/) // 双换行分隔段落
    .map(p => p.trim())
    .filter(p => p.length > 0)
  
  // 如果段落太少，尝试按单换行切分
  if (paragraphs.length < 3) {
    return text
      .split(/\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
  }
  
  return paragraphs
}

async function importScriptToRAG() {
  console.log('📚 简单导入剧本文档到 RAG 库（不调用模型）...\n')

  try {
    // 步骤 1: 检查文件是否存在
    console.log('1️⃣ 检查文件...')
    if (!existsSync(scriptFilePath)) {
      console.error(`❌ 文件不存在: ${scriptFilePath}`)
      console.log('\n💡 提示：请确认文件路径是否正确')
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
    
    console.log(`✅ 解析成功，剧本长度: ${scriptContent.length} 字符`)
    console.log(`📄 前200字符预览:\n${scriptContent.substring(0, 200)}...\n`)

    // 步骤 3: 简单切分（按段落）
    console.log('3️⃣ 按段落切分剧本...')
    const segments = simpleSegment(scriptContent)
    
    console.log(`✅ 切分完成，共 ${segments.length} 个片段\n`)
    
    // 显示前几个片段
    console.log('📝 前5个片段预览:')
    segments.slice(0, 5).forEach((seg, index) => {
      console.log(`   ${index + 1}. ${seg.substring(0, 60)}...`)
    })
    console.log('')

    // 步骤 4: 准备存储到 RAG 库的数据
    console.log('4️⃣ 准备存储数据...')
    const segmentsForRAG = segments.map((content, index) => ({
      shotNumber: index + 1,
      content: content,
      prompt: '', // 可以后续手动添加
      description: '', // 可以后续手动添加
    }))
    
    console.log(`✅ 数据准备完成，共 ${segmentsForRAG.length} 个片段\n`)

    // 步骤 5: 存储到 RAG 库
    console.log('5️⃣ 存储到 RAG 库...')
    const storeResult = await ragService.storeScriptSegments(scriptId, segmentsForRAG)
    
    if (!storeResult) {
      console.error('❌ 存储到 RAG 库失败')
      return
    }
    
    console.log(`✅ 成功存储 ${segmentsForRAG.length} 个片段到 RAG 库`)
    console.log(`   RAG 库 ID: ${scriptId}`)
    console.log(`   存储路径: ./data/rag_vectors/${scriptId}.json\n`)

    // 步骤 6: 验证存储
    console.log('6️⃣ 验证存储...')
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
    console.log(`   系统会自动从 RAG 库检索相关片段和上下文`)
    console.log(`\n💡 提示：如果需要更精细的切分，可以手动编辑存储的 JSON 文件`)
    console.log(`   文件路径: server/data/rag_vectors/${scriptId}.json\n`)

  } catch (error) {
    console.error('❌ 导入失败:', error.message)
    console.error(error.stack)
  }
}

// 运行导入
importScriptToRAG()

