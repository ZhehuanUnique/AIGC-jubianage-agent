# BFG Repo-Cleaner Cleanup Script
# BFG JAR: E:\bfg-1.14.0.jar

$bfgJar = "E:\bfg-1.14.0.jar"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BFG Repo-Cleaner Git History Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check BFG JAR
if (-not (Test-Path $bfgJar)) {
    Write-Host "Error: BFG JAR not found: $bfgJar" -ForegroundColor Red
    exit 1
}

Write-Host "Found BFG: $bfgJar" -ForegroundColor Green
Write-Host ""

# Check Java (will verify when running BFG)
Write-Host "1. Java check (will verify when running BFG)..." -ForegroundColor Yellow
Write-Host ""

# Create bare repository
Write-Host "2. Creating bare repository..." -ForegroundColor Yellow
$bareRepoPath = Join-Path (Split-Path (Get-Location)) "AIGC-jubianage-agent-clean.git"

if (Test-Path $bareRepoPath) {
    Write-Host "   Removing old bare repository..." -ForegroundColor Yellow
    Remove-Item -Path $bareRepoPath -Recurse -Force -ErrorAction SilentlyContinue
}

# Get remote URL
$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    Write-Host "   Error: Could not get remote URL" -ForegroundColor Red
    Write-Host "   Trying to clone from current directory..." -ForegroundColor Yellow
    $currentDir = (Get-Location).Path
    git clone --mirror $currentDir $bareRepoPath
} else {
    Write-Host "   Cloning from remote: $remoteUrl" -ForegroundColor Yellow
    Write-Host "   To: $bareRepoPath" -ForegroundColor Gray
    git clone --mirror $remoteUrl $bareRepoPath
}

if (-not (Test-Path $bareRepoPath)) {
    Write-Host "   Error: Clone failed" -ForegroundColor Red
    exit 1
}

Write-Host "   Done: $bareRepoPath" -ForegroundColor Green
Write-Host ""

# Use BFG to clean
Write-Host "3. Using BFG to clean large files and directories..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes, please wait..." -ForegroundColor Red
Write-Host ""

Push-Location $bareRepoPath

Write-Host "   Removing: USB Files/" -ForegroundColor Yellow
java -jar $bfgJar --delete-folders "USB Files" .

Write-Host "   Removing: Chiefavefan/" -ForegroundColor Yellow
java -jar $bfgJar --delete-folders "Chiefavefan" .

Write-Host "   Removing: milvus/volumes/" -ForegroundColor Yellow
java -jar $bfgJar --delete-folders "milvus/volumes" .

Write-Host "   Removing: Models/*.safetensors" -ForegroundColor Yellow
java -jar $bfgJar --delete-files "*.safetensors" .

Write-Host ""
Write-Host "4. Cleaning up Git references and garbage collection..." -ForegroundColor Yellow
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Cleaned repository location: $bareRepoPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps (choose one):" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option A: Push cleaned repository directly" -ForegroundColor Yellow
Write-Host "  cd `"$bareRepoPath`"" -ForegroundColor White
Write-Host "  git remote set-url origin https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git" -ForegroundColor White
Write-Host "  git push --force" -ForegroundColor White
Write-Host ""
Write-Host "Option B: Replace current repository" -ForegroundColor Yellow
Write-Host "  1. Backup current .git directory" -ForegroundColor White
Write-Host "  2. Delete current .git directory" -ForegroundColor White
Write-Host "  3. Copy cleaned .git directory" -ForegroundColor White
Write-Host "  4. Run: git push origin main --force" -ForegroundColor White
Write-Host ""

