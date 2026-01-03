#!/bin/bash

echo "========================================"
echo "使用 SSH 更新 GitHub 仓库"
echo "========================================"
echo ""

echo "[1/5] 检查当前远程仓库配置..."
git remote -v
echo ""

echo "[2/5] 切换到 SSH 方式..."
git remote set-url origin git@github.com:ZhehuanUnique/AIGC-jubianage-agent.git
echo "✅ 已切换到 SSH 方式"
echo ""

echo "[3/5] 验证远程仓库配置..."
git remote -v
echo ""

echo "[4/5] 检查 Git 状态..."
git status --short
echo ""

echo "[5/5] 添加、提交并推送..."
git add -A
echo "✅ 已添加所有更改"
echo ""

git commit -m "chore: 清理多余的脚本和文档，更新README.md，添加Milvus配置说明"
if [ $? -eq 0 ]; then
    echo "✅ 已提交更改"
else
    echo "⚠️  提交失败或没有需要提交的更改"
fi
echo ""

echo "推送到 GitHub (SSH)..."
git push origin main
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✅ 代码已成功推送到 GitHub!"
    echo "========================================"
    echo ""
    echo "最新提交:"
    git log --oneline -1
    echo ""
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "可能的原因:"
    echo "  1. SSH 密钥未配置或未添加到 GitHub"
    echo "  2. 网络连接问题"
    echo "  3. 权限问题"
    echo ""
    echo "请检查:"
    echo "  - SSH 密钥是否已添加到 GitHub"
    echo "  - 测试连接: ssh -T git@github.com"
    echo ""
fi
echo ""

