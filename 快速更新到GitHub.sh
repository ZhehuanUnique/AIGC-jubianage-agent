#!/bin/bash

echo "========================================"
echo "使用 SSH 更新 GitHub 仓库"
echo "========================================"
echo ""

echo "[1/6] 检查当前远程仓库配置..."
git remote -v
echo ""

echo "[2/6] 切换到 SSH 方式..."
git remote set-url origin git@github.com:ZhehuanUnique/AIGC-jubianage-agent.git
echo "✅ 已切换到 SSH 方式"
echo ""

echo "[3/6] 验证远程仓库配置..."
git remote -v
echo ""

echo "[4/6] 检查 Git 状态..."
git status --short
echo ""

echo "[5/6] 添加所有更改..."
git add -A
echo "✅ 已添加所有更改"
echo ""

echo "[6/6] 提交并推送..."
git commit -m "style: 更新积分充值页面 - 改为白色背景，调整价格为¥999起，更新品牌名称为剧变时代Agent; feat: 添加 Kling 可灵视频生成服务支持" || echo "⚠️  没有需要提交的更改或提交失败"
echo ""

echo "推送到 GitHub (SSH)..."
if git push origin main; then
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

