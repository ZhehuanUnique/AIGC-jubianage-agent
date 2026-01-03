#!/bin/bash
# 完整更新服务器 - 在服务器上执行

set -e

export NVM_DIR=$HOME/.nvm
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "========================================"
echo "完整更新服务器"
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
pm2 status aigc-agent | grep -q "online" && echo "✅ 后端服务运行正常" || echo "⚠️  后端服务可能未正常运行"
echo ""

# 3. 重新构建前端
echo "步骤 3: 重新构建前端..."
cd ..
rm -rf dist node_modules/.vite
npm run build
echo "✅ 构建完成"
echo ""

# 4. 设置权限并重新加载 Nginx
echo "步骤 4: 设置权限并重新加载 Nginx..."
sudo chown -R ubuntu:ubuntu dist/
sudo systemctl reload nginx
echo "✅ Nginx 已重新加载"
echo ""

# 5. 验证更新
echo "步骤 5: 验证更新..."
echo "测试 /api/health 端点:"
curl -s http://localhost:3002/api/health && echo "" || echo "❌ 健康检查失败"
echo ""

echo "========================================"
echo "✅ 更新完成！"
echo "========================================"





