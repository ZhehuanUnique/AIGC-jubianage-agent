#!/bin/bash

# 部署到服务器脚本
# 使用方法: ./部署到服务器.sh

echo "🚀 开始部署到服务器..."

# 1. 构建前端
echo "📦 构建前端..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败"
    exit 1
fi

echo "✅ 前端构建成功"

# 2. 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  检测到未提交的更改，正在提交..."
    git add -A
    git commit -m "feat: 更新代码并部署到服务器"
    git push
    echo "✅ 代码已提交到 GitHub"
else
    echo "✅ 没有未提交的更改"
fi

# 3. 部署到服务器（通过 SSH）
echo "📤 部署到服务器..."
SERVER_USER="root"
SERVER_HOST="your-server-ip"
SERVER_PATH="/var/www/aigc-agent"

# 使用 rsync 同步文件
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    ./ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/

# 4. 在服务器上重启服务
echo "🔄 重启服务器服务..."
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
cd /var/www/aigc-agent
pm2 restart aigc-agent || pm2 start server/index.js --name aigc-agent
EOF

echo "✅ 部署完成！"

