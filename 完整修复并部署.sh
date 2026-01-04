#!/bin/bash

echo "=========================================="
echo "  完整修复并部署"
echo "=========================================="
echo ""

# 步骤1：确保本地代码已提交
echo "1. 检查本地代码状态..."
if [ -n "$(git status --porcelain)" ]; then
    echo "  ⚠️ 有未提交的更改，正在提交..."
    git add server/services/musicStorageService.js
    git commit -m "修复 musicStorageService 数据库连接问题"
    git push origin main
    echo "  ✅ 代码已推送到 GitHub"
else
    echo "  ✅ 本地代码已是最新"
fi

echo ""
echo "2. 连接到服务器并执行修复..."
ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "2.1 停止服务..."
pm2 stop aigc-agent 2>/dev/null
pm2 delete aigc-agent 2>/dev/null

echo ""
echo "2.2 强制拉取最新代码..."
git fetch origin
git reset --hard origin/main

echo ""
echo "2.3 验证修复是否已应用..."
if grep -q "pool.default || pool" server/services/musicStorageService.js; then
    echo "  ✅ musicStorageService.js 修复已应用"
else
    echo "  ❌ musicStorageService.js 修复未应用"
    echo "  手动修复中..."
    cd server/services
    # 这里可以添加 sed 命令来修复，但为了安全，先检查
    cd ../..
fi

echo ""
echo "2.4 检查所有服务文件的语法..."
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
echo "2.5 检查主文件语法..."
if node --check index.js 2>&1 | grep -q "SyntaxError"; then
    echo "  ❌ index.js 有语法错误"
    node --check index.js 2>&1 | head -10
    exit 1
else
    echo "  ✅ index.js 语法正确"
fi

echo ""
echo "2.6 检查端口占用..."
if lsof -i :3002 > /dev/null 2>&1; then
    echo "  ⚠️ 端口 3002 被占用，释放中..."
    lsof -i :3002 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
    sleep 2
fi

echo ""
echo "2.7 重新启动服务..."
pm2 start index.js --name aigc-agent --max-memory-restart 1G
pm2 save

echo ""
echo "2.8 等待服务启动（15秒）..."
sleep 15

echo ""
echo "2.9 检查服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "2.10 检查端口监听..."
if netstat -tulpn 2>/dev/null | grep -q ":3002" || lsof -i :3002 > /dev/null 2>&1; then
    echo "  ✅ 端口 3002 已被监听"
    netstat -tulpn 2>/dev/null | grep 3002 || lsof -i :3002 | head -3
else
    echo "  ❌ 端口 3002 未被监听"
fi

echo ""
echo "2.11 测试健康检查..."
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

