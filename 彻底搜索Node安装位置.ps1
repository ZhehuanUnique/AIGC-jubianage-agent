# 彻底搜索 Node.js 安装位置

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  彻底搜索 Node.js 安装位置" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$foundPaths = @()

# 1. 检查标准安装位置
Write-Host "[1/6] 检查标准安装位置..." -ForegroundColor Yellow
$standardPaths = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "$env:ProgramFiles\nodejs",
    "$env:ProgramFiles(x86)\nodejs",
    "C:\nodejs",
    "D:\nodejs",
    "E:\nodejs"
)

foreach ($path in $standardPaths) {
    $nodeExe = Join-Path $path "node.exe"
    if (Test-Path $nodeExe) {
        Write-Host "   ✅ 找到: $nodeExe" -ForegroundColor Green
        $foundPaths += $path
        try {
            $version = & $nodeExe --version 2>&1
            Write-Host "      版本: $version" -ForegroundColor Green
        } catch {}
    }
}

# 2. 检查用户目录
Write-Host "`n[2/6] 检查用户目录..." -ForegroundColor Yellow
$userPaths = @(
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:APPDATA\npm",
    "$env:USERPROFILE\nodejs",
    "$env:USERPROFILE\.nodejs"
)

foreach ($path in $userPaths) {
    $nodeExe = Join-Path $path "node.exe"
    if (Test-Path $nodeExe) {
        Write-Host "   ✅ 找到: $nodeExe" -ForegroundColor Green
        $foundPaths += $path
        try {
            $version = & $nodeExe --version 2>&1
            Write-Host "      版本: $version" -ForegroundColor Green
        } catch {}
    }
}

# 3. 检查 NVM for Windows
Write-Host "`n[3/6] 检查 NVM for Windows..." -ForegroundColor Yellow
$nvmPaths = @(
    "$env:APPDATA\nvm",
    "$env:ProgramFiles\nvm",
    "C:\Program Files\nvm",
    "$env:USERPROFILE\nvm"
)

foreach ($nvmPath in $nvmPaths) {
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
                    try {
                        $version = & $nodeExe --version 2>&1
                        Write-Host "         版本: $version" -ForegroundColor Green
                    } catch {}
                }
            }
        }
    }
}

