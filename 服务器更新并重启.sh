#!/bin/bash

# 服务器更新代码并重启服务

echo "正在连接到服务器更新代码并重启服务..."
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

# 配置 PATH
export PATH="/home/ubuntu/.nvm/versions/node/v20.19.6/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

echo "1. 拉取最新代码..."
git fetch origin
git reset --hard origin/main
echo "  ✅ 代码已更新"

echo ""
echo "2. 检查语法..."
cd server
if node --check index.js > /dev/null 2>&1; then
    echo "  ✅ 语法检查通过"
    
    echo ""
    echo "3. 重启服务..."
    pm2 restart aigc-agent
    sleep 3
    
    echo ""
    echo "4. 检查服务状态..."
    pm2 status aigc-agent
    
    echo ""
    echo "5. 测试服务..."
    if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
        echo "  ✅ 服务正常运行"
        curl -s http://localhost:3002/api/health
    else
        echo "  ❌ 服务异常，查看日志："
        pm2 logs aigc-agent --lines 10 --err --nostream | tail -5
    fi
else
    echo "  ❌ 仍有语法错误"
    node --check index.js 2>&1 | head -5
fi

ENDSSH

echo ""
echo "完成！"




