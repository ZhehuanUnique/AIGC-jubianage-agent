/**
 * 前端积分计算工具
 * 与后端 server/services/creditService.js 保持一致的逻辑
 */

/**
 * 根据实际成本（元）计算积分（普通用户显示）
 * @param costInYuan - 实际成本（元）
 * @returns 消耗的积分
 */
export function calculateCreditFromCost(costInYuan: number): number {
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
 * @param resolution - 分辨率：'480p', '720p', '1080p'
 * @param duration - 视频时长（秒）
 * @returns 实际成本（元）
 */
export function calculateVolcengineCost(resolution: string, duration: number): number {
  // 基础成本：5秒1080p视频 = 3.645元
  const baseCost = 3.645
  
  // 分辨率系数（根据像素数比例）
  const resolutionMultiplier: Record<string, number> = {
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
 * @param model - 模型名称
 * @param resolution - 分辨率：'480p', '720p', '1080p'
 * @param duration - 视频时长（秒）
 * @returns 消耗的积分
 */
export function calculateVideoGenerationCredit(
  model: string,
  resolution: string,
  duration: number
): number {
  let costInYuan = 0
  
  // 根据模型计算实际成本
  if (model === 'volcengine-video-3.0-pro' || model === 'doubao-seedance-3.0-pro') {
    costInYuan = calculateVolcengineCost(resolution, duration)
  }
  // 其他模型可以在这里添加成本计算逻辑
  
  // 将成本转换为积分
  return calculateCreditFromCost(costInYuan)
}





