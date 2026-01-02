#!/bin/bash

# 快速更新线上部署（跳过依赖检查，直接拉取、构建、重启）

set -e

echo "========================================"
echo "快速更新线上部署"
echo "========================================"
echo ""

cd /var/www/aigc-agent

# 1. 更新代码
echo "步骤 1: 从 GitHub 拉取最新代码..."
git pull origin main
echo "✅ 代码已更新"
echo ""

# 2. 重启后端服务
echo "步骤 2: 重启后端服务..."
cd server
pm2 restart aigc-agent
sleep 3
echo "✅ 后端服务已重启"
echo ""

# 3. 清理并重新构建前端
echo "步骤 3: 清理并重新构建前端..."
cd ..
rm -rf dist node_modules/.vite
npm run build
echo "✅ 构建完成"
echo ""

# 4. 设置文件权限并重新加载 Nginx
echo "步骤 4: 设置文件权限并重新加载 Nginx..."
sudo chown -R ubuntu:ubuntu dist/
sudo systemctl reload nginx
echo "✅ 部署完成"
echo ""

echo "========================================"
echo "✅ 快速更新完成！"
echo "========================================"
echo ""

