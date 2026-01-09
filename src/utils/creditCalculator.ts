/**
 * 前端积分计算工具
 * 与后端 server/services/creditService.js 保持一致的逻辑
 */

/**
 * 302.ai 模型价格配置（元/次或元/秒）
 * 数据来源：https://302.ai/pricing/
 */
export const MODEL_PRICING: Record<string, {
  name: string
  pricePerSecond?: Record<string, number>
  pricePerImage?: number
}> = {
  // ==================== 视频生成模型 ====================
  // 即梦系列
  'volcengine-video-3.0-pro': {
    name: '即梦-3.0Pro',
    pricePerSecond: {
      '480p': 0.182,
      '720p': 0.408,
      '1080p': 0.729
    }
  },
  'doubao-seedance-1-5-pro-251215': {
    name: '即梦-3.5Pro',
    pricePerSecond: {
      '480p': 0.182,
      '720p': 0.408,
      '1080p': 0.729
    }
  },
  
  // Hailuo 海螺系列
  'minimax-hailuo-02': {
    name: 'Hailuo-02',
    pricePerSecond: {
      '512P': 0.35,
      '768P': 0.42,
      '1080P': 0.50
    }
  },
  'minimax-hailuo-2.3': {
    name: 'Hailuo-2.3',
    pricePerSecond: {
      '512P': 0.42,
      '768P': 0.50,
      '1080P': 0.60
    }
  },
  'minimax-hailuo-2.3-fast': {
    name: 'Hailuo-2.3-fast',
    pricePerSecond: {
      '512P': 0.35,
      '768P': 0.42,
      '1080P': 0.50
    }
  },
  
  // Hailuo I2V-01 系列（新增）
  'minimax-i2v-01-live': {
    name: 'Hailuo-01-Live',
    pricePerSecond: {
      '512P': 0.48,
      '768P': 0.58,
      '1080P': 0.70
    }
  },
  'minimax-i2v-01-director': {
    name: 'Hailuo-01-Director',
    pricePerSecond: {
      '512P': 0.55,
      '768P': 0.67,
      '1080P': 0.80
    }
  },
  'minimax-s2v-01': {
    name: 'Hailuo-S2V',
    pricePerSecond: {
      '512P': 0.48,
      '768P': 0.58,
      '1080P': 0.70
    }
  },
  
  // Kling 可灵系列
  'kling-2.6': {
    name: 'Kling-2.6',
    pricePerSecond: {
      '720p': 0.50,
      '1080p': 0.60
    }
  },
  'kling-o1': {
    name: 'Kling-O1',
    pricePerSecond: {
      '720p': 0.60,
      '1080p': 0.72
    }
  },
  
  // Google Veo 系列
  'veo3.1': {
    name: 'Veo3.1',
    pricePerSecond: {
      '720p': 0.67,
      '1080p': 0.80
    }
  },
  'veo3.1-pro': {
    name: 'Veo3.1-Pro',
    pricePerSecond: {
      '720p': 0.83,
      '1080p': 1.00
    }
  },
  
  // Vidu 系列
  'viduq2-turbo': {
    name: 'Vidu Q2 Turbo',
    pricePerSecond: {
      '720p': 0.42,
      '1080p': 0.50
    }
  },
  'viduq2-pro': {
    name: 'Vidu Q2 Pro',
    pricePerSecond: {
      '720p': 0.58,
      '1080p': 0.70
    }
  },
  
  // ==================== 图片生成模型 ====================
  'midjourney-v7': {
    name: 'Midjourney V7',
    pricePerImage: 0.5
  },
  'flux-2-max': {
    name: 'Flux 2 Max',
    pricePerImage: 0.3
  },
  'flux-2-pro': {
    name: 'Flux 2 Pro',
    pricePerImage: 0.2
  },
  'flux-2-flex': {
    name: 'Flux 2 Flex',
    pricePerImage: 0.15
  },
  'seedream-4.5': {
    name: 'Seedream 4.5',
    pricePerImage: 0.2
  },
  'seedream-4.0': {
    name: 'Seedream 4.0',
    pricePerImage: 0.15
  }
}

