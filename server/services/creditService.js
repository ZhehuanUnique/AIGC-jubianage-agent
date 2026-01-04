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
 * 计算即梦AI-视频生成3.0 Pro的实际成本
 * @param {string} resolution - 分辨率：'480p', '720p', '1080p'
 * @param {number} duration - 视频时长（秒）
 * @returns {number} 实际成本（元）
 */
export function calculateVolcengineCost(resolution, duration) {
  // 根据用户提供的信息：
  // 即梦3.0pro 5秒1080p视频 = 3.645元 = 40积分
  
  // 基础成本：5秒1080p视频 = 3.645元
  const baseCost = 3.645
  
  // 分辨率系数（根据像素数比例）
  const resolutionMultiplier = {
    '480p': 0.25,  // 480p像素数约为1080p的25%
    '720p': 0.56,  // 720p像素数约为1080p的56%
    '1080p': 1.0   // 1080p是基准
  }
  
  // 时长系数（线性比例）
  const durationMultiplier = duration / 5
  
  // 计算成本：基础成本 × 分辨率系数 × 时长系数
  const cost = baseCost * (resolutionMultiplier[resolution] || 1.0) * durationMultiplier
  
  return cost
}

/**
 * 计算视频生成的积分消耗
 * @param {string} model - 模型名称
 * @param {string} resolution - 分辨率：'480p', '720p', '1080p'
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
    // 根据模型计算实际成本
    if (model === 'volcengine-video-3.0-pro' || model === 'doubao-seedance-3.0-pro') {
      costInYuan = calculateVolcengineCost(resolution, duration)
    } else if (model === 'doubao-seedance-1-5-pro-251215' || model === 'doubao-seedance-1-0-pro') {
      // 豆包 Seedance 成本计算
      // Token = 宽 × 高 × 帧率 × 时长 / 1024
      // 价格：2.2 PTC/1M token
      // 1 PTC ≈ 0.15元（根据市场汇率）
      
      const resolutionPixels = {
        '480p': { width: 854, height: 480 },
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 }
      }
      
      const pixels = resolutionPixels[resolution] || resolutionPixels['720p']
      const frameRate = 24 // 默认帧率
      const tokens = (pixels.width * pixels.height * frameRate * duration) / 1024
      const ptc = (tokens / 1000000) * 2.2
      costInYuan = ptc * 0.15 // PTC转人民币
    }
    // 其他模型可以在这里添加成本计算逻辑
  }
  
  // 将成本转换为积分
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

