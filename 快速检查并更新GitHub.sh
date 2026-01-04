#!/bin/bash

# 快速检查并更新 GitHub

echo "检查 Git 状态..."
cd /c/Users/Administrator/Desktop/AIGC-jubianage-agent

echo ""
echo "1. 工作区状态："
git status --short || echo "无更改"

echo ""
echo "2. 最近的提交："
git log --oneline -3

echo ""
echo "3. 检查远程同步："
git fetch origin 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>&1)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ 本地代码与 GitHub 同步"
else
    echo "⚠️  本地代码与 GitHub 不同步"
    echo "本地: $LOCAL"
    echo "远程: $REMOTE"
    
    AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
    BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")
    
    if [ "$AHEAD" -gt 0 ]; then
        echo "本地领先 $AHEAD 个提交（需要推送）"
    fi
    if [ "$BEHIND" -gt 0 ]; then
        echo "本地落后 $BEHIND 个提交（需要拉取）"
    fi
fi

echo ""
echo "4. 未推送的提交："
UNPUSHED=$(git log origin/main..HEAD --oneline 2>&1)
if [ -n "$UNPUSHED" ]; then
    echo "$UNPUSHED"
    echo ""
    echo "是否推送到 GitHub? (y/n)"
    read -r answer
    if [ "$answer" = "y" ]; then
        git push origin main
        echo "✅ 已推送到 GitHub"
    fi
else
    echo "✅ 所有提交已推送"
fi