/**
 * 根据实际成本（元）计算积分（普通用户显示）
 * @param costInYuan - 实际成本（元）
 * @returns 消耗的积分
 */
export function calculateCreditFromCost(costInYuan: number): number {
  if (costInYuan <= 0) {
    return 0
  }
  
  if (costInYuan <= 0.1) return 1
  if (costInYuan <= 0.2) return 2
  if (costInYuan <= 0.5) return 5
  if (costInYuan <= 1.0) return 10
  if (costInYuan <= 1.5) return 15
  if (costInYuan <= 2.0) return 20
  if (costInYuan <= 2.5) return 25
  if (costInYuan <= 3.0) return 30
  if (costInYuan <= 3.5) return 35
  if (costInYuan <= 4.0) return 40
  
  // 4.0元以上：每0.5元一个档次，每档5积分
  const tier = Math.ceil((costInYuan - 4.0) / 0.5)
  return 40 + tier * 5
}

/**
 * 标准化分辨率格式
 */
function normalizeResolution(resolution: string): string {
  const resolutionMap: Record<string, string> = {
    '480p': '480p',
    '512p': '512P',
    '512P': '512P',
    '720p': '720p',
    '768p': '768P',
    '768P': '768P',
    '1080p': '1080p',
    '1080P': '1080P'
  }
  return resolutionMap[resolution] || resolution
}

/**
 * 计算视频生成的实际成本（元）
 * @param model - 模型名称
 * @param resolution - 分辨率
 * @param duration - 视频时长（秒）
 * @returns 实际成本（元）
 */
export function calculateVideoCost(model: string, resolution: string, duration: number): number {
  const modelConfig = MODEL_PRICING[model]
  
  if (!modelConfig || !modelConfig.pricePerSecond) {
    // 默认价格：0.5元/秒
    return duration * 0.5
  }
  
  const normalizedResolution = normalizeResolution(resolution)
  let pricePerSecond = modelConfig.pricePerSecond[normalizedResolution]
  
  // 如果没有找到对应分辨率，使用第一个可用的
  if (!pricePerSecond) {
    const availableResolutions = Object.keys(modelConfig.pricePerSecond)
    pricePerSecond = modelConfig.pricePerSecond[availableResolutions[0]]
  }
  
  return pricePerSecond * duration
}

/**
 * 计算视频生成的积分消耗
 * @param model - 模型名称
 * @param resolution - 分辨率
 * @param duration - 视频时长（秒）
 * @returns 消耗的积分
 */
export function calculateVideoGenerationCredit(
  model: string,
  resolution: string,
  duration: number
): number {
  const costInYuan = calculateVideoCost(model, resolution, duration)
  return calculateCreditFromCost(costInYuan)
}

/**
 * 计算图片生成的实际成本（元）
 */
export function calculateImageCost(model: string, count: number = 1): number {
  const modelConfig = MODEL_PRICING[model]
  
  if (!modelConfig || !modelConfig.pricePerImage) {
    return count * 0.2
  }
  
  return modelConfig.pricePerImage * count
}

/**
 * 计算图片生成的积分消耗
 */
export function calculateImageGenerationCredit(model: string, count: number = 1): number {
  const costInYuan = calculateImageCost(model, count)
  return calculateCreditFromCost(costInYuan)
}

/**
 * 获取模型显示名称
 */
export function getModelDisplayName(model: string): string {
  const modelConfig = MODEL_PRICING[model]
  return modelConfig ? modelConfig.name : model
}

/**
 * 获取积分消耗说明
 */
export function getCreditDescription(
  model: string,
  resolution: string,
  duration: number
): string {
  const credit = calculateVideoGenerationCredit(model, resolution, duration)
  if (credit > 0) {
    return `预计消耗 ${credit} 积分`
  }
  return '不消耗积分'
}
