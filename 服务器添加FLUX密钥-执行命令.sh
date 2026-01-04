#!/bin/bash

# 在服务器上添加 FLUX API 密钥到 .env 文件
# 使用方法：在服务器上执行此脚本

echo "📝 开始添加 FLUX API 密钥到服务器 .env 文件..."

# 进入项目目录
cd /var/www/aigc-agent/server || exit 1

# 备份现有的 .env 文件
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ 已备份现有 .env 文件"
fi

# 检查是否已经存在 FLUX 配置
if grep -q "FLUX_2_MAX_API_KEY" .env 2>/dev/null; then
    echo "⚠️  检测到 .env 文件中已存在 FLUX 配置"
    # 删除旧的 FLUX 配置
    sed -i '/# ==================== Flux 系列文生图配置 ====================/,/^FLUX_API_HOST=/d' .env
    echo "✅ 已删除旧的 FLUX 配置"
fi

# 添加 FLUX API 密钥配置
echo "" >> .env
echo "# ==================== Flux 系列文生图配置 ====================" >> .env
echo "FLUX_2_MAX_API_KEY=sk-pt7fNXMnTz9yjUCeWpyQiSe4TLqgVCcQh2SlYuJZsKbXNEvc" >> .env
echo "FLUX_2_FLEX_API_KEY=sk-5jaNdKCnz2NqbXxE1Q53L5y8Dw8SMz3HA9KPzeolNJdCbPyu" >> .env
echo "FLUX_2_PRO_API_KEY=sk-FhVXrURRgdWLhZWFaHaNKEexAWu1DXod8ixFijuchuZaBKsd" >> .env
echo "FLUX_API_HOST=https://api.302.ai" >> .env

echo "✅ 已添加 FLUX API 密钥到 .env 文件"
echo ""
echo "🔄 正在重启 PM2 服务..."
pm2 restart aigc-agent

echo ""
echo "✅ 完成！正在检查服务状态..."
sleep 2
pm2 logs aigc-agent --lines 20

