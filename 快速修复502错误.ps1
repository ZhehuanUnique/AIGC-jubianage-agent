# PowerShell 脚本：快速修复 502 错误

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  快速修复 502 错误" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$commands = @"
echo "1. 检查 PM2 服务状态..."
pm2 list

echo ""
echo "2. 检查端口 3002..."
if lsof -i :3002 > /dev/null 2>&1; then
    echo "✅ 端口 3002 已被占用"
    lsof -i :3002 | head -5
else
    echo "❌ 端口 3002 未被占用"
fi

echo ""
echo "3. 测试后端服务健康检查..."
curl -s --max-time 3 http://localhost:3002/api/health || echo "❌ 后端服务无响应"

echo ""
echo "4. 查看最近的错误日志..."
pm2 logs aigc-agent --err --lines 30 --nostream || echo "无法获取日志"

echo ""
echo "5. 重启后端服务..."
cd /var/www/aigc-agent/server
pm2 restart aigc-agent

echo ""
echo "6. 等待服务启动（5秒）..."
sleep 5

echo ""
echo "7. 再次检查服务状态..."
pm2 list | grep aigc-agent

echo ""
echo "8. 再次测试健康检查..."
if curl -s --max-time 5 http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务已恢复！"
    curl -s http://localhost:3002/api/health
else
    echo "❌ 后端服务仍未恢复"
    echo ""
    echo "查看详细日志："
    pm2 logs aigc-agent --lines 50 --nostream
fi
"@

ssh ubuntu@119.45.121.152 $commands

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  修复完成" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan




