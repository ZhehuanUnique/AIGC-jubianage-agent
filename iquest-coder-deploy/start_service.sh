#!/bin/bash

# 启动 IQuest-Coder 服务

set -e

echo "🚀 启动 IQuest-Coder-V1-40B API 服务..."

# 激活虚拟环境
source /opt/iquest-coder-env/bin/activate

# 使用 PM2 启动服务
cd /opt/iquest-coder
pm2 start ecosystem.config.js

echo ""
echo "✅ 服务已启动！"
echo ""
echo "📊 查看状态: pm2 status"
echo "📝 查看日志: pm2 logs iquest-coder"
echo "🔄 重启服务: pm2 restart iquest-coder"
echo "🛑 停止服务: pm2 stop iquest-coder"
echo ""
echo "🌐 API 地址: http://localhost:8000"
echo "📖 API 文档: http://localhost:8000/docs"
echo ""
