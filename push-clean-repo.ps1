# Push cleaned repository with optimized settings
Write-Host "Pushing cleaned repository to GitHub..." -ForegroundColor Cyan
Write-Host ""

$bareRepoPath = "..\AIGC-jubianage-agent-clean.git"

if (-not (Test-Path $bareRepoPath)) {
    Write-Host "Error: Cleaned repository not found: $bareRepoPath" -ForegroundColor Red
    exit 1
}

Push-Location $bareRepoPath

# Configure Git for large pushes
Write-Host "1. Configuring Git for push..." -ForegroundColor Yellow
git config http.postBuffer 524288000
git config http.maxRequestBuffer 100M
git config core.compression 0

# Set remote URL to HTTPS
Write-Host "2. Setting remote URL to HTTPS..." -ForegroundColor Yellow
git remote set-url origin https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git

# Try pushing with increased buffer
Write-Host "3. Pushing to GitHub (this may take a while)..." -ForegroundColor Yellow
Write-Host ""

# Try push with verbose output
$env:GIT_TRACE = "1"
$env:GIT_CURL_VERBOSE = "1"

git push --force --verbose

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Push successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Push failed. Trying alternative method..." -ForegroundColor Yellow
    Write-Host ""
    
    # Try with smaller chunks
    Write-Host "Trying with smaller buffer..." -ForegroundColor Yellow
    git config http.postBuffer 104857600
    git push --force --verbose
}

Pop-Location


