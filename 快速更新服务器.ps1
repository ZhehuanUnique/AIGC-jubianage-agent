# 快速更新服务器（使用 SSH 密钥，无需密码）
# 使用方法: .\快速更新服务器.ps1

param(
    [string]$ServerIP = "119.45.121.152",
    [string]$Username = "ubuntu",
    [string]$UpdateType = "quick"  # quick 或 full
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "快速更新服务器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "服务器: $Username@$ServerIP" -ForegroundColor Cyan
Write-Host "更新类型: $UpdateType" -ForegroundColor Cyan
Write-Host ""

# 测试 SSH 连接
Write-Host "检查 SSH 连接..." -ForegroundColor Yellow
$testResult = ssh -o BatchMode=yes -o ConnectTimeout=5 "$Username@$ServerIP" "echo 'SSH连接成功'" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SSH 连接失败，请检查:" -ForegroundColor Red
    Write-Host "  1. 服务器 IP 地址是否正确" -ForegroundColor Gray
    Write-Host "  2. SSH 密钥是否已配置" -ForegroundColor Gray
    Write-Host "  3. 服务器是否可访问" -ForegroundColor Gray
    Write-Host ""
    Write-Host "测试连接: ssh $Username@$ServerIP" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ SSH 连接正常" -ForegroundColor Green
Write-Host ""

# 执行更新命令
Write-Host "正在执行更新..." -ForegroundColor Cyan
Write-Host ""

# 将命令写入临时文件，避免 PowerShell 解析 Bash 语法
$tempScript = [System.IO.Path]::GetTempFileName()

if ($UpdateType -eq "full") {
    # 完整更新（包含依赖检查）
    $bashScript = @'
#!/bin/bash
set -e
cd /var/www/aigc-agent
echo "步骤 1: 更新代码..."
git pull origin main
echo "步骤 2: 检查后端依赖..."
cd server
if [ -f package.json ] && ([ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ]); then
  npm install
fi
echo "步骤 3: 重启后端服务..."
pm2 restart aigc-agent
cd ..
echo "步骤 4: 检查前端依赖..."
if [ -f package.json ] && ([ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ]); then
  npm install
fi
echo "步骤 5: 构建前端..."
rm -rf dist node_modules/.vite
npm run build
echo "步骤 6: 设置权限并重新加载 Nginx..."
sudo chown -R ubuntu:ubuntu dist/
sudo systemctl reload nginx
echo "✅ 完整更新完成！"
'@
} else {
    # 快速更新
    $bashScript = @'
#!/bin/bash
set -e
cd /var/www/aigc-agent
echo "步骤 1: 更新代码..."
git pull origin main
echo "步骤 2: 重启后端服务..."
cd server && pm2 restart aigc-agent && cd ..
echo "步骤 3: 构建前端..."
rm -rf dist node_modules/.vite
npm run build
echo "步骤 4: 设置权限并重新加载 Nginx..."
sudo chown -R ubuntu:ubuntu dist/
sudo systemctl reload nginx
echo "✅ 快速更新完成！"
'@
}

# 将脚本写入临时文件（使用 Unix 换行符）
$bashScript = $bashScript -replace "`r`n", "`n" -replace "`r", "`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tempScript, $bashScript, $utf8NoBom)

# 通过 SSH 执行脚本
Get-Content $tempScript -Raw | ssh -o StrictHostKeyChecking=no "$Username@$ServerIP" "bash"

# 清理临时文件
Remove-Item $tempScript -Force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 服务器更新成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 提示: 可以访问网站检查更新是否生效" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ 更新失败，请检查错误信息" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 可以手动连接服务器查看日志:" -ForegroundColor Yellow
    Write-Host "  ssh $Username@$ServerIP" -ForegroundColor Gray
    Write-Host "  pm2 logs aigc-agent" -ForegroundColor Gray
}

