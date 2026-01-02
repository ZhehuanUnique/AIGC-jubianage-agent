/**
 * 导入剧本到向量数据库（Chroma/Milvus）
 * 支持使用 Gemini Embedding 或 CLIP 生成向量
 * 
 * 使用方法：
 * node server/services/videoMotionPrompt/import-to-vector-db.js
 */

import { parseDocx } from '../../utils/docxParser.js'
import { geminiRagService } from './geminiRagService.js'
import { existsSync } from 'fs'

// ============ 配置区域 ============
// 剧本文件路径（修改为你的文档路径）
const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\安萌.docx'

// RAG 库中的剧本ID（修改为唯一的ID，建议使用英文和数字）
const scriptId = 'anmeng'

// 是否使用 CLIP 生成向量（false: 使用 Gemini Embedding, true: 使用 CLIP）
// - false: 使用 Gemini Embedding（云端生成，更准确，需要 API Key）
// - true: 使用 CLIP（本地生成，保护隐私，不需要 API Key）
const useClip = false
// ================================

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

async function importScriptToVectorDB() {
  console.log('📚 导入剧本文档到向量数据库...\n')
  console.log(`📋 配置信息：`)
  console.log(`   文件路径: ${scriptFilePath}`)
  console.log(`   剧本ID: ${scriptId}`)
  console.log(`   向量类型: ${useClip ? 'CLIP（本地）' : 'Gemini Embedding（云端）'}\n`)

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

    // 步骤 4: 准备存储数据
    console.log('4️⃣ 准备存储数据...')
    const segmentsForRAG = segments.map((content, index) => ({
      shotNumber: index + 1,
      content: content,
      prompt: '', // 可以后续手动添加
      description: '', // 可以后续手动添加
    }))
    
    console.log(`✅ 数据准备完成，共 ${segmentsForRAG.length} 个片段\n`)

    // 步骤 5: 存储到向量数据库
    console.log(`5️⃣ 存储到向量数据库（使用 ${useClip ? 'CLIP' : 'Gemini Embedding'}）...`)
    console.log('   ⏳ 这可能需要一些时间，请耐心等待...\n')
    
    const storeResult = await geminiRagService.storeScriptSegments(
      scriptId, 
      segmentsForRAG,
      { useClip }
    )
    
    if (!storeResult) {
      console.error('❌ 存储到向量数据库失败')
      console.error('💡 提示：请检查：')
      console.error('   1. 向量数据库服务是否正常运行')
      console.error('   2. 环境变量配置是否正确')
      console.error('   3. 依赖包是否已安装（chromadb 或 @zilliz/milvus2-sdk-node）')
      if (!useClip) {
        console.error('   4. Gemini API Key 是否配置正确')
      }
      return
    }
    
    console.log(`✅ 成功存储 ${segmentsForRAG.length} 个片段到向量数据库`)
    console.log(`   RAG 库 ID: ${scriptId}`)
    console.log(`   使用向量: ${useClip ? 'CLIP（本地）' : 'Gemini Embedding（云端）'}\n`)

    // 步骤 6: 验证存储
    console.log('6️⃣ 验证存储...')
    if (segmentsForRAG.length > 0) {
      const testRetrieval = await geminiRagService.retrieveRelevantSegments(
        scriptId,
        segmentsForRAG[0].content,
        segmentsForRAG[0].shotNumber
      )
      
      console.log(`✅ 验证成功，检索到 ${testRetrieval.length} 个相关片段`)
      if (testRetrieval.length > 0) {
        console.log(`   示例检索结果: ${testRetrieval[0].content.substring(0, 50)}...`)
      }
    }
    console.log('')

    console.log('🎉 导入完成！\n')
    console.log('📋 使用说明：')
    console.log(`   在生成视频运动提示词时，使用 scriptId: "${scriptId}"`)
    console.log(`   并指定模型为 gemini-3-flash-preview 或 gemini-3-pro-preview`)
    console.log(`   系统会自动从向量数据库检索相关片段和上下文\n`)

  } catch (error) {
    console.error('❌ 导入失败:', error.message)
    console.error(error.stack)
    console.error('\n💡 故障排查：')
    console.error('   1. 检查向量数据库服务是否运行')
    console.error('   2. 检查环境变量配置（.env 文件）')
    console.error('   3. 检查依赖包是否已安装')
    if (!useClip) {
      console.error('   4. 检查 Gemini API Key 是否有效')
    }
  }
}

// 运行导入
importScriptToVectorDB()


