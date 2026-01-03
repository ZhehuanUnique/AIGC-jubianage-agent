#!/bin/bash

echo "========================================"
echo "更新服务器端代码"
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

# 2. 检查当前 Git 状态
echo "[2/6] 检查当前 Git 状态..."
echo "当前分支和状态:"
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git branch --show-current && git status --short"
echo ""

# 3. 拉取最新代码
echo "[3/6] 拉取最新代码..."
PULL_OUTPUT=$(ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git pull origin main" 2>&1)
echo "$PULL_OUTPUT"
if [ $? -eq 0 ]; then
    echo "✅ 代码已更新"
else
    echo "⚠️  拉取代码时可能有警告"
fi
echo ""

# 4. 检查最新提交
echo "[4/6] 检查最新提交..."
echo "最新 3 个提交:"
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git log --oneline -3"
echo ""

# 5. 检查关键文件
echo "[5/6] 检查关键文件..."
FILES=("README.md" "完整更新服务器.sh" "通过SSH部署到服务器.ps1" "修复Milvus重启问题.bat")
for file in "${FILES[@]}"; do
    if ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && test -f '$file' && echo '存在' || echo '不存在'" | grep -q "存在"; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (不存在)"
    fi
done
echo ""

# 6. 执行完整更新
echo "[6/6] 执行完整更新..."
echo "正在执行更新脚本..."
UPDATE_OUTPUT=$(ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && bash 完整更新服务器.sh" 2>&1)
echo "$UPDATE_OUTPUT"
echo ""

# 7. 验证服务状态
echo "========================================"
echo "验证服务状态"
echo "========================================"
echo ""

echo "PM2 服务状态:"
PM2_STATUS=$(ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH/server && pm2 status aigc-agent --no-color" 2>&1)
echo "$PM2_STATUS"
if echo "$PM2_STATUS" | grep -q "online"; then
    echo "✅ PM2 服务运行正常"
else
    echo "⚠️  PM2 服务可能未正常运行"
fi
echo ""

echo "后端健康检查:"
HEALTH_CHECK=$(ssh "$SERVER_USER@$SERVER_HOST" "curl -s http://localhost:3002/api/health" 2>&1)
if echo "$HEALTH_CHECK" | grep -q "ok\|status"; then
    echo "✅ 后端服务健康检查通过"
    echo "  响应: $HEALTH_CHECK"
else
    echo "❌ 后端服务健康检查失败"
    echo "  响应: $HEALTH_CHECK"
fi
echo ""

echo "========================================"
echo "✅ 更新完成！"
echo "========================================"
echo ""
echo "💡 提示："
echo "   - 访问网站: https://www.jubianai.cn"
echo "   - 查看日志: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH/server && pm2 logs aigc-agent'"
echo ""

