# IndexTTS2.5 本地 Docker 启动脚本

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  IndexTTS2.5 本地 Docker 服务启动" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否安装
Write-Host "步骤1: 检查 Docker 环境..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "✅ Docker 已安装: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker 未安装，请先安装 Docker Desktop for Windows" -ForegroundColor Red
    Write-Host "下载地址: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# 检查 Docker 是否运行
Write-Host ""
Write-Host "步骤2: 检查 Docker 服务状态..." -ForegroundColor Yellow
try {
    docker ps > $null 2>&1
    Write-Host "✅ Docker 服务正在运行" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker 服务未运行，请启动 Docker Desktop" -ForegroundColor Red
    exit 1
}

# 检查模型文件
Write-Host ""
Write-Host "步骤3: 检查模型文件..." -ForegroundColor Yellow
$checkpointsPath = "E:\IndexTTS2.5\checkpoints"
$configPath = "E:\IndexTTS2.5\checkpoints\config.yaml"

if (-not (Test-Path $checkpointsPath)) {
    Write-Host "❌ 模型目录不存在: $checkpointsPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $configPath)) {
    Write-Host "⚠️  配置文件不存在: $configPath" -ForegroundColor Yellow
    Write-Host "   请确保 checkpoints 目录包含 config.yaml" -ForegroundColor Yellow
} else {
    Write-Host "✅ 模型目录存在: $checkpointsPath" -ForegroundColor Green
    Write-Host "✅ 配置文件存在: $configPath" -ForegroundColor Green
}

# 检查 Docker Desktop 文件共享设置
Write-Host ""
Write-Host "步骤4: 检查 Docker 文件共享设置..." -ForegroundColor Yellow
Write-Host "⚠️  请确保在 Docker Desktop 中已共享 E 盘" -ForegroundColor Yellow
Write-Host "   设置路径: Docker Desktop → Settings → Resources → File Sharing" -ForegroundColor Gray
Write-Host "   添加 E 盘到共享列表" -ForegroundColor Gray
Write-Host ""

# 进入项目目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 停止旧容器（如果存在）
Write-Host "步骤5: 清理旧容器..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml down 2>&1 | Out-Null
Write-Host "✅ 清理完成" -ForegroundColor Green

# 构建镜像
Write-Host ""
Write-Host "步骤6: 构建 Docker 镜像（这可能需要几分钟）..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 镜像构建失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 镜像构建成功" -ForegroundColor Green

# 启动服务
Write-Host ""
Write-Host "步骤7: 启动服务..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 服务启动失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 服务启动成功" -ForegroundColor Green

# 等待服务启动
Write-Host ""
Write-Host "步骤8: 等待服务初始化（30秒）..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 检查服务状态
Write-Host ""
Write-Host "步骤9: 检查服务状态..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml ps

# 查看日志
Write-Host ""
Write-Host "步骤10: 查看服务日志..." -ForegroundColor Yellow
Write-Host "（按 Ctrl+C 退出日志查看）" -ForegroundColor Gray
Write-Host ""
docker-compose -f docker-compose.local.yml logs -f --tail=50




