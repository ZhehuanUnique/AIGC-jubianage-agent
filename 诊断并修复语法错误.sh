#!/bin/bash

echo "=========================================="
echo "  诊断并修复语法错误"
echo "=========================================="
echo ""

# 连接到服务器并执行诊断
ssh ubuntu@119.45.121.152 << 'EOF'
cd /var/www/aigc-agent/server

echo "1. 检查主文件语法..."
if node --check index.js 2>&1; then
    echo "✅ index.js 语法正确"
else
    echo "❌ index.js 有语法错误"
    node --check index.js 2>&1 | head -10
fi

echo ""
echo "2. 检查所有服务文件语法..."
for file in services/*.js; do
    if [ -f "$file" ]; then
        if node --check "$file" 2>&1 | grep -q "SyntaxError"; then
            echo "❌ 发现语法错误: $file"
            node --check "$file" 2>&1 | head -5
        fi
    fi
done

echo ""
echo "3. 检查是否有未初始化的 const 声明..."
grep -rn "const [a-zA-Z_$][a-zA-Z0-9_$]*[;,]$\|const [a-zA-Z_$][a-zA-Z0-9_$]*$" services/ 2>/dev/null | head -10 || echo "未找到明显的未初始化 const 声明"

echo ""
echo "4. 检查文件末尾是否有问题..."
for file in services/*.js; do
    if [ -f "$file" ]; then
        # 检查文件末尾是否有问题
        last_line=$(tail -1 "$file")
        if [[ "$last_line" =~ ^[[:space:]]*const[[:space:]]+[a-zA-Z_$] ]]; then
            echo "⚠️ 文件末尾可能是未完成的 const 声明: $file"
            tail -3 "$file"
        fi
    fi
done

echo ""
echo "5. 尝试修复：拉取最新代码..."
cd /var/www/aigc-agent
git pull origin main || echo "Git pull 失败或无需更新"

echo ""
echo "6. 重启服务..."
cd server
pm2 restart aigc-agent

echo ""
echo "7. 等待服务启动（5秒）..."
sleep 5

echo ""
echo "8. 检查服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "9. 查看最新错误日志..."
pm2 logs aigc-agent --err --lines 10 --nostream

EOF

echo ""
echo "=========================================="
echo "  诊断完成"
echo "=========================================="




