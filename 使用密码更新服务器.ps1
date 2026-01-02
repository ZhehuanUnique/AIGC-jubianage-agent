# 使用密码更新服务器（临时方案）
# 注意：建议配置 SSH 密钥，更安全且无需每次输入密码

param(
    [string]$ServerIP = "119.45.121.152",
    [string]$Username = "ubuntu",
    [string]$Password = "246859CFF"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "使用密码更新服务器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  注意：此脚本使用密码连接，建议配置 SSH 密钥" -ForegroundColor Yellow
Write-Host ""

# 检查是否安装了 sshpass（用于自动输入密码）
$hasSshpass = Get-Command sshpass -ErrorAction SilentlyContinue

if (-not $hasSshpass) {
    Write-Host "未找到 sshpass，将使用交互式方式" -ForegroundColor Yellow
    Write-Host "请在提示时输入密码: $Password" -ForegroundColor Cyan
    Write-Host ""
    
    # 使用交互式 SSH（会提示输入密码）
    $updateCommand = @"
cd /var/www/aigc-agent && \
echo '步骤 1: 更新代码...' && \
git pull origin main && \
echo '步骤 2: 重启后端服务...' && \
cd server && pm2 restart aigc-agent && cd .. && \
echo '步骤 3: 构建前端...' && \
rm -rf dist node_modules/.vite && \
npm run build && \
echo '步骤 4: 设置权限并重新加载 Nginx...' && \
sudo chown -R ubuntu:ubuntu dist/ && \
sudo systemctl reload nginx && \
echo '✅ 更新完成！'
"@
    
    Write-Host "正在连接服务器，请输入密码..." -ForegroundColor Cyan
    ssh -o StrictHostKeyChecking=no "$Username@$ServerIP" $updateCommand
} else {
    Write-Host "使用 sshpass 自动输入密码..." -ForegroundColor Green
    Write-Host ""
    
    $updateCommand = @"
cd /var/www/aigc-agent && \
echo '步骤 1: 更新代码...' && \
git pull origin main && \
echo '步骤 2: 重启后端服务...' && \
cd server && pm2 restart aigc-agent && cd .. && \
echo '步骤 3: 构建前端...' && \
rm -rf dist node_modules/.vite && \
npm run build && \
echo '步骤 4: 设置权限并重新加载 Nginx...' && \
sudo chown -R ubuntu:ubuntu dist/ && \
sudo systemctl reload nginx && \
echo '✅ 更新完成！'
"@
    
    # 使用 sshpass 传递密码
    echo $Password | sshpass -p $Password ssh -o StrictHostKeyChecking=no "$Username@$ServerIP" $updateCommand
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 服务器更新成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 建议配置 SSH 密钥，使用: .\配置SSH密钥连接.ps1" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ 更新失败，请检查错误信息" -ForegroundColor Red
}

