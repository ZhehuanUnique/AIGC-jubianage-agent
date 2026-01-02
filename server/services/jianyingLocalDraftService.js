/**
 * 剪映本地草稿文件生成服务
 * 直接生成本地草稿文件，保存到剪映草稿文件夹
 * 这样剪映会自动识别并显示在"本地草稿"列表中
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { promisify } from 'util'
import https from 'https'
import http from 'http'

const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)

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
 * 下载视频文件
 * @param {string} videoUrl - 视频URL
 * @param {string} savePath - 保存路径
 * @returns {Promise<string>} 本地文件路径
 */
async function downloadVideo(videoUrl, savePath) {
  return new Promise((resolve, reject) => {
    const protocol = videoUrl.startsWith('https:') ? https : http
    
    const file = fs.createWriteStream(savePath)
    
    protocol.get(videoUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`下载失败: HTTP ${response.statusCode}`))
        return
      }
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        resolve(savePath)
      })
    }).on('error', (error) => {
      fs.unlink(savePath, () => {}) // 删除失败的文件
      reject(error)
    })
  })
}

/**
 * 获取视频时长（毫秒）
 * @param {string} videoPath - 视频文件路径
 * @returns {Promise<number>} 视频时长（毫秒）
 */
async function getVideoDuration(videoPath) {
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    // 使用 ffprobe 获取视频时长
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    )
    const durationSeconds = parseFloat(stdout.trim())
    if (!isNaN(durationSeconds) && durationSeconds > 0) {
      return Math.round(durationSeconds * 1000) // 转换为毫秒
    }
  } catch (error) {
    console.warn('无法获取视频时长，使用默认值:', error.message)
  }
  
  return 5000 // 默认5秒
}

/**
 * 生成本地剪映草稿文件（包含视频）
 * @param {Object} options - 选项
 * @param {string} options.projectName - 项目名称
 * @param {Array<string>} options.videoUrls - 视频URL列表
 * @param {boolean} options.addToTrack - 是否添加到轨道（默认false，只添加到素材库）
 * @param {number} options.width - 画布宽度（默认1920）
 * @param {number} options.height - 画布高度（默认1080）
 * @returns {Promise<Object>} 生成结果
 */
