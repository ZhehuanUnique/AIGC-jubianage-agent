@echo off
chcp 65001 >nul
echo ========================================
echo 更新服务器
echo ========================================
echo.
echo 正在连接服务器并执行更新...
echo 请在提示时输入密码: 246859CFF
echo.

ssh ubuntu@119.45.121.152 "cd /var/www/aigc-agent && echo '步骤 1: 更新代码...' && git pull origin main && echo '步骤 2: 重启后端服务...' && cd server && pm2 restart aigc-agent && cd .. && echo '步骤 3: 构建前端...' && rm -rf dist node_modules/.vite && npm run build && echo '步骤 4: 设置权限并重新加载 Nginx...' && sudo chown -R ubuntu:ubuntu dist/ && sudo systemctl reload nginx && echo '✅ 更新完成！'"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 服务器更新成功！
) else (
    echo.
    echo ❌ 更新失败，请检查错误信息
)

pause

