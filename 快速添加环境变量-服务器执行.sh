#!/bin/bash

# 在服务器上执行此脚本，快速添加环境变量

cd /var/www/aigc-agent

# 备份现有的 .env 文件
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 已备份 .env 文件"

# 添加 Seedream API Keys
echo "" >> .env
echo "# Seedream 系列文生图配置" >> .env
echo "SEEDREAM_4_5_API_KEY=sk-eKTQUoP9Scu0AULiJ0GwhGhDzIB1nfeNSp1Chwt8mRbwxPA6" >> .env
echo "SEEDREAM_4_0_API_KEY=sk-4GPAVvZzres7qjYdVCwdDnpchut6ZPWwRUKq7a4n9YJhmxYU" >> .env
echo "SEEDREAM_API_HOST=https://api.302.ai" >> .env

# 添加 Flux API Keys
echo "" >> .env
echo "# Flux 系列文生图配置" >> .env
echo "FLUX_2_MAX_API_KEY=sk-pt7fNXMnTz9yjUCeWpyQiSe4TLqgVCcQh2SlYuJZsKbXNEvc" >> .env
echo "FLUX_2_FLEX_API_KEY=sk-5jaNdKCnz2NqbXxE1Q53L5y8Dw8SMz3HA9KPzeolNJdCbPyu" >> .env
echo "FLUX_2_PRO_API_KEY=sk-FhVXrURRgdWLhZWFaHaNKEexAWu1DXod8ixFijuchuZaBKsd" >> .env
echo "FLUX_API_HOST=https://api.302.ai" >> .env

echo ""
echo "✅ 环境变量已添加"
echo ""
echo "当前环境变量状态："
grep -E "SEEDREAM|FLUX" .env

echo ""
echo "⚠️  现在需要重启 PM2 服务使环境变量生效："
echo "   pm2 restart aigc-agent"

