#!/bin/bash

# 快速重启后端服务

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

# 配置 PATH
export PATH="/home/ubuntu/.nvm/versions/node/v20.19.6/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

echo "重启后端服务..."
pm2 restart aigc-agent

echo ""
echo "等待服务启动..."
sleep 3

echo ""
echo "检查服务状态..."
pm2 status aigc-agent

echo ""
echo "查看最新日志..."
pm2 logs aigc-agent --lines 20 --nostream

echo ""
echo "测试健康检查..."
curl -s http://localhost:3002/api/health || echo "服务未响应"

ENDSSH




