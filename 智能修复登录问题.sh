#!/bin/bash

echo "=========================================="
echo "  智能修复登录问题"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "1. 停止服务..."
pm2 stop aigc-agent 2>/dev/null
pm2 delete aigc-agent 2>/dev/null
pkill -f "node.*index.js" 2>/dev/null

echo ""
echo "2. 释放端口 3002..."
lsof -ti :3002 | xargs kill -9 2>/dev/null
sleep 2

echo ""
echo "3. 拉取最新代码..."
git fetch origin
git reset --hard origin/main
echo "  ✅ 代码已更新到: $(git log -1 --oneline)"

echo ""
echo "4. 查找 Node.js（PM2 应该能找到）..."
# PM2 通常知道 node 的位置，我们直接启动服务
# 如果 PM2 启动失败，说明 node 确实有问题

echo ""
echo "5. 启动服务（PM2 会自动找到 node）..."
cd server
pm2 start index.js --name aigc-agent --max-memory-restart 1G
pm2 save

echo ""
echo "6. 等待服务启动（40秒，给模型加载时间）..."
sleep 40

echo ""
echo "7. 检查服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "8. 检查进程..."
ps aux | grep "node.*index.js" | grep -v grep | head -2

echo ""
echo "9. 检查端口监听..."
if netstat -tulpn 2>/dev/null | grep -q ":3002" || lsof -i :3002 > /dev/null 2>&1; then
    echo "  ✅ 端口 3002 已被监听"
    netstat -tulpn 2>/dev/null | grep 3002 || lsof -i :3002 | head -2
else
    echo "  ❌ 端口 3002 未被监听"
fi

echo ""
echo "10. 测试健康检查（重试 5 次，每次等待 10 秒）..."
SUCCESS=0
for i in 1 2 3 4 5; do
    echo "  尝试 $i/5..."
    RESPONSE=$(curl -s --max-time 10 http://localhost:3002/api/health 2>&1)
    if echo "$RESPONSE" | grep -q "healthy\|status"; then
        echo "  ✅ 健康检查成功！"
        echo "$RESPONSE"
        echo ""
        SUCCESS=1
        break
    else
        echo "  ⏳ 等待服务启动..."
        sleep 10
    fi
done

if [ $SUCCESS -eq 0 ]; then
    echo "  ❌ 健康检查失败"
    echo ""
    echo "  === 最新错误日志（50行）==="
    pm2 logs aigc-agent --err --lines 50 --nostream | tail -50
    echo ""
    echo "  === 最新输出日志（30行）==="
    pm2 logs aigc-agent --out --lines 30 --nostream | tail -30
    echo ""
    echo "  === PM2 详细信息 ==="
    pm2 describe aigc-agent
fi

ENDSSH

echo ""
echo "=========================================="
echo "  修复完成"
echo "=========================================="




