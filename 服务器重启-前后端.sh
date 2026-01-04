#!/bin/bash

# 服务器重启脚本：拉取最新代码并重启前后端

echo "=========================================="
echo "开始重启前后端服务"
echo "=========================================="

# 1. 查找项目目录
PROJECT_DIR=""
if [ -d "/home/ubuntu/AIGC-jubianage-agent" ]; then
    PROJECT_DIR="/home/ubuntu/AIGC-jubianage-agent"
elif [ -d "$HOME/AIGC-jubianage-agent" ]; then
    PROJECT_DIR="$HOME/AIGC-jubianage-agent"
elif [ -d "/root/AIGC-jubianage-agent" ]; then
    echo "⚠️  项目在/root目录，需要使用sudo权限"
    PROJECT_DIR="/root/AIGC-jubianage-agent"
else
    echo "❌ 未找到项目目录，请手动指定路径"
    exit 1
fi

echo "✅ 找到项目目录: $PROJECT_DIR"

# 2. 进入项目目录
if [ "$PROJECT_DIR" == "/root/AIGC-jubianage-agent" ]; then
    echo "使用sudo权限访问/root目录..."
    sudo su - <<EOF
cd $PROJECT_DIR

# 拉取最新代码
echo ""
echo "📥 拉取最新代码..."
git pull origin main

# 构建前端
echo ""
echo "🔨 构建前端..."
cd src
npm install
npm run build
cd ..

# 重启后端
echo ""
echo "🔄 重启后端服务..."
cd server
npm install
cd ..
pm2 restart AIGC-jubianage-agent || pm2 start server/index.js --name AIGC-jubianage-agent

# 检查状态
echo ""
echo "📊 检查服务状态..."
pm2 status
EOF
else
    cd "$PROJECT_DIR" || exit 1

    # 3. 拉取最新代码
    echo ""
    echo "📥 拉取最新代码..."
    git pull origin main

    if [ $? -ne 0 ]; then
        echo "❌ Git拉取失败"
        exit 1
    fi

    echo "✅ 代码拉取成功"

    # 4. 构建前端
    echo ""
    echo "🔨 构建前端..."
    cd src || exit 1
    npm install
    npm run build

    if [ $? -ne 0 ]; then
        echo "❌ 前端构建失败"
        exit 1
    fi

    echo "✅ 前端构建成功"

    # 5. 返回项目根目录
    cd ..

    # 6. 安装后端依赖（如果需要）
    echo ""
    echo "📦 检查后端依赖..."
    cd server || exit 1
    npm install
    cd ..

    # 7. 重启后端服务
    echo ""
    echo "🔄 重启后端服务..."
    pm2 restart AIGC-jubianage-agent || pm2 start server/index.js --name AIGC-jubianage-agent

    if [ $? -ne 0 ]; then
        echo "❌ 后端服务重启失败"
        exit 1
    fi

    echo "✅ 后端服务已重启"

    # 8. 检查服务状态
    echo ""
    echo "📊 检查服务状态..."
    pm2 status

    # 9. 显示日志（最近50行）
    echo ""
    echo "📋 后端服务日志（最近50行）："
    pm2 logs AIGC-jubianage-agent --lines 50 --nostream
fi

echo ""
echo "=========================================="
echo "✅ 前后端重启完成！"
echo "=========================================="
echo ""
echo "前端构建文件位置: $PROJECT_DIR/src/dist"
echo "后端服务状态: pm2 status"
echo "查看后端实时日志: pm2 logs AIGC-jubianage-agent"
echo ""

