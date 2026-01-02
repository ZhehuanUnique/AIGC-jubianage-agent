# BFG Repo-Cleaner 清理脚本
# 使用方法: .\bfg-cleanup.ps1

param(
    [string]$BfgJarPath = "E:\bfg-1.14.0.jar"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BFG Repo-Cleaner Git 历史清理" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check BFG JAR file
Write-Host "检查 BFG JAR 文件..." -ForegroundColor Yellow
if (-not (Test-Path $BfgJarPath)) {
    Write-Host "错误: 找不到 BFG JAR 文件" -ForegroundColor Red
    Write-Host "路径: $BfgJarPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请手动指定 BFG JAR 文件的完整路径:" -ForegroundColor Yellow
    Write-Host "  .\bfg-cleanup.ps1 -BfgJarPath `"E:\你的路径\bfg-1.14.0.jar`"" -ForegroundColor White
    exit 1
}

Write-Host "找到 BFG: $BfgJarPath" -ForegroundColor Green
Write-Host ""

# Check Java
Write-Host "检查 Java 环境..." -ForegroundColor Yellow
try {
    $javaCheck = java -version 2>&1
    Write-Host "Java 已安装" -ForegroundColor Green
} catch {
    Write-Host "错误: 未找到 Java" -ForegroundColor Red
    Write-Host "请先安装 Java: https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Create bare repository
Write-Host "1. 创建裸仓库..." -ForegroundColor Yellow
$bareRepoPath = Join-Path $PSScriptRoot "..\AIGC-jubianage-agent-clean.git"

if (Test-Path $bareRepoPath) {
    Write-Host "   删除旧的裸仓库..." -ForegroundColor Yellow
    Remove-Item -Path $bareRepoPath -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "   正在克隆当前仓库为裸仓库..." -ForegroundColor Yellow
git clone --mirror . $bareRepoPath

if (-not (Test-Path $bareRepoPath)) {
    Write-Host "   错误: 克隆失败" -ForegroundColor Red
    exit 1
}

Write-Host "   完成: $bareRepoPath" -ForegroundColor Green
Write-Host ""

# Use BFG to clean
Write-Host "2. 使用 BFG 清理大文件和目录..." -ForegroundColor Yellow
Write-Host "   这可能需要几分钟，请耐心等待..." -ForegroundColor Red
Write-Host ""

Push-Location $bareRepoPath

Write-Host "   删除: USB Files/" -ForegroundColor Yellow
java -jar $BfgJarPath --delete-folders "USB Files" .

Write-Host "   删除: Chiefavefan/" -ForegroundColor Yellow
java -jar $BfgJarPath --delete-folders "Chiefavefan" .

Write-Host "   删除: milvus/volumes/" -ForegroundColor Yellow
java -jar $BfgJarPath --delete-folders "milvus/volumes" .

Write-Host "   删除: Models/*.safetensors" -ForegroundColor Yellow
java -jar $BfgJarPath --delete-files "*.safetensors" .

Write-Host ""
Write-Host "3. 清理 Git 引用和垃圾回收..." -ForegroundColor Yellow
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "清理完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "清理后的仓库位置: $bareRepoPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "下一步操作（选择其一）:" -ForegroundColor Cyan
Write-Host ""
Write-Host "方案 A: 直接推送清理后的仓库" -ForegroundColor Yellow
Write-Host "  cd `"$bareRepoPath`"" -ForegroundColor White
Write-Host "  git remote set-url origin https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git" -ForegroundColor White
Write-Host "  git push --force" -ForegroundColor White
Write-Host ""
Write-Host "方案 B: 替换当前仓库" -ForegroundColor Yellow
Write-Host "  1. 备份当前 .git 目录" -ForegroundColor White
Write-Host "  2. 删除当前 .git 目录" -ForegroundColor White
Write-Host "  3. 复制清理后的 .git 目录" -ForegroundColor White
Write-Host "  4. 运行: git push origin main --force" -ForegroundColor White
Write-Host ""

