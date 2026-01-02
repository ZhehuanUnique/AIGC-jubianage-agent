# 创建干净分支脚本 - 快速解决方案
# 这个方法会创建一个新的孤立分支，只包含必要的代码文件

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "创建干净分支（快速方案）" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 保存当前更改
Write-Host "1. 保存当前更改..." -ForegroundColor Yellow
git stash push -m "临时保存更改"

# 2. 创建新的孤立分支
Write-Host "2. 创建新的孤立分支 'clean-main'..." -ForegroundColor Yellow
git checkout --orphan clean-main

# 3. 删除所有文件
Write-Host "3. 清空工作目录..." -ForegroundColor Yellow
git rm -rf .

# 4. 从原分支恢复必要的文件（排除大文件目录）
Write-Host "4. 恢复必要的代码文件..." -ForegroundColor Yellow
git checkout main -- .
git rm -rf "USB Files" "Chiefavefan" "Models" "milvus/volumes" 2>$null
git rm -rf "*.mp4" "*.mov" "*.zip" "*.apk" "*.psd" "*.safetensors" 2>$null

# 5. 添加所有文件并提交
Write-Host "5. 创建初始提交..." -ForegroundColor Yellow
git add .
git commit -m "Clean repository - removed large files"

# 6. 切换回 main 分支并合并
Write-Host "6. 替换 main 分支..." -ForegroundColor Yellow
git branch -D main
git branch -m main

# 7. 恢复之前的更改
Write-Host "7. 恢复之前的更改..." -ForegroundColor Yellow
git stash pop 2>$null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "完成！现在可以强制推送:" -ForegroundColor Green
Write-Host "  git push origin main --force" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""


