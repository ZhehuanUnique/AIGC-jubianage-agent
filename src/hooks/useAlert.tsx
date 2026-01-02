import { useState, useCallback, useEffect } from 'react'
import { AlertModal, AlertType } from '../components/AlertModal'
import { setGlobalAlertHandler } from '../utils/alert'

export function useAlert() {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean
    title?: string
    message: string
    type: AlertType
  }>({
    isOpen: false,
    message: '',
    type: 'info',
  })

  const showAlert = useCallback(
    (message: string, type: AlertType = 'info', title?: string) => {
      setAlertState({
        isOpen: true,
        message,
        type,
        title,
      })
    },
    []
  )

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // 注册全局 alert 处理器
  useEffect(() => {
    setGlobalAlertHandler(showAlert)
    return () => {
      setGlobalAlertHandler(null as any)
    }
  }, [showAlert])

  // 渲染提示框组件
  const AlertComponent = (
    <AlertModal
      isOpen={alertState.isOpen}
      title={alertState.title}
      message={alertState.message}
      type={alertState.type}
      onClose={closeAlert}
    />
  )

  return {
    showAlert,
    closeAlert,
    AlertComponent,
  }
}


