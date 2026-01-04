# 配置 Node.js 到 PATH 环境变量（PowerShell 版本）

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  配置 Node.js 到 PATH" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$commands = @"
cd /var/www/aigc-agent

echo '步骤 1: 查找 Node.js'
NODE_PATH=\$(which node 2>/dev/null || which nodejs 2>/dev/null || echo '')
if [ -z \"\$NODE_PATH\" ]; then
    for p in /usr/bin/nodejs /usr/local/bin/node /opt/nodejs/bin/node; do
        if [ -f \"\$p\" ]; then
            NODE_PATH=\"\$p\"
            break
        fi
    done
fi

if [ -z \"\$NODE_PATH\" ] && command -v pm2 > /dev/null 2>&1; then
    PM2_NODE=\$(pm2 info aigc-agent 2>/dev/null | grep 'exec path' | awk '{print \$4}' | head -1)
    if [ -n \"\$PM2_NODE\" ]; then
        NODE_DIR=\$(dirname \"\$PM2_NODE\")
        if [ -f \"\$NODE_DIR/node\" ]; then
            NODE_PATH=\"\$NODE_DIR/node\"
        fi
    fi
fi

if [ -z \"\$NODE_PATH\" ]; then
    echo '❌ 未找到 Node.js'
    exit 1
fi

NODE_DIR=\$(dirname \"\$NODE_PATH\")
echo \"✅ 找到 Node.js: \$NODE_PATH\"
echo \"✅ 目录: \$NODE_DIR\"
echo \"✅ 版本: \$(\$NODE_PATH --version 2>/dev/null || echo '未知')\"

echo ''
echo '步骤 2: 配置 PATH'
export PATH=\"\$NODE_DIR:\$PATH\"
echo '✅ 已添加到当前会话'

if ! grep -q \"\$NODE_DIR\" ~/.bashrc 2>/dev/null; then
    echo '' >> ~/.bashrc
    echo \"export PATH=\\\"\\\$NODE_DIR:\\\$PATH\\\"\" >> ~/.bashrc
    echo '✅ 已添加到 ~/.bashrc'
fi

echo ''
echo '步骤 3: 验证'
if command -v node > /dev/null 2>&1; then
    echo \"✅ node: \$(which node) (\$(node --version))\"
else
    echo \"⚠️  node 命令不可用，但可以直接使用: \$NODE_PATH\"
fi

if command -v npm > /dev/null 2>&1; then
    echo \"✅ npm: \$(which npm) (\$(npm --version))\"
fi

echo ''
echo '步骤 4: 检查语法错误'
cd server
NODE_CMD=\"node\"
if ! command -v node > /dev/null 2>&1; then
    NODE_CMD=\"\$NODE_PATH\"
fi

ERRORS=0
for file in index.js services/*.js; do
    if [ -f \"\$file\" ]; then
        if \"\$NODE_CMD\" --check \"\$file\" > /dev/null 2>&1; then
            echo \"✅ \$(basename \$file)\"
        else
            echo \"❌ \$(basename \$file)\"
            \"\$NODE_CMD\" --check \"\$file\" 2>&1 | head -3
            ERRORS=\$((ERRORS + 1))
        fi
    fi
done

echo ''
if [ \$ERRORS -eq 0 ]; then
    echo '✅ 所有文件语法正确！'
    echo ''
    echo '可以重启服务：'
    echo '  pm2 restart aigc-agent'
else
    echo \"❌ 发现 \$ERRORS 个文件有语法错误\"
fi
"@

Write-Host "正在连接到服务器..." -ForegroundColor Yellow
ssh ubuntu@119.45.121.152 $commands

Write-Host ""
Write-Host "执行完成！" -ForegroundColor Green




