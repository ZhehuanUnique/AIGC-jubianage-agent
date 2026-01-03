# 通过 SSH 部署到服务器
# 使用方法: .\通过SSH部署到服务器.ps1

$SERVER_USER = "ubuntu"
$SERVER_HOST = "119.45.121.152"
$SERVER_PATH = "/var/www/aigc-agent"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "通过 SSH 部署到服务器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 SSH 连接
Write-Host "[1/4] 检查 SSH 连接..." -ForegroundColor Yellow
$testConnection = ssh -o BatchMode=yes -o ConnectTimeout=5 "$SERVER_USER@$SERVER_HOST" "echo 'SSH连接成功'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SSH 连接失败，请检查：" -ForegroundColor Red
    Write-Host "   - SSH 密钥是否已配置" -ForegroundColor Red
    Write-Host "   - 服务器地址是否正确: $SERVER_HOST" -ForegroundColor Red
    Write-Host "   - 用户名是否正确: $SERVER_USER" -ForegroundColor Red
    exit 1
}
Write-Host "✅ SSH 连接成功" -ForegroundColor Green
Write-Host ""

# 2. 在服务器上拉取最新代码
Write-Host "[2/4] 在服务器上拉取最新代码..." -ForegroundColor Yellow
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git pull origin main"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 拉取代码失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 代码已更新" -ForegroundColor Green
Write-Host ""

# 3. 在服务器上执行完整更新脚本
Write-Host "[3/4] 在服务器上执行完整更新..." -ForegroundColor Yellow
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && bash 完整更新服务器.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  更新脚本执行完成，但可能有警告" -ForegroundColor Yellow
} else {
    Write-Host "✅ 更新完成" -ForegroundColor Green
}
Write-Host ""

# 4. 验证部署
Write-Host "[4/4] 验证部署..." -ForegroundColor Yellow
Write-Host "检查 PM2 服务状态:" -ForegroundColor Cyan
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH/server && pm2 status aigc-agent"
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示：" -ForegroundColor Yellow
Write-Host "   - 访问网站: https://www.jubianai.cn" -ForegroundColor Cyan
Write-Host "   - 查看日志: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH/server && pm2 logs aigc-agent'" -ForegroundColor Cyan
Write-Host ""