export async function generateLocalDraftWithVideos(options = {}) {
  const {
    projectName = '新项目',
    videoUrls = [],
    addToTrack = false,
    width = 1920,
    height = 1080,
  } = options

  if (!Array.isArray(videoUrls) || videoUrls.length === 0) {
    throw new Error('视频URL列表不能为空')
  }

  try {
    console.log('📝 开始生成本地剪映草稿文件:', {
      projectName,
      videoCount: videoUrls.length,
      addToTrack,
    })

    // 创建草稿文件夹
    const draftPath = getDraftPath(projectName)
    await mkdir(draftPath, { recursive: true })

    // 下载视频并生成素材
    const materials = []
    const tracks = []
    let currentTime = 0
    const downloadErrors = []

    for (let i = 0; i < videoUrls.length; i++) {
      const videoUrl = videoUrls[i]
      const materialId = `video_${Date.now()}_${i}`
      
      try {
        // 确定文件扩展名
        let ext = 'mp4'
        if (videoUrl.includes('.mp4')) ext = 'mp4'
        else if (videoUrl.includes('.mov')) ext = 'mov'
        else if (videoUrl.includes('.avi')) ext = 'avi'
        else if (videoUrl.includes('.webm')) ext = 'webm'
        
        const videoFileName = `${materialId}.${ext}`
        const videoFilePath = path.join(draftPath, videoFileName)

        // 下载视频
        console.log(`📥 下载视频 ${i + 1}/${videoUrls.length}: ${videoUrl.substring(0, 50)}...`)
        await downloadVideo(videoUrl, videoFilePath)
        
        // 验证文件是否存在且大小大于0
        if (!fs.existsSync(videoFilePath)) {
          throw new Error('视频文件下载后不存在')
        }
        
        const stats = fs.statSync(videoFilePath)
        if (stats.size === 0) {
          throw new Error('视频文件大小为0，下载可能失败')
        }
        
        console.log(`✅ 视频 ${i + 1} 下载成功: ${videoFileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
        
        // 获取视频时长
        const videoDuration = await getVideoDuration(videoFilePath)
        
        // 添加到素材列表
        materials.push({
          id: materialId,
          type: 'video',
          path: videoFileName, // 相对路径，相对于草稿文件夹
          duration: videoDuration,
          format: ext,
          width: width, // 添加视频尺寸信息（有助于剪映识别）
          height: height,
        })
        
        console.log(`✅ 视频 ${i + 1} 已添加到素材列表: ${materialId}`)
      } catch (error) {
        console.error(`❌ 下载视频 ${i + 1} 失败:`, error.message)
        downloadErrors.push({
          index: i + 1,
          url: videoUrl.substring(0, 50) + '...',
          error: error.message,
        })
        // 继续处理下一个视频，不中断整个流程
      }

      // 如果 addToTrack 为 true，添加到视频轨道
      if (addToTrack) {
        if (tracks.length === 0) {
          // 创建视频轨道
          tracks.push({
            type: 'video',
            segments: [],
          })
        }
        
        tracks[0].segments.push({
          material_id: materialId,
          start_time: 0,
          end_time: videoDuration,
          target_timerange: {
            start: currentTime,
            duration: videoDuration,
          },
          volume: 1.0,
          speed: 1.0,
        })
        
        currentTime += videoDuration
      }
    }

    // 检查是否有成功下载的视频
    if (materials.length === 0) {
      throw new Error(`所有视频下载失败。错误详情: ${JSON.stringify(downloadErrors)}`)
    }

    if (downloadErrors.length > 0) {
      console.warn(`⚠️ ${downloadErrors.length} 个视频下载失败，但已成功下载 ${materials.length} 个视频`)
    }

    console.log(`✅ 成功下载 ${materials.length}/${videoUrls.length} 个视频`)

    // 生成 draft_content.json（使用 5.9 版本格式，避免加密）
    // 注意：即使视频只在素材库，也需要至少有一个空的视频轨道，否则剪映可能无法识别
    const draftContent = {
      version: '5.9.0',
      canvas_config: {
        width,
        height,
        ratio: 'original',
        fps: 30,
      },
      // 如果 tracks 为空，至少添加一个空的视频轨道
      tracks: tracks.length > 0 ? tracks : [
        {
          type: 'video',
          segments: [],
        },
      ],
      materials: materials.map(material => ({
        ...material,
        // 确保所有必需字段都存在
        name: material.path, // 添加名称字段
        source: 'local', // 添加来源字段
      })),
      project_setting: {
        fps: 30,
        resolution: `${width}x${height}`,
        ratio: 'original',
      },
      // 添加其他可能需要的字段
      audio_tracks: [],
      text_tracks: [],
      effect_tracks: [],
    }

    // 写入 draft_content.json
    const draftContentPath = path.join(draftPath, 'draft_content.json')
    await writeFile(
      draftContentPath,
      JSON.stringify(draftContent, null, 2),
      'utf-8'
    )

    // 生成 draft_meta_info.json（有助于剪映识别）
    const draftMetaInfo = {
      draft_name: projectName,
      draft_create_time: Date.now(),
      draft_update_time: Date.now(),
      draft_version: '5.9.0',
    }
    const draftMetaInfoPath = path.join(draftPath, 'draft_meta_info.json')
    await writeFile(
      draftMetaInfoPath,
      JSON.stringify(draftMetaInfo, null, 2),
      'utf-8'
    )

    // 验证生成的文件
    if (!fs.existsSync(draftContentPath)) {
      throw new Error('draft_content.json 文件未生成')
    }

    const draftContentStr = fs.readFileSync(draftContentPath, 'utf-8')
    const parsedContent = JSON.parse(draftContentStr)
    
    if (!parsedContent.materials || parsedContent.materials.length === 0) {
      throw new Error('draft_content.json 中 materials 数组为空')
    }

    // 验证视频文件是否存在
    for (const material of parsedContent.materials) {
      const videoFilePath = path.join(draftPath, material.path)
      if (!fs.existsSync(videoFilePath)) {
        throw new Error(`视频文件不存在: ${material.path}`)
      }
    }

    console.log('✅ 本地草稿文件生成成功:', draftPath)
    console.log(`   视频数量: ${materials.length}/${videoUrls.length} (成功/总数)`)
    console.log(`   添加到轨道: ${addToTrack ? '是' : '否（仅素材库）'}`)
    console.log(`   素材列表: ${materials.length} 个视频`)
    
    if (downloadErrors.length > 0) {
      console.warn(`   ⚠️ 下载失败: ${downloadErrors.length} 个视频`)
    }

    return {
      success: true,
      draftPath,
      draftContentPath,
      videoCount: materials.length,
      totalVideoCount: videoUrls.length,
      addToTrack,
      downloadErrors: downloadErrors.length > 0 ? downloadErrors : undefined,
      message: `本地草稿文件已生成: ${draftPath} (${materials.length}/${videoUrls.length} 个视频)`,
    }
  } catch (error) {
    console.error('❌ 生成本地草稿文件失败:', error)
    throw new Error(`生成本地草稿文件失败: ${error.message}`)
  }
}

