#!/bin/bash

echo "=========================================="
echo "  检查修复状态"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'EOF'
# 加载环境变量
export PATH="$PATH:/usr/local/bin:/usr/bin"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "1. 检查 Node.js 和 PM2..."
which node || echo "  ⚠️ node 未找到，尝试使用 /usr/bin/node"
which pm2 || echo "  ⚠️ pm2 未找到，尝试使用 npx pm2"

NODE_CMD=$(which node || echo "/usr/bin/node")
PM2_CMD=$(which pm2 || echo "npx pm2")

echo "  使用 Node.js: $NODE_CMD"
echo "  使用 PM2: $PM2_CMD"

echo ""
echo "2. 检查服务状态..."
$PM2_CMD list 2>/dev/null | grep aigc-agent || echo "  ⚠️ 服务未运行或 PM2 未找到"

echo ""
echo "3. 检查端口占用..."
if lsof -i :3002 > /dev/null 2>&1; then
    echo "  ✅ 端口 3002 已被占用"
    lsof -i :3002 | head -3
else
    echo "  ❌ 端口 3002 未被占用"
fi

echo ""
echo "4. 测试后端服务健康检查..."
if curl -s --max-time 5 http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "  ✅ 后端服务健康检查通过"
    curl -s http://localhost:3002/api/health | head -3
else
    echo "  ❌ 后端服务健康检查失败"
fi

echo ""
echo "5. 检查代码版本..."
cd /var/www/aigc-agent
echo "  当前提交: $(git log --oneline -1 2>/dev/null || echo '无法获取')"
echo "  是否有未提交更改: $(git status --short 2>/dev/null | wc -l) 个文件"

echo ""
echo "6. 检查 musicStorageService.js 是否已修复..."
cd server
if grep -q "pool.default || pool" services/musicStorageService.js 2>/dev/null; then
    echo "  ✅ musicStorageService.js 已包含修复代码"
else
    echo "  ❌ musicStorageService.js 可能未更新"
fi

echo ""
echo "7. 检查语法错误（如果 Node.js 可用）..."
if $NODE_CMD --version > /dev/null 2>&1; then
    echo "  检查 index.js..."
    if $NODE_CMD --check index.js 2>&1 | grep -q "SyntaxError"; then
        echo "  ❌ index.js 有语法错误"
        $NODE_CMD --check index.js 2>&1 | head -5
    else
        echo "  ✅ index.js 语法正确"
    fi
else
    echo "  ⚠️ 无法检查语法（Node.js 不可用）"
fi

echo ""
echo "8. 查看最新错误日志（如果 PM2 可用）..."
if $PM2_CMD list > /dev/null 2>&1; then
    $PM2_CMD logs aigc-agent --err --lines 5 --nostream 2>&1 | tail -10 || echo "  无法获取日志"
else
    echo "  ⚠️ 无法获取日志（PM2 不可用）"
fi

EOF

echo ""
echo "=========================================="
echo "  检查完成"
echo "=========================================="




