import { AlertType } from '../components/AlertModal'

// 全局 alert 处理器
let globalAlertHandler: ((message: string, type?: AlertType, title?: string) => void) | null = null

export function setGlobalAlertHandler(
  handler: (message: string, type?: AlertType, title?: string) => void
) {
  globalAlertHandler = handler
}

/**
 * 统一的提示框函数，替换原生 alert
 * @param message 提示消息
 * @param type 提示类型
 * @param title 标题（可选）
 */
export function alert(message: string, type: AlertType = 'info', title?: string) {
  if (globalAlertHandler) {
    globalAlertHandler(message, type, title)
  } else {
    // 降级到原生 alert
    window.alert(message)
  }
}

// 便捷函数
export const alertSuccess = (message: string, title?: string) => alert(message, 'success', title)
export const alertError = (message: string, title?: string) => alert(message, 'error', title)
export const alertWarning = (message: string, title?: string) => alert(message, 'warning', title)
export const alertInfo = (message: string, title?: string) => alert(message, 'info', title)