# 4. 检查注册表
Write-Host "`n[4/6] 检查注册表安装信息..." -ForegroundColor Yellow
try {
    $regNodes = Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue | 
        Where-Object { $_.DisplayName -like "*Node*" -or $_.DisplayName -like "*nodejs*" }
    
    if ($regNodes) {
        foreach ($node in $regNodes) {
            Write-Host "   ✅ 找到安装: $($node.DisplayName)" -ForegroundColor Green
            if ($node.InstallLocation) {
                $nodeExe = Join-Path $node.InstallLocation "node.exe"
                if (Test-Path $nodeExe) {
                    Write-Host "      位置: $($node.InstallLocation)" -ForegroundColor Green
                    $foundPaths += $node.InstallLocation
                }
            }
        }
    } else {
        Write-Host "   ❌ 注册表中未找到" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  无法访问注册表（可能需要管理员权限）" -ForegroundColor Yellow
}

# 5. 检查 Chocolatey
Write-Host "`n[5/6] 检查 Chocolatey 安装..." -ForegroundColor Yellow
$chocoPaths = @(
    "C:\ProgramData\chocolatey\lib\nodejs",
    "C:\ProgramData\chocolatey\lib\nodejs.install"
)

foreach ($chocoPath in $chocoPaths) {
    if (Test-Path $chocoPath) {
        Write-Host "   ✅ 找到 Chocolatey 安装: $chocoPath" -ForegroundColor Green
        $nodeExe = Get-ChildItem -Path $chocoPath -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($nodeExe) {
            Write-Host "      node.exe: $($nodeExe.FullName)" -ForegroundColor Green
            $dir = Split-Path -Parent $nodeExe.FullName
            $foundPaths += $dir
        }
    }
}

# 6. 深度搜索系统盘（可能需要时间）
Write-Host "`n[6/6] 深度搜索系统盘（这可能需要几分钟）..." -ForegroundColor Yellow
Write-Host "   正在搜索 C:\Program Files 和 C:\Program Files (x86)..." -ForegroundColor Gray

$searchPaths = @("C:\Program Files", "C:\Program Files (x86)")
foreach ($searchPath in $searchPaths) {
    if (Test-Path $searchPath) {
        try {
            $results = Get-ChildItem -Path $searchPath -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue -Depth 3 | Select-Object -First 5
            if ($results) {
                foreach ($result in $results) {
                    Write-Host "   ✅ 找到: $($result.FullName)" -ForegroundColor Green
                    $dir = Split-Path -Parent $result.FullName
                    if ($dir -notin $foundPaths) {
                        $foundPaths += $dir
                    }
                }
            }
        } catch {
            Write-Host "   ⚠️  搜索 $searchPath 时出错（可能需要管理员权限）" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  搜索结果" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($foundPaths.Count -gt 0) {
    Write-Host "✅ 找到 $($foundPaths.Count) 个 Node.js 安装位置：" -ForegroundColor Green
    Write-Host ""
    
    # 去重并排序
    $uniquePaths = $foundPaths | Sort-Object -Unique
    
    foreach ($path in $uniquePaths) {
        Write-Host "📁 $path" -ForegroundColor Cyan
        $nodeExe = Join-Path $path "node.exe"
        if (Test-Path $nodeExe) {
            try {
                $version = & $nodeExe --version 2>&1
                Write-Host "   版本: $version" -ForegroundColor Green
            } catch {
                Write-Host "   (无法获取版本)" -ForegroundColor Gray
            }
        }
        Write-Host ""
    }
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  配置 PATH 的方法" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "方法 1: PowerShell 命令（推荐）" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    foreach ($path in $uniquePaths) {
        Write-Host '$nodePath = "' + $path + '"' -ForegroundColor White
        Write-Host '$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")' -ForegroundColor White
        Write-Host 'if ($currentPath -notlike "*$nodePath*") {' -ForegroundColor White
        Write-Host '    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "User")' -ForegroundColor White
        Write-Host '    Write-Host "✅ 已添加: $nodePath" -ForegroundColor Green' -ForegroundColor White
        Write-Host '} else {' -ForegroundColor White
        Write-Host '    Write-Host "ℹ️  已在 PATH 中: $nodePath" -ForegroundColor Yellow' -ForegroundColor White
        Write-Host '}' -ForegroundColor White
        Write-Host ""
    }
    
    Write-Host "方法 2: 图形界面" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "1. 按 Win+R，输入 sysdm.cpl，回车" -ForegroundColor White
    Write-Host "2. 点击"环境变量"" -ForegroundColor White
    Write-Host "3. 在"用户变量"中找到 Path，点击"编辑"" -ForegroundColor White
    Write-Host "4. 点击"新建"，添加以下路径：" -ForegroundColor White
    foreach ($path in $uniquePaths) {
        Write-Host "   - $path" -ForegroundColor Cyan
    }
    Write-Host "5. 点击所有"确定"按钮" -ForegroundColor White
    Write-Host "6. 关闭所有 PowerShell/CMD 窗口，重新打开" -ForegroundColor White
    Write-Host ""
    
} else {
    Write-Host "❌ 未找到 Node.js 安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "1. Node.js 安装在其他驱动器（D:、E: 等）" -ForegroundColor White
    Write-Host "2. 安装路径非常规" -ForegroundColor White
    Write-Host "3. 需要管理员权限才能搜索某些位置" -ForegroundColor White
    Write-Host ""
    Write-Host "建议：" -ForegroundColor Yellow
    Write-Host "1. 以管理员身份运行 PowerShell 后重新执行此脚本" -ForegroundColor White
    Write-Host "2. 手动检查其他驱动器" -ForegroundColor White
    Write-Host "3. 检查是否通过其他方式安装（如 Docker、WSL 等）" -ForegroundColor White
}

Write-Host ""




