# 更新服务器端 Kling API Key
# 使用方法: .\更新Kling-API密钥.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  更新服务器端 Kling API Key" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 服务器信息
$SERVER_USER = "ubuntu"
$SERVER_HOST = "119.45.121.152"
$SERVER_PATH = "/var/www/aigc-agent/server"

# API Keys
$KLING_26_KEY = "sk-Ye3MC07uIMCp6y3jHE1SJfjCeLn7zCdkEmJGFvfBiJRLVrtf"
$KLING_O1_KEY = "sk-KaKChOwvjCCidlz4xTLVgW5yYUQjL6MpRMuZFLMD3I96f4El"

Write-Host ""
Write-Host "正在更新服务器端 .env 文件..." -ForegroundColor Yellow

# 通过 SSH 更新 .env 文件
$sshCommand = @"
cd ${SERVER_PATH}

# 备份现有 .env 文件
if [ -f .env ]; then
  cp .env .env.backup.\$(date +%Y%m%d_%H%M%S)
  echo "✅ 已备份 .env 文件"
fi

# 更新 KLING_26_API_KEY
if grep -q "^KLING_26_API_KEY=" .env 2>/dev/null; then
  sed -i "s|^KLING_26_API_KEY=.*|KLING_26_API_KEY=${KLING_26_KEY}|" .env
  echo "✅ 已更新 KLING_26_API_KEY"
else
  echo "KLING_26_API_KEY=${KLING_26_KEY}" >> .env
  echo "✅ 已添加 KLING_26_API_KEY"
fi

# 更新 KLING_O1_API_KEY
if grep -q "^KLING_O1_API_KEY=" .env 2>/dev/null; then
  sed -i "s|^KLING_O1_API_KEY=.*|KLING_O1_API_KEY=${KLING_O1_KEY}|" .env
  echo "✅ 已更新 KLING_O1_API_KEY"
else
  echo "KLING_O1_API_KEY=${KLING_O1_KEY}" >> .env
  echo "✅ 已添加 KLING_O1_API_KEY"
fi

# 添加 KLING_API_HOST（如果不存在）
if ! grep -q "^KLING_API_HOST=" .env 2>/dev/null; then
  echo "KLING_API_HOST=https://api.302.ai" >> .env
  echo "✅ 已添加 KLING_API_HOST"
fi

# 验证更新
echo ""
echo "=========================================="
echo "  验证更新结果"
echo "=========================================="
grep "^KLING_26_API_KEY=" .env | sed 's/\(.*\)=\(.*\)/\1=***已设置***/' 2>/dev/null || echo "⚠️  KLING_26_API_KEY 未找到"
grep "^KLING_O1_API_KEY=" .env | sed 's/\(.*\)=\(.*\)/\1=***已设置***/' 2>/dev/null || echo "⚠️  KLING_O1_API_KEY 未找到"
grep "^KLING_API_HOST=" .env | head -1

echo ""
echo "✅ API Key 更新完成！"
echo ""
echo "⚠️  需要重启后端服务以使配置生效："
echo "   cd /var/www/aigc-agent/server && pm2 restart aigc-agent"
"@

ssh ${SERVER_USER}@${SERVER_HOST} $sshCommand

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  ✅ 完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  请手动执行以下命令重启后端服务：" -ForegroundColor Yellow
Write-Host "   ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${SERVER_PATH} && pm2 restart aigc-agent'" -ForegroundColor Yellow

