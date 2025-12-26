import mammoth from 'mammoth'
import fs from 'fs'

/**
 * 解析docx文件，提取文本内容
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 提取的文本内容
 */
export async function parseDocx(filePath) {
  try {
    const buffer = fs.readFileSync(filePath)
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error) {
    throw new Error(`解析docx文件失败: ${error.message}`)
  }
}







