#!/bin/bash

echo "=========================================="
echo "  诊断服务连接问题"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'EOF'
cd /var/www/aigc-agent/server

echo "1. 检查 PM2 服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "2. 检查进程是否真的在运行..."
ps aux | grep "node.*index.js" | grep -v grep

echo ""
echo "3. 检查端口 3002 是否被监听..."
netstat -tulpn | grep 3002 || lsof -i :3002 || echo "端口 3002 未被监听"

echo ""
echo "4. 查看服务启动日志（最近50行）..."
pm2 logs aigc-agent --lines 50 --nostream | tail -50

echo ""
echo "5. 查看错误日志（最近30行）..."
pm2 logs aigc-agent --err --lines 30 --nostream | tail -30

echo ""
echo "6. 检查服务是否立即退出..."
pm2 describe aigc-agent | grep -E "status|restarts|uptime"

echo ""
echo "7. 尝试手动启动服务（测试）..."
cd /var/www/aigc-agent/server
node index.js &
TEST_PID=$!
sleep 3
if ps -p $TEST_PID > /dev/null; then
    echo "  ✅ 服务可以手动启动"
    curl -s http://localhost:3002/api/health || echo "  ⚠️ 但健康检查失败"
    kill $TEST_PID 2>/dev/null
else
    echo "  ❌ 服务无法手动启动（可能立即退出）"
fi

EOF

echo ""
echo "=========================================="
echo "  诊断完成"
echo "=========================================="




