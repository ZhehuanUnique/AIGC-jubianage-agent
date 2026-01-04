# 确保 GitHub 上的代码是最新的

Write-Host "检查并更新 GitHub..." -ForegroundColor Yellow
Write-Host ""

cd C:\Users\Administrator\Desktop\AIGC-jubianage-agent

# 检查状态
Write-Host "1. 检查工作区状态..." -ForegroundColor Cyan
$status = git status --porcelain
if ($status) {
    Write-Host "  有未提交的更改，正在提交..." -ForegroundColor Yellow
    git add .
    git commit -m "修复语法错误，确保服务正常运行"
    Write-Host "  ✅ 已提交" -ForegroundColor Green
} else {
    Write-Host "  ✅ 工作区干净" -ForegroundColor Green
}

# 检查远程同步
Write-Host ""
Write-Host "2. 检查远程同步..." -ForegroundColor Cyan
git fetch origin 2>&1 | Out-Null

$unpushed = git log origin/main..HEAD --oneline
if ($unpushed) {
    Write-Host "  有未推送的提交，正在推送..." -ForegroundColor Yellow
    git push origin main
    Write-Host "  ✅ 已推送到 GitHub" -ForegroundColor Green
} else {
    Write-Host "  ✅ 所有提交已推送" -ForegroundColor Green
}

# 显示最终状态
Write-Host ""
Write-Host "3. 最终状态：" -ForegroundColor Cyan
$localCommit = git rev-parse --short HEAD
$remoteCommit = git rev-parse --short origin/main 2>&1

if ($localCommit -eq $remoteCommit) {
    Write-Host "  ✅ GitHub 上的代码是最新的" -ForegroundColor Green
    Write-Host "  最新提交: $localCommit" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️  本地和远程不同步" -ForegroundColor Yellow
    Write-Host "  本地: $localCommit" -ForegroundColor Gray
    Write-Host "  远程: $remoteCommit" -ForegroundColor Gray
}

Write-Host ""




