#!/bin/bash

echo "=========================================="
echo "  一键修复登录问题"
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
echo "4. 检查代码语法..."
cd server
ERRORS=0

# 检查主文件
if ! node --check index.js > /dev/null 2>&1; then
    echo "  ❌ index.js 有语法错误"
    node --check index.js 2>&1 | head -10
    ERRORS=1
fi

# 检查关键服务文件
for file in services/musicStorageService.js services/klingService.js; do
    if [ -f "$file" ]; then
        if ! node --check "$file" > /dev/null 2>&1; then
            echo "  ❌ $file 有语法错误"
            node --check "$file" 2>&1 | head -5
            ERRORS=1
        fi
    fi
done

if [ $ERRORS -eq 1 ]; then
    echo ""
    echo "  ⚠️ 发现语法错误，请先修复"
    exit 1
fi

echo "  ✅ 所有文件语法正确"

echo ""
echo "5. 启动服务..."
cd ..
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
echo "8. 测试健康检查（重试 3 次）..."
for i in 1 2 3; do
    echo "  尝试 $i/3..."
    if curl -s --max-time 10 http://localhost:3002/api/health > /dev/null 2>&1; then
        echo "  ✅ 健康检查成功！"
        curl -s http://localhost:3002/api/health
        echo ""
        exit 0
    fi
    sleep 5
done

echo "  ❌ 健康检查失败"
echo ""
echo "  查看错误日志："
pm2 logs aigc-agent --err --lines 50 --nostream | tail -50

ENDSSH

echo ""
echo "=========================================="
echo "  修复完成"
echo "=========================================="




