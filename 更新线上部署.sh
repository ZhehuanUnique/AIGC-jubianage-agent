#!/bin/bash

# 更新线上部署 - 在服务器上执行

set -e

echo "========================================"
echo "更新线上部署"
echo "========================================"
echo ""

cd /var/www/aigc-agent

# 1. 更新代码
echo "步骤 1: 从 GitHub 拉取最新代码..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Git pull 失败，请检查网络连接或权限"
    exit 1
fi
echo "✅ 代码已更新"
echo ""

# 2. 安装后端依赖（如果需要）
echo "步骤 2: 检查后端依赖..."
cd server
if [ -f "package.json" ]; then
    # 检查是否有新的依赖
    if [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null || [ ! -d "node_modules" ]; then
        echo "📦 安装后端依赖..."
        npm install
        echo "✅ 后端依赖已安装"
    else
        echo "✅ 后端依赖已是最新"
    fi
fi
echo ""

# 3. 重启后端服务
echo "步骤 3: 重启后端服务..."
pm2 restart aigc-agent
sleep 3

# 检查服务状态
pm2 status aigc-agent | grep -q "online" && echo "✅ 后端服务运行正常" || echo "⚠️  后端服务可能未正常运行，请检查日志: pm2 logs aigc-agent"
echo ""

# 4. 安装前端依赖（如果需要）
echo "步骤 4: 检查前端依赖..."
cd ..
if [ -f "package.json" ]; then
    # 检查是否有新的依赖
    if [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null || [ ! -d "node_modules" ]; then
        echo "📦 安装前端依赖..."
        npm install
        echo "✅ 前端依赖已安装"
    else
        echo "✅ 前端依赖已是最新"
    fi
fi
echo ""

# 5. 清理前端构建
echo "步骤 5: 清理前端构建..."
rm -rf dist node_modules/.vite
echo "✅ 已清理"
echo ""

# 6. 重新构建前端
echo "步骤 6: 重新构建前端..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败，请检查错误信息"
    exit 1
fi
echo "✅ 构建完成"
echo ""

# 7. 设置文件权限
echo "步骤 7: 设置文件权限..."
sudo chown -R ubuntu:ubuntu dist/
echo "✅ 权限已设置"
echo ""

# 8. 重新加载 Nginx
echo "步骤 8: 重新加载 Nginx..."
sudo systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "✅ Nginx 已重新加载"
else
    echo "⚠️  Nginx 重新加载失败，请检查配置: sudo nginx -t"
fi
echo ""

echo "========================================"
echo "✅ 更新完成！"
echo "========================================"
echo ""
echo "📋 更新内容:"
echo "  ✅ 代码已从 GitHub 拉取"
echo "  ✅ 后端服务已重启"
echo "  ✅ 前端已重新构建"
echo "  ✅ Nginx 已重新加载"
echo ""
echo "💡 提示:"
echo "  - 查看后端日志: pm2 logs aigc-agent"
echo "  - 查看后端状态: pm2 status"
echo "  - 测试后端健康: curl http://localhost:3002/api/health"
echo "  - 清除浏览器缓存后刷新页面查看效果"
echo ""





