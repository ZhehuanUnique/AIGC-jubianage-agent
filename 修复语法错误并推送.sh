#!/bin/bash

# 修复语法错误并推送到 GitHub

echo "=========================================="
echo "  修复语法错误并推送到 GitHub"
echo "=========================================="
echo ""

cd C:\Users\Administrator\Desktop\AIGC-jubianage-agent

echo "1. 检查语法..."
cd server
if node --check index.js > /dev/null 2>&1; then
    echo "  ✅ 语法检查通过"
    cd ..
    
    echo ""
    echo "2. 提交并推送到 GitHub..."
    git add server/index.js
    git commit -m "修复 index.js 中的 TypeScript 类型注解语法错误"
    git push origin main
    
    echo ""
    echo "✅ 已修复并推送到 GitHub"
    echo ""
    echo "3. 现在可以在服务器上执行："
    echo "   cd /var/www/aigc-agent"
    echo "   git pull origin main"
    echo "   pm2 restart aigc-agent"
else
    echo "  ❌ 仍有语法错误"
    node --check index.js
fi




