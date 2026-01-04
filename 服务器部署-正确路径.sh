#!/bin/bash

# 服务器部署脚本（适用于ubuntu用户）
# 注意：项目可能不在/root目录，需要先找到正确的路径

echo "=========================================="
echo "开始部署流程"
echo "=========================================="

# 1. 查找项目目录（可能在多个位置）
PROJECT_DIR=""

# 检查常见位置
if [ -d "/home/ubuntu/AIGC-jubianage-agent" ]; then
    PROJECT_DIR="/home/ubuntu/AIGC-jubianage-agent"
elif [ -d "~/AIGC-jubianage-agent" ]; then
    PROJECT_DIR="~/AIGC-jubianage-agent"
elif [ -d "$HOME/AIGC-jubianage-agent" ]; then
    PROJECT_DIR="$HOME/AIGC-jubianage-agent"
elif [ -d "/root/AIGC-jubianage-agent" ]; then
    # 如果需要访问/root目录，需要使用sudo
    echo "⚠️  项目在/root目录，需要使用sudo权限"
    PROJECT_DIR="/root/AIGC-jubianage-agent"
else
    echo "❌ 未找到项目目录，请手动指定路径"
    echo "常见位置："
    echo "  - /home/ubuntu/AIGC-jubianage-agent"
    echo "  - ~/AIGC-jubianage-agent"
    echo "  - /root/AIGC-jubianage-agent (需要sudo)"
    exit 1
fi

echo "✅ 找到项目目录: $PROJECT_DIR"

# 2. 进入项目目录
if [ "$PROJECT_DIR" == "/root/AIGC-jubianage-agent" ]; then
    echo "使用sudo权限访问/root目录..."
    cd "$PROJECT_DIR" || exit 1
else
    cd "$PROJECT_DIR" || exit 1
fi

# 3. 拉取最新代码
echo ""
echo "📥 拉取最新代码..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git拉取失败"
    exit 1
fi

echo "✅ 代码拉取成功"

# 4. 安装前端依赖
echo ""
echo "📦 安装前端依赖..."
cd src || exit 1
npm install

if [ $? -ne 0 ]; then
    echo "❌ 前端依赖安装失败"
    exit 1
fi

echo "✅ 前端依赖安装完成"

# 5. 构建前端
echo ""
echo "🔨 构建前端..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败"
    exit 1
fi

echo "✅ 前端构建成功"

# 6. 返回项目根目录
cd ..

# 7. 安装后端依赖
echo ""
echo "📦 安装后端依赖..."
cd server || exit 1
npm install

if [ $? -ne 0 ]; then
    echo "❌ 后端依赖安装失败"
    exit 1
fi

echo "✅ 后端依赖安装完成"

# 8. 重启后端服务（使用PM2）
echo ""
echo "🔄 重启后端服务..."
pm2 restart AIGC-jubianage-agent || pm2 start server/index.js --name AIGC-jubianage-agent

if [ $? -ne 0 ]; then
    echo "❌ 后端服务重启失败"
    exit 1
fi

echo "✅ 后端服务已重启"

# 9. 检查服务状态
echo ""
echo "📊 检查服务状态..."
pm2 status

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "前端构建文件位置: $PROJECT_DIR/src/dist"
echo "后端服务状态: pm2 status"
echo "查看后端日志: pm2 logs AIGC-jubianage-agent"
echo ""

