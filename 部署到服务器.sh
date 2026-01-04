#!/bin/bash

# 部署脚本：拉取最新代码并重新部署前后端

echo "=========================================="
echo "开始部署流程"
echo "=========================================="

# 1. 进入项目目录
cd /root/AIGC-jubianage-agent || exit 1

# 2. 拉取最新代码
echo ""
echo "📥 拉取最新代码..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git拉取失败"
    exit 1
fi

echo "✅ 代码拉取成功"

# 3. 安装前端依赖（如果需要）
echo ""
echo "📦 检查前端依赖..."
cd src || exit 1
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        exit 1
    fi
    echo "✅ 前端依赖安装完成"
else
    echo "✅ 前端依赖已是最新"
fi

# 4. 构建前端
echo ""
echo "🔨 构建前端..."
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
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
    echo "✅ 后端依赖安装完成"
else
    echo "✅ 后端依赖已是最新"
fi

# 7. 重启后端服务（使用PM2）
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

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "前端构建文件位置: src/dist"
echo "后端服务状态: pm2 status"
echo "查看后端日志: pm2 logs AIGC-jubianage-agent"
echo ""

