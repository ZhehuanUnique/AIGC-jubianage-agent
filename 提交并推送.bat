@echo off
chcp 65001 >nul
echo ========================================
echo 提交代码到 GitHub
echo ========================================
echo.

echo [1/4] 检查 Git 状态...
git status --short
echo.

echo [2/4] 添加所有更改...
git add -A
git status --short
echo.

echo [3/4] 提交更改...
git commit -m "chore: 清理多余的脚本和文档，更新README.md，添加Milvus配置说明"
if %errorlevel% neq 0 (
    echo 提交失败或没有需要提交的更改
)
echo.

echo [4/4] 推送到 GitHub...
git push origin main
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 代码已成功推送到 GitHub!
    echo ========================================
    echo.
    echo 最新提交:
    git log --oneline -1
    echo.
) else (
    echo.
    echo 推送失败，请检查网络连接和权限
    echo.
)
echo.

pause

