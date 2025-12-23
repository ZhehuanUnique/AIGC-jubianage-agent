import dotenv from 'dotenv'

dotenv.config()

/**
 * 调用通义千问API（使用HTTP请求）
 * @param {string} prompt - 提示词
 * @param {string} model - 模型名称
 *   可选值：
 *   - 'qwen-max': 最强模型，效果最好，成本最高（0.12元/千tokens）
 *   - 'qwen-plus': 推荐，平衡效果和成本（0.02元/千tokens）
 *   - 'qwen-turbo': 快速模型，成本低（0.008元/千tokens）
 *   - 'qwen-flash': 最快模型，成本最低（0.008元/千tokens）
 * @returns {Promise<string>} API返回的文本内容
 */
export async function callQwenAPI(prompt, model = 'qwen-plus') {
  const apiKey = process.env.DASHSCOPE_API_KEY

  if (!apiKey) {
    throw new Error('请设置 DASHSCOPE_API_KEY 环境变量')
  }

  try {
    // 使用HTTP请求调用通义千问API
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        input: {
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        parameters: {
          max_tokens: 2000,
          temperature: 0.3,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error?.message || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error('API密钥无效，请检查 DASHSCOPE_API_KEY 环境变量')
      }
      
      throw new Error(`API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    // 解析返回结果
    if (data.output && data.output.choices && data.output.choices.length > 0) {
      return data.output.choices[0].message?.content || ''
    }
    
    if (data.output && data.output.text) {
      return data.output.text
    }
    
    // 如果格式不符合预期，返回原始数据用于调试
    console.warn('API返回格式异常:', JSON.stringify(data, null, 2))
    throw new Error('API返回格式异常，请检查日志')
  } catch (error) {
    console.error('通义千问API调用错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`大模型调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 备用方案：使用OpenAI API（如果通义千问不可用）
 */
export async function callOpenAIAPI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('请设置 OPENAI_API_KEY 环境变量')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'API调用失败')
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('OpenAI API调用错误:', error)
    throw new Error(`大模型调用失败: ${error.message || '未知错误'}`)
  }
}

