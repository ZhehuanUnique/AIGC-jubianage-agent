# 部署到服务器 PowerShell 脚本
# 使用方法: .\部署到服务器.ps1

Write-Host "🚀 开始部署到服务器..." -ForegroundColor Green

# 1. 构建前端
Write-Host "📦 构建前端..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 前端构建失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 前端构建成功" -ForegroundColor Green

# 2. 检查是否有未提交的更改
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  检测到未提交的更改，正在提交..." -ForegroundColor Yellow
    git add -A
    git commit -m "feat: 更新代码并部署到服务器"
    git push
    Write-Host "✅ 代码已提交到 GitHub" -ForegroundColor Green
} else {
    Write-Host "✅ 没有未提交的更改" -ForegroundColor Green
}

# 3. 部署到服务器（通过 SSH）
Write-Host "📤 部署到服务器..." -ForegroundColor Yellow

# 注意：需要根据实际情况修改以下变量
$SERVER_USER = "root"
$SERVER_HOST = "your-server-ip"
$SERVER_PATH = "/var/www/aigc-agent"

# 使用 scp 或 rsync 同步文件（需要安装 OpenSSH 或使用 WinSCP）
# 这里使用 scp 示例
Write-Host "⚠️  请手动执行以下命令部署到服务器：" -ForegroundColor Yellow
Write-Host "scp -r dist/* $SERVER_USER@$SERVER_HOST:$SERVER_PATH/dist/" -ForegroundColor Cyan
Write-Host "scp -r server/* $SERVER_USER@$SERVER_HOST:$SERVER_PATH/server/" -ForegroundColor Cyan
Write-Host "ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && pm2 restart aigc-agent'" -ForegroundColor Cyan

Write-Host "✅ 部署脚本准备完成！" -ForegroundColor Green

