#!/bin/bash

# 更新代码到 GitHub 并部署到服务器

echo "=========================================="
echo "  更新代码到 GitHub 并部署"
echo "=========================================="
echo ""

# 1. 检查本地代码语法
echo "1. 检查本地代码语法..."
cd server
ERRORS=0
for file in index.js services/*.js; do
    if [ -f "$file" ]; then
        if ! node --check "$file" > /dev/null 2>&1; then
            echo "  ❌ 语法错误: $file"
            node --check "$file" 2>&1 | head -3
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

if [ $ERRORS -gt 0 ]; then
    echo "  ❌ 发现 $ERRORS 个语法错误，请先修复"
    exit 1
fi

echo "  ✅ 本地代码语法正确"
cd ..

# 2. 提交并推送到 GitHub
echo ""
echo "2. 提交并推送到 GitHub..."
git add .
git commit -m "修复语法错误，确保服务正常运行" || echo "没有更改需要提交"
git push origin main

echo "  ✅ 代码已推送到 GitHub"

# 3. 部署到服务器
echo ""
echo "3. 部署到服务器..."
ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

# 配置 PATH
export PATH="/home/ubuntu/.nvm/versions/node/v20.19.6/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

echo "  拉取最新代码..."
git fetch origin
git reset --hard origin/main

echo "  检查语法..."
cd server
ERRORS=0
for file in index.js services/*.js; do
    if [ -f "$file" ]; then
        if ! node --check "$file" > /dev/null 2>&1; then
            echo "    ❌ 语法错误: $file"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "  ✅ 语法检查通过"
    echo "  重启服务..."
    pm2 restart aigc-agent
    sleep 3
    echo "  检查服务状态..."
    pm2 status aigc-agent
    echo "  测试服务..."
    curl -s http://localhost:3002/api/health && echo "✅ 服务正常" || echo "❌ 服务异常"
else
    echo "  ❌ 仍有 $ERRORS 个语法错误"
fi

ENDSSH

echo ""
echo "=========================================="
echo "  部署完成"
echo "=========================================="




