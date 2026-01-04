#!/bin/bash

echo "=========================================="
echo "  快速检查修复状态"
echo "=========================================="
echo ""

# 使用交互式 SSH 会话
ssh -t ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "1. 检查服务状态..."
pm2 list 2>/dev/null | grep aigc-agent || echo "PM2 未运行或服务不存在"

echo ""
echo "2. 测试健康检查..."
curl -s --max-time 3 http://localhost:3002/api/health && echo "" || echo "服务未响应"

echo ""
echo "3. 检查代码版本..."
git log --oneline -1 2>/dev/null

echo ""
echo "4. 检查修复是否已应用..."
if grep -q "pool.default || pool" server/services/musicStorageService.js 2>/dev/null; then
    echo "✅ musicStorageService.js 已修复"
else
    echo "❌ musicStorageService.js 未修复"
fi

echo ""
echo "5. 查看最新错误（最后5行）..."
pm2 logs aigc-agent --err --lines 5 --nostream 2>/dev/null | tail -5 || echo "无法获取日志"

ENDSSH

echo ""
echo "=========================================="
echo "  检查完成"
echo "=========================================="




