#!/bin/bash

# 在服务器上执行此脚本，添加图生视频的 API Key

cd /var/www/aigc-agent

# 备份现有的 .env 文件
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 已备份 .env 文件"

# 添加 Doubao Seedance API Keys
echo "" >> .env
echo "# Doubao Seedance 图生视频配置" >> .env
echo "DOUBAO_SEEDANCE_1_5_PRO_API_KEY=sk-4qOfXiYXE2EHRW1QDmfIhlTaWLwdIc5dTmR3QRcsuKztCE4R" >> .env
echo "DOUBAO_SEEDANCE_1_0_LITE_API_KEY=sk-DzzAX3YmhTZG8BV7GTo3qgvkh6cye1fJty1igEChHxmv8NVu" >> .env
echo "DOUBAO_SEEDANCE_API_KEY=sk-4qOfXiYXE2EHRW1QDmfIhlTaWLwdIc5dTmR3QRcsuKztCE4R" >> .env
echo "DOUBAO_SEEDANCE_API_HOST=https://api.302.ai" >> .env

# 添加 Vidu V2 API Keys
echo "" >> .env
echo "# Vidu V2 图生视频配置" >> .env
echo "VIDU_V2_API_KEY=sk-UuNxQvlA47aZOgRdj7k27ElXa5KuoaSY6BgzlCRrbMDx1dvL" >> .env
echo "VIDU_V2_API_HOST=https://api.302.ai" >> .env

# 添加 Vidu HD API Keys
echo "" >> .env
echo "# Vidu V2 智能超清-尊享 视频超分辨率配置" >> .env
echo "VIDU_HD_API_KEY=sk-sE5HA9SwjNo3IHmK7tIS6apV4O5wdBv1sV6Um94smvEZ21sx" >> .env
echo "VIDU_HD_API_HOST=https://api.302.ai" >> .env

# 添加 Veo3 API Keys
echo "" >> .env
echo "# Google Veo3.1 图生视频配置" >> .env
echo "VEO3_API_KEY=sk-zH0PHvXSqMiPeu5JjdTfeS6c2HiBJ8Cq2SKNfQ5CeNW9skIP" >> .env
echo "VEO3_PRO_API_KEY=sk-wP69G7mVXlyTQOsHWyDznxIvtChJuevg6RnjozhLNuxGGN8Y" >> .env
echo "VEO3_API_HOST=https://api.302.ai" >> .env

# 添加 Hailuo API Keys
echo "" >> .env
echo "# MiniMax Hailuo 图生视频配置" >> .env
echo "HAILUO_02_API_KEY=sk-OjYZLpE7qAUyy6XL8EQSZuq5SFciSK3zzn6yfdjwuhzxDwMn" >> .env
echo "HAILUO_23_API_KEY=sk-cjiLn17tIdXqi3QBN6E2so6CtHOSJlc9yFlQkU9Yryw72XG5" >> .env
echo "HAILUO_API_HOST=https://api.302.ai" >> .env

# 添加 Kling API Keys
echo "" >> .env
echo "# Kling 可灵图生视频配置" >> .env
echo "KLING_26_API_KEY=sk-Ye3MC07uIMCp6y3jHE1SJfjCeLn7zCdkEmJGFvfBiJRLVrtf" >> .env
echo "KLING_O1_API_KEY=sk-KaKChOwvjCCidlz4xTLVgW5yYUQjL6MpRMuZFLMD3I96f4El" >> .env
echo "KLING_API_HOST=https://api.302.ai" >> .env

echo ""
echo "✅ 图生视频 API Key 已添加"
echo ""
echo "当前图生视频环境变量状态："
grep -E "DOUBAO_SEEDANCE|VIDU|VEO3|HAILUO|KLING" .env

echo ""
echo "⚠️  现在需要重启 PM2 服务使环境变量生效："
echo "   pm2 restart aigc-agent"

