# 强制更新服务器端代码
# 使用方法: .\强制更新服务器端.ps1

$SERVER_USER = "ubuntu"
$SERVER_HOST = "119.45.121.152"
$SERVER_PATH = "/var/www/aigc-agent"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "强制更新服务器端代码" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查当前状态
Write-Host "[1/5] 检查当前状态..." -ForegroundColor Yellow
Write-Host "本地最新提交:" -ForegroundColor Cyan
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git log --oneline -1"
Write-Host ""

Write-Host "远程最新提交:" -ForegroundColor Cyan
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git fetch origin 2>&1 && git log origin/main --oneline -1"
Write-Host ""

# 2. 强制拉取最新代码
Write-Host "[2/5] 强制拉取最新代码..." -ForegroundColor Yellow
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git fetch origin && git reset --hard origin/main"
Write-Host "✅ 代码已强制更新" -ForegroundColor Green
Write-Host ""

# 3. 验证代码更新
Write-Host "[3/5] 验证代码更新..." -ForegroundColor Yellow
Write-Host "最新提交:" -ForegroundColor Cyan
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git log --oneline -3"
Write-Host ""

Write-Host "检查积分充值代码:" -ForegroundColor Cyan
$creditCode = ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && grep -n '积分充值\|credit-recharge' src/components/NavigationBar.tsx 2>&1 | head -3"
Write-Host $creditCode
Write-Host ""

# 4. 清理并重新构建前端
Write-Host "[4/5] 清理并重新构建前端..." -ForegroundColor Yellow
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && rm -rf dist node_modules/.vite && npm run build"
Write-Host "✅ 前端构建完成" -ForegroundColor Green
Write-Host ""

# 5. 重启服务并设置权限
Write-Host "[5/5] 重启服务并设置权限..." -ForegroundColor Yellow
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && sudo chown -R ubuntu:ubuntu dist/ && cd server && pm2 restart aigc-agent && cd .. && sudo systemctl reload nginx"
Write-Host "✅ 服务已重启" -ForegroundColor Green
Write-Host ""

# 6. 验证服务
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "验证服务状态" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PM2 服务状态:" -ForegroundColor Cyan
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH/server && pm2 status aigc-agent --no-color"
Write-Host ""

Write-Host "后端健康检查:" -ForegroundColor Cyan
$healthCheck = ssh "$SERVER_USER@$SERVER_HOST" "curl -s http://localhost:3002/api/health" 2>&1
Write-Host $healthCheck
Write-Host ""

Write-Host "检查构建文件中的积分充值:" -ForegroundColor Cyan
$distCheck = ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && grep -r '积分充值' dist/ 2>&1 | head -2"
Write-Host $distCheck
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 强制更新完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示：" -ForegroundColor Yellow
Write-Host "   - 访问网站: https://www.jubianai.cn" -ForegroundColor Cyan
Write-Host "   - 清除浏览器缓存后刷新页面" -ForegroundColor Cyan
Write-Host "   - 如果仍然没有反应，检查浏览器控制台错误" -ForegroundColor Cyan
Write-Host ""

