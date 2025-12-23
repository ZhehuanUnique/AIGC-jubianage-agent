@echo off
chcp 65001 >nul
echo ========================================
echo   剧变时代Agent - 后端服务启动脚本
echo ========================================
echo.

cd /d %~dp0server

if not exist "node_modules" (
    echo [1/3] 正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败！
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
)

if not exist ".env" (
    echo ⚠️  警告: .env 文件不存在！
    echo.
    echo 请创建 server/.env 文件，内容如下：
    echo.
    echo DASHSCOPE_API_KEY=your_api_key_here
    echo QWEN_MODEL=qwen-plus
    echo PORT=3001
    echo.
    pause
    exit /b 1
)

echo [2/3] 检查后端服务状态...
node ..\check-backend.js
echo.

echo [3/3] 启动后端服务...
echo.
echo ========================================
echo   服务地址: http://localhost:3001
echo   按 Ctrl+C 停止服务
echo ========================================
echo.

call npm run dev

pause

