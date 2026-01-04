# 修正 Node.js PATH 配置

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  修正 Node.js PATH 配置" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 获取当前 PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
Write-Host "当前用户 PATH:" -ForegroundColor Yellow
Write-Host $currentPath -ForegroundColor Gray
Write-Host ""

# 检查是否有错误的配置
$hasWrongPath = $currentPath -like "*D:\node.exe*"
$hasCorrectPath = $currentPath -like "*D:\;*" -or $currentPath -like "*;D:\*" -or $currentPath -eq "D:\"

if ($hasWrongPath) {
    Write-Host "❌ 发现错误配置: PATH 中包含 D:\node.exe" -ForegroundColor Red
    Write-Host "   应该添加目录 D:\，而不是文件路径 D:\node.exe" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "正在修正..." -ForegroundColor Yellow
    
    # 移除错误的路径
    $pathArray = $currentPath -split ';' | Where-Object { $_ -ne "D:\node.exe" -and $_ -ne "D:\\node.exe" }
    
    # 添加正确的路径（如果还没有）
    if ($pathArray -notcontains "D:\") {
        $pathArray += "D:\"
        Write-Host "✅ 已添加正确的路径: D:\" -ForegroundColor Green
    }
    
    # 重新组合 PATH
    $newPath = $pathArray -join ';'
    
    # 保存
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "✅ PATH 已修正" -ForegroundColor Green
    Write-Host ""
    Write-Host "修正后的 PATH:" -ForegroundColor Yellow
    Write-Host $newPath -ForegroundColor Gray
    
} elseif ($hasCorrectPath) {
    Write-Host "✅ PATH 配置正确: 已包含 D:\" -ForegroundColor Green
} else {
    Write-Host "ℹ️  PATH 中未找到 D:\，正在添加..." -ForegroundColor Yellow
    
    # 添加正确的路径
    if ($currentPath) {
        $newPath = "$currentPath;D:\"
    } else {
        $newPath = "D:\"
    }
    
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "✅ 已添加 D:\ 到 PATH" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  验证配置" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 刷新当前会话
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 验证 node.exe 是否存在
if (Test-Path "D:\node.exe") {
    Write-Host "✅ node.exe 存在: D:\node.exe" -ForegroundColor Green
    
    # 尝试获取版本
    try {
        $version = & "D:\node.exe" --version 2>&1
        Write-Host "✅ Node.js 版本: $version" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  无法获取版本" -ForegroundColor Yellow
    }
    
    # 验证 node 命令
    try {
        $nodeVersion = node --version 2>&1
        Write-Host "✅ node 命令可用: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  node 命令不可用（需要重新打开 PowerShell）" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ 未找到 node.exe: D:\node.exe" -ForegroundColor Red
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
Write-Host "如果仍然不可用，请检查：" -ForegroundColor Yellow
Write-Host "1. PATH 中应该是 D:\（目录），不是 D:\node.exe（文件）" -ForegroundColor White
Write-Host "2. 确保 D:\node.exe 文件确实存在" -ForegroundColor White
Write-Host ""




