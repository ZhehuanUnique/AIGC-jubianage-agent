#!/bin/bash

echo "=========================================="
echo "  更新服务器代码并重启服务"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "1. 停止服务..."
pm2 stop aigc-agent 2>/dev/null

echo ""
echo "2. 拉取最新代码..."
git fetch origin
git reset --hard origin/main

echo ""
echo "3. 检查修复是否已应用..."
if grep -q "pool.default || pool" server/services/musicStorageService.js; then
    echo "  ✅ musicStorageService.js 已包含修复代码"
else
    echo "  ❌ musicStorageService.js 未更新，尝试手动修复..."
    # 这里可以添加自动修复逻辑，但为了安全，先检查
fi

echo ""
echo "4. 检查语法（如果 Node.js 可用）..."
if command -v node > /dev/null 2>&1; then
    cd server
    if node --check index.js 2>&1 | grep -q "SyntaxError"; then
        echo "  ❌ 发现语法错误"
        node --check index.js 2>&1 | head -10
        echo ""
        echo "  请先修复语法错误"
        exit 1
    else
        echo "  ✅ 语法检查通过"
    fi
    cd ..
else
    echo "  ⚠️ Node.js 不可用，跳过语法检查"
fi

echo ""
echo "5. 重新启动服务..."
cd server
pm2 start index.js --name aigc-agent --autorestart --max-memory-restart 1G
pm2 save

echo ""
echo "6. 等待服务启动（10秒）..."
sleep 10

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
echo "9. 测试健康检查..."
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
echo "  更新完成"
echo "=========================================="




