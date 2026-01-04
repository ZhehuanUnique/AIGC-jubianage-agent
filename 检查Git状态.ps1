# 检查 Git 状态和 GitHub 同步情况

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  检查 Git 状态" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

cd C:\Users\Administrator\Desktop\AIGC-jubianage-agent

Write-Host "1. 检查工作区状态..." -ForegroundColor Yellow
$status = git status --short
if ($status) {
    Write-Host "  ⚠️  有未提交的更改：" -ForegroundColor Yellow
    $status | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
} else {
    Write-Host "  ✅ 工作区干净（无未提交的更改）" -ForegroundColor Green
}

Write-Host ""
Write-Host "2. 检查最近的提交..." -ForegroundColor Yellow
$commits = git log --oneline -5
$commits | ForEach-Object { Write-Host "    $_" -ForegroundColor White }

Write-Host ""
Write-Host "3. 检查与远程仓库的差异..." -ForegroundColor Yellow
git fetch origin 2>&1 | Out-Null
$localCommit = git rev-parse HEAD
$remoteCommit = git rev-parse origin/main 2>&1

if ($LASTEXITCODE -eq 0) {
    if ($localCommit -eq $remoteCommit) {
        Write-Host "  ✅ 本地代码与 GitHub 同步" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  本地代码与 GitHub 不同步" -ForegroundColor Yellow
        Write-Host "  本地最新提交: $localCommit" -ForegroundColor Gray
        Write-Host "  远程最新提交: $remoteCommit" -ForegroundColor Gray
        
        $ahead = git rev-list --count origin/main..HEAD
        $behind = git rev-list --count HEAD..origin/main
        
        if ($ahead -gt 0) {
            Write-Host "  ⚠️  本地领先远程 $ahead 个提交（需要推送）" -ForegroundColor Yellow
        }
        if ($behind -gt 0) {
            Write-Host "  ⚠️  本地落后远程 $behind 个提交（需要拉取）" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ❌ 无法连接到远程仓库" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. 检查未推送的提交..." -ForegroundColor Yellow
$unpushed = git log origin/main..HEAD --oneline
if ($unpushed) {
    Write-Host "  ⚠️  有以下未推送的提交：" -ForegroundColor Yellow
    $unpushed | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
} else {
    Write-Host "  ✅ 所有提交已推送到 GitHub" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  建议操作" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($status) {
    Write-Host "1. 提交本地更改：" -ForegroundColor Yellow
    Write-Host "   git add ." -ForegroundColor Cyan
    Write-Host "   git commit -m '修复语法错误'" -ForegroundColor Cyan
    Write-Host "   git push origin main" -ForegroundColor Cyan
    Write-Host ""
}

if ($unpushed) {
    Write-Host "2. 推送到 GitHub：" -ForegroundColor Yellow
    Write-Host "   git push origin main" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""




