# 通过 SSH 更新服务器代码
# 使用方法: .\通过SSH更新服务器.ps1

param(
    [string]$ServerIP = "",
    [string]$Username = "ubuntu",
    [string]$Password = "",
    [string]$UpdateType = "quick"  # quick 或 full
)

# 如果没有提供参数，提示输入
if ([string]::IsNullOrWhiteSpace($ServerIP)) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "通过 SSH 更新服务器代码" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $ServerIP = Read-Host "请输入服务器 IP 地址"
    $Username = Read-Host "请输入用户名 (默认: ubuntu)" 
    if ([string]::IsNullOrWhiteSpace($Username)) {
        $Username = "ubuntu"
    }
    
    Write-Host ""
    Write-Host "更新类型:" -ForegroundColor Yellow
    Write-Host "  1. 快速更新 (quick) - 跳过依赖检查" -ForegroundColor Gray
    Write-Host "  2. 完整更新 (full) - 包含依赖检查" -ForegroundColor Gray
    $updateChoice = Read-Host "请选择 (1/2, 默认: 1)"
    
    if ($updateChoice -eq "2") {
        $UpdateType = "full"
    } else {
        $UpdateType = "quick"
    }
}

# 注意：如果已配置 SSH 密钥，无需密码
# 如果没有配置密钥，脚本会提示输入密码

Write-Host ""
Write-Host "正在连接到服务器: $Username@$ServerIP" -ForegroundColor Cyan
Write-Host ""

# 检查是否安装了 SSH 客户端
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 错误: 未找到 SSH 客户端" -ForegroundColor Red
    Write-Host "请安装 OpenSSH 客户端或使用 Git Bash" -ForegroundColor Yellow
    exit 1
}

# 创建临时脚本文件（在服务器上执行）
$remoteScript = @"
#!/bin/bash
set -e

cd /var/www/aigc-agent

echo "========================================"
echo "更新线上部署"
echo "========================================"
echo ""

# 1. 更新代码
echo "步骤 1: 从 GitHub 拉取最新代码..."
git pull origin main
if [ `$? -ne 0 ]; then
    echo "❌ Git pull 失败，请检查网络连接或权限"
    exit 1
fi
echo "✅ 代码已更新"
echo ""

# 2. 重启后端服务
echo "步骤 2: 重启后端服务..."
cd server
pm2 restart aigc-agent
sleep 3
echo "✅ 后端服务已重启"
echo ""

# 3. 清理并重新构建前端
echo "步骤 3: 清理并重新构建前端..."
cd ..
rm -rf dist node_modules/.vite
npm run build
if [ `$? -ne 0 ]; then
    echo "❌ 前端构建失败，请检查错误信息"
    exit 1
fi
echo "✅ 构建完成"
echo ""

# 4. 设置文件权限并重新加载 Nginx
echo "步骤 4: 设置文件权限并重新加载 Nginx..."
sudo chown -R ubuntu:ubuntu dist/
sudo systemctl reload nginx
echo "✅ 部署完成"
echo ""

echo "========================================"
echo "✅ 更新完成！"
echo "========================================"
echo ""
"@

