#!/bin/bash

# 在服务器上添加 FLUX API 密钥到 .env 文件
# 使用方法：在服务器上执行此脚本，或手动复制命令执行

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
    read -p "是否要更新现有的 FLUX 配置？(y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 已取消操作"
        exit 0
    fi
    # 删除旧的 FLUX 配置
    sed -i '/# ==================== Flux 系列文生图配置 ====================/,/^FLUX_API_HOST=/d' .env
    echo "✅ 已删除旧的 FLUX 配置"
fi

# 添加 FLUX API 密钥配置
# 请将下面的 YOUR_FLUX_2_MAX_API_KEY 等替换为实际的 API 密钥
echo "" >> .env
echo "# ==================== Flux 系列文生图配置 ====================" >> .env
echo "# Flux-2-Max API Key（从 https://302.ai 获取）" >> .env
echo "FLUX_2_MAX_API_KEY=YOUR_FLUX_2_MAX_API_KEY" >> .env
echo "# Flux-2-Flex API Key（从 https://302.ai 获取）" >> .env
echo "FLUX_2_FLEX_API_KEY=YOUR_FLUX_2_FLEX_API_KEY" >> .env
echo "# Flux-2-Pro API Key（从 https://302.ai 获取）" >> .env
echo "FLUX_2_PRO_API_KEY=YOUR_FLUX_2_PRO_API_KEY" >> .env
echo "# 可选：Flux API Host（默认使用正式环境，所有 Flux 模型共用）" >> .env
echo "FLUX_API_HOST=https://api.302.ai" >> .env

echo "✅ 已添加 FLUX 配置模板到 .env 文件"
echo ""
echo "⚠️  重要：请使用 nano 或 vim 编辑 .env 文件，将 YOUR_FLUX_2_MAX_API_KEY 等替换为实际的 API 密钥"
echo ""
echo "编辑命令："
echo "  nano /var/www/aigc-agent/server/.env"
echo ""
echo "编辑完成后，重启服务："
echo "  pm2 restart aigc-agent"
echo "  pm2 logs aigc-agent --lines 20"

