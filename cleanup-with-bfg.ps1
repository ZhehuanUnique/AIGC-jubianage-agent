# Cleanup Git history using BFG Repo-Cleaner
# BFG JAR file location: E:\bfg-1.14.0.jar

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "使用 BFG Repo-Cleaner 清理 Git 历史" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# BFG JAR file path
$bfgJar = "E:\bfg-1.14.0.jar"

# Check if BFG JAR exists
if (-not (Test-Path $bfgJar)) {
    Write-Host "错误: 找不到 BFG JAR 文件: $bfgJar" -ForegroundColor Red
    Write-Host "请确认文件路径是否正确" -ForegroundColor Yellow
    exit 1
}

Write-Host "找到 BFG: $bfgJar" -ForegroundColor Green
Write-Host ""

# Check Java
Write-Host "1. 检查 Java 环境..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "   Java 已安装: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "   错误: 未找到 Java，请先安装 Java" -ForegroundColor Red
    Write-Host "   下载地址: https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 1: Clone bare repository
Write-Host "2. 克隆裸仓库（bare repository）..." -ForegroundColor Yellow
$bareRepoPath = "C:\Users\Administrator\Desktop\AIGC-jubianage-agent-clean.git"
$originalRepoPath = "C:\Users\Administrator\Desktop\AIGC-jubianage-agent"

if (Test-Path $bareRepoPath) {
    Write-Host "   裸仓库已存在，删除旧版本..." -ForegroundColor Yellow
    Remove-Item -Path $bareRepoPath -Recurse -Force
}

Write-Host "   正在克隆..." -ForegroundColor Yellow
Set-Location $originalRepoPath
git clone --mirror . $bareRepoPath

if (-not (Test-Path $bareRepoPath)) {
    Write-Host "   错误: 克隆失败" -ForegroundColor Red
    exit 1
}

Write-Host "   克隆完成: $bareRepoPath" -ForegroundColor Green
Write-Host ""

# Step 2: Use BFG to delete large files and directories
Write-Host "3. 使用 BFG 删除大文件和目录..." -ForegroundColor Yellow
Write-Host "   这可能需要几分钟..." -ForegroundColor Red
Write-Host ""

Set-Location $bareRepoPath

# Delete USB Files directory
Write-Host "   正在删除: USB Files/" -ForegroundColor Yellow
java -jar $bfgJar --delete-folders "USB Files" .

# Delete Chiefavefan directory
Write-Host "   正在删除: Chiefavefan/" -ForegroundColor Yellow
java -jar $bfgJar --delete-folders "Chiefavefan" .

# Delete milvus/volumes directory
Write-Host "   正在删除: milvus/volumes/" -ForegroundColor Yellow
java -jar $bfgJar --delete-folders "milvus/volumes" .

# Delete Models/*.safetensors files
Write-Host "   正在删除: Models/*.safetensors" -ForegroundColor Yellow
java -jar $bfgJar --delete-files "*.safetensors" .

Write-Host ""
Write-Host "4. 清理 Git 引用和垃圾回收..." -ForegroundColor Yellow
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "BFG 清理完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Step 3: Replace original repository
Write-Host "5. 替换原始仓库..." -ForegroundColor Yellow
Write-Host "   警告: 这将替换当前仓库的历史记录" -ForegroundColor Red
Write-Host "   是否继续？(Y/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "Y" -or $response -eq "y") {
    Set-Location $originalRepoPath
    
    # Backup current repository
    $backupPath = "$originalRepoPath-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "   创建备份: $backupPath" -ForegroundColor Yellow
    Copy-Item -Path $originalRepoPath -Destination $backupPath -Recurse
    
    # Remove .git directory
    Remove-Item -Path "$originalRepoPath\.git" -Recurse -Force
    
    # Copy cleaned .git from bare repository
    Copy-Item -Path "$bareRepoPath\*" -Destination "$originalRepoPath\.git" -Recurse -Force
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "清理完成！现在可以推送了:" -ForegroundColor Green
    Write-Host "  git push origin main --force" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "已取消替换操作" -ForegroundColor Yellow
    Write-Host "清理后的仓库在: $bareRepoPath" -ForegroundColor Yellow
    Write-Host "你可以手动合并或替换" -ForegroundColor Yellow
}

Set-Location $originalRepoPath

