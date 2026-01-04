# 在服务器端添加 Seedream 和 Flux 的 API Key

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  添加服务器环境变量" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$sshCommand = @"
cd /var/www/aigc-agent

# 备份现有的 .env 文件
if [ -f .env ]; then
    cp .env .env.backup.`$(date +%Y%m%d_%H%M%S)
    echo "✅ 已备份 .env 文件"
fi

# 检查并添加 Seedream API Keys
if ! grep -q "SEEDREAM_4_5_API_KEY" .env 2>/dev/null; then
    echo "" >> .env
    echo "# Seedream 4.5 API Key" >> .env
    echo "SEEDREAM_4_5_API_KEY=sk-eKTQUoP9Scu0AULiJ0GwhGhDzIB1nfeNSp1Chwt8mRbwxPA6" >> .env
    echo "✅ 已添加 SEEDREAM_4_5_API_KEY"
else
    echo "⚠️  SEEDREAM_4_5_API_KEY 已存在"
fi

if ! grep -q "SEEDREAM_4_0_API_KEY" .env 2>/dev/null; then
    echo "SEEDREAM_4_0_API_KEY=sk-4GPAVvZzres7qjYdVCwdDnpchut6ZPWwRUKq7a4n9YJhmxYU" >> .env
    echo "✅ 已添加 SEEDREAM_4_0_API_KEY"
else
    echo "⚠️  SEEDREAM_4_0_API_KEY 已存在"
fi

# 检查并添加 Flux API Keys
if ! grep -q "FLUX_2_MAX_API_KEY" .env 2>/dev/null; then
    echo "" >> .env
    echo "# Flux 系列 API Keys" >> .env
    echo "FLUX_2_MAX_API_KEY=sk-pt7fNXMnTz9yjUCeWpyQiSe4TLqgVCcQh2SlYuJZsKbXNEvc" >> .env
    echo "✅ 已添加 FLUX_2_MAX_API_KEY"
else
    echo "⚠️  FLUX_2_MAX_API_KEY 已存在"
fi

if ! grep -q "FLUX_2_FLEX_API_KEY" .env 2>/dev/null; then
    echo "FLUX_2_FLEX_API_KEY=sk-5jaNdKCnz2NqbXxE1Q53L5y8Dw8SMz3HA9KPzeolNJdCbPyu" >> .env
    echo "✅ 已添加 FLUX_2_FLEX_API_KEY"
else
    echo "⚠️  FLUX_2_FLEX_API_KEY 已存在"
fi

if ! grep -q "FLUX_2_PRO_API_KEY" .env 2>/dev/null; then
    echo "FLUX_2_PRO_API_KEY=sk-FhVXrURRgdWLhZWFaHaNKEexAWu1DXod8ixFijuchuZaBKsd" >> .env
    echo "✅ 已添加 FLUX_2_PRO_API_KEY"
else
    echo "⚠️  FLUX_2_PRO_API_KEY 已存在"
fi

# 显示添加的环境变量（不显示完整值，只显示前几个字符）
echo ""
echo "=========================================="
echo "  当前环境变量状态："
echo "=========================================="
grep -E "SEEDREAM|FLUX" .env | sed 's/=.*/=***/' || echo "未找到相关环境变量"

echo ""
echo "✅ 环境变量配置完成"
echo ""
echo "⚠️  需要重启 PM2 服务使环境变量生效："
echo "   pm2 restart aigc-agent"
"@

ssh ubuntu@119.45.121.152 $sshCommand

Write-Host ""
Write-Host "完成！" -ForegroundColor Green



