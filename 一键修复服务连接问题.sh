#!/bin/bash

echo "=========================================="
echo "  一键修复服务连接问题"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent/server

echo "1. 查看当前服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "2. 查看错误日志（最近20行）..."
pm2 logs aigc-agent --err --lines 20 --nostream | tail -20

echo ""
echo "3. 停止并删除服务..."
pm2 stop aigc-agent 2>/dev/null
pm2 delete aigc-agent 2>/dev/null

echo ""
echo "4. 检查语法..."
if node --check index.js 2>&1 | grep -q "SyntaxError"; then
    echo "  ❌ 发现语法错误"
    node --check index.js 2>&1 | head -10
    echo ""
    echo "  请先修复语法错误，然后重新运行此脚本"
    exit 1
else
    echo "  ✅ 语法检查通过"
fi

echo ""
echo "5. 检查端口占用..."
if lsof -i :3002 > /dev/null 2>&1; then
    echo "  ⚠️ 端口 3002 被占用，尝试释放..."
    lsof -i :3002 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
    sleep 2
fi

echo ""
echo "6. 重新启动服务..."
pm2 start index.js --name aigc-agent --autorestart --max-memory-restart 1G
pm2 save

echo ""
echo "7. 等待服务启动（10秒）..."
sleep 10

echo ""
echo "8. 检查服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "9. 检查端口监听..."
if netstat -tulpn 2>/dev/null | grep -q ":3002" || lsof -i :3002 > /dev/null 2>&1; then
    echo "  ✅ 端口 3002 已被监听"
else
    echo "  ❌ 端口 3002 未被监听"
fi

echo ""
echo "10. 测试健康检查..."
if curl -s --max-time 5 http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "  ✅ 健康检查通过"
    curl -s http://localhost:3002/api/health
else
    echo "  ❌ 健康检查失败"
    echo ""
    echo "  查看最新日志："
    pm2 logs aigc-agent --lines 30 --nostream | tail -30
fi

ENDSSH

echo ""
echo "=========================================="
echo "  修复完成"
echo "=========================================="




