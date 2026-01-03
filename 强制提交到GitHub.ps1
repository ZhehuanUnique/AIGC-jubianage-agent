# 强制提交代码到 GitHub
# 使用方法: .\强制提交到GitHub.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "强制提交代码到 GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在 git 仓库中
if (-not (Test-Path .git)) {
    Write-Host "❌ 错误: 当前目录不是 git 仓库" -ForegroundColor Red
    exit 1
}

# 显示当前状态
Write-Host "📋 当前 git 状态:" -ForegroundColor Cyan
$status = git status --short
if ($status) {
    Write-Host $status
} else {
    Write-Host "  没有未提交的更改"
}
Write-Host ""

# 显示最新提交
Write-Host "📋 最新 3 个提交:" -ForegroundColor Cyan
git log --oneline -3
Write-Host ""

# 添加所有更改
Write-Host "📦 添加所有更改..." -ForegroundColor Cyan
git add -A
$addResult = git status --short
if ($addResult) {
    Write-Host "✅ 已添加以下文件:" -ForegroundColor Green
    Write-Host $addResult
} else {
    Write-Host "⚠️  没有需要添加的文件" -ForegroundColor Yellow
}
Write-Host ""

# 检查是否有更改需要提交
$changes = git diff --cached --name-only
if ($changes) {
    Write-Host "💬 提交更改..." -ForegroundColor Cyan
    $commitMessage = "chore: 清理多余的脚本和文档，更新README.md，添加Milvus配置说明"
    git commit -m $commitMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 已提交更改" -ForegroundColor Green
        Write-Host "   提交信息: $commitMessage" -ForegroundColor Cyan
    } else {
        Write-Host "❌ 提交失败" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
} else {
    Write-Host "⚠️  没有需要提交的更改" -ForegroundColor Yellow
    Write-Host ""
}

# 推送到 GitHub
Write-Host "🚀 推送到 GitHub (origin/main)..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ 代码已成功推送到 GitHub!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 最新提交:" -ForegroundColor Cyan
    git log --oneline -1
    Write-Host ""
    Write-Host "💡 下一步: 在服务器上执行更新命令" -ForegroundColor Yellow
    Write-Host "   ssh ubuntu@119.45.121.152 'cd /var/www/aigc-agent && git pull origin main && bash 完整更新服务器.sh'" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ 推送失败，请检查：" -ForegroundColor Red
    Write-Host "   - Git 远程仓库配置是否正确" -ForegroundColor Red
    Write-Host "   - 是否有推送权限" -ForegroundColor Red
    Write-Host "   - 网络连接是否正常" -ForegroundColor Red
    Write-Host ""
    exit 1
}

