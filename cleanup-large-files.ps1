# Git 历史清理脚本 - 删除大文件
# 这个脚本会从 Git 历史中删除指定的大文件和目录

Write-Host "开始清理 Git 历史中的大文件..." -ForegroundColor Yellow

# 需要删除的目录和文件模式
$pathsToRemove = @(
    "USB Files",
    "Chiefavefan",
    "Models/*.safetensors",
    "milvus/volumes",
    "*.mp4",
    "*.mov",
    "*.zip",
    "*.apk",
    "*.psd"
)

# 使用 git filter-branch 删除这些文件
$pathsString = ($pathsToRemove | ForEach-Object { "`"$_`"" }) -join " "

# 创建临时脚本
$filterScript = @"
git filter-branch --force --index-filter `
  "git rm -rf --cached --ignore-unmatch $pathsString" `
  --prune-empty --tag-name-filter cat -- --all
"@

Write-Host "执行清理命令..." -ForegroundColor Yellow
Write-Host "注意：这个过程可能需要较长时间..." -ForegroundColor Yellow

# 执行清理
Invoke-Expression $filterScript

Write-Host "清理完成！" -ForegroundColor Green
Write-Host "现在可以运行: git push origin main --force" -ForegroundColor Green


