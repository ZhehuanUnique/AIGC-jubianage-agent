#!/bin/bash

# 服务器部署脚本
# 使用方法：ssh ubuntu@119.45.121.152 "bash -s" < 服务器部署.sh

echo "=========================================="
echo "  开始部署流程"
echo "=========================================="

# 1. 进入项目目录
echo "步骤 1: 进入项目目录..."
cd /var/www/aigc-agent || exit 1
pwd

# 2. 强制拉取最新代码
echo ""
echo "步骤 2: 强制拉取最新代码..."
git fetch origin
git reset --hard origin/main
echo "✅ 代码已更新到最新版本"
git log -1 --oneline

# 3. 清理并重新构建前端
echo ""
echo "步骤 3: 清理并重新构建前端..."
rm -rf dist node_modules/.vite
echo "✅ 已清理构建缓存"
npm run build
if [ $? -eq 0 ]; then
    echo "✅ 前端构建成功"
else
    echo "❌ 前端构建失败"
    exit 1
fi

# 4. 设置权限并重启服务
echo ""
echo "步骤 4: 设置权限并重启服务..."
sudo chown -R ubuntu:ubuntu dist/
echo "✅ 已设置 dist/ 目录权限"

cd server
pm2 restart aigc-agent
if [ $? -eq 0 ]; then
    echo "✅ PM2 服务已重启"
else
    echo "❌ PM2 服务重启失败"
    exit 1
fi

cd ..
sudo systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "✅ Nginx 已重新加载"
else
    echo "❌ Nginx 重新加载失败"
    exit 1
fi

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "检查服务状态："
pm2 status aigc-agent
echo ""
echo "检查 Nginx 状态："
sudo systemctl status nginx --no-pager | head -5

