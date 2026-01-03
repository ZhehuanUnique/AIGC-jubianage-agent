@echo off
chcp 65001 >nul
echo ==========================================
echo   修复 Milvus Standalone 重启问题
echo ==========================================
echo.

cd /d "%~dp0milvus" || exit /b 1

echo [1/4] 停止所有容器...
docker-compose down
echo.

echo [2/4] 清理损坏的 RocksMQ 数据...
if exist "volumes\milvus\rdb_data" (
    echo   正在删除 rdb_data 目录...
    rmdir /S /Q "volumes\milvus\rdb_data" 2>nul
    if %errorlevel% equ 0 (
        echo   ✅ 已清理损坏的数据
    ) else (
        echo   ⚠️  清理失败，可能需要手动删除
    )
) else (
    echo   ℹ️  rdb_data 目录不存在，跳过清理
)
echo.

echo [3/4] 重新启动服务...
docker-compose up -d
echo.

echo [4/4] 等待服务启动（60秒）...
timeout /t 60 /nobreak >nul
echo.

echo ==========================================
echo   检查容器状态
echo ==========================================
docker-compose ps
echo.

echo ==========================================
echo   测试健康检查
echo ==========================================
curl -s http://localhost:9091/healthz
if %errorlevel% equ 0 (
    echo.
    echo ✅ Milvus 健康检查通过！
) else (
    echo.
    echo ⚠️  健康检查失败，请查看日志：
    echo    docker-compose logs --tail=50 standalone
)
echo.

echo ==========================================
echo   ✅ 修复完成！
echo ==========================================
echo.
echo 如果问题仍然存在，请查看日志：
echo   cd milvus
echo   docker-compose logs -f standalone
echo.

pause

