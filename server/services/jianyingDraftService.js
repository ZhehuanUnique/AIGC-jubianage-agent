/**
 * 剪映草稿文件生成服务
 * 用于生成剪映草稿文件，包含音频轨道
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { promisify } from 'util'

const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)
const access = promisify(fs.access)

/**
 * 获取剪映草稿文件夹路径
 * @param {string} projectName - 项目名称
 * @returns {string} 草稿文件夹路径
 */
function getDraftPath(projectName) {
  const homeDir = os.homedir()
  const isWindows = process.platform === 'win32'
  
  if (isWindows) {
    return path.join(
      homeDir,
      'AppData',
      'Local',
      'JianyingPro',
      'User Data',
      'Projects',
      'com.lveditor.draft',
      `${projectName}.draft`
    )
  } else {
    // macOS
    return path.join(
      homeDir,
      'Movies',
      'JianyingPro',
      'User Data',
      'Projects',
      `${projectName}.draft`
    )
  }
}

/**
 * 下载音频文件
 * @param {string} audioUrl - 音频URL
 * @param {string} savePath - 保存路径
 * @returns {Promise<string>} 本地文件路径
 */
async function downloadAudio(audioUrl, savePath) {
  try {
    const response = await fetch(audioUrl)
    if (!response.ok) {
      throw new Error(`下载音频失败: HTTP ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(savePath, buffer)
    
    return savePath
  } catch (error) {
    console.error('下载音频失败:', error)
    throw new Error(`下载音频失败: ${error.message}`)
  }
}

/**
 * 生成剪映草稿文件
 * @param {Object} options - 选项
 * @param {string} options.projectName - 项目名称
 * @param {string} options.audioUrl - 音频URL（HTTP/HTTPS或本地路径）
 * @param {string} options.text - 文本内容（用于字幕）
 * @param {number} options.duration - 音频时长（毫秒，可选）
 * @param {number} options.width - 画布宽度（默认1920）
 * @param {number} options.height - 画布高度（默认1080）
 * @returns {Promise<Object>} 生成结果
 */
export async function generateJianyingDraft(options = {}) {
  const {
    projectName = '语音项目',
    audioUrl,
    text = '',
    duration,
    width = 1920,
    height = 1080,
  } = options

  if (!audioUrl) {
    throw new Error('音频URL不能为空')
  }

  try {
    // 创建草稿文件夹
    const draftPath = getDraftPath(projectName)
    await mkdir(draftPath, { recursive: true })

    // 生成唯一的素材ID
    const materialId = `audio_${Date.now()}`
    const audioFileName = `${materialId}.wav`
    const audioFilePath = path.join(draftPath, audioFileName)

    // 下载音频文件（如果是URL或base64）
    let localAudioPath = audioUrl
    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
      localAudioPath = await downloadAudio(audioUrl, audioFilePath)
    } else if (audioUrl.startsWith('data:audio')) {
      // 如果是 base64 数据，直接写入文件
      const base64Data = audioUrl.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')
      await writeFile(audioFilePath, buffer)
      localAudioPath = audioFilePath
    } else {
      // 如果是本地路径，复制到草稿文件夹
      const fs = await import('fs')
      await fs.promises.copyFile(audioUrl, audioFilePath)
      localAudioPath = audioFilePath
    }

    // 获取音频时长（如果未提供）
    let audioDuration = duration || 5000 // 默认5秒
    if (!duration) {
      try {
        // 尝试使用 ffprobe 获取时长（如果可用）
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)
        
        const { stdout } = await execAsync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${localAudioPath}"`
        )
        const durationSeconds = parseFloat(stdout.trim())
        if (!isNaN(durationSeconds) && durationSeconds > 0) {
          audioDuration = Math.round(durationSeconds * 1000) // 转换为毫秒
        }
      } catch (error) {
        console.warn('无法获取音频时长，使用默认值:', error.message)
      }
    }

    // 生成 draft_content.json
    const draftContent = {
      version: "5.9.0", // 使用 5.9 版本格式避免加密
      canvas_config: {
        width: width,
        height: height,
        ratio: "original"
      },
      tracks: [
        // 音频轨道
        {
          type: "audio",
          segments: [
            {
              material_id: materialId,
              start_time: 0,
              end_time: audioDuration,
              target_timerange: {
                start: 0,
                duration: audioDuration
              },
              volume: 1.0,
              speed: 1.0
            }
          ]
        }
      ],
      materials: [
        {
          id: materialId,
          type: "audio",
          path: audioFileName, // 相对路径
          duration: audioDuration,
          format: "wav"
        }
      ],
      project_setting: {
        fps: 30,
        resolution: `${width}x${height}`,
        ratio: "original"
      }
    }

    // 如果有文本，添加字幕轨道
    if (text && text.trim()) {
      const textMaterialId = `text_${Date.now()}`
      draftContent.tracks.push({
        type: "text",
        segments: [
          {
            material_id: textMaterialId,
            start_time: 0,
            end_time: audioDuration,
            target_timerange: {
              start: 0,
              duration: audioDuration
            },
            content: text.trim(),
            style: {
              font_size: 48,
              font_color: "#FFFFFF",
              background_color: "transparent",
              position: "center"
            }
          }
        ]
      })
      draftContent.materials.push({
        id: textMaterialId,
        type: "text",
        content: text.trim()
      })
    }

    // 写入 draft_content.json
    const draftContentPath = path.join(draftPath, 'draft_content.json')
    await writeFile(
      draftContentPath,
      JSON.stringify(draftContent, null, 2),
      'utf-8'
    )

    // 生成 draft_meta_info.json（可选，但有助于剪映识别）
    const draftMetaInfo = {
      draft_name: projectName,
      draft_create_time: Date.now(),
      draft_update_time: Date.now(),
      draft_version: "5.9.0"
    }
    const draftMetaInfoPath = path.join(draftPath, 'draft_meta_info.json')
    await writeFile(
      draftMetaInfoPath,
      JSON.stringify(draftMetaInfo, null, 2),
      'utf-8'
    )

    return {
      success: true,
      draftPath: draftPath,
      draftContentPath: draftContentPath,
      audioPath: localAudioPath,
      message: `剪映草稿文件已生成: ${draftPath}`
    }
  } catch (error) {
    console.error('生成剪映草稿文件失败:', error)
    throw new Error(`生成剪映草稿文件失败: ${error.message}`)
  }
}

