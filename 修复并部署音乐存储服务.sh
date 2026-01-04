#!/bin/bash

echo "=========================================="
echo "  修复并部署音乐存储服务"
echo "=========================================="
echo ""

# 步骤1：确保本地代码已提交
echo "1. 检查本地代码状态..."
if [ -n "$(git status --porcelain)" ]; then
    echo "  ⚠️ 有未提交的更改，正在提交..."
    git add server/services/musicStorageService.js
    git commit -m "修复 musicStorageService 语法错误，移除 CREATE TABLE，使用 Supabase"
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
echo "2.3 检查语法..."
cd server
if node --check services/musicStorageService.js 2>&1 | grep -q "SyntaxError"; then
    echo "  ❌ musicStorageService.js 有语法错误"
    node --check services/musicStorageService.js 2>&1 | head -10
    exit 1
else
    echo "  ✅ musicStorageService.js 语法正确"
fi

if node --check index.js 2>&1 | grep -q "SyntaxError"; then
    echo "  ❌ index.js 有语法错误"
    node --check index.js 2>&1 | head -10
    exit 1
else
    echo "  ✅ index.js 语法正确"
fi

echo ""
echo "2.4 检查端口占用..."
if lsof -i :3002 > /dev/null 2>&1; then
    echo "  ⚠️ 端口 3002 被占用，释放中..."
    lsof -i :3002 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
    sleep 2
fi

echo ""
echo "2.5 重新启动服务..."
pm2 start index.js --name aigc-agent --max-memory-restart 1G
pm2 save

echo ""
echo "2.6 等待服务启动（15秒）..."
sleep 15

echo ""
echo "2.7 检查服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "2.8 检查端口监听..."
if netstat -tulpn 2>/dev/null | grep -q ":3002" || lsof -i :3002 > /dev/null 2>&1; then
    echo "  ✅ 端口 3002 已被监听"
else
    echo "  ❌ 端口 3002 未被监听"
fi

echo ""
echo "2.9 测试健康检查..."
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

