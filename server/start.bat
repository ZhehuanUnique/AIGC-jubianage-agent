@echo off
echo 正在启动后端服务...
echo.

REM 检查是否安装了依赖
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
    echo.
)

REM 检查.env文件
if not exist ".env" (
    echo 警告: .env 文件不存在！
    echo 请创建 .env 文件并配置 DASHSCOPE_API_KEY
    echo.
    pause
)

echo 启动后端服务...
echo 服务将在 http://localhost:3001 启动
echo 按 Ctrl+C 停止服务
echo.

call npm run dev

pause

