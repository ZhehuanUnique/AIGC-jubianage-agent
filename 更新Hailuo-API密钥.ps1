# 更新服务器端 Hailuo API Key
# 使用方法: .\更新Hailuo-API密钥.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  更新服务器端 Hailuo API Key" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 服务器信息
$SERVER_USER = "ubuntu"
$SERVER_HOST = "119.45.121.152"
$SERVER_PATH = "/var/www/aigc-agent/server"

# API Keys
$HAILUO_02_KEY = "sk-OjYZLpE7qAUyy6XL8EQSZuq5SFciSK3zzn6yfdjwuhzxDwMn"
$HAILUO_23_KEY = "sk-cjiLn17tIdXqi3QBN6E2so6CtHOSJlc9yFlQkU9Yryw72XG5"

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

# 更新 HAILUO_02_API_KEY
if grep -q "^HAILUO_02_API_KEY=" .env 2>/dev/null; then
  sed -i "s|^HAILUO_02_API_KEY=.*|HAILUO_02_API_KEY=${HAILUO_02_KEY}|" .env
  echo "✅ 已更新 HAILUO_02_API_KEY"
else
  echo "HAILUO_02_API_KEY=${HAILUO_02_KEY}" >> .env
  echo "✅ 已添加 HAILUO_02_API_KEY"
fi

# 更新 HAILUO_23_API_KEY
if grep -q "^HAILUO_23_API_KEY=" .env 2>/dev/null; then
  sed -i "s|^HAILUO_23_API_KEY=.*|HAILUO_23_API_KEY=${HAILUO_23_KEY}|" .env
  echo "✅ 已更新 HAILUO_23_API_KEY"
else
  echo "HAILUO_23_API_KEY=${HAILUO_23_KEY}" >> .env
  echo "✅ 已添加 HAILUO_23_API_KEY"
fi

# 验证更新
echo ""
echo "=========================================="
echo "  验证更新结果"
echo "=========================================="
grep "^HAILUO_02_API_KEY=" .env | sed 's/\(.*\)=\(.*\)/\1=***已设置***/'
grep "^HAILUO_23_API_KEY=" .env | sed 's/\(.*\)=\(.*\)/\1=***已设置***/'

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

