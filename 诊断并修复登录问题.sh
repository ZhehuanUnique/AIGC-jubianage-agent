#!/bin/bash

echo "=========================================="
echo "  诊断并修复登录问题"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "=== 1. PM2 服务状态 ==="
pm2 list

echo ""
echo "=== 2. 端口监听情况 ==="
netstat -tulpn 2>/dev/null | grep 3002 || echo "端口 3002 未被监听"

echo ""
echo "=== 3. 进程检查 ==="
ps aux | grep "node.*index.js" | grep -v grep || echo "未找到 Node.js 进程"

echo ""
echo "=== 4. 健康检查 ==="
curl -v http://localhost:3002/api/health 2>&1 | head -20

echo ""
echo "=== 5. 最新错误日志 ==="
pm2 logs aigc-agent --err --lines 50 --nostream 2>&1 | tail -50

echo ""
echo "=== 6. 最新输出日志 ==="
pm2 logs aigc-agent --out --lines 30 --nostream 2>&1 | tail -30

ENDSSH

echo ""
echo "=========================================="
echo "  诊断完成"
echo "=========================================="




