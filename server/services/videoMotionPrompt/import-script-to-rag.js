/**
 * 将桌面上的剧本文件导入到 RAG 库
 * 
 * 使用方法：
 * node server/services/videoMotionPrompt/import-script-to-rag.js
 */

import { parseDocx } from '../../utils/docxParser.js'
import { segmentScript } from '../scriptSegmenter.js'
import { ragService } from './ragService.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 剧本文件路径
const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\安萌.docx'
const scriptId = 'anmeng' // RAG 库中的剧本ID

async function importScriptToRAG() {
  console.log('📚 开始导入剧本文档到 RAG 库...\n')

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
    console.log(`📄 前100字符预览: ${scriptContent.substring(0, 100)}...\n`)

    // 步骤 3: 切分剧本为片段
    console.log('3️⃣ 切分剧本为片段...')
    console.log('   （这可能需要一些时间，请耐心等待...）\n')
    
    const segments = await segmentScript(scriptContent, '安萌', 'qwen-max', true)
    
    if (!segments || segments.length === 0) {
      console.error('❌ 剧本切分失败或没有生成片段')
      return
    }
    
    console.log(`✅ 切分完成，共 ${segments.length} 个片段\n`)

    // 步骤 4: 准备存储到 RAG 库的数据
    console.log('4️⃣ 准备存储数据...')
    const segmentsForRAG = segments.map(seg => ({
      shotNumber: seg.shotNumber || 0,
      content: seg.segment || seg.content || '',
      prompt: seg.prompt || '',
      description: seg.description || '',
    }))
    
    console.log(`✅ 数据准备完成，共 ${segmentsForRAG.length} 个片段`)
    console.log(`   示例片段 1: ${segmentsForRAG[0].content.substring(0, 50)}...`)
    if (segmentsForRAG.length > 1) {
      console.log(`   示例片段 2: ${segmentsForRAG[1].content.substring(0, 50)}...`)
    }
    console.log('')

    // 步骤 5: 存储到 RAG 库
    console.log('5️⃣ 存储到 RAG 库...')
    const storeResult = await ragService.storeScriptSegments(scriptId, segmentsForRAG)
    
    if (!storeResult) {
      console.error('❌ 存储到 RAG 库失败')
      return
    }
    
    console.log(`✅ 成功存储 ${segmentsForRAG.length} 个片段到 RAG 库`)
    console.log(`   RAG 库 ID: ${scriptId}\n`)

    // 步骤 6: 验证存储
    console.log('6️⃣ 验证存储...')
    const testRetrieval = await ragService.retrieveRelevantSegments(
      scriptId,
      segmentsForRAG[0].content,
      segmentsForRAG[0].shotNumber
    )
    
    console.log(`✅ 验证成功，检索到 ${testRetrieval.length} 个相关片段`)
    if (testRetrieval.length > 0) {
      console.log(`   示例检索结果: ${testRetrieval[0].content.substring(0, 50)}...`)
    }
    console.log('')

    console.log('🎉 导入完成！\n')
    console.log('📋 使用说明：')
    console.log(`   在生成视频运动提示词时，使用 scriptId: "${scriptId}"`)
    console.log(`   系统会自动从 RAG 库检索相关片段和上下文\n`)

  } catch (error) {
    console.error('❌ 导入失败:', error.message)
    console.error(error.stack)
  }
}

// 运行导入
importScriptToRAG()

