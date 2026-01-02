import mammoth from 'mammoth'
import fs from 'fs'

/**
 * 解析docx文件，提取文本内容
 * @param {string|Buffer} filePathOrBuffer - 文件路径或Buffer
 * @returns {Promise<string>} 提取的文本内容
 */
export async function parseDocx(filePathOrBuffer) {
  try {
    let buffer
    if (Buffer.isBuffer(filePathOrBuffer)) {
      // 如果传入的是Buffer，直接使用
      buffer = filePathOrBuffer
    } else {
      // 如果传入的是文件路径，读取文件
      buffer = fs.readFileSync(filePathOrBuffer)
    }
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error) {
    throw new Error(`解析docx文件失败: ${error.message}`)
  }
}









