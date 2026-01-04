# 直接检查 Node.js 常见安装路径

Write-Host "正在检查常见安装路径..." -ForegroundColor Yellow
Write-Host ""

$paths = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs"
)

$found = $false

foreach ($path in $paths) {
    $nodeExe = Join-Path $path "node.exe"
    Write-Host "检查: $path" -ForegroundColor Cyan
    
    if (Test-Path $nodeExe) {
        Write-Host "  ✅ 找到 node.exe!" -ForegroundColor Green
        Write-Host "  完整路径: $nodeExe" -ForegroundColor Green
        
        try {
            $version = & $nodeExe --version 2>&1
            Write-Host "  版本: $version" -ForegroundColor Green
        } catch {
            Write-Host "  (无法获取版本)" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "添加到 PATH 的命令：" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host '$nodePath = "' + $path + '"' -ForegroundColor White
        Write-Host '$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")' -ForegroundColor White
        Write-Host '[Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "User")' -ForegroundColor White
        Write-Host 'Write-Host "✅ 已添加到 PATH" -ForegroundColor Green' -ForegroundColor White
        Write-Host ""
        Write-Host "执行后，关闭并重新打开 PowerShell！" -ForegroundColor Yellow
        
        $found = $true
        break
    } else {
        Write-Host "  ❌ 未找到" -ForegroundColor Red
    }
    Write-Host ""
}

if (-not $found) {
    Write-Host "❌ 在常见位置未找到 Node.js" -ForegroundColor Red
    Write-Host ""
    Write-Host "请尝试：" -ForegroundColor Yellow
    Write-Host "1. 检查开始菜单快捷方式的属性，查看"目标"路径" -ForegroundColor White
    Write-Host "2. 以管理员身份运行搜索脚本" -ForegroundColor White
}




