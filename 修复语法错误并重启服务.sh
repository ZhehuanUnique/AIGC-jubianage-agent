#!/bin/bash

echo "=========================================="
echo "  修复语法错误并重启服务"
echo "=========================================="
echo ""

# 连接到服务器并执行修复
ssh ubuntu@119.45.121.152 << 'EOF'
cd /var/www/aigc-agent

echo "1. 检查代码语法..."
cd server
node --check index.js 2>&1 | head -20 || echo "语法检查完成"

echo ""
echo "2. 检查服务文件语法..."
for file in services/*.js; do
    if node --check "$file" 2>&1 | grep -q "SyntaxError"; then
        echo "❌ 发现语法错误: $file"
        node --check "$file" 2>&1 | head -5
    fi
done

echo ""
echo "3. 拉取最新代码..."
git pull origin main || echo "Git pull 失败或无需更新"

echo ""
echo "4. 重启服务..."
pm2 restart aigc-agent

echo ""
echo "5. 等待服务启动（5秒）..."
sleep 5

echo ""
echo "6. 检查服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "7. 测试健康检查..."
if curl -s --max-time 5 http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务已恢复！"
    curl -s http://localhost:3002/api/health
else
    echo "❌ 后端服务仍未恢复"
    echo ""
    echo "查看详细日志："
    pm2 logs aigc-agent --lines 30 --nostream
fi

EOF

echo ""
echo "=========================================="
echo "  修复完成"
echo "=========================================="




