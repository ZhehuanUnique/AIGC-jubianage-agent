# 从开始菜单快捷方式查找 Node.js 实际安装路径

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  从快捷方式查找 Node.js 实际路径" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$shortcutPath = "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Node.js"

Write-Host "检查开始菜单路径: $shortcutPath" -ForegroundColor Yellow
Write-Host ""

if (Test-Path $shortcutPath) {
    Write-Host "✅ 找到 Node.js 开始菜单文件夹" -ForegroundColor Green
    Write-Host ""
    
    # 查找所有快捷方式
    $shortcuts = Get-ChildItem -Path $shortcutPath -Filter "*.lnk" -ErrorAction SilentlyContinue
    
    if ($shortcuts) {
        Write-Host "找到的快捷方式：" -ForegroundColor Cyan
        foreach ($shortcut in $shortcuts) {
            Write-Host "  - $($shortcut.Name)" -ForegroundColor White
            
            # 读取快捷方式的目标路径
            try {
                $shell = New-Object -ComObject WScript.Shell
                $link = $shell.CreateShortcut($shortcut.FullName)
                $targetPath = $link.TargetPath
                
                if ($targetPath) {
                    Write-Host "    目标: $targetPath" -ForegroundColor Green
                    
                    # 如果目标是 node.exe，获取其目录
                    if ($targetPath -like "*node.exe") {
                        $nodeDir = Split-Path -Parent $targetPath
                        Write-Host "    ✅ Node.js 实际安装目录: $nodeDir" -ForegroundColor Green
                        
                        # 验证 node.exe 是否存在
                        if (Test-Path $targetPath) {
                            Write-Host "    ✅ node.exe 存在" -ForegroundColor Green
                            try {
                                $version = & $targetPath --version 2>&1
                                Write-Host "    版本: $version" -ForegroundColor Green
                            } catch {
                                Write-Host "    (无法获取版本)" -ForegroundColor Gray
                            }
                        } else {
                            Write-Host "    ❌ node.exe 不存在（可能已移动）" -ForegroundColor Red
                        }
                    }
                }
            } catch {
                Write-Host "    ⚠️  无法读取快捷方式" -ForegroundColor Yellow
            }
            Write-Host ""
        }
    } else {
        Write-Host "⚠️  未找到快捷方式文件" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ 开始菜单路径不存在" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  根据常见安装位置推断" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Node.js 通常安装在以下位置
$commonInstallPaths = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs"
)

foreach ($path in $commonInstallPaths) {
    $nodeExe = Join-Path $path "node.exe"
    Write-Host "检查: $path" -ForegroundColor Yellow
    if (Test-Path $nodeExe) {
        Write-Host "  ✅ 找到 node.exe: $nodeExe" -ForegroundColor Green
        try {
            $version = & $nodeExe --version 2>&1
            Write-Host "  版本: $version" -ForegroundColor Green
        } catch {}
        
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "  配置 PATH 的命令" -ForegroundColor Cyan
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host '$nodePath = "' + $path + '"' -ForegroundColor Green
        Write-Host '$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")' -ForegroundColor Green
        Write-Host 'if ($currentPath -notlike "*$nodePath*") {' -ForegroundColor Green
        Write-Host '    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "User")' -ForegroundColor Green
        Write-Host '    Write-Host "✅ 已添加到 PATH: $nodePath" -ForegroundColor Green' -ForegroundColor Green
        Write-Host '} else {' -ForegroundColor Green
        Write-Host '    Write-Host "ℹ️  已在 PATH 中" -ForegroundColor Yellow' -ForegroundColor Green
        Write-Host '}' -ForegroundColor Green
        Write-Host ""
        Write-Host "执行后，关闭并重新打开 PowerShell 窗口！" -ForegroundColor Yellow
        break
    } else {
        Write-Host "  ❌ 未找到" -ForegroundColor Gray
    }
}

Write-Host ""




