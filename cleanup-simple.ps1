# Quick cleanup script
Write-Host "Starting Git history cleanup..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Create backup
Write-Host "1. Creating backup branch..." -ForegroundColor Yellow
$backupName = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
git branch $backupName 2>$null
Write-Host "   Backup created: $backupName" -ForegroundColor Green
Write-Host ""

# Step 2: Remove large directories from history
Write-Host "2. Removing large directories from Git history..." -ForegroundColor Yellow
Write-Host "   This may take 5-15 minutes..." -ForegroundColor Red
Write-Host ""

# Remove USB Files
Write-Host "   Removing: USB Files/" -ForegroundColor Yellow
git filter-branch --force --index-filter 'git rm -rf --cached --ignore-unmatch "USB Files"' --prune-empty --tag-name-filter cat -- --all 2>&1 | Out-Null

# Remove Chiefavefan
Write-Host "   Removing: Chiefavefan/" -ForegroundColor Yellow
git filter-branch --force --index-filter 'git rm -rf --cached --ignore-unmatch "Chiefavefan"' --prune-empty --tag-name-filter cat -- --all 2>&1 | Out-Null

# Remove milvus/volumes
Write-Host "   Removing: milvus/volumes/" -ForegroundColor Yellow
git filter-branch --force --index-filter 'git rm -rf --cached --ignore-unmatch "milvus/volumes"' --prune-empty --tag-name-filter cat -- --all 2>&1 | Out-Null

# Remove Models/*.safetensors files
Write-Host "   Removing: Models/*.safetensors files" -ForegroundColor Yellow
$safetensorsFiles = git ls-files "Models/*.safetensors" 2>$null
if ($safetensorsFiles) {
    $safetensorsFiles | ForEach-Object {
        $file = $_
        Write-Host "     Removing: $file" -ForegroundColor Gray
        git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch `"$file`"" --prune-empty --tag-name-filter cat -- --all 2>&1 | Out-Null
    }
} else {
    Write-Host "     No .safetensors files found in Models directory" -ForegroundColor Gray
}

# Step 3: Clean up references
Write-Host ""
Write-Host "3. Cleaning up Git references..." -ForegroundColor Yellow
git for-each-ref --format="%(refname)" refs/original/ | ForEach-Object { git update-ref -d $_ }
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Now you can push with:" -ForegroundColor Yellow
Write-Host "  git push origin main --force" -ForegroundColor White
Write-Host ""

