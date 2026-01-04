#!/bin/bash

echo "=========================================="
echo "  直接重启服务（不检查语法）"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "1. 停止服务..."
pm2 stop aigc-agent 2>/dev/null
pm2 delete aigc-agent 2>/dev/null

echo ""
echo "2. 释放端口..."
lsof -ti :3002 | xargs kill -9 2>/dev/null
sleep 2

echo ""
echo "3. 拉取最新代码..."
git fetch origin
git reset --hard origin/main

echo ""
echo "4. 启动服务..."
cd server
pm2 start index.js --name aigc-agent --max-memory-restart 1G
pm2 save

echo ""
echo "5. 等待启动（30秒）..."
sleep 30

echo ""
echo "6. 服务状态："
pm2 list

echo ""
echo "7. 测试健康检查："
curl -s --max-time 10 http://localhost:3002/api/health || echo "健康检查失败"

echo ""
echo "8. 最新错误日志："
pm2 logs aigc-agent --err --lines 20 --nostream | tail -20

ENDSSH

echo ""
echo "=========================================="
echo "  完成"
echo "=========================================="




