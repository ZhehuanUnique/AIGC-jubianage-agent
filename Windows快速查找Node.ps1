# Windows 快速查找 Node.js

Write-Host "正在搜索 Node.js..." -ForegroundColor Yellow

# 检查常见位置
$paths = @(
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

$found = $false
foreach ($path in $paths) {
    $nodeExe = Join-Path $path "node.exe"
    if (Test-Path $nodeExe) {
        Write-Host "`n✅ 找到 Node.js: $nodeExe" -ForegroundColor Green
        Write-Host "   目录: $path" -ForegroundColor Green
        $found = $true
        
        # 测试版本
        try {
            $version = & $nodeExe --version 2>&1
            Write-Host "   版本: $version" -ForegroundColor Green
        } catch {
            Write-Host "   (无法获取版本)" -ForegroundColor Gray
        }
    }
}

# 检查 NVM
$nvmPath = "$env:APPDATA\nvm"
if (Test-Path $nvmPath) {
    Write-Host "`n✅ 找到 NVM: $nvmPath" -ForegroundColor Green
    $versions = Get-ChildItem $nvmPath -Directory | Where-Object { $_.Name -match '^\d+\.\d+\.\d+' }
    if ($versions) {
        Write-Host "   已安装版本:" -ForegroundColor Cyan
        foreach ($v in $versions) {
            $nodeExe = Join-Path $v.FullName "node.exe"
            if (Test-Path $nodeExe) {
                Write-Host "   - $($v.Name): $nodeExe" -ForegroundColor White
                $found = $true
            }
        }
    }
}

if (-not $found) {
    Write-Host "`n❌ 未找到 Node.js" -ForegroundColor Red
    Write-Host "`n建议安装：" -ForegroundColor Yellow
    Write-Host "1. 官网: https://nodejs.org/" -ForegroundColor Cyan
    Write-Host "2. Chocolatey: choco install nodejs" -ForegroundColor Cyan
}




