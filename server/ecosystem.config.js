/**
 * PM2 进程管理配置文件
 * 用于确保后端服务 24 小时稳定运行
 */

module.exports = {
  apps: [
    {
      name: 'aigc-agent',
      script: './index.js',
      cwd: '/var/www/aigc-agent/server',
      instances: 1,
      exec_mode: 'fork',
      
      // 自动重启配置
      autorestart: true,           // 自动重启
      watch: false,                // 不监听文件变化（生产环境）
      max_memory_restart: '1G',    // 内存超过 1G 时重启
      
      // 错误处理
      error_file: '/home/ubuntu/.pm2/logs/aigc-agent-error.log',
      out_file: '/home/ubuntu/.pm2/logs/aigc-agent-out.log',
      log_file: '/home/ubuntu/.pm2/logs/aigc-agent-combined.log',
      time: true,                  // 日志添加时间戳
      merge_logs: true,            // 合并日志
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      
      // 重启策略
      min_uptime: '10s',           // 最小运行时间（10秒内重启视为异常）
      max_restarts: 10,            // 最大重启次数（10次后停止）
      restart_delay: 4000,         // 重启延迟（4秒）
      
      // 健康检查（可选）
      // 如果进程无响应，PM2 会自动重启
      kill_timeout: 5000,          // 优雅关闭超时时间（5秒）
      
      // 日志轮转
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }
  ]
}

