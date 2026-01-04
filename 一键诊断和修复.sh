#!/bin/bash

# 一键诊断和修复登录网络错误

echo "正在连接到服务器进行诊断和修复..."
echo ""

ssh ubuntu@119.45.121.152 bash << 'REMOTE_SCRIPT'
set -e

cd /var/www/aigc-agent

echo "=========================================="
echo "  诊断和修复登录网络错误"
echo "=========================================="
echo ""

# 1. 配置 Node.js PATH
echo "[1/6] 配置 Node.js PATH..."
export PATH="/home/ubuntu/.nvm/versions/node/v20.19.6/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi
echo "   ✅ Node.js: $(node --version 2>/dev/null || echo '未找到')"
echo ""

# 2. 检查 PM2 服务状态
echo "[2/6] 检查 PM2 服务状态..."
pm2 status aigc-agent || echo "   ⚠️  PM2 服务不存在"
echo ""

# 3. 检查语法错误
echo "[3/6] 检查语法错误..."
cd server
ERRORS=0
ERROR_FILES=""
for file in index.js services/*.js; do
    if [ -f "$file" ]; then
        if ! node --check "$file" > /dev/null 2>&1; then
            echo "   ❌ 语法错误: $file"
            node --check "$file" 2>&1 | head -3
            ERRORS=$((ERRORS + 1))
            ERROR_FILES="$ERROR_FILES $file"
        fi
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "   ✅ 所有文件语法正确"
else
    echo "   ❌ 发现 $ERRORS 个语法错误"
fi
echo ""

# 4. 重启服务（如果语法正确）
if [ $ERRORS -eq 0 ]; then
    echo "[4/6] 重启后端服务..."
    pm2 restart aigc-agent || pm2 start server/index.js --name aigc-agent
    sleep 3
    echo "   ✅ 服务已重启"
else
    echo "[4/6] 跳过重启（存在语法错误）"
fi
echo ""

# 5. 检查服务状态
echo "[5/6] 检查服务状态..."
pm2 status aigc-agent
echo ""

# 6. 测试服务连接
echo "[6/6] 测试服务连接..."
sleep 2
if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "   ✅ 后端服务正常运行"
    curl -s http://localhost:3002/api/health | head -3
else
    echo "   ❌ 后端服务无法连接"
    echo "   查看错误日志："
    pm2 logs aigc-agent --lines 10 --err --nostream | tail -5
fi
echo ""

echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ 诊断完成，服务应该正常运行"
else
    echo "❌ 发现语法错误，需要先修复："
    echo "$ERROR_FILES"
fi
echo "=========================================="

REMOTE_SCRIPT

echo ""
echo "诊断完成！"




