import { AuthService } from '../services/authService.js'

/**
 * JWT认证中间件
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '未提供认证token' })
  }

  AuthService.verifyToken(token)
    .then((result) => {
      if (!result.success) {
        return res.status(401).json({ error: result.error })
      }
      req.user = result.user
      next()
    })
    .catch((error) => {
      console.error('认证中间件错误:', error)
      return res.status(500).json({ error: '认证失败' })
    })
}

/**
 * 可选认证中间件（如果提供了token则验证，否则继续）
 */
export function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    req.user = null
    return next()
  }

  AuthService.verifyToken(token)
    .then((result) => {
      if (result.success) {
        req.user = result.user
      } else {
        req.user = null
      }
      next()
    })
    .catch(() => {
      req.user = null
      next()
    })
}

