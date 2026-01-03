#!/bin/bash

# 提交代码到 GitHub 仓库

set -e

echo "========================================"
echo "提交代码到 GitHub"
echo "========================================"
echo ""

# 检查是否在 git 仓库中
if [ ! -d .git ]; then
    echo "❌ 错误: 当前目录不是 git 仓库"
    exit 1
fi

# 检查是否有未提交的更改
if [ -z "$(git status --porcelain)" ]; then
    echo "⚠️  没有未提交的更改"
    read -p "是否继续提交？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# 显示当前状态
echo "📋 当前 git 状态:"
git status --short
echo ""

# 添加所有更改
echo "📦 添加所有更改..."
git add .
echo "✅ 已添加所有更改"
echo ""

# 提交更改
echo "💬 请输入提交信息:"
read -p "提交信息: " commit_message

if [ -z "$commit_message" ]; then
    commit_message="更新代码: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "使用默认提交信息: $commit_message"
fi

git commit -m "$commit_message"
echo "✅ 已提交更改"
echo ""

# 推送到 GitHub
echo "🚀 推送到 GitHub..."
read -p "推送到哪个分支？(默认: main) " branch
branch=${branch:-main}

echo "正在推送到 origin/$branch..."
git push origin "$branch"

echo ""
echo "========================================"
echo "✅ 代码已成功推送到 GitHub!"
echo "========================================"
echo ""
echo "📋 推送信息:"
echo "  分支: $branch"
echo "  提交信息: $commit_message"
echo ""
echo "💡 下一步: 在服务器上执行更新命令"
echo ""





