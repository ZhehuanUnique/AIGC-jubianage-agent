#!/bin/bash

echo "检查生产环境服务状态..."

ssh ubuntu@119.45.121.152 << 'ENDSSH'
echo "=== PM2 服务状态 ==="
pm2 list

echo ""
echo "=== 端口监听 ==="
netstat -tulpn 2>/dev/null | grep 3002 || lsof -i :3002 2>/dev/null | head -3

echo ""
echo "=== 健康检查 ==="
curl -v http://localhost:3002/api/health 2>&1 | head -20

echo ""
echo "=== 最新错误日志（50行）==="
pm2 logs aigc-agent --err --lines 50 --nostream | tail -50

ENDSSH




