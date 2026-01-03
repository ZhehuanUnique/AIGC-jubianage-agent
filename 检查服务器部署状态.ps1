# 检查服务器部署状态
# 使用方法: .\检查服务器部署状态.ps1

$SERVER_USER = "ubuntu"
$SERVER_HOST = "119.45.121.152"
$SERVER_PATH = "/var/www/aigc-agent"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "检查服务器部署状态" -ForegroundColor Cyan
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

# 2. 检查 Git 状态
Write-Host "[2/6] 检查 Git 状态..." -ForegroundColor Yellow
Write-Host "当前分支和最新提交:" -ForegroundColor Cyan
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git branch --show-current && git log --oneline -1"
Write-Host ""

Write-Host "检查是否有未拉取的更新:" -ForegroundColor Cyan
$unpulled = ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && git fetch origin 2>&1 && git log HEAD..origin/main --oneline" 2>&1
if ($unpulled -match "^\s*$") {
    Write-Host "✅ 代码已是最新" -ForegroundColor Green
} else {
    Write-Host "⚠️  有未拉取的更新:" -ForegroundColor Yellow
    Write-Host $unpulled -ForegroundColor Yellow
}
Write-Host ""

# 3. 检查关键文件
Write-Host "[3/6] 检查关键文件..." -ForegroundColor Yellow
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

# 4. 检查 dist 目录
Write-Host "[4/6] 检查前端构建..." -ForegroundColor Yellow
$distExists = ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && test -d dist && echo '存在' || echo '不存在'" 2>&1
if ($distExists -match "存在") {
    Write-Host "✅ dist 目录存在" -ForegroundColor Green
    $distTime = ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && stat -c '%y' dist/index.html 2>/dev/null || stat -f '%Sm' dist/index.html 2>/dev/null" 2>&1
    Write-Host "  构建时间: $distTime" -ForegroundColor Cyan
} else {
    Write-Host "❌ dist 目录不存在" -ForegroundColor Red
}
Write-Host ""

# 5. 检查 PM2 服务
Write-Host "[5/6] 检查 PM2 服务..." -ForegroundColor Yellow
$pm2Status = ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH/server && pm2 status aigc-agent --no-color" 2>&1
Write-Host $pm2Status
if ($pm2Status -match "online") {
    Write-Host "✅ PM2 服务运行正常" -ForegroundColor Green
} else {
    Write-Host "⚠️  PM2 服务可能未正常运行" -ForegroundColor Yellow
}
Write-Host ""

# 6. 检查后端健康状态
Write-Host "[6/6] 检查后端健康状态..." -ForegroundColor Yellow
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
Write-Host "检查完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

