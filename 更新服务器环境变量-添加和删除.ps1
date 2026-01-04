# 在服务器端更新 .env 文件：添加火山引擎配置，删除302.ai相关配置

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  更新服务器环境变量（添加和删除）" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$sshCommand = @"
cd /var/www/aigc-agent

# 备份现有的 .env 文件
cp .env .env.backup.\$(date +%Y%m%d_%H%M%S)
echo "✅ 已备份 .env 文件"

# 删除302.ai相关的配置（如果存在）
# 注意：这里删除的是302.ai作为第三方平台的配置，不是所有302.ai的引用
if grep -q "^# 可选：302.ai API Host" .env 2>/dev/null; then
    # 删除302.ai API Host配置行及其注释
    sed -i '/^# 可选：302.ai API Host/d' .env
    sed -i '/^DOUBAO_SEEDANCE_API_HOST=https:\/\/api.302.ai/d' .env
    echo "✅ 已删除 DOUBAO_SEEDANCE_API_HOST (302.ai)"
fi

# 添加火山引擎即梦AI-视频生成3.0 Pro配置
if ! grep -q "VOLCENGINE_AK" .env 2>/dev/null; then
    echo "" >> .env
    echo "# ==================== 火山引擎即梦AI-视频生成3.0 Pro配置 ===================" >> .env
    echo "# 火山引擎 Access Key ID（从火山引擎控制台获取）" >> .env
    echo "# 用于即梦AI-视频生成3.0 Pro" >> .env
    echo "VOLCENGINE_AK=AKLTYjM1ZTY4NWRiMWEyNDg4NDg1ZTBhODdlYWNmYzY5ZTI" >> .env
    echo "# 火山引擎 Secret Access Key（从火山引擎控制台获取）" >> .env
    echo "VOLCENGINE_SK=WVRoall6QmtNMkUwTnpsaE5EbGpZbUV5T1RZeU16Y3pZVGN4TnpKa01UTQ==" >> .env
    echo "# 可选：火山引擎 API Host（默认使用正式环境）" >> .env
    echo "# 正式环境: https://visual.volcengineapi.com" >> .env
    echo "VOLCENGINE_API_HOST=https://visual.volcengineapi.com" >> .env
    echo "✅ 已添加火山引擎即梦AI-3.0 Pro配置"
else
    echo "⚠️  VOLCENGINE_AK 已存在，跳过添加"
fi

# 显示当前配置状态
echo ""
echo "=========================================="
echo "  当前环境变量状态："
echo "=========================================="
echo ""
echo "火山引擎配置："
grep -E "VOLCENGINE" .env | head -5 || echo "未找到火山引擎配置"

echo ""
echo "✅ 环境变量更新完成"
echo ""
echo "⚠️  需要重启 PM2 服务使环境变量生效："
echo "   pm2 restart aigc-agent"
"@

ssh ubuntu@119.45.121.152 $sshCommand

Write-Host ""
Write-Host "完成！" -ForegroundColor Green

