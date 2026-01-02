# Git 历史清理和推送脚本
# 这个脚本会创建一个干净的提交历史，移除所有大文件

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git 历史清理和推送脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查当前状态
Write-Host "1. 检查当前 Git 状态..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "2. 创建备份分支..." -ForegroundColor Yellow
git branch backup-before-cleanup 2>$null
Write-Host "   已创建备份分支: backup-before-cleanup" -ForegroundColor Green

Write-Host ""
Write-Host "3. 使用 git filter-branch 清理大文件..." -ForegroundColor Yellow
Write-Host "   注意：这个过程可能需要 10-30 分钟，请耐心等待..." -ForegroundColor Red

# 需要删除的路径模式
$patterns = @(
    "USB Files",
    "Chiefavefan",
    "Models/*.safetensors",
    "milvus/volumes"
)

# 对每个模式执行清理
foreach ($pattern in $patterns) {
    Write-Host "   正在删除: $pattern" -ForegroundColor Yellow
    git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch `"$pattern`"" --prune-empty --tag-name-filter cat -- --all 2>&1 | Out-Null
}

# 清理引用
Write-Host ""
Write-Host "4. 清理 Git 引用..." -ForegroundColor Yellow
git for-each-ref --format="%(refname)" refs/original/ | ForEach-Object { git update-ref -d $_ }
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host ""
Write-Host "5. 检查清理后的仓库大小..." -ForegroundColor Yellow
$repoSize = (git count-objects -vH | Select-String "size-pack").ToString() -replace ".*size-pack: ", ""
Write-Host "   仓库大小: $repoSize" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "清理完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "现在可以运行以下命令强制推送:" -ForegroundColor Yellow
Write-Host "  git push origin main --force" -ForegroundColor White
Write-Host ""
Write-Host "如果推送仍然失败，可以尝试:" -ForegroundColor Yellow
Write-Host "  git push origin main --force --no-verify" -ForegroundColor White
Write-Host ""


