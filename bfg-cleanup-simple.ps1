# Simple BFG cleanup script
# BFG JAR: E:\bfg-1.14.0.jar

$bfgJar = "E:\bfg-1.14.0.jar"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BFG Repo-Cleaner 清理脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check BFG JAR
if (-not (Test-Path $bfgJar)) {
    Write-Host "错误: 找不到 BFG JAR 文件" -ForegroundColor Red
    Write-Host "路径: $bfgJar" -ForegroundColor Yellow
    exit 1
}

Write-Host "找到 BFG: $bfgJar" -ForegroundColor Green
Write-Host ""

# Check Java
Write-Host "1. 检查 Java..." -ForegroundColor Yellow
try {
    java -version 2>&1 | Out-Null
    Write-Host "   Java 已安装" -ForegroundColor Green
} catch {
    Write-Host "   错误: 未安装 Java" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 1: Clone bare repository
Write-Host "2. 创建裸仓库..." -ForegroundColor Yellow
$bareRepo = "..\AIGC-jubianage-agent-clean.git"

if (Test-Path $bareRepo) {
    Write-Host "   删除旧的裸仓库..." -ForegroundColor Yellow
    Remove-Item -Path $bareRepo -Recurse -Force
}

Write-Host "   正在克隆..." -ForegroundColor Yellow
git clone --mirror . $bareRepo

if (-not (Test-Path $bareRepo)) {
    Write-Host "   错误: 克隆失败" -ForegroundColor Red
    exit 1
}

Write-Host "   完成" -ForegroundColor Green
Write-Host ""

# Step 2: Use BFG to clean
Write-Host "3. 使用 BFG 清理..." -ForegroundColor Yellow
Write-Host "   这可能需要几分钟..." -ForegroundColor Red
Write-Host ""

Push-Location $bareRepo

Write-Host "   删除: USB Files/" -ForegroundColor Yellow
java -jar $bfgJar --delete-folders "USB Files" .

Write-Host "   删除: Chiefavefan/" -ForegroundColor Yellow
java -jar $bfgJar --delete-folders "Chiefavefan" .

Write-Host "   删除: milvus/volumes/" -ForegroundColor Yellow
java -jar $bfgJar --delete-folders "milvus/volumes" .

Write-Host "   删除: Models/*.safetensors" -ForegroundColor Yellow
java -jar $bfgJar --delete-files "*.safetensors" .

Write-Host ""
Write-Host "4. 清理 Git 引用..." -ForegroundColor Yellow
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "清理完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "1. 进入清理后的仓库: cd ..\AIGC-jubianage-agent-clean.git" -ForegroundColor White
Write-Host "2. 强制推送到远程: git push --force" -ForegroundColor White
Write-Host ""
Write-Host "或者替换当前仓库:" -ForegroundColor Yellow
Write-Host "1. 备份当前 .git 目录" -ForegroundColor White
Write-Host "2. 复制清理后的 .git 目录到当前仓库" -ForegroundColor White
Write-Host ""

