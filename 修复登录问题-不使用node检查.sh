#!/bin/bash

echo "=========================================="
echo "  修复登录问题（跳过语法检查）"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "1. 停止所有相关进程..."
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

echo ""
echo "4. 查找 Node.js 路径..."
NODE_PATH=$(which node 2>/dev/null || find /usr -name node 2>/dev/null | grep -E "(bin/node|nodejs/bin/node)" | head -1)
if [ -n "$NODE_PATH" ]; then
    echo "  ✅ 找到 Node.js: $NODE_PATH"
    export PATH=$(dirname $NODE_PATH):$PATH
else
    echo "  ⚠️  未找到 Node.js，跳过语法检查"
    echo "  （如果服务启动失败，请检查日志）"
fi

echo ""
echo "5. 启动服务..."
cd server
pm2 start index.js --name aigc-agent --max-memory-restart 1G
pm2 save

echo ""
echo "6. 等待服务启动（30秒）..."
sleep 30

echo ""
echo "7. 检查服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "8. 检查端口监听..."
if netstat -tulpn 2>/dev/null | grep -q ":3002" || lsof -i :3002 > /dev/null 2>&1; then
    echo "  ✅ 端口 3002 已被监听"
else
    echo "  ❌ 端口 3002 未被监听"
fi

echo ""
echo "9. 测试健康检查（重试 3 次）..."
SUCCESS=0
for i in 1 2 3; do
    echo "  尝试 $i/3..."
    if curl -s --max-time 10 http://localhost:3002/api/health > /dev/null 2>&1; then
        echo "  ✅ 健康检查成功！"
        curl -s http://localhost:3002/api/health
        echo ""
        SUCCESS=1
        break
    fi
    sleep 5
done

if [ $SUCCESS -eq 0 ]; then
    echo "  ❌ 健康检查失败"
    echo ""
    echo "  查看错误日志："
    pm2 logs aigc-agent --err --lines 50 --nostream | tail -50
    echo ""
    echo "  查看输出日志："
    pm2 logs aigc-agent --out --lines 30 --nostream | tail -30
fi

ENDSSH

echo ""
echo "=========================================="
echo "  修复完成"
echo "=========================================="




