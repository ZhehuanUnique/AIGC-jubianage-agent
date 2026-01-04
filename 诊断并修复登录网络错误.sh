#!/bin/bash

# 诊断并修复登录网络错误

echo "=========================================="
echo "  诊断并修复登录网络错误"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "1. 配置 Node.js PATH..."
export PATH="/home/ubuntu/.nvm/versions/node/v20.19.6/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

echo "   Node.js 版本: $(node --version 2>/dev/null || echo '未找到')"
echo ""

echo "2. 检查 PM2 服务状态..."
pm2 status aigc-agent
echo ""

echo "3. 查看最近的错误日志..."
pm2 logs aigc-agent --lines 30 --err --nostream | tail -20
echo ""

echo "4. 检查语法错误..."
cd server

ERROR_FOUND=false
for file in index.js services/*.js; do
    if [ -f "$file" ]; then
        if ! node --check "$file" > /dev/null 2>&1; then
            echo "   ❌ 语法错误: $file"
            node --check "$file" 2>&1 | head -3
            ERROR_FOUND=true
        fi
    fi
done

if [ "$ERROR_FOUND" = false ]; then
    echo "   ✅ 所有文件语法正确"
fi

echo ""
echo "5. 测试后端服务连接..."
if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "   ✅ 后端服务正常运行"
    curl -s http://localhost:3002/api/health
else
    echo "   ❌ 后端服务无法连接"
    echo "   尝试重启服务..."
    pm2 restart aigc-agent
    sleep 3
    if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
        echo "   ✅ 服务重启成功"
    else
        echo "   ❌ 服务重启失败，查看日志："
        pm2 logs aigc-agent --lines 20 --err --nostream
    fi
fi

echo ""
echo "6. 检查 Nginx 配置..."
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx 正在运行"
else
    echo "   ❌ Nginx 未运行，尝试启动..."
    sudo systemctl start nginx
fi

echo ""
echo "7. 测试外部访问..."
if curl -s http://localhost/api/health > /dev/null 2>&1; then
    echo "   ✅ 通过 Nginx 可以访问"
else
    echo "   ⚠️  通过 Nginx 无法访问"
fi

ENDSSH

echo ""
echo "=========================================="
echo "  诊断完成"
echo "=========================================="




