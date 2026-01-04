# 配置 D:\ 的 Node.js 到 PATH

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  配置 Node.js 到 PATH" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$nodePath = "D:\"
$nodeExe = "D:\node.exe"

Write-Host "Node.js 路径: $nodeExe" -ForegroundColor Yellow
Write-Host ""

# 验证文件是否存在
if (Test-Path $nodeExe) {
    Write-Host "✅ 确认 node.exe 存在" -ForegroundColor Green
    
    # 获取版本
    try {
        $version = & $nodeExe --version 2>&1
        Write-Host "✅ Node.js 版本: $version" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  无法获取版本" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  添加到 PATH" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # 检查是否已在 PATH 中
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($currentPath -like "*$nodePath*") {
        Write-Host "ℹ️  D:\ 已在 PATH 中" -ForegroundColor Yellow
        Write-Host "当前 PATH: $currentPath" -ForegroundColor Gray
    } else {
        # 添加到 PATH
        $newPath = "$currentPath;$nodePath"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "✅ 已添加到用户 PATH" -ForegroundColor Green
        
        # 刷新当前会话
        $env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Host "✅ 已刷新当前会话的 PATH" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  验证配置" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # 验证 node 命令
    try {
        $nodeVersion = node --version 2>&1
        Write-Host "✅ node 命令可用: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  node 命令不可用（需要重新打开 PowerShell）" -ForegroundColor Yellow
    }
    
    # 验证 npm 命令
    $npmExe = "D:\npm.cmd"
    if (Test-Path $npmExe) {
        try {
            $npmVersion = npm --version 2>&1
            Write-Host "✅ npm 命令可用: $npmVersion" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  npm 命令不可用（需要重新打开 PowerShell）" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ℹ️  未找到 npm.cmd（可能 npm 在其他位置）" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  重要提示" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  请关闭并重新打开 PowerShell 窗口！" -ForegroundColor Yellow
    Write-Host "   然后执行以下命令验证：" -ForegroundColor White
    Write-Host "   node --version" -ForegroundColor Cyan
    Write-Host "   npm --version" -ForegroundColor Cyan
    Write-Host ""
    
} else {
    Write-Host "❌ 未找到 node.exe: $nodeExe" -ForegroundColor Red
    Write-Host "请确认文件是否存在" -ForegroundColor Yellow
}

Write-Host ""




