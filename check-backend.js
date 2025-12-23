// 快速检查后端服务是否运行
const http = require('http')

const checkBackend = async () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3002/health', (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ 后端服务运行正常！')
          console.log('响应:', data)
          resolve(true)
        } else {
          console.log('❌ 后端服务响应异常，状态码:', res.statusCode)
          resolve(false)
        }
      })
    })

    req.on('error', (err) => {
      console.log('❌ 无法连接到后端服务')
      console.log('错误:', err.message)
      console.log('')
      console.log('请确保：')
      console.log('1. 后端服务已启动（在 server 目录运行 npm run dev）')
      console.log('2. 服务运行在 http://localhost:3002')
      resolve(false)
    })

    req.setTimeout(3000, () => {
      req.destroy()
      console.log('❌ 连接超时')
      resolve(false)
    })
  })
}

checkBackend()

