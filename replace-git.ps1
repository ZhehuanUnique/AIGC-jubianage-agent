# 用清理后的仓库替换原始仓库的 .git 目录
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "替换原始仓库的 .git 目录" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$originalRepo = "C:\Users\Administrator\Desktop\AIGC-jubianage-agent"
$cleanedBareRepo = "C:\Users\Administrator\Desktop\AIGC-jubianage-agent-clean.git"
$backupGit = "C:\Users\Administrator\Desktop\AIGC-jubianage-agent\.git.backup"

# 检查清理后的仓库是否存在
if (-not (Test-Path $cleanedBareRepo)) {
    Write-Host "错误: 清理后的仓库不存在: $cleanedBareRepo" -ForegroundColor Red
    exit 1
}

# 进入原始仓库目录
Push-Location $originalRepo

# 1. 备份当前的 .git 目录
Write-Host "1. 备份当前的 .git 目录..." -ForegroundColor Yellow
if (Test-Path ".git") {
    if (Test-Path $backupGit) {
        Remove-Item -Recurse -Force $backupGit
    }
    Move-Item -Path ".git" -Destination $backupGit
    Write-Host "   已备份到: $backupGit" -ForegroundColor Green
} else {
    Write-Host "   警告: 当前目录没有 .git 目录" -ForegroundColor Yellow
}
Write-Host ""

# 2. 克隆清理后的仓库到当前目录
Write-Host "2. 克隆清理后的仓库..." -ForegroundColor Yellow
git clone $cleanedBareRepo temp-clone
if ($LASTEXITCODE -ne 0) {
    Write-Host "   错误: 克隆失败" -ForegroundColor Red
    # 恢复备份
    if (Test-Path $backupGit) {
        Move-Item -Path $backupGit -Destination ".git"
    }
    Pop-Location
    exit 1
}
Write-Host ""

# 3. 复制清理后的 .git 目录
Write-Host "3. 复制清理后的 .git 目录..." -ForegroundColor Yellow
Copy-Item -Path "temp-clone\.git" -Destination ".git" -Recurse -Force
Write-Host "   完成" -ForegroundColor Green
Write-Host ""

# 4. 清理临时目录
Write-Host "4. 清理临时文件..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "temp-clone"
Write-Host "   完成" -ForegroundColor Green
Write-Host ""

# 5. 检查状态
Write-Host "5. 检查 Git 状态..." -ForegroundColor Yellow
git status
Write-Host ""

# 6. 设置远程仓库
Write-Host "6. 设置远程仓库..." -ForegroundColor Yellow
git remote set-url origin git@github.com:ZhehuanUnique/AIGC-jubianage-agent.git
git remote -v
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "替换完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步: 运行以下命令推送清理后的仓库" -ForegroundColor Yellow
Write-Host "  git push --force origin main" -ForegroundColor White
Write-Host ""

Pop-Location

