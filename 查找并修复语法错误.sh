#!/bin/bash

echo "=========================================="
echo "  查找并修复语法错误"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "1. 配置 Node.js PATH..."
# 尝试找到 node
NODE_PATH=$(which node 2>/dev/null || find /usr -name node 2>/dev/null | grep -E 'bin/node$' | head -1)
if [ -z "$NODE_PATH" ]; then
    NODE_PATH=$(find /opt -name node 2>/dev/null | grep -E 'bin/node$' | head -1)
fi
if [ -z "$NODE_PATH" ]; then
    NODE_PATH="/usr/bin/nodejs"
fi

if [ -f "$NODE_PATH" ]; then
    export PATH="$(dirname $NODE_PATH):$PATH"
    echo "  ✅ 使用 Node.js: $NODE_PATH"
else
    echo "  ⚠️  未找到 Node.js，尝试使用 PM2 的 node"
    # PM2 通常知道 node 的位置
fi

echo ""
echo "2. 检查所有服务文件的语法..."
cd server
ERROR_FILES=""

for file in services/*.js; do
    if [ -f "$file" ]; then
        # 尝试使用 node --check
        if command -v node > /dev/null 2>&1; then
            if ! node --check "$file" > /dev/null 2>&1; then
                echo "  ❌ 发现语法错误: $file"
                node --check "$file" 2>&1 | head -10
                ERROR_FILES="$ERROR_FILES $file"
            fi
        else
            # 如果 node 不可用，使用 grep 查找明显的语法错误
            if grep -q "const\s\+\w\+\s*[;,]\s*$" "$file" || grep -q "const\s\+\w\+\s*$" "$file"; then
                echo "  ⚠️  可能有问题: $file（需要 node 检查）"
                ERROR_FILES="$ERROR_FILES $file"
            fi
        fi
    fi
done

if [ -n "$ERROR_FILES" ]; then
    echo ""
    echo "  ⚠️  发现可能有语法错误的文件："
    echo "$ERROR_FILES"
    echo ""
    echo "  请检查这些文件中的 const 声明"
else
    echo "  ✅ 未发现明显的语法错误"
fi

echo ""
echo "3. 检查主文件..."
if command -v node > /dev/null 2>&1; then
    if node --check index.js > /dev/null 2>&1; then
        echo "  ✅ index.js 语法正确"
    else
        echo "  ❌ index.js 有语法错误"
        node --check index.js 2>&1 | head -10
    fi
else
    echo "  ⚠️  无法检查（node 不可用）"
fi

ENDSSH

echo ""
echo "=========================================="
echo "  检查完成"
echo "=========================================="




