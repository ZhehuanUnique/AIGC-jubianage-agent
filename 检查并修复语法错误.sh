#!/bin/bash

echo "=========================================="
echo "  检查并修复语法错误"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent/server

echo "1. 检查所有服务文件的语法..."
ERROR_FOUND=0
ERROR_FILES=""

for file in services/*.js; do
    if [ -f "$file" ]; then
        if node --check "$file" 2>&1 | grep -q "SyntaxError"; then
            echo "  ❌ 发现语法错误: $file"
            node --check "$file" 2>&1 | head -5
            ERROR_FOUND=1
            ERROR_FILES="$ERROR_FILES $file"
        fi
    fi
done

if [ $ERROR_FOUND -eq 1 ]; then
    echo ""
    echo "2. 发现语法错误的文件："
    echo "$ERROR_FILES"
    echo ""
    echo "3. 检查主文件..."
    if node --check index.js 2>&1 | grep -q "SyntaxError"; then
        echo "  ❌ index.js 也有语法错误"
        node --check index.js 2>&1 | head -10
    else
        echo "  ✅ index.js 语法正确"
    fi
    exit 1
else
    echo "  ✅ 所有服务文件语法正确"
fi

echo ""
echo "2. 检查主文件语法..."
if node --check index.js 2>&1 | grep -q "SyntaxError"; then
    echo "  ❌ index.js 有语法错误"
    node --check index.js 2>&1 | head -10
    exit 1
else
    echo "  ✅ index.js 语法正确"
fi

echo ""
echo "3. 检查是否有未提交的更改..."
cd /var/www/aigc-agent
if [ -n "$(git status --porcelain)" ]; then
    echo "  ⚠️ 有未提交的更改"
    git status --short
else
    echo "  ✅ 没有未提交的更改"
fi

ENDSSH

echo ""
echo "=========================================="
echo "  检查完成"
echo "=========================================="




