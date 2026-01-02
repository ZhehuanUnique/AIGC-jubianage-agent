# Cleanup Models directory .safetensors files from Git history
Write-Host "Removing Models/*.safetensors files from Git history..." -ForegroundColor Cyan
Write-Host ""

# Find all .safetensors files in Models directory
Write-Host "1. Finding .safetensors files in Models directory..." -ForegroundColor Yellow
$safetensorsFiles = git ls-files "Models/*.safetensors"

if ($safetensorsFiles) {
    Write-Host "   Found the following .safetensors files:" -ForegroundColor Yellow
    $safetensorsFiles | ForEach-Object { Write-Host "     - $_" -ForegroundColor White }
    Write-Host ""
    
    # Remove each file individually
    Write-Host "2. Removing each file from Git history..." -ForegroundColor Yellow
    $safetensorsFiles | ForEach-Object {
        $file = $_
        Write-Host "   Removing: $file" -ForegroundColor Yellow
        git filter-branch --force --index-filter "git rm -rf --cached --ignore-unmatch `"$file`"" --prune-empty --tag-name-filter cat -- --all 2>&1 | Out-Null
    }
    
    Write-Host ""
    Write-Host "3. Cleaning up Git references..." -ForegroundColor Yellow
    git for-each-ref --format="%(refname)" refs/original/ | ForEach-Object { git update-ref -d $_ }
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Models/*.safetensors files removed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "   No .safetensors files found in Models directory" -ForegroundColor Yellow
}

Write-Host ""


