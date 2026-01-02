# 配置 SSH 密钥到服务器（完整版）
# 服务器: ubuntu@119.45.121.152
# 密码: 246859CFF

$ServerIP = "119.45.121.152"
$Username = "ubuntu"
$Password = "246859CFF"
$sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "配置 SSH 密钥" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务器: $Username@$ServerIP" -ForegroundColor Yellow
Write-Host ""

# 步骤 1: 检查并生成 SSH 密钥
Write-Host "步骤 1: 检查 SSH 密钥..." -ForegroundColor Cyan

if (-not (Test-Path $sshKeyPath)) {
    Write-Host "未找到 SSH 密钥，正在生成..." -ForegroundColor Yellow
    
    # 确保 .ssh 目录存在
    $sshDir = "$env:USERPROFILE\.ssh"
    if (-not (Test-Path $sshDir)) {
        New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
    }
    
    # 生成 SSH 密钥（无密码）
    ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""' -C "aigc-agent-server-$(Get-Date -Format 'yyyyMMdd')"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SSH 密钥已生成" -ForegroundColor Green
    } else {
        Write-Host "❌ SSH 密钥生成失败" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ 已找到现有 SSH 密钥" -ForegroundColor Green
}

# 步骤 2: 读取公钥
Write-Host ""
Write-Host "步骤 2: 读取公钥..." -ForegroundColor Cyan

$publicKeyPath = "$sshKeyPath.pub"
if (-not (Test-Path $publicKeyPath)) {
    Write-Host "❌ 公钥文件不存在" -ForegroundColor Red
    exit 1
}

$publicKey = Get-Content $publicKeyPath -Raw
$publicKey = $publicKey.Trim()

Write-Host "公钥内容:" -ForegroundColor Yellow
Write-Host $publicKey -ForegroundColor Gray
Write-Host ""

# 步骤 3: 将公钥复制到服务器
Write-Host "步骤 3: 将公钥复制到服务器..." -ForegroundColor Cyan
Write-Host "请在提示时输入密码: $Password" -ForegroundColor Yellow
Write-Host ""

# 创建临时脚本文件（在服务器上执行）
$remoteScript = @"
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo '$publicKey' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
echo '✅ 公钥已添加到服务器'
"@

# 将脚本保存到临时文件
$tempScript = [System.IO.Path]::GetTempFileName()
$remoteScript | Out-File -FilePath $tempScript -Encoding UTF8 -NoNewline

Write-Host "正在执行（需要输入密码）..." -ForegroundColor Cyan
Get-Content $tempScript | ssh -o StrictHostKeyChecking=no "$Username@$ServerIP" "bash"

# 清理临时文件
Remove-Item $tempScript -Force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "步骤 4: 测试 SSH 密钥连接..." -ForegroundColor Cyan
    
    # 测试无密码连接
    $testResult = ssh -o BatchMode=yes -o ConnectTimeout=5 "$Username@$ServerIP" "echo 'SSH密钥配置成功！'" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✅ SSH 密钥配置成功！" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "现在可以无密码连接服务器了！" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "测试连接:" -ForegroundColor Yellow
        Write-Host "  ssh $Username@$ServerIP" -ForegroundColor Gray
        Write-Host ""
        Write-Host "更新服务器:" -ForegroundColor Yellow
        Write-Host "  .\快速更新服务器.ps1" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "⚠️  SSH 密钥可能未正确配置" -ForegroundColor Yellow
        Write-Host "错误信息: $testResult" -ForegroundColor Red
        Write-Host ""
        Write-Host "请手动检查:" -ForegroundColor Yellow
        Write-Host "  1. 服务器上的 ~/.ssh/authorized_keys 文件" -ForegroundColor Gray
        Write-Host "  2. 文件权限是否正确 (600)" -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "❌ 公钥复制失败，请检查:" -ForegroundColor Red
    Write-Host "  1. 服务器 IP 地址是否正确" -ForegroundColor Gray
    Write-Host "  2. 密码是否正确" -ForegroundColor Gray
    Write-Host "  3. 服务器是否可访问" -ForegroundColor Gray
}

