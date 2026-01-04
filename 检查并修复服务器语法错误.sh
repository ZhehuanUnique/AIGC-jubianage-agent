#!/bin/bash

# 检查并修复服务器语法错误

echo "=========================================="
echo "  检查并修复服务器语法错误"
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

echo "✅ Node.js 版本: $(node --version 2>/dev/null || echo '未找到')"
echo ""

echo "2. 检查所有服务文件的语法..."
cd server

ERROR_COUNT=0
ERROR_FILES=""

for file in services/*.js index.js; do
    if [ -f "$file" ]; then
        echo "  检查: $file"
        if node --check "$file" > /dev/null 2>&1; then
            echo "    ✅ 语法正确"
        else
            echo "    ❌ 语法错误"
            node --check "$file" 2>&1 | head -5
            ERROR_COUNT=$((ERROR_COUNT + 1))
            ERROR_FILES="$ERROR_FILES $file"
        fi
    fi
done

echo ""
if [ $ERROR_COUNT -eq 0 ]; then
    echo "✅ 所有文件语法检查通过"
    echo ""
    echo "3. 检查 PM2 服务状态..."
    pm2 status
    echo ""
    echo "4. 重启服务..."
    pm2 restart aigc-agent
    echo ""
    echo "5. 查看服务日志..."
    sleep 2
    pm2 logs aigc-agent --lines 20 --nostream
else
    echo "❌ 发现 $ERROR_COUNT 个文件有语法错误："
    echo "$ERROR_FILES"
    echo ""
    echo "请修复这些文件中的语法错误"
fi

ENDSSH

echo ""
echo "=========================================="
echo "  检查完成"
echo "=========================================="




