# 深度搜索 Node.js 或提供安装指南

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  深度搜索 Node.js 或安装指南" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$found = $false
$foundPaths = @()

# 1. 检查所有可能的安装位置
Write-Host "[1/5] 检查所有常见安装位置..." -ForegroundColor Yellow

$allPaths = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "$env:ProgramFiles\nodejs",
    "$env:ProgramFiles(x86)\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:APPDATA\npm",
    "C:\nodejs",
    "D:\nodejs",
    "E:\nodejs",
    "F:\nodejs"
)

foreach ($path in $allPaths) {
    $nodeExe = Join-Path $path "node.exe"
    if (Test-Path $nodeExe) {
        Write-Host "   ✅ 找到: $nodeExe" -ForegroundColor Green
        $foundPaths += $path
        $found = $true
        try {
            $version = & $nodeExe --version 2>&1
            Write-Host "      版本: $version" -ForegroundColor Green
        } catch {}
    }
}

# 2. 检查 NVM
Write-Host "`n[2/5] 检查 NVM for Windows..." -ForegroundColor Yellow
$nvmPath = "$env:APPDATA\nvm"
if (Test-Path $nvmPath) {
    Write-Host "   ✅ 找到 NVM: $nvmPath" -ForegroundColor Green
    $versions = Get-ChildItem $nvmPath -Directory -ErrorAction SilentlyContinue | Where-Object { 
        $_.Name -match '^\d+\.\d+\.\d+' -or $_.Name -match '^v\d+\.\d+\.\d+'
    }
    if ($versions) {
        foreach ($v in $versions) {
            $nodeExe = Join-Path $v.FullName "node.exe"
            if (Test-Path $nodeExe) {
                Write-Host "      ✅ 版本 $($v.Name): $nodeExe" -ForegroundColor Green
                $foundPaths += $v.FullName
                $found = $true
            }
        }
    }
} else {
    Write-Host "   ❌ 未找到 NVM" -ForegroundColor Gray
}

# 3. 检查注册表
Write-Host "`n[3/5] 检查注册表..." -ForegroundColor Yellow
try {
    $regNodes = Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue | 
        Where-Object { $_.DisplayName -like "*Node*" -or $_.DisplayName -like "*nodejs*" }
    
    if ($regNodes) {
        foreach ($node in $regNodes) {
            Write-Host "   ✅ 找到安装记录: $($node.DisplayName)" -ForegroundColor Green
            if ($node.InstallLocation) {
                $nodeExe = Join-Path $node.InstallLocation "node.exe"
                if (Test-Path $nodeExe) {
                    Write-Host "      位置: $($node.InstallLocation)" -ForegroundColor Green
                    $foundPaths += $node.InstallLocation
                    $found = $true
                } else {
                    Write-Host "      ⚠️  注册表有记录但文件不存在（可能已卸载）" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "   ❌ 注册表中未找到" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  无法访问注册表（可能需要管理员权限）" -ForegroundColor Yellow
}

# 4. 搜索整个系统盘（需要时间）
Write-Host "`n[4/5] 深度搜索系统盘（这可能需要几分钟）..." -ForegroundColor Yellow
Write-Host "   正在搜索 C:\Program Files..." -ForegroundColor Gray

try {
    $results = Get-ChildItem -Path "C:\Program Files" -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue -Depth 3 | Select-Object -First 3
    if ($results) {
        foreach ($result in $results) {
            Write-Host "   ✅ 找到: $($result.FullName)" -ForegroundColor Green
            $dir = Split-Path -Parent $result.FullName
            if ($dir -notin $foundPaths) {
                $foundPaths += $dir
                $found = $true
            }
        }
    } else {
        Write-Host "   ❌ 未找到" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  搜索失败（可能需要管理员权限）" -ForegroundColor Yellow
}

# 5. 检查开始菜单快捷方式
Write-Host "`n[5/5] 检查开始菜单快捷方式..." -ForegroundColor Yellow
$startMenuPath = "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Node.js"
if (Test-Path $startMenuPath) {
    Write-Host "   ✅ 找到开始菜单文件夹" -ForegroundColor Green
    $shortcuts = Get-ChildItem -Path $startMenuPath -Filter "*.lnk" -ErrorAction SilentlyContinue
    if ($shortcuts) {
        foreach ($shortcut in $shortcuts) {
            try {
                $shell = New-Object -ComObject WScript.Shell
                $link = $shell.CreateShortcut($shortcut.FullName)
                $targetPath = $link.TargetPath
                if ($targetPath -and $targetPath -like "*node.exe") {
                    Write-Host "      快捷方式指向: $targetPath" -ForegroundColor Green
                    $dir = Split-Path -Parent $targetPath
                    if ($dir -notin $foundPaths) {
                        $foundPaths += $dir
                        $found = $true
                    }
                }
            } catch {}
        }
    }
} else {
    Write-Host "   ❌ 未找到开始菜单文件夹" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  搜索结果" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($found) {
    Write-Host "✅ 找到 Node.js 安装位置：" -ForegroundColor Green
    $uniquePaths = $foundPaths | Sort-Object -Unique
    foreach ($path in $uniquePaths) {
        Write-Host "   📁 $path" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  添加到 PATH 的命令" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($path in $uniquePaths) {
        Write-Host "# 添加路径: $path" -ForegroundColor Yellow
        Write-Host '$nodePath = "' + $path + '"' -ForegroundColor Green
        Write-Host '$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")' -ForegroundColor Green
        Write-Host 'if ($currentPath -notlike "*$nodePath*") {' -ForegroundColor Green
        Write-Host '    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "User")' -ForegroundColor Green
        Write-Host '    Write-Host "✅ 已添加到 PATH" -ForegroundColor Green' -ForegroundColor Green
        Write-Host '} else {' -ForegroundColor Green
        Write-Host '    Write-Host "ℹ️  已在 PATH 中" -ForegroundColor Yellow' -ForegroundColor Green
        Write-Host '}' -ForegroundColor Green
        Write-Host ""
    }
    
    Write-Host "执行后，关闭并重新打开 PowerShell 窗口！" -ForegroundColor Yellow
    
} else {
    Write-Host "❌ 未找到 Node.js 安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  安装 Node.js" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "方法 1: 官网下载安装（推荐）" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "1. 访问: https://nodejs.org/" -ForegroundColor White
    Write-Host "2. 下载 LTS 版本（长期支持版）" -ForegroundColor White
    Write-Host "3. 运行安装程序，按默认选项安装" -ForegroundColor White
    Write-Host "4. 安装时会自动添加到 PATH" -ForegroundColor White
    Write-Host "5. 安装完成后重启 PowerShell" -ForegroundColor White
    Write-Host ""
    
    Write-Host "方法 2: 使用 Chocolatey（如果已安装）" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "choco install nodejs" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "方法 3: 使用 NVM for Windows（推荐用于多版本管理）" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "1. 下载: https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor White
    Write-Host "2. 安装 nvm-setup.exe" -ForegroundColor White
    Write-Host "3. 打开新的 PowerShell，执行:" -ForegroundColor White
    Write-Host "   nvm install 20.19.6" -ForegroundColor Cyan
    Write-Host "   nvm use 20.19.6" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "方法 4: 使用 Scoop（如果已安装）" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "scoop install nodejs" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  安装后验证" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "安装完成后，关闭并重新打开 PowerShell，然后执行：" -ForegroundColor White
    Write-Host "  node --version" -ForegroundColor Cyan
    Write-Host "  npm --version" -ForegroundColor Cyan
    Write-Host ""
}




