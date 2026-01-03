#!/bin/bash

echo "========================================"
echo "检查并强制更新服务器端代码"
echo "========================================"
echo ""

SERVER_USER="ubuntu"
SERVER_HOST="119.45.121.152"
SERVER_PATH="/var/www/aigc-agent"

# 1. 检查当前状态
echo "[1/6] 检查当前状态..."
echo "本地最新提交:"
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git log --oneline -1"
echo ""

echo "远程最新提交:"
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git fetch origin 2>&1 && git log origin/main --oneline -1"
echo ""

echo "检查是否有未拉取的更新:"
UNPULLED=$(ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git log HEAD..origin/main --oneline")
if [ -z "$UNPULLED" ]; then
    echo "✅ 代码已是最新"
else
    echo "⚠️  有未拉取的更新:"
    echo "$UNPULLED"
fi
echo ""

# 2. 检查积分充值代码
echo "[2/6] 检查积分充值代码..."
echo "检查 NavigationBar.tsx:"
CREDIT_CODE=$(ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && grep -n '积分充值\|credit-recharge' src/components/NavigationBar.tsx 2>&1 | head -5")
echo "$CREDIT_CODE"
echo ""

# 3. 强制拉取最新代码
echo "[3/6] 强制拉取最新代码..."
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git fetch origin && git reset --hard origin/main"
echo "✅ 代码已强制更新"
echo ""

# 4. 验证代码更新
echo "[4/6] 验证代码更新..."
echo "最新提交:"
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git log --oneline -3"
echo ""

# 5. 清理并重新构建前端
echo "[5/6] 清理并重新构建前端..."
echo "正在构建（这可能需要几分钟）..."
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && rm -rf dist node_modules/.vite && npm run build"
if [ $? -eq 0 ]; then
    echo "✅ 前端构建完成"
else
    echo "⚠️  构建可能有问题，请检查"
fi
echo ""

# 6. 重启服务并设置权限
echo "[6/6] 重启服务并设置权限..."
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && sudo chown -R ubuntu:ubuntu dist/ && cd server && pm2 restart aigc-agent && cd .. && sudo systemctl reload nginx"
echo "✅ 服务已重启"
echo ""

# 7. 验证服务
echo "========================================"
echo "验证服务状态"
echo "========================================"
echo ""

echo "PM2 服务状态:"
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH/server && pm2 status aigc-agent --no-color"
echo ""

echo "后端健康检查:"
HEALTH_CHECK=$(ssh "$SERVER_USER@$SERVER_HOST" "curl -s http://localhost:3002/api/health" 2>&1)
echo "$HEALTH_CHECK"
echo ""

echo "检查构建文件中的积分充值:"
DIST_CHECK=$(ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && grep -r '积分充值' dist/ 2>&1 | head -2")
echo "$DIST_CHECK"
echo ""

echo "========================================"
echo "✅ 强制更新完成！"
echo "========================================"
echo ""
echo "💡 提示："
echo "   - 访问网站: https://www.jubianai.cn"
echo "   - 清除浏览器缓存后刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）"
echo "   - 如果仍然没有反应，检查浏览器控制台错误（F12）"
echo ""

