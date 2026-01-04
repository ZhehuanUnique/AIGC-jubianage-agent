#!/bin/bash

echo "=========================================="
echo "  修复并重启生产环境服务"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "1. 停止服务..."
pm2 stop aigc-agent 2>/dev/null
pm2 delete aigc-agent 2>/dev/null

echo ""
echo "2. 检查端口占用..."
if lsof -i :3002 > /dev/null 2>&1; then
    echo "  ⚠️ 端口 3002 被占用，释放中..."
    lsof -i :3002 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
    sleep 2
fi

echo ""
echo "3. 拉取最新代码..."
git fetch origin
git reset --hard origin/main

echo ""
echo "4. 检查语法..."
cd server
if node --check index.js 2>&1 | grep -q "SyntaxError"; then
    echo "  ❌ index.js 有语法错误"
    node --check index.js 2>&1 | head -10
    exit 1
else
    echo "  ✅ index.js 语法正确"
fi

# 检查关键服务文件
for file in services/musicStorageService.js services/klingService.js; do
    if [ -f "$file" ]; then
        if node --check "$file" 2>&1 | grep -q "SyntaxError"; then
            echo "  ❌ $file 有语法错误"
            node --check "$file" 2>&1 | head -5
            exit 1
        fi
    fi
done
echo "  ✅ 关键服务文件语法正确"

echo ""
echo "5. 重新启动服务..."
pm2 start index.js --name aigc-agent --max-memory-restart 1G
pm2 save

echo ""
echo "6. 等待服务启动（20秒）..."
sleep 20

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
for i in {1..5}; do
    if curl -s --max-time 5 http://localhost:3002/api/health > /dev/null 2>&1; then
        echo "  ✅ 健康检查通过（尝试 $i/5）"
        curl -s http://localhost:3002/api/health
        echo ""
        break
    else
        echo "  ⏳ 等待服务启动（尝试 $i/5）..."
        sleep 5
    fi
done

if ! curl -s --max-time 5 http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "  ❌ 健康检查失败"
    echo ""
    echo "  查看最新错误日志："
    pm2 logs aigc-agent --err --lines 30 --nostream | tail -30
fi

ENDSSH

echo ""
echo "=========================================="
echo "  修复完成"
echo "=========================================="




