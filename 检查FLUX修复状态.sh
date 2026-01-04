#!/bin/bash

# 检查 FLUX 修复状态

echo "🔍 检查服务状态..."
pm2 status

echo ""
echo "📋 查看最近的启动日志（包含 .env 加载信息）..."
pm2 logs aigc-agent --lines 50 | grep -E "\.env|fluxService|FLUX|✅|⚠️"

echo ""
echo "📋 查看最近的错误日志..."
pm2 logs aigc-agent --err --lines 20

echo ""
echo "🧪 测试环境变量是否已加载..."
node -e "require('dotenv').config({ path: '/var/www/aigc-agent/.env' }); console.log('FLUX_2_MAX_API_KEY:', process.env.FLUX_2_MAX_API_KEY ? '已设置 (' + process.env.FLUX_2_MAX_API_KEY.substring(0, 10) + '...)' : '未设置'); console.log('FLUX_2_FLEX_API_KEY:', process.env.FLUX_2_FLEX_API_KEY ? '已设置 (' + process.env.FLUX_2_FLEX_API_KEY.substring(0, 10) + '...)' : '未设置'); console.log('FLUX_2_PRO_API_KEY:', process.env.FLUX_2_PRO_API_KEY ? '已设置 (' + process.env.FLUX_2_PRO_API_KEY.substring(0, 10) + '...)' : '未设置');"

