#!/bin/bash

# 在服务器上直接执行此脚本
# 使用方法: ssh ubuntu@119.45.121.152 "bash -s" < 快速修复语法错误-服务器执行.sh

cd /var/www/aigc-agent/server

echo "1. 检查所有 JS 文件的语法..."
for file in services/*.js index.js; do
    if [ -f "$file" ]; then
        echo "检查: $file"
        if ! node --check "$file" 2>&1; then
            echo "  ❌ 发现语法错误"
            node --check "$file" 2>&1 | head -5
        else
            echo "  ✅ 语法正确"
        fi
    fi
done

echo ""
echo "2. 拉取最新代码..."
cd /var/www/aigc-agent
git fetch origin
git reset --hard origin/main

echo ""
echo "3. 重启服务..."
cd server
pm2 restart aigc-agent

echo ""
echo "4. 等待服务启动..."
sleep 5

echo ""
echo "5. 检查服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "6. 测试健康检查..."
curl -s http://localhost:3002/api/health || echo "服务未响应"




