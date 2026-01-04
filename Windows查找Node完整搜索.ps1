# Windows 完整搜索 Node.js 安装位置

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  完整搜索 Node.js 安装位置" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$found = $false
$nodePaths = @()

# 方法 1: 使用 Get-Command（最可靠）
Write-Host "方法 1: 使用 Get-Command" -ForegroundColor Yellow
try {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        Write-Host "✅ 找到 node: $($nodeCmd.Source)" -ForegroundColor Green
        $nodeDir = Split-Path -Parent $nodeCmd.Source
        Write-Host "   目录: $nodeDir" -ForegroundColor Green
        $nodePaths += $nodeDir
        $found = $true
    } else {
        Write-Host "❌ Get-Command 未找到 node" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get-Command 执行失败" -ForegroundColor Red
}

Write-Host ""

# 方法 2: 检查常见安装位置
Write-Host "方法 2: 检查常见安装位置" -ForegroundColor Yellow
$commonPaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:ProgramFiles(x86)\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "$env:APPDATA\npm\node.exe",
    "C:\nodejs\node.exe",
    "D:\nodejs\node.exe",
    "E:\nodejs\node.exe"
)

foreach ($path in $commonPaths) {
    if (Test-Path $path) {
        Write-Host "✅ 找到: $path" -ForegroundColor Green
        $nodeDir = Split-Path -Parent $path
        Write-Host "   目录: $nodeDir" -ForegroundColor Green
        if ($nodeDir -notin $nodePaths) {
            $nodePaths += $nodeDir
        }
        $found = $true
    }
}

Write-Host ""

# 方法 3: 检查 NVM for Windows
Write-Host "方法 3: 检查 NVM for Windows" -ForegroundColor Yellow
$nvmPaths = @(
    "$env:APPDATA\nvm",
    "$env:ProgramFiles\nvm",
    "C:\Program Files\nvm",
    "$env:USERPROFILE\nvm"
)

foreach ($nvmPath in $nvmPaths) {
    if (Test-Path $nvmPath) {
        Write-Host "✅ 找到 NVM 安装: $nvmPath" -ForegroundColor Green
        
        # 查找已安装的 Node.js 版本
        $versions = Get-ChildItem "$nvmPath" -Directory -ErrorAction SilentlyContinue | Where-Object { 
            $_.Name -match '^v?\d+\.\d+\.\d+' -or $_.Name -match '^\d+\.\d+\.\d+'
        }
        
        if ($versions) {
            Write-Host "   已安装的版本:" -ForegroundColor Cyan
            foreach ($version in $versions) {
                $nodeExe = Join-Path $version.FullName "node.exe"
                if (Test-Path $nodeExe) {
                    Write-Host "   - $($version.Name): $nodeExe" -ForegroundColor White
                    $nodeDir = Split-Path -Parent $nodeExe
                    if ($nodeDir -notin $nodePaths) {
                        $nodePaths += $nodeDir
                    }
                    $found = $true
                }
            }
        }
    }
}

Write-Host ""

# 方法 4: 搜索整个系统（可能需要较长时间）
Write-Host "方法 4: 搜索系统盘（可能需要几分钟）" -ForegroundColor Yellow
Write-Host "正在搜索 C:\ 盘..." -ForegroundColor Gray

try {
    $searchPaths = @("C:\Program Files", "C:\Program Files (x86)", "$env:LOCALAPPDATA\Programs")
    foreach ($searchPath in $searchPaths) {
        if (Test-Path $searchPath) {
            Write-Host "   搜索: $searchPath" -ForegroundColor Gray
            $results = Get-ChildItem -Path $searchPath -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue -Depth 3
            if ($results) {
                foreach ($result in $results) {
                    Write-Host "   ✅ 找到: $($result.FullName)" -ForegroundColor Green
                    $nodeDir = Split-Path -Parent $result.FullName
                    if ($nodeDir -notin $nodePaths) {
                        $nodePaths += $nodeDir
                    }
                    $found = $true
                }
            }
        }
    }
} catch {
    Write-Host "   ⚠️  搜索过程中出现错误（可能需要管理员权限）" -ForegroundColor Yellow
}

Write-Host ""

# 方法 5: 检查 Chocolatey 安装
Write-Host "方法 5: 检查 Chocolatey 安装" -ForegroundColor Yellow
$chocoPath = "C:\ProgramData\chocolatey\lib\nodejs"
if (Test-Path $chocoPath) {
    Write-Host "✅ 找到 Chocolatey Node.js: $chocoPath" -ForegroundColor Green
    $nodeExe = Get-ChildItem -Path $chocoPath -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($nodeExe) {
        Write-Host "   node.exe: $($nodeExe.FullName)" -ForegroundColor Green
        $nodeDir = Split-Path -Parent $nodeExe.FullName
        if ($nodeDir -notin $nodePaths) {
            $nodePaths += $nodeDir
        }
        $found = $true
    }
} else {
    Write-Host "ℹ️  未找到 Chocolatey 安装" -ForegroundColor Gray
}

Write-Host ""

# 方法 6: 检查 Scoop 安装
Write-Host "方法 6: 检查 Scoop 安装" -ForegroundColor Yellow
$scoopPath = "$env:USERPROFILE\scoop\apps\nodejs"
if (Test-Path $scoopPath) {
    Write-Host "✅ 找到 Scoop Node.js: $scoopPath" -ForegroundColor Green
    $nodeExe = Get-ChildItem -Path $scoopPath -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($nodeExe) {
        Write-Host "   node.exe: $($nodeExe.FullName)" -ForegroundColor Green
        $nodeDir = Split-Path -Parent $nodeExe.FullName
        if ($nodeDir -notin $nodePaths) {
            $nodePaths += $nodePaths
        }
        $found = $true
    }
} else {
    Write-Host "ℹ️  未找到 Scoop 安装" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  搜索结果总结" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($found) {
    Write-Host "✅ 找到 Node.js 安装位置：" -ForegroundColor Green
    foreach ($path in $nodePaths) {
        Write-Host "   - $path" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "配置 PATH 的命令：" -ForegroundColor Yellow
    foreach ($path in $nodePaths) {
        Write-Host '$nodePath = "' + $path + '"' -ForegroundColor White
        Write-Host '$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")' -ForegroundColor White
        Write-Host '[Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "User")' -ForegroundColor White
        Write-Host ""
    }
} else {
    Write-Host "❌ 未找到 Node.js 安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "建议安装方式：" -ForegroundColor Yellow
    Write-Host "1. 官网下载安装（推荐）：" -ForegroundColor White
    Write-Host "   https://nodejs.org/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. 使用 Chocolatey：" -ForegroundColor White
    Write-Host "   choco install nodejs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. 使用 NVM for Windows：" -ForegroundColor White
    Write-Host "   https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. 使用 Scoop：" -ForegroundColor White
    Write-Host "   scoop install nodejs" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan




