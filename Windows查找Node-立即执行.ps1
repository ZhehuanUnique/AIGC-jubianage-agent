# 立即执行的 Node.js 查找脚本

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  搜索 Node.js 安装位置" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$found = $false

# 1. 检查标准安装位置
Write-Host "1. 检查标准安装位置..." -ForegroundColor Yellow
$standardPaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:ProgramFiles(x86)\nodejs\node.exe"
)

foreach ($path in $standardPaths) {
    if (Test-Path $path) {
        Write-Host "   ✅ 找到: $path" -ForegroundColor Green
        $dir = Split-Path -Parent $path
        Write-Host "      目录: $dir" -ForegroundColor Green
        $found = $true
    }
}

# 2. 检查用户目录
Write-Host "`n2. 检查用户目录..." -ForegroundColor Yellow
$userPaths = @(
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "$env:APPDATA\npm\node.exe"
)

foreach ($path in $userPaths) {
    if (Test-Path $path) {
        Write-Host "   ✅ 找到: $path" -ForegroundColor Green
        $dir = Split-Path -Parent $path
        Write-Host "      目录: $dir" -ForegroundColor Green
        $found = $true
    }
}

# 3. 检查 NVM
Write-Host "`n3. 检查 NVM for Windows..." -ForegroundColor Yellow
$nvmPath = "$env:APPDATA\nvm"
if (Test-Path $nvmPath) {
    Write-Host "   ✅ 找到 NVM: $nvmPath" -ForegroundColor Green
    $versions = Get-ChildItem $nvmPath -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^\d+\.\d+\.\d+' }
    if ($versions) {
        Write-Host "   已安装版本:" -ForegroundColor Cyan
        foreach ($v in $versions) {
            $nodeExe = Join-Path $v.FullName "node.exe"
            if (Test-Path $nodeExe) {
                Write-Host "      - $($v.Name): $nodeExe" -ForegroundColor White
                $found = $true
            }
        }
    }
} else {
    Write-Host "   ❌ 未找到 NVM" -ForegroundColor Gray
}

# 4. 检查注册表
Write-Host "`n4. 检查注册表安装信息..." -ForegroundColor Yellow
try {
    $regNodes = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like "*Node*" }
    if ($regNodes) {
        foreach ($node in $regNodes) {
            Write-Host "   ✅ 找到安装: $($node.DisplayName)" -ForegroundColor Green
            if ($node.InstallLocation) {
                Write-Host "      位置: $($node.InstallLocation)" -ForegroundColor Green
                $nodeExe = Join-Path $node.InstallLocation "node.exe"
                if (Test-Path $nodeExe) {
                    Write-Host "      node.exe: $nodeExe" -ForegroundColor Green
                    $found = $true
                }
            }
        }
    } else {
        Write-Host "   ❌ 注册表中未找到" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  无法访问注册表（可能需要管理员权限）" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan

if ($found) {
    Write-Host "✅ 找到 Node.js 安装" -ForegroundColor Green
    Write-Host "`n配置 PATH 的方法：" -ForegroundColor Yellow
    Write-Host "1. 图形界面: Win+R -> sysdm.cpl -> 环境变量" -ForegroundColor White
    Write-Host "2. PowerShell: 运行配置脚本" -ForegroundColor White
} else {
    Write-Host "❌ 未找到 Node.js 安装" -ForegroundColor Red
    Write-Host "`n建议安装：" -ForegroundColor Yellow
    Write-Host "1. 官网下载: https://nodejs.org/ (推荐 LTS 版本)" -ForegroundColor Cyan
    Write-Host "2. Chocolatey: choco install nodejs" -ForegroundColor Cyan
    Write-Host "3. NVM for Windows: https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor Cyan
}

Write-Host ""




