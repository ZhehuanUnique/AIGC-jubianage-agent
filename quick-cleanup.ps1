# 快速清理脚本 - 只删除最大的几个目录
# 这个方法比完整清理快很多

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "快速清理 Git 历史" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 先提交当前更改（如果有）
Write-Host "1. 检查并提交当前更改..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "   发现未提交的更改，是否提交？(Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "Y" -or $response -eq "y") {
        git add .
        git commit -m "Save current changes before cleanup"
    }
}

# 创建备份
Write-Host ""
Write-Host "2. 创建备份分支..." -ForegroundColor Yellow
git branch backup-$(Get-Date -Format "yyyyMMdd-HHmmss") 2>$null
Write-Host "   备份已创建" -ForegroundColor Green

# 只删除最大的几个目录（这些占用了大部分空间）
Write-Host ""
Write-Host "3. 开始清理最大的目录..." -ForegroundColor Yellow
Write-Host "   这将删除以下目录的历史记录:" -ForegroundColor Yellow
Write-Host "   - USB Files/" -ForegroundColor White
Write-Host "   - Chiefavefan/" -ForegroundColor White
Write-Host "   - milvus/volumes/" -ForegroundColor White
Write-Host ""
Write-Host "   注意：这个过程可能需要 5-15 分钟..." -ForegroundColor Red
Write-Host ""

# 删除 USB Files 目录
Write-Host "   正在删除: USB Files/" -ForegroundColor Yellow
git filter-branch --force --index-filter 'git rm -rf --cached --ignore-unmatch "USB Files"' --prune-empty --tag-name-filter cat -- --all 2>&1 | Out-Null

# 删除 Chiefavefan 目录
Write-Host "   正在删除: Chiefavefan/" -ForegroundColor Yellow
git filter-branch --force --index-filter 'git rm -rf --cached --ignore-unmatch "Chiefavefan"' --prune-empty --tag-name-filter cat -- --all 2>&1 | Out-Null

# 删除 milvus/volumes 目录
Write-Host "   正在删除: milvus/volumes/" -ForegroundColor Yellow
git filter-branch --force --index-filter 'git rm -rf --cached --ignore-unmatch "milvus/volumes"' --prune-empty --tag-name-filter cat -- --all 2>&1 | Out-Null

# 清理引用
Write-Host ""
Write-Host "4. 清理 Git 引用和垃圾回收..." -ForegroundColor Yellow
git for-each-ref --format="%(refname)" refs/original/ | ForEach-Object { git update-ref -d $_ }
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "清理完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "现在可以尝试推送:" -ForegroundColor Yellow
Write-Host "  git push origin main --force" -ForegroundColor White
Write-Host ""
Write-Host "如果仍然失败，可能需要删除更多文件" -ForegroundColor Yellow
Write-Host ""

