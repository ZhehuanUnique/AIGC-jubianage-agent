# IndexTTS2.5 快速启动脚本（使用国内镜像源）

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "正在启动 IndexTTS2.5 服务（使用国内镜像源）..." -ForegroundColor Cyan

# 停止旧容器
docker-compose -f docker-compose.local.国内镜像.yml down 2>&1 | Out-Null

# 构建并启动
docker-compose -f docker-compose.local.国内镜像.yml up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 服务启动成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "API 地址: http://localhost:8000" -ForegroundColor Cyan
    Write-Host "健康检查: http://localhost:8000/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "查看日志: docker-compose -f docker-compose.local.国内镜像.yml logs -f" -ForegroundColor Yellow
    Write-Host "停止服务: docker-compose -f docker-compose.local.国内镜像.yml down" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ 服务启动失败" -ForegroundColor Red
    Write-Host "查看详细日志: docker-compose -f docker-compose.local.国内镜像.yml logs" -ForegroundColor Yellow
}




