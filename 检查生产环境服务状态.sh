#!/bin/bash

echo "=========================================="
echo "  检查生产环境服务状态"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
echo "1. 检查 PM2 服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "2. 检查端口监听..."
if netstat -tulpn 2>/dev/null | grep -q ":3002" || lsof -i :3002 > /dev/null 2>&1; then
    echo "  ✅ 端口 3002 已被监听"
    netstat -tulpn 2>/dev/null | grep 3002 || lsof -i :3002 | head -3
else
    echo "  ❌ 端口 3002 未被监听"
fi

echo ""
echo "3. 测试健康检查..."
if curl -s --max-time 5 http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "  ✅ 健康检查通过"
    curl -s http://localhost:3002/api/health
    echo ""
else
    echo "  ❌ 健康检查失败"
fi

echo ""
echo "4. 查看最新错误日志（最近 30 行）..."
pm2 logs aigc-agent --err --lines 30 --nostream | tail -30

echo ""
echo "5. 查看最新输出日志（最近 20 行）..."
pm2 logs aigc-agent --out --lines 20 --nostream | tail -20

ENDSSH

echo ""
echo "=========================================="
echo "  检查完成"
echo "=========================================="




