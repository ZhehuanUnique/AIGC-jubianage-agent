#!/bin/bash

# 快速启动 PM2 服务的正确命令
# PM2 默认会自动重启，不需要 --autorestart 选项

cd /var/www/aigc-agent/server

# 停止并删除旧进程（如果存在）
pm2 stop aigc-agent 2>/dev/null
pm2 delete aigc-agent 2>/dev/null

# 启动服务（PM2 默认会自动重启）
pm2 start index.js --name aigc-agent --max-memory-restart 1G

# 保存 PM2 进程列表，以便系统重启后自动恢复
pm2 save

# 显示状态
echo ""
echo "服务状态："
pm2 list | grep aigc-agent

echo ""
echo "等待 5 秒后检查健康状态..."
sleep 5

# 检查健康状态
if curl -s --max-time 5 http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ 服务启动成功"
    curl -s http://localhost:3002/api/health
    echo ""
else
    echo "❌ 服务启动失败，查看日志："
    pm2 logs aigc-agent --lines 20 --nostream | tail -20
fi




