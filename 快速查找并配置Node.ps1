# 快速查找并配置 Node.js

$found = $false
$paths = @()

# 搜索所有可能的位置
$searchLocations = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "$env:ProgramFiles\nodejs",
    "$env:ProgramFiles(x86)\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:APPDATA\npm",
    "C:\nodejs",
    "D:\nodejs",
    "E:\nodejs"
)

Write-Host "正在搜索 Node.js..." -ForegroundColor Yellow

foreach ($loc in $searchLocations) {
    $nodeExe = Join-Path $loc "node.exe"
    if (Test-Path $nodeExe) {
        Write-Host "`n✅ 找到: $nodeExe" -ForegroundColor Green
        $paths += $loc
        $found = $true
        try {
            $v = & $nodeExe --version 2>&1
            Write-Host "   版本: $v" -ForegroundColor Green
        } catch {}
    }
}

# 检查 NVM
$nvmPath = "$env:APPDATA\nvm"
if (Test-Path $nvmPath) {
    Write-Host "`n✅ 找到 NVM: $nvmPath" -ForegroundColor Green
    $vers = Get-ChildItem $nvmPath -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^\d+\.\d+\.\d+' }
    foreach ($v in $vers) {
        $nodeExe = Join-Path $v.FullName "node.exe"
        if (Test-Path $nodeExe) {
            Write-Host "   版本 $($v.Name): $nodeExe" -ForegroundColor Green
            $paths += $v.FullName
            $found = $true
        }
    }
}

# 检查注册表
try {
    $reg = Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue | 
        Where-Object { $_.DisplayName -like "*Node*" }
    if ($reg) {
        foreach ($r in $reg) {
            if ($r.InstallLocation) {
                $nodeExe = Join-Path $r.InstallLocation "node.exe"
                if (Test-Path $nodeExe) {
                    Write-Host "`n✅ 注册表找到: $($r.InstallLocation)" -ForegroundColor Green
                    $paths += $r.InstallLocation
                    $found = $true
                }
            }
        }
    }
} catch {}

if ($found) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "找到的 Node.js 路径：" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    $uniquePaths = $paths | Sort-Object -Unique
    foreach ($p in $uniquePaths) {
        Write-Host "📁 $p" -ForegroundColor White
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "添加到 PATH 的命令：" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    foreach ($p in $uniquePaths) {
        Write-Host "`n# 添加路径: $p" -ForegroundColor Yellow
        Write-Host '$nodePath = "' + $p + '"' -ForegroundColor Green
        Write-Host '$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")' -ForegroundColor Green
        Write-Host 'if ($currentPath -notlike "*$nodePath*") {' -ForegroundColor Green
        Write-Host '    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "User")' -ForegroundColor Green
        Write-Host '    Write-Host "✅ 已添加到 PATH: $nodePath" -ForegroundColor Green' -ForegroundColor Green
        Write-Host '} else {' -ForegroundColor Green
        Write-Host '    Write-Host "ℹ️  已在 PATH 中" -ForegroundColor Yellow' -ForegroundColor Green
        Write-Host '}' -ForegroundColor Green
    }
    
    Write-Host "`n执行后，关闭并重新打开 PowerShell 窗口！" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ 未找到 Node.js" -ForegroundColor Red
    Write-Host "`n请尝试以管理员身份运行此脚本，或手动检查其他位置。" -ForegroundColor Yellow
}




