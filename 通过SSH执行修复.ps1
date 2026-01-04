# 通过 SSH 执行修复命令

Write-Host "正在连接到服务器执行修复..." -ForegroundColor Yellow
Write-Host ""

$commands = @"
cd /var/www/aigc-agent
export PATH="/home/ubuntu/.nvm/versions/node/v20.19.6/bin:`$PATH"
if [ -s "`$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="`$HOME/.nvm"
    [ -s "`$NVM_DIR/nvm.sh" ] && \. "`$NVM_DIR/nvm.sh"
fi

echo "=========================================="
echo "  诊断和修复"
echo "=========================================="
echo ""

echo "[1] 检查 PM2 服务状态..."
pm2 status aigc-agent
echo ""

echo "[2] 查看错误日志..."
pm2 logs aigc-agent --lines 30 --err --nostream | tail -15
echo ""

echo "[3] 检查语法错误..."
cd server
ERRORS=0
for file in index.js services/*.js; do
    if [ -f "`$file" ]; then
        if ! node --check "`$file" > /dev/null 2>&1; then
            echo "  ❌ 语法错误: `$file"
            node --check "`$file" 2>&1 | head -3
            ERRORS=`$((ERRORS + 1))
        fi
    fi
done

if [ `$ERRORS -eq 0 ]; then
    echo "  ✅ 语法检查通过"
    echo ""
    echo "[4] 重启服务..."
    pm2 restart aigc-agent
    sleep 3
    echo ""
    echo "[5] 检查服务状态..."
    pm2 status aigc-agent
    echo ""
    echo "[6] 测试服务..."
    curl -s http://localhost:3002/api/health && echo "✅ 服务正常" || echo "❌ 服务异常"
else
    echo "  ❌ 发现 `$ERRORS 个语法错误，请先修复"
fi
"@

ssh ubuntu@119.45.121.152 $commands

Write-Host ""
Write-Host "执行完成！" -ForegroundColor Green




