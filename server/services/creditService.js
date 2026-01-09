/**
 * 积分计算服务
 * 根据实际成本（元）转换为积分
 * 规则：
 * - 0.1元 = 1积分
 * - 0.1~0.2元 = 2积分
 * - 0.2~0.5元 = 5积分
 * - 0.5~1.0元 = 10积分
 * - 1.0~1.5元 = 15积分
 * - 1.5~2.0元 = 20积分
 * - 2.0~2.5元 = 25积分
 * - 2.5~3.0元 = 30积分
 * - 3.0~3.5元 = 35积分
 * - 3.5~4.0元 = 40积分
 * - 以此类推，每0.5元一个档次，每档5积分
 */

/**
 * 302.ai 模型价格配置（元/次或元/秒）
 * 数据来源：https://302.ai/pricing/
 */
export const MODEL_PRICING = {
  // ==================== 视频生成模型 ====================
  // 即梦系列
  'volcengine-video-3.0-pro': {
    name: '即梦-3.0Pro',
    // 5秒1080p = 3.645元，按秒计费
    pricePerSecond: {
      '480p': 0.182,   // 3.645 * 0.25 / 5
      '720p': 0.408,   // 3.645 * 0.56 / 5
      '1080p': 0.729   // 3.645 / 5
    }
  },
  'doubao-seedance-1-5-pro-251215': {
    name: '即梦-3.5Pro',
    // 与3.0Pro价格相近
    pricePerSecond: {
      '480p': 0.182,
      '720p': 0.408,
      '1080p': 0.729
    }
  },
  
  // Hailuo 海螺系列（302.ai价格）
  'minimax-hailuo-02': {
    name: 'Hailuo-02',
    // 6秒视频约2.5元
    pricePerSecond: {
      '512P': 0.35,
      '768P': 0.42,
      '1080P': 0.50
    }
  },
  'minimax-hailuo-2.3': {
    name: 'Hailuo-2.3',
    // 6秒视频约3元
    pricePerSecond: {
      '512P': 0.42,
      '768P': 0.50,
      '1080P': 0.60
    }
  },
  'minimax-hailuo-2.3-fast': {
    name: 'Hailuo-2.3-fast',
    // 快速版价格略低
    pricePerSecond: {
      '512P': 0.35,
      '768P': 0.42,
      '1080P': 0.50
    }
  },
  
  // Hailuo I2V-01 系列（新增）
  'minimax-i2v-01-live': {
    name: 'Hailuo-01-Live',
    // 首尾帧生视频，6秒约3.5元
    pricePerSecond: {
      '512P': 0.48,
      '768P': 0.58,
      '1080P': 0.70
    }
  },
  'minimax-i2v-01-director': {
    name: 'Hailuo-01-Director',
    // 导演模式，功能最强，6秒约4元
    pricePerSecond: {
      '512P': 0.55,
      '768P': 0.67,
      '1080P': 0.80
    }
  },
  'minimax-s2v-01': {
    name: 'Hailuo-S2V',
    // 主体参考视频，6秒约3.5元
    pricePerSecond: {
      '512P': 0.48,
      '768P': 0.58,
      '1080P': 0.70
    }
  },
  
  // Kling 可灵系列
  'kling-2.6': {
    name: 'Kling-2.6',
    // 5秒视频约3元
    pricePerSecond: {
      '720p': 0.50,
      '1080p': 0.60
    }
  },
  'kling-o1': {
    name: 'Kling-O1',
    // O1版本价格略高
    pricePerSecond: {
      '720p': 0.60,
      '1080p': 0.72
    }
  },
  
  // Google Veo 系列
  'veo3.1': {
    name: 'Veo3.1',
    // 5秒视频约4元
    pricePerSecond: {
      '720p': 0.67,
      '1080p': 0.80
    }
  },
  'veo3.1-pro': {
    name: 'Veo3.1-Pro',
    // Pro版本价格更高
    pricePerSecond: {
      '720p': 0.83,
      '1080p': 1.00
    }
  },
  
  // Vidu 系列
  'viduq2-turbo': {
    name: 'Vidu Q2 Turbo',
    // 4秒视频约2元
    pricePerSecond: {
      '720p': 0.42,
      '1080p': 0.50
    }
  },
  'viduq2-pro': {
    name: 'Vidu Q2 Pro',
    // Pro版本价格更高
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
 * @param {number} costInYuan - 实际成本（元）
 * @returns {number} 消耗的积分
 */
export function calculateCreditFromCost(costInYuan) {
  if (costInYuan <= 0) {
    return 0
  }
  
  // 0.1元 = 1积分
  if (costInYuan <= 0.1) {
    return 1
  }
  
  // 0.1~0.2元 = 2积分
  if (costInYuan <= 0.2) {
    return 2
  }
  
  // 0.2~0.5元 = 5积分
  if (costInYuan <= 0.5) {
    return 5
  }
  
  // 0.5~1.0元 = 10积分
  if (costInYuan <= 1.0) {
    return 10
  }
  
  // 1.0~1.5元 = 15积分
  if (costInYuan <= 1.5) {
    return 15
  }
  
  // 1.5~2.0元 = 20积分
  if (costInYuan <= 2.0) {
    return 20
  }
  
  // 2.0~2.5元 = 25积分
  if (costInYuan <= 2.5) {
    return 25
  }
  
  // 2.5~3.0元 = 30积分
  if (costInYuan <= 3.0) {
    return 30
  }
  
  // 3.0~3.5元 = 35积分
  if (costInYuan <= 3.5) {
    return 35
  }
  
  // 3.5~4.0元 = 40积分
  if (costInYuan <= 4.0) {
    return 40
  }
  
  // 4.0元以上：每0.5元一个档次，每档5积分
  const tier = Math.ceil((costInYuan - 4.0) / 0.5)
  return 40 + tier * 5
}

/**
 * 计算视频生成的实际成本（元）
 * @param {string} model - 模型名称
 * @param {string} resolution - 分辨率
 * @param {number} duration - 视频时长（秒）
 * @returns {number} 实际成本（元）
 */
export function calculateVideoCost(model, resolution, duration) {
  const modelConfig = MODEL_PRICING[model]
  
  if (!modelConfig || !modelConfig.pricePerSecond) {
    console.warn(`未找到模型 ${model} 的价格配置，使用默认价格`)
    // 默认价格：0.5元/秒
    return duration * 0.5
  }
  
  // 标准化分辨率格式
  const normalizedResolution = normalizeResolution(resolution)
  
  // 获取对应分辨率的价格
  let pricePerSecond = modelConfig.pricePerSecond[normalizedResolution]
  
  // 如果没有找到对应分辨率，使用最接近的
  if (!pricePerSecond) {
    const availableResolutions = Object.keys(modelConfig.pricePerSecond)
    pricePerSecond = modelConfig.pricePerSecond[availableResolutions[0]]
  }
  
  return pricePerSecond * duration
}

/**
 * 标准化分辨率格式
 * @param {string} resolution - 原始分辨率
 * @returns {string} 标准化后的分辨率
 */
function normalizeResolution(resolution) {
  const resolutionMap = {
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
 * 计算视频生成的积分消耗
 * @param {string} model - 模型名称
 * @param {string} resolution - 分辨率
 * @param {number} duration - 视频时长（秒）
 * @param {number} customCost - 可选：自定义成本（元），如果提供则直接使用
 * @returns {number} 消耗的积分
 */
export function calculateVideoGenerationCredit(model, resolution, duration, customCost = null) {
  let costInYuan = 0
  
  // 如果提供了自定义成本，直接使用
  if (customCost !== null && customCost > 0) {
    costInYuan = customCost
  } else {
    costInYuan = calculateVideoCost(model, resolution, duration)
  }
  
  // 将成本转换为积分
  return calculateCreditFromCost(costInYuan)
}

/**
 * 计算图片生成的实际成本（元）
 * @param {string} model - 模型名称
 * @param {number} count - 图片数量
 * @returns {number} 实际成本（元）
 */
export function calculateImageCost(model, count = 1) {
  const modelConfig = MODEL_PRICING[model]
  
  if (!modelConfig || !modelConfig.pricePerImage) {
    console.warn(`未找到模型 ${model} 的价格配置，使用默认价格`)
    // 默认价格：0.2元/张
    return count * 0.2
  }
  
  return modelConfig.pricePerImage * count
}

/**
 * 计算图片生成的积分消耗
 * @param {string} model - 模型名称
 * @param {number} count - 图片数量
 * @returns {number} 消耗的积分
 */
export function calculateImageGenerationCredit(model, count = 1) {
  const costInYuan = calculateImageCost(model, count)
  return calculateCreditFromCost(costInYuan)
}

/**
 * 获取积分消耗说明
 * @param {string} model - 模型名称
 * @param {string} resolution - 分辨率
 * @param {number} duration - 视频时长（秒）
 * @param {number} customCost - 可选：自定义成本（元）
 * @returns {string} 积分消耗说明文本
 */
export function getCreditDescription(model, resolution, duration, customCost = null) {
  const credit = calculateVideoGenerationCredit(model, resolution, duration, customCost)
  if (credit > 0) {
    return `预计消耗 ${credit} 积分`
  }
  return '不消耗积分'
}

/**
 * 获取模型显示名称
 * @param {string} model - 模型ID
 * @returns {string} 显示名称
 */
export function getModelDisplayName(model) {
  const modelConfig = MODEL_PRICING[model]
  return modelConfig ? modelConfig.name : model
}
