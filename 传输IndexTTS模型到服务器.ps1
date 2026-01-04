# IndexTTS2.5 模型文件传输脚本
# 在 Windows PowerShell 中运行

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  IndexTTS2.5 模型文件传输" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 配置
$SERVER = "ubuntu@119.45.121.152"
$REMOTE_DIR = "/var/www/indextts-docker"
$LOCAL_CHECKPOINTS = "E:\IndexTTS2.5\checkpoints"

# 步骤1：在服务器上创建目录
Write-Host "步骤1: 在服务器上创建目录..." -ForegroundColor Yellow
ssh $SERVER "mkdir -p $REMOTE_DIR/checkpoints $REMOTE_DIR/outputs"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 创建目录失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 目录创建成功" -ForegroundColor Green
Write-Host ""

# 步骤2：检查本地文件是否存在
Write-Host "步骤2: 检查本地文件..." -ForegroundColor Yellow
if (-not (Test-Path $LOCAL_CHECKPOINTS)) {
    Write-Host "❌ 本地目录不存在: $LOCAL_CHECKPOINTS" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 本地目录存在" -ForegroundColor Green
Write-Host ""

# 步骤3：传输文件
Write-Host "步骤3: 开始传输文件（这可能需要较长时间，请耐心等待）..." -ForegroundColor Yellow
Write-Host "源目录: $LOCAL_CHECKPOINTS" -ForegroundColor Gray
Write-Host "目标: $SERVER:$REMOTE_DIR/checkpoints" -ForegroundColor Gray
Write-Host ""

scp -r "$LOCAL_CHECKPOINTS" "$SERVER`:$REMOTE_DIR/checkpoints"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 文件传输成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "步骤4: 验证文件..." -ForegroundColor Yellow
    ssh $SERVER "ls -lh $REMOTE_DIR/checkpoints/ | head -10"
} else {
    Write-Host ""
    Write-Host "❌ 文件传输失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "提示：" -ForegroundColor Yellow
    Write-Host "1. 检查网络连接" -ForegroundColor Gray
    Write-Host "2. 检查 SSH 密钥是否已配置" -ForegroundColor Gray
    Write-Host "3. 检查服务器磁盘空间是否充足" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  传输完成" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan




