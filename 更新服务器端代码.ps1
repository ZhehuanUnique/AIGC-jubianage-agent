# 更新服务器端代码
# 使用方法: .\更新服务器端代码.ps1

$SERVER_USER = "ubuntu"
$SERVER_HOST = "119.45.121.152"
$SERVER_PATH = "/var/www/aigc-agent"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "更新服务器端代码" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 SSH 连接
Write-Host "[1/6] 检查 SSH 连接..." -ForegroundColor Yellow
$testConnection = ssh -o BatchMode=yes -o ConnectTimeout=5 "$SERVER_USER@$SERVER_HOST" "echo 'OK'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SSH 连接失败" -ForegroundColor Red
    Write-Host $testConnection -ForegroundColor Red
    exit 1
}
Write-Host "✅ SSH 连接成功" -ForegroundColor Green
Write-Host ""

# 2. 检查当前 Git 状态
Write-Host "[2/6] 检查当前 Git 状态..." -ForegroundColor Yellow
Write-Host "当前分支和状态:" -ForegroundColor Cyan
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git branch --show-current && git status --short"
Write-Host ""

# 3. 拉取最新代码
Write-Host "[3/6] 拉取最新代码..." -ForegroundColor Yellow
$pullOutput = ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git pull origin main" 2>&1
Write-Host $pullOutput
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 代码已更新" -ForegroundColor Green
} else {
    Write-Host "⚠️  拉取代码时可能有警告" -ForegroundColor Yellow
}
Write-Host ""

# 4. 检查最新提交
Write-Host "[4/6] 检查最新提交..." -ForegroundColor Yellow
Write-Host "最新 3 个提交:" -ForegroundColor Cyan
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git log --oneline -3"
Write-Host ""

# 5. 检查关键文件
Write-Host "[5/6] 检查关键文件..." -ForegroundColor Yellow
$files = @("README.md", "完整更新服务器.sh", "通过SSH部署到服务器.ps1", "修复Milvus重启问题.bat")
foreach ($file in $files) {
    $exists = ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && test -f '$file' && echo '存在' || echo '不存在'" 2>&1
    if ($exists -match "存在") {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (不存在)" -ForegroundColor Red
    }
}
Write-Host ""

# 6. 执行完整更新
Write-Host "[6/6] 执行完整更新..." -ForegroundColor Yellow
Write-Host "正在执行更新脚本..." -ForegroundColor Cyan
$updateOutput = ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && bash 完整更新服务器.sh" 2>&1
Write-Host $updateOutput
Write-Host ""

# 7. 验证服务状态
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "验证服务状态" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PM2 服务状态:" -ForegroundColor Cyan
$pm2Status = ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH/server && pm2 status aigc-agent --no-color" 2>&1
Write-Host $pm2Status
if ($pm2Status -match "online") {
    Write-Host "✅ PM2 服务运行正常" -ForegroundColor Green
} else {
    Write-Host "⚠️  PM2 服务可能未正常运行" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "后端健康检查:" -ForegroundColor Cyan
$healthCheck = ssh "$SERVER_USER@$SERVER_HOST" "curl -s http://localhost:3002/api/health" 2>&1
if ($healthCheck -match "ok" -or $healthCheck -match "status") {
    Write-Host "✅ 后端服务健康检查通过" -ForegroundColor Green
    Write-Host "  响应: $healthCheck" -ForegroundColor Cyan
} else {
    Write-Host "❌ 后端服务健康检查失败" -ForegroundColor Red
    Write-Host "  响应: $healthCheck" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 更新完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示：" -ForegroundColor Yellow
Write-Host "   - 访问网站: https://www.jubianai.cn" -ForegroundColor Cyan
Write-Host "   - 查看日志: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH/server && pm2 logs aigc-agent'" -ForegroundColor Cyan
Write-Host ""

