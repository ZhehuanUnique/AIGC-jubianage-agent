#!/bin/bash

# 修复服务器上的语法错误

echo "正在连接到服务器修复语法错误..."
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

# 配置 PATH
export PATH="/home/ubuntu/.nvm/versions/node/v20.19.6/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

echo "1. 检查语法错误..."
cd server

# 检查所有文件
ERRORS=0
for file in index.js services/*.js; do
    if [ -f "$file" ]; then
        if ! node --check "$file" > /dev/null 2>&1; then
            echo "  ❌ 语法错误: $file"
            node --check "$file" 2>&1 | head -5
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "  ✅ 所有文件语法正确"
    echo ""
    echo "2. 从 GitHub 拉取最新代码..."
    git fetch origin
    git reset --hard origin/main
    echo "  ✅ 代码已更新"
    echo ""
    echo "3. 重新检查语法..."
    ERRORS=0
    for file in index.js services/*.js; do
        if [ -f "$file" ]; then
            if ! node --check "$file" > /dev/null 2>&1; then
                echo "  ❌ 语法错误: $file"
                node --check "$file" 2>&1 | head -5
                ERRORS=$((ERRORS + 1))
            fi
        fi
    done
    
    if [ $ERRORS -eq 0 ]; then
        echo "  ✅ 语法检查通过"
        echo ""
        echo "4. 重启服务..."
        pm2 restart aigc-agent
        sleep 3
        echo ""
        echo "5. 检查服务状态..."
        pm2 status aigc-agent
        echo ""
        echo "6. 测试服务..."
        curl -s http://localhost:3002/api/health && echo "✅ 服务正常" || echo "❌ 服务异常"
    else
        echo "  ❌ 仍有 $ERRORS 个语法错误"
        echo "  请检查并修复这些文件"
    fi
else
    echo "  ❌ 发现 $ERRORS 个语法错误"
    echo "  建议从 GitHub 拉取最新代码："
    echo "  git fetch origin"
    echo "  git reset --hard origin/main"
fi

ENDSSH

echo ""
echo "修复完成！"




