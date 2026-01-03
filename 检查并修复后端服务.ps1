# PowerShell 脚本：检查并修复后端服务

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  检查并修复后端服务" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 连接到服务器并执行检查
$commands = @"
echo "1. 检查 PM2 服务状态..."
pm2 list

echo ""
echo "2. 检查端口 3002 是否被占用..."
if lsof -i :3002 > /dev/null 2>&1; then
    echo "✅ 端口 3002 已被占用"
    lsof -i :3002
else
    echo "❌ 端口 3002 未被占用，后端服务可能未运行"
fi

echo ""
echo "3. 检查后端服务健康状态..."
if curl -s --max-time 5 http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务健康检查通过"
    curl -s http://localhost:3002/api/health
else
    echo "❌ 后端服务健康检查失败"
fi

echo ""
echo "4. 检查 Nginx 状态..."
sudo systemctl status nginx --no-pager | head -20

echo ""
echo "5. 查看 PM2 日志（最近20行）..."
pm2 logs aigc-agent --lines 20 --nostream

echo ""
echo "6. 尝试重启后端服务..."
cd /var/www/aigc-agent/server
pm2 restart aigc-agent || {
    echo "重启失败，尝试完全重启..."
    pm2 stop aigc-agent 2>/dev/null
    pm2 delete aigc-agent 2>/dev/null
    pm2 start index.js --name aigc-agent --autorestart --max-memory-restart 1G
    pm2 save
}

echo ""
echo "7. 等待5秒后再次检查..."
sleep 5

if curl -s --max-time 5 http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务已恢复"
else
    echo "❌ 后端服务仍未恢复，请检查日志"
    echo ""
    echo "查看详细日志："
    pm2 logs aigc-agent --lines 50 --nostream
fi
"@

ssh ubuntu@119.45.121.152 $commands

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  检查完成" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