# 如果是完整更新，添加依赖检查
if ($UpdateType -eq "full") {
    $remoteScript = @"
#!/bin/bash
set -e

cd /var/www/aigc-agent

echo "========================================"
echo "更新线上部署（完整更新）"
echo "========================================"
echo ""

# 1. 更新代码
echo "步骤 1: 从 GitHub 拉取最新代码..."
git pull origin main
if [ `$? -ne 0 ]; then
    echo "❌ Git pull 失败，请检查网络连接或权限"
    exit 1
fi
echo "✅ 代码已更新"
echo ""

# 2. 检查后端依赖
echo "步骤 2: 检查后端依赖..."
cd server
if [ -f "package.json" ]; then
    if [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null || [ ! -d "node_modules" ]; then
        echo "📦 安装后端依赖..."
        npm install
        echo "✅ 后端依赖已安装"
    else
        echo "✅ 后端依赖已是最新"
    fi
fi
echo ""

# 3. 重启后端服务
echo "步骤 3: 重启后端服务..."
pm2 restart aigc-agent
sleep 3
pm2 status aigc-agent | grep -q "online" && echo "✅ 后端服务运行正常" || echo "⚠️  后端服务可能未正常运行"
echo ""

# 4. 检查前端依赖
echo "步骤 4: 检查前端依赖..."
cd ..
if [ -f "package.json" ]; then
    if [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null || [ ! -d "node_modules" ]; then
        echo "📦 安装前端依赖..."
        npm install
        echo "✅ 前端依赖已安装"
    else
        echo "✅ 前端依赖已是最新"
    fi
fi
echo ""

# 5. 清理并重新构建前端
echo "步骤 5: 清理并重新构建前端..."
rm -rf dist node_modules/.vite
npm run build
if [ `$? -ne 0 ]; then
    echo "❌ 前端构建失败，请检查错误信息"
    exit 1
fi
echo "✅ 构建完成"
echo ""

# 6. 设置文件权限并重新加载 Nginx
echo "步骤 6: 设置文件权限并重新加载 Nginx..."
sudo chown -R ubuntu:ubuntu dist/
sudo systemctl reload nginx
if [ `$? -eq 0 ]; then
    echo "✅ Nginx 已重新加载"
else
    echo "⚠️  Nginx 重新加载失败，请检查配置"
fi
echo ""

echo "========================================"
echo "✅ 更新完成！"
echo "========================================"
echo ""
"@
}

# 将脚本保存到临时文件
$tempScript = [System.IO.Path]::GetTempFileName()
$remoteScript | Out-File -FilePath $tempScript -Encoding UTF8

# 将脚本内容通过 SSH 执行
Write-Host "正在执行更新..." -ForegroundColor Cyan
Write-Host ""

# 方法1: 如果配置了 SSH 密钥，直接执行
# 方法2: 如果没有密钥，使用 expect 或手动输入密码

# 检查是否可以使用密钥连接（无密码）
$testConnection = ssh -o BatchMode=yes -o ConnectTimeout=5 "$Username@$ServerIP" "echo 'test'" 2>&1

if ($LASTEXITCODE -eq 0) {
    # 已配置密钥，直接执行
    Write-Host "✅ 检测到 SSH 密钥，使用密钥连接" -ForegroundColor Green
    Write-Host ""
    
    Get-Content $tempScript | ssh -o StrictHostKeyChecking=no "$Username@$ServerIP" "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 更新完成！" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ 更新失败，请检查服务器日志" -ForegroundColor Red
    }
} else {
    # 需要密码，使用交互式方式
    Write-Host "⚠️  未配置 SSH 密钥，将使用密码连接" -ForegroundColor Yellow
    Write-Host "请在提示时输入服务器密码" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 提示: 建议先配置 SSH 密钥，使用: .\配置SSH密钥连接.ps1" -ForegroundColor Cyan
    Write-Host ""
    
    # 使用 SSH 执行（会提示输入密码）
    Get-Content $tempScript | ssh -o StrictHostKeyChecking=no "$Username@$ServerIP" "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 更新完成！" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ 更新失败" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 提示:" -ForegroundColor Yellow
        Write-Host "  1. 确保服务器 IP 地址正确" -ForegroundColor Gray
        Write-Host "  2. 确保密码正确" -ForegroundColor Gray
        Write-Host "  3. 确保服务器已安装 SSH 服务" -ForegroundColor Gray
        Write-Host "  4. 建议配置 SSH 密钥: .\配置SSH密钥连接.ps1" -ForegroundColor Gray
    }
}

# 清理临时文件
if (Test-Path $tempScript) {
    Remove-Item $tempScript -Force
}

