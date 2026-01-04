# Windows 查找 Node.js 安装路径

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  查找 Node.js 安装位置" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 方法 1: 使用 where 命令
Write-Host "方法 1: 使用 where 命令" -ForegroundColor Yellow
try {
    $nodePath = where.exe node 2>$null | Select-Object -First 1
    if ($nodePath) {
        Write-Host "✅ 找到 node: $nodePath" -ForegroundColor Green
        $nodeDir = Split-Path -Parent $nodePath
        Write-Host "   目录: $nodeDir" -ForegroundColor Green
    } else {
        Write-Host "❌ 未找到 node 命令" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ where 命令执行失败" -ForegroundColor Red
}

Write-Host ""

# 方法 2: 检查常见位置
Write-Host "方法 2: 检查常见位置" -ForegroundColor Yellow
$commonPaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:APPDATA\npm\node.exe",
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:ProgramFiles(x86)\nodejs\node.exe"
)

$found = $false
foreach ($path in $commonPaths) {
    if (Test-Path $path) {
        Write-Host "✅ 找到: $path" -ForegroundColor Green
        $nodeDir = Split-Path -Parent $path
        Write-Host "   目录: $nodeDir" -ForegroundColor Green
        $found = $true
    }
}

if (-not $found) {
    Write-Host "❌ 在常见位置未找到 Node.js" -ForegroundColor Red
}

Write-Host ""

# 方法 3: 检查 NVM for Windows
Write-Host "方法 3: 检查 NVM for Windows" -ForegroundColor Yellow
$nvmPath = "$env:APPDATA\nvm"
if (Test-Path $nvmPath) {
    Write-Host "✅ 找到 NVM 安装: $nvmPath" -ForegroundColor Green
    
    # 查找已安装的 Node.js 版本
    $nvmVersions = Get-ChildItem "$nvmPath" -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^v?\d+\.\d+\.\d+' }
    if ($nvmVersions) {
        Write-Host "   已安装的版本:" -ForegroundColor Cyan
        foreach ($version in $nvmVersions) {
            $nodeExe = Join-Path $version.FullName "node.exe"
            if (Test-Path $nodeExe) {
                Write-Host "   - $($version.Name): $nodeExe" -ForegroundColor White
            }
        }
    }
} else {
    Write-Host "ℹ️  未找到 NVM for Windows" -ForegroundColor Gray
}

Write-Host ""

# 方法 4: 使用 Get-Command
Write-Host "方法 4: 使用 Get-Command" -ForegroundColor Yellow
try {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        Write-Host "✅ 找到 node: $($nodeCmd.Source)" -ForegroundColor Green
        $nodeDir = Split-Path -Parent $nodeCmd.Source
        Write-Host "   目录: $nodeDir" -ForegroundColor Green
    } else {
        Write-Host "❌ Get-Command 未找到 node" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get-Command 执行失败" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  配置 PATH 的建议" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 如果找到了路径，提供配置命令
$nodeDir = $null
try {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        $nodeDir = Split-Path -Parent $nodeCmd.Source
    }
} catch {}

if ($nodeDir) {
    Write-Host "检测到 Node.js 目录: $nodeDir" -ForegroundColor Green
    Write-Host ""
    Write-Host "添加到 PATH 的命令：" -ForegroundColor Yellow
    Write-Host '$nodePath = "' + $nodeDir + '"' -ForegroundColor White
    Write-Host '$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")' -ForegroundColor White
    Write-Host '[Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "User")' -ForegroundColor White
    Write-Host ""
    Write-Host "或者使用图形界面：" -ForegroundColor Yellow
    Write-Host "1. Win+R -> sysdm.cpl -> 环境变量" -ForegroundColor White
    Write-Host "2. 编辑用户变量 Path" -ForegroundColor White
    Write-Host "3. 添加: $nodeDir" -ForegroundColor White
} else {
    Write-Host "未找到 Node.js，请先安装 Node.js" -ForegroundColor Red
    Write-Host ""
    Write-Host "安装方式：" -ForegroundColor Yellow
    Write-Host "1. 官网下载: https://nodejs.org/" -ForegroundColor White
    Write-Host "2. 使用 NVM for Windows: https://github.com/coreybutler/nvm-windows" -ForegroundColor White
    Write-Host "3. 使用 Chocolatey: choco install nodejs" -ForegroundColor White
}




