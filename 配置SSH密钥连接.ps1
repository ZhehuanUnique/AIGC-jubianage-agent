# 配置 SSH 密钥连接（推荐方式，无需每次输入密码）
# 使用方法: .\配置SSH密钥连接.ps1

param(
    [string]$ServerIP = "",
    [string]$Username = "ubuntu"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "配置 SSH 密钥连接" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 如果没有提供参数，提示输入
if ([string]::IsNullOrWhiteSpace($ServerIP)) {
    $ServerIP = Read-Host "请输入服务器 IP 地址"
    $Username = Read-Host "请输入用户名 (默认: ubuntu)"
    if ([string]::IsNullOrWhiteSpace($Username)) {
        $Username = "ubuntu"
    }
}

# 检查是否已有 SSH 密钥
$sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
$sshKeyExists = Test-Path $sshKeyPath

if (-not $sshKeyExists) {
    Write-Host "未找到 SSH 密钥，正在生成..." -ForegroundColor Yellow
    Write-Host ""
    
    # 生成 SSH 密钥
    ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""' -C "aigc-agent-deploy"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ SSH 密钥生成失败" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ SSH 密钥已生成" -ForegroundColor Green
    Write-Host ""
}

# 读取公钥
$publicKey = Get-Content "$sshKeyPath.pub" -ErrorAction SilentlyContinue

if (-not $publicKey) {
    Write-Host "❌ 无法读取公钥文件" -ForegroundColor Red
    exit 1
}

Write-Host "公钥内容:" -ForegroundColor Cyan
Write-Host $publicKey -ForegroundColor Gray
Write-Host ""

Write-Host "请将以上公钥添加到服务器的 ~/.ssh/authorized_keys 文件中" -ForegroundColor Yellow
Write-Host ""
Write-Host "方法1: 手动添加" -ForegroundColor Cyan
Write-Host "  1. SSH 连接到服务器: ssh $Username@$ServerIP" -ForegroundColor Gray
Write-Host "  2. 执行: mkdir -p ~/.ssh && chmod 700 ~/.ssh" -ForegroundColor Gray
Write-Host "  3. 执行: echo '$publicKey' >> ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host "  4. 执行: chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host ""

$autoCopy = Read-Host "是否自动复制公钥到服务器？(需要输入一次密码) (y/n)"

if ($autoCopy -eq "y" -or $autoCopy -eq "Y") {
    Write-Host ""
    Write-Host "正在复制公钥到服务器..." -ForegroundColor Cyan
    Write-Host "请在提示时输入服务器密码" -ForegroundColor Yellow
    Write-Host ""
    
    # 使用 ssh-copy-id（如果可用）或手动复制
    if (Get-Command ssh-copy-id -ErrorAction SilentlyContinue) {
        ssh-copy-id "$Username@$ServerIP"
    } else {
        # 手动方式
        $tempKey = [System.IO.Path]::GetTempFileName()
        $publicKey | Out-File -FilePath $tempKey -Encoding ASCII -NoNewline
        
        Write-Host "执行以下命令（需要输入密码）:" -ForegroundColor Yellow
        Write-Host "  type $tempKey | ssh $Username@$ServerIP `"mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys`"" -ForegroundColor Gray
        Write-Host ""
        
        $confirm = Read-Host "是否现在执行？(y/n)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            Get-Content $tempKey | ssh "$Username@$ServerIP" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
        }
        
        Remove-Item $tempKey -Force
    }
    
    Write-Host ""
    Write-Host "✅ 公钥已复制到服务器" -ForegroundColor Green
    Write-Host ""
    
    # 测试连接
    Write-Host "正在测试 SSH 连接..." -ForegroundColor Cyan
    ssh -o BatchMode=yes -o ConnectTimeout=5 "$Username@$ServerIP" "echo 'SSH 连接成功！'" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SSH 密钥配置成功！现在可以无密码连接服务器" -ForegroundColor Green
    } else {
        Write-Host "⚠️  SSH 连接测试失败，请检查配置" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "请手动将公钥添加到服务器，然后使用以下命令测试:" -ForegroundColor Yellow
    Write-Host "  ssh $Username@$ServerIP" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "配置完成后，可以使用以下命令更新服务器:" -ForegroundColor Cyan
Write-Host "  .\通过SSH更新服务器.ps1 -ServerIP $ServerIP -Username $Username" -ForegroundColor Gray
Write-Host ""

