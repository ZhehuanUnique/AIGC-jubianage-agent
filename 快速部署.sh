#!/bin/bash

# 快速部署脚本
# 使用方法: bash 快速部署.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🚀 开始部署剧变时代Agent到服务器"
echo "=========================================="

# 配置服务器信息（请根据实际情况修改）
SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-your-server-ip}"
SERVER_PATH="${SERVER_PATH:-/var/www/aigc-agent}"

# 1. 检查 Git 状态
echo ""
echo "📋 步骤 1: 检查 Git 状态..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  检测到未提交的更改"
    read -p "是否提交更改到 GitHub? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add -A
        git commit -m "feat: 修改创作指引按钮直接打开飞书文档链接，添加使用指南文档"
        echo "📤 推送到 GitHub..."
        git push origin main
        echo "✅ 代码已推送到 GitHub"
    else
        echo "⚠️  跳过 Git 提交"
    fi
else
    echo "✅ 没有未提交的更改"
fi

# 2. 构建前端
echo ""
echo "📦 步骤 2: 构建前端..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败"
    exit 1
fi
echo "✅ 前端构建成功"

# 3. 部署到服务器
echo ""
echo "📤 步骤 3: 部署到服务器..."
echo "服务器: $SERVER_USER@$SERVER_HOST:$SERVER_PATH"

# 检查服务器连接
if ! ssh -o ConnectTimeout=5 $SERVER_USER@$SERVER_HOST "echo '连接成功'" 2>/dev/null; then
    echo "❌ 无法连接到服务器，请检查配置"
    exit 1
fi

# 同步前端文件
echo "📤 同步前端文件..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    dist/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/dist/

# 同步服务器代码（如果需要）
read -p "是否同步服务器代码? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 同步服务器代码..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.env' \
        server/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/server/
fi

# 4. 在服务器上执行部署后操作
echo ""
echo "🔄 步骤 4: 重启服务..."
ssh $SERVER_USER@$SERVER_HOST << EOF
cd $SERVER_PATH

# 拉取最新代码（如果使用 Git）
if [ -d .git ]; then
    echo "📥 拉取最新代码..."
    git pull origin main || true
fi

# 安装依赖（如果需要）
if [ -f server/package.json ]; then
    echo "📦 检查服务器依赖..."
    cd server
    npm install --production
    cd ..
fi

# 重启 PM2 服务
echo "🔄 重启 PM2 服务..."
pm2 restart aigc-agent || pm2 start server/index.js --name aigc-agent

# 检查服务状态
echo "📊 服务状态:"
pm2 status aigc-agent
EOF

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "📝 验证步骤:"
echo "1. 访问网站首页"
echo "2. 点击导航栏的'创作指引'按钮"
echo "3. 确认是否在新标签页中打开了飞书文档链接"
echo ""

