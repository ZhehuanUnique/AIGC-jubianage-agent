#!/bin/bash

echo "=========================================="
echo "  完整修复语法错误并部署"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "1. 停止服务..."
pm2 stop aigc-agent 2>/dev/null
pm2 delete aigc-agent 2>/dev/null

echo ""
echo "2. 强制拉取最新代码..."
git fetch origin
git reset --hard origin/main

echo ""
echo "3. 检查所有服务文件的语法..."
cd server
ERROR_FOUND=0

for file in services/*.js; do
    if [ -f "$file" ]; then
        if node --check "$file" 2>&1 | grep -q "SyntaxError"; then
            echo "  ❌ 发现语法错误: $file"
            node --check "$file" 2>&1 | head -5
            ERROR_FOUND=1
        fi
    fi
done

if [ $ERROR_FOUND -eq 1 ]; then
    echo ""
    echo "  ⚠️ 发现语法错误，请先修复后再重启服务"
    exit 1
fi

echo "  ✅ 所有服务文件语法正确"

echo ""
echo "4. 检查主文件语法..."
if node --check index.js 2>&1 | grep -q "SyntaxError"; then
    echo "  ❌ index.js 有语法错误"
    node --check index.js 2>&1 | head -10
    exit 1
else
    echo "  ✅ index.js 语法正确"
fi

echo ""
echo "5. 检查端口占用..."
if lsof -i :3002 > /dev/null 2>&1; then
    echo "  ⚠️ 端口 3002 被占用，释放中..."
    lsof -i :3002 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
    sleep 2
fi

echo ""
echo "6. 重新启动服务..."
pm2 start index.js --name aigc-agent --max-memory-restart 1G
pm2 save

echo ""
echo "7. 等待服务启动（15秒）..."
sleep 15

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
    echo ""
else
    echo "  ❌ 健康检查失败"
    echo ""
    echo "  查看最新错误日志："
    pm2 logs aigc-agent --err --lines 20 --nostream | tail -20
fi

ENDSSH

echo ""
echo "=========================================="
echo "  修复完成"
echo "=========================================="




