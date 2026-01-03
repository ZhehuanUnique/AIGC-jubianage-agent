#!/bin/bash

echo "========================================"
echo "检查服务器部署状态"
echo "========================================"
echo ""

SERVER_USER="ubuntu"
SERVER_HOST="119.45.121.152"
SERVER_PATH="/var/www/aigc-agent"

# 1. 检查 SSH 连接
echo "[1/6] 检查 SSH 连接..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 "$SERVER_USER@$SERVER_HOST" "echo 'OK'" >/dev/null 2>&1; then
    echo "✅ SSH 连接成功"
else
    echo "❌ SSH 连接失败"
    exit 1
fi
echo ""

# 2. 检查 Git 状态
echo "[2/6] 检查 Git 状态..."
echo "当前分支和最新提交:"
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git branch --show-current && git log --oneline -1"
echo ""

echo "检查是否有未拉取的更新:"
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git fetch origin 2>&1"
UNPULLED=$(ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git log HEAD..origin/main --oneline")
if [ -z "$UNPULLED" ]; then
    echo "✅ 代码已是最新"
else
    echo "⚠️  有未拉取的更新:"
    echo "$UNPULLED"
fi
echo ""

# 3. 检查关键文件
echo "[3/6] 检查关键文件..."
FILES=("README.md" "完整更新服务器.sh" "通过SSH部署到服务器.ps1" "修复Milvus重启问题.bat")
for file in "${FILES[@]}"; do
    if ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && test -f '$file' && echo '存在' || echo '不存在'" | grep -q "存在"; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (不存在)"
    fi
done
echo ""

# 4. 检查 dist 目录
echo "[4/6] 检查前端构建..."
if ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && test -d dist && echo '存在' || echo '不存在'" | grep -q "存在"; then
    echo "✅ dist 目录存在"
    DIST_TIME=$(ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && stat -c '%y' dist/index.html 2>/dev/null || stat -f '%Sm' dist/index.html 2>/dev/null")
    echo "  构建时间: $DIST_TIME"
else
    echo "❌ dist 目录不存在"
fi
echo ""

# 5. 检查 PM2 服务
echo "[5/6] 检查 PM2 服务..."
PM2_STATUS=$(ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH/server && pm2 status aigc-agent --no-color")
echo "$PM2_STATUS"
if echo "$PM2_STATUS" | grep -q "online"; then
    echo "✅ PM2 服务运行正常"
else
    echo "⚠️  PM2 服务可能未正常运行"
fi
echo ""

# 6. 检查后端健康状态
echo "[6/6] 检查后端健康状态..."
HEALTH_CHECK=$(ssh "$SERVER_USER@$SERVER_HOST" "curl -s http://localhost:3002/api/health")
if echo "$HEALTH_CHECK" | grep -q "ok\|status"; then
    echo "✅ 后端服务健康检查通过"
    echo "  响应: $HEALTH_CHECK"
else
    echo "❌ 后端服务健康检查失败"
    echo "  响应: $HEALTH_CHECK"
fi
echo ""

echo "========================================"
echo "检查完成"
echo "========================================"
echo ""

