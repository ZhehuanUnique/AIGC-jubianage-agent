# 提交代码到 GitHub - PowerShell 版本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "提交代码到 GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在 git 仓库中
if (-not (Test-Path .git)) {
    Write-Host "❌ 错误: 当前目录不是 git 仓库" -ForegroundColor Red
    exit 1
}

# 检查是否有未提交的更改
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "⚠️  没有未提交的更改" -ForegroundColor Yellow
    $continue = Read-Host "是否继续提交？(y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 0
    }
}

# 显示当前状态
Write-Host "📋 当前 git 状态:" -ForegroundColor Cyan
git status --short
Write-Host ""

# 添加所有更改
Write-Host "📦 添加所有更改..." -ForegroundColor Cyan
git add .
Write-Host "✅ 已添加所有更改" -ForegroundColor Green
Write-Host ""

# 提交更改
Write-Host "💬 请输入提交信息:" -ForegroundColor Cyan
$commitMessage = Read-Host "提交信息"

if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "更新代码: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host "使用默认提交信息: $commitMessage" -ForegroundColor Yellow
}

git commit -m $commitMessage
Write-Host "✅ 已提交更改" -ForegroundColor Green
Write-Host ""

# 推送到 GitHub
Write-Host "🚀 推送到 GitHub..." -ForegroundColor Cyan
$branch = Read-Host "推送到哪个分支？(默认: main)"
if ([string]::IsNullOrWhiteSpace($branch)) {
    $branch = "main"
}

Write-Host "正在推送到 origin/$branch..." -ForegroundColor Cyan
git push origin $branch

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 代码已成功推送到 GitHub!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 推送信息:" -ForegroundColor Cyan
Write-Host "  分支: $branch"
Write-Host "  提交信息: $commitMessage"
Write-Host ""
Write-Host "💡 下一步: 在服务器上执行更新命令" -ForegroundColor Yellow
Write-Host ""

