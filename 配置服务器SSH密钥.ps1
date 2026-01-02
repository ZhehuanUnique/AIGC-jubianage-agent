# 配置服务器 SSH 密钥（使用密码）
# 配置后，以后更新就不需要输入密码了

$ServerIP = "119.45.121.152"
$Username = "ubuntu"
$Password = "246859CFF"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "配置服务器 SSH 密钥" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否已有 SSH 密钥
$sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
if (-not (Test-Path $sshKeyPath)) {
    Write-Host "正在生成 SSH 密钥..." -ForegroundColor Yellow
    ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""' -C "aigc-agent-server"
    Write-Host "✅ SSH 密钥已生成" -ForegroundColor Green
}

# 读取公钥
$publicKey = Get-Content "$sshKeyPath.pub"
Write-Host ""
Write-Host "正在将公钥复制到服务器..." -ForegroundColor Yellow
Write-Host "请在提示时输入密码: $Password" -ForegroundColor Cyan
Write-Host ""

# 使用 ssh-copy-id 或手动复制
$copyCommand = @"
mkdir -p ~/.ssh && \
chmod 700 ~/.ssh && \
echo '$publicKey' >> ~/.ssh/authorized_keys && \
chmod 600 ~/.ssh/authorized_keys && \
echo '✅ 公钥已添加'
"@

ssh -o StrictHostKeyChecking=no "$Username@$ServerIP" $copyCommand

Write-Host ""
Write-Host "正在测试 SSH 密钥连接..." -ForegroundColor Yellow
ssh -o BatchMode=yes -o ConnectTimeout=5 "$Username@$ServerIP" "echo 'SSH密钥配置成功！'"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SSH 密钥配置成功！现在可以无密码连接服务器" -ForegroundColor Green
    Write-Host ""
    Write-Host "以后可以直接使用: .\快速更新服务器.ps1" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "⚠️  SSH 密钥配置可能未成功，请手动检查" -ForegroundColor Yellow
}

