import { ollamaService } from './ollamaService.js'
import { ragService } from './ragService.js'
import { geminiRagService } from './geminiRagService.js'
import { generateVideoPromptWithGemini } from './geminiService.js'
import { config } from './config.js'

/**
 * 视频运动提示词生成器
 * 根据图片和剧本上下文生成视频运动提示词
 * 支持多个模型：Ollama (本地) 和 Gemini (云端)
 */
class VideoMotionPromptGenerator {
  constructor() {
    this.ollama = ollamaService
    this.rag = ragService
    this.geminiRag = geminiRagService
  }

  /**
   * 生成视频运动提示词
   * @param {Object} params - 参数
   * @param {string} params.imageUrl - 图片URL
   * @param {string} params.scriptContext - 剧本上下文
   * @param {number} params.shotNumber - 分镜编号
   * @param {string} params.scriptId - 剧本ID（用于RAG检索）
   * @param {string} params.characterInfo - 角色信息（可选）
   * @param {string} params.sceneInfo - 场景信息（可选）
   * @param {string} params.workStyle - 作品风格（可选）
   * @param {string} params.workBackground - 作品背景（可选）
   * @param {string} params.model - 使用的模型（可选，默认 ollama-qwen3-vl-8b）
   * @returns {Promise<Object>} {motionPrompt: string, confidence: number, model: string}
   */
  async generate(params) {
    const {
      imageUrl,
      scriptContext,
      shotNumber,
      scriptId,
      characterInfo = '',
      sceneInfo = '',
      workStyle = '真人电影风格',
      workBackground = '现代',
      model = 'ollama-qwen3-vl-8b', // 默认使用本地 Ollama 模型
    } = params

    try {
      console.log(`🎬 开始生成视频运动提示词 - 分镜 ${shotNumber}，使用模型: ${model}`)

      // 1. 获取 RAG 检索的相关上下文
      let relevantContext = ''
      let ragService = null
      
      // 根据模型选择 RAG 服务
      if (model === 'gemini-3-flash-preview' || model === 'gemini-3-pro-preview') {
        ragService = this.geminiRag
      } else {
        ragService = this.rag
      }

      if (config.rag.enabled && scriptId && ragService) {
        // 对于 Gemini RAG，启用混合检索（CLIP + Gemini Embedding）
        const mergeResults = process.env.GEMINI_RAG_MERGE_RESULTS !== 'false'
        const relevantSegments = await ragService.retrieveRelevantSegments(
          scriptId,
          scriptContext,
          shotNumber,
          { mergeResults }
        )

        // 获取上下文窗口（当前分镜前后的片段）
        const contextWindow = await ragService.getContextWindow(scriptId, shotNumber, 2)

        // 合并相关片段
        const allContext = [...relevantSegments, ...contextWindow]
        if (allContext.length > 0) {
          relevantContext = allContext
            .map(seg => `分镜${seg.shotNumber}: ${seg.content || seg.prompt || ''}`)
            .join('\n')
        }
      }

      // 2. 构建提示词
      const prompt = this.buildPrompt({
        imageDescription: '', // Gemini 模型会直接分析图片，不需要单独描述
        scriptContext,
        relevantContext,
        shotNumber,
        characterInfo,
        sceneInfo,
        imageUrl,
        workStyle,
        workBackground,
      })

      let motionPrompt = ''
      let usedModel = model

      // 3. 根据模型类型调用不同的生成方法
      if (model === 'gemini-3-flash-preview' || model === 'gemini-3-pro-preview') {
        // 使用 Gemini 模型
        console.log(`🤖 使用 ${model} 生成视频提示词`)
        motionPrompt = await generateVideoPromptWithGemini(
          imageUrl,
          prompt,
          model,
          {
            temperature: config.prompt.temperature,
            maxTokens: 200,
          }
        )
        usedModel = model
      } else {
        // 使用 Ollama 本地模型
        console.log(`🤖 使用 Ollama 本地模型生成视频提示词`)
        
        // 构建消息
        const messages = [
          {
            role: 'system',
            content: `你是一名专业的视频导演和运镜专家。你的任务是：
1. 根据图片内容，分析画面中可能发生的动作（人物动作、物体运动、自然现象等）
2. 根据画面构图和剧情，设计合适的运镜方式（推拉摇移、跟拍、环绕、升降等）
3. 生成简洁有力的视频运动提示词（不超过${config.prompt.maxLength}字）

提示词格式要求：
- 包含动作描述（如：人物向前走、物体飘动、镜头推进等）
- 包含运镜方式（如：缓慢推进、环绕拍摄、跟随移动等）
- 简洁明了，适合视频生成模型使用
- 只输出提示词，不要有其他解释`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ]

        // 如果模型支持视觉，传递图片URL
        const chatOptions = {
          temperature: config.prompt.temperature,
          maxTokens: 200,
        }
        
        // 如果模型支持视觉，添加图片URL
        if (this.ollama.isVisionModel()) {
          chatOptions.imageUrl = imageUrl
          console.log('🖼️  使用视觉模型分析图片')
        }

        const response = await this.ollama.chat(messages, chatOptions)
        motionPrompt = this.extractMotionPrompt(response)
        usedModel = config.ollama.model
      }

      // 4. 提取和清理提示词
      const finalPrompt = this.extractMotionPrompt(motionPrompt)
      const confidence = this.calculateConfidence(finalPrompt, scriptContext)

      console.log(`✅ 视频运动提示词生成完成: ${finalPrompt}`)

      return {
        motionPrompt: finalPrompt,
        confidence,
        model: usedModel,
      }
    } catch (error) {
      console.error('生成视频运动提示词失败:', error)
      // 返回备用提示词
      return {
        motionPrompt: this.generateFallbackPrompt(scriptContext),
        confidence: 0.5,
        error: error.message,
      }
    }
  }

  /**
   * 描述图片（支持视觉模型）
   * @param {string} imageUrl - 图片URL
   * @returns {Promise<string>} 图片描述
   */
  async describeImage(imageUrl) {
    // 如果模型支持视觉，直接返回空字符串（图片会在 chat 中直接传递）
    // 如果不支持视觉，返回空字符串让模型根据剧本推断
    if (!config.prompt.includeImageDescription) {
      return ''
    }

    // 如果使用视觉模型，图片会直接传递给模型，不需要单独描述
    if (this.ollama.isVisionModel()) {
      return '' // 视觉模型可以直接"看到"图片
    }

    // 非视觉模型：返回提示，让模型根据剧本推断
    return ''
  }

  /**
   * 构建生成提示词
   */
  buildPrompt({ imageDescription, scriptContext, relevantContext, shotNumber, characterInfo, sceneInfo, imageUrl }) {
    let prompt = `请根据以下信息，分析图片并生成视频运动提示词：

【图片信息】
图片URL：${imageUrl}
${imageDescription ? `图片描述：${imageDescription}\n` : '（请根据剧本上下文推断图片内容）'}

【分镜信息】
分镜编号：${shotNumber}
当前分镜内容：${scriptContext}

${relevantContext ? `【相关剧本上下文】\n${relevantContext}\n` : ''}
${characterInfo ? `【角色信息】\n${characterInfo}\n` : ''}
${sceneInfo ? `【场景信息】\n${sceneInfo}\n` : ''}

【RAG 检索的相关剧本片段】
${relevantContext ? relevantContext : '（无相关片段）'}

【分析任务】
请综合以下信息，从两个维度分析并生成提示词：

1. **图片分析**（如果使用视觉模型，直接分析图片内容；否则根据剧本推断）：
   - 画面中的人物、物体、场景
   - 人物的姿态、表情、动作趋势
   - 物体的位置、运动状态
   - 场景的氛围、构图特点

2. **动作分析**：结合图片和 RAG 检索的相关剧本片段，推断画面中可能发生的动作
   - 人物动作（行走、奔跑、转身、挥手、坐下等）
   - 物体运动（飘动、旋转、掉落、飞起等）
   - 自然现象（风吹、水流、光影变化等）
   - 注意：参考 RAG 检索的相关片段，保持动作的连贯性和剧情一致性

3. **运镜设计**：根据画面构图、剧情需要和 RAG 上下文，设计合适的运镜方式
   - 推拉（推进、拉远）
   - 摇移（左右摇、上下摇、平移）
   - 跟拍（跟随主体移动）
   - 环绕（围绕主体旋转）
   - 升降（镜头上升或下降）
   - 固定（静态镜头，但画面内有运动）
   - 注意：参考前后分镜的运镜方式，保持视觉连贯性

【输出要求】
- 生成一个简洁的视频运动提示词（不超过${config.prompt.maxLength}字）
- 必须包含动作描述和运镜方式
- 结合 RAG 检索的相关片段，确保提示词符合整体剧情
- 示例格式："镜头缓慢推进，人物向前行走" 或 "环绕拍摄，物体在空中旋转"
- 只输出提示词，不要有其他解释

视频运动提示词：`

    return prompt
  }

  /**
   * 从模型响应中提取运动提示词
   */
  extractMotionPrompt(response) {
    // 清理响应文本
    let prompt = response.trim()

    // 移除可能的引号
    prompt = prompt.replace(/^["']|["']$/g, '')

    // 如果包含"提示词："等前缀，提取后面的内容
    const match = prompt.match(/(?:提示词|运动提示词|motion)[：:]\s*(.+)/i)
    if (match) {
      prompt = match[1].trim()
    }

    // 限制长度
    if (prompt.length > config.prompt.maxLength) {
      prompt = prompt.substring(0, config.prompt.maxLength)
    }

    return prompt || '镜头缓慢移动'
  }

  /**
   * 计算提示词置信度（简单实现）
   */
  calculateConfidence(motionPrompt, scriptContext) {
    // 检查是否包含动作关键词
    const actionKeywords = /移动|运动|动作|行走|奔跑|飞行|旋转|摆动|飘动|转身|挥手|坐下|站起|跳跃|落下/i.test(motionPrompt)
    
    // 检查是否包含运镜关键词
    const cameraKeywords = /推进|拉远|摇|移|跟拍|跟随|环绕|旋转|升降|固定|静态|镜头/i.test(motionPrompt)
    
    // 检查长度是否合适
    const hasLength = motionPrompt.length >= 10 && motionPrompt.length <= config.prompt.maxLength

    // 如果同时包含动作和运镜关键词，置信度最高
    if (actionKeywords && cameraKeywords && hasLength) {
      return 0.9
    } else if ((actionKeywords || cameraKeywords) && hasLength) {
      return 0.75
    } else if (hasLength) {
      return 0.6
    } else {
      return 0.5
    }
  }

  /**
   * 生成备用提示词（当模型调用失败时）
   */
  generateFallbackPrompt(scriptContext) {
    // 简单的关键词提取，生成包含动作和运镜的提示词
    const actionKeywords = ['移动', '运动', '动作', '行走', '奔跑', '飞行', '转身', '挥手']
    const cameraKeywords = ['推进', '拉远', '跟随', '环绕']
    
    const hasAction = actionKeywords.some(keyword => scriptContext.includes(keyword))
    const hasCamera = cameraKeywords.some(keyword => scriptContext.includes(keyword))

    if (hasAction && hasCamera) {
      return '镜头跟随主体移动'
    } else if (hasAction) {
      return '镜头缓慢推进，主体向前移动'
    } else {
      return '镜头缓慢推进'
    }
  }
}

// 导出单例
export const videoMotionPromptGenerator = new VideoMotionPromptGenerator()

// 导出便捷函数
export async function generateVideoMotionPrompt(params) {
  return await videoMotionPromptGenerator.generate(params)
}


