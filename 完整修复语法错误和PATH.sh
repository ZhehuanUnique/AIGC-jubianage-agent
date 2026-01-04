#!/bin/bash

echo "=========================================="
echo "  完整修复：配置 PATH + 检查语法错误"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
cd /var/www/aigc-agent

echo "1. 查找并配置 Node.js PATH..."
# 尝试多种方法找到 node
NODE_PATH=""
if command -v node > /dev/null 2>&1; then
    NODE_PATH=$(which node)
elif command -v nodejs > /dev/null 2>&1; then
    NODE_PATH=$(which nodejs)
else
    # 尝试常见位置
    for path in /usr/bin/nodejs /usr/local/bin/node /opt/nodejs/bin/node; do
        if [ -f "$path" ]; then
            NODE_PATH="$path"
            break
        fi
    done
    
    # 如果还没找到，尝试从 PM2 获取
    if [ -z "$NODE_PATH" ] && command -v pm2 > /dev/null 2>&1; then
        PM2_NODE=$(pm2 info aigc-agent 2>/dev/null | grep "exec path" | awk '{print $4}' | head -1)
        if [ -n "$PM2_NODE" ]; then
            NODE_DIR=$(dirname "$PM2_NODE" 2>/dev/null)
            if [ -n "$NODE_DIR" ] && [ -f "$NODE_DIR/node" ]; then
                NODE_PATH="$NODE_DIR/node"
            fi
        fi
    fi
fi

if [ -z "$NODE_PATH" ]; then
    echo "  ❌ 未找到 Node.js"
    echo "  请先安装 Node.js 或检查安装位置"
    exit 1
fi

NODE_DIR=$(dirname "$NODE_PATH")
echo "  ✅ 找到 Node.js: $NODE_PATH"
echo "  ✅ Node.js 版本: $($NODE_PATH --version 2>/dev/null || echo '未知')"
echo "  ✅ Node.js 目录: $NODE_DIR"

# 添加到 PATH
export PATH="$NODE_DIR:$PATH"
echo "  ✅ 已添加到当前会话的 PATH"

# 添加到 ~/.bashrc（如果还没有）
if ! grep -q "$NODE_DIR" ~/.bashrc 2>/dev/null; then
    echo "" >> ~/.bashrc
    echo "# Node.js PATH (自动添加)" >> ~/.bashrc
    echo "export PATH=\"$NODE_DIR:\$PATH\"" >> ~/.bashrc
    echo "  ✅ 已添加到 ~/.bashrc（永久生效）"
fi

echo ""
echo "2. 验证 node 命令..."
if command -v node > /dev/null 2>&1; then
    echo "  ✅ node 命令可用: $(which node)"
    echo "  ✅ node 版本: $(node --version)"
else
    echo "  ⚠️  node 命令仍不可用，尝试直接使用 $NODE_PATH"
    alias node="$NODE_PATH"
fi

echo ""
echo "3. 检查所有服务文件的语法..."
cd server

ERROR_COUNT=0
ERROR_FILES=""

# 检查所有 .js 文件
for file in services/*.js index.js; do
    if [ -f "$file" ]; then
        echo "  检查: $file"
        
        # 使用 node --check 检查语法
        if command -v node > /dev/null 2>&1; then
            if ! node --check "$file" > /dev/null 2>&1; then
                echo "    ❌ 语法错误: $file"
                node --check "$file" 2>&1 | head -5
                ERROR_COUNT=$((ERROR_COUNT + 1))
                ERROR_FILES="$ERROR_FILES $file"
            else
                echo "    ✅ 语法正确"
            fi
        else
            # 如果 node 不可用，使用 $NODE_PATH
            if ! "$NODE_PATH" --check "$file" > /dev/null 2>&1; then
                echo "    ❌ 语法错误: $file"
                "$NODE_PATH" --check "$file" 2>&1 | head -5
                ERROR_COUNT=$((ERROR_COUNT + 1))
                ERROR_FILES="$ERROR_FILES $file"
            else
                echo "    ✅ 语法正确"
            fi
        fi
    fi
done

echo ""
if [ $ERROR_COUNT -eq 0 ]; then
    echo "  ✅ 所有文件语法检查通过"
else
    echo "  ❌ 发现 $ERROR_COUNT 个文件有语法错误："
    echo "$ERROR_FILES"
    echo ""
    echo "  请检查这些文件中的 const 声明是否都有初始化值"
fi

echo ""
echo "4. 检查主入口文件..."
if command -v node > /dev/null 2>&1; then
    if node --check index.js > /dev/null 2>&1; then
        echo "  ✅ index.js 语法正确"
    else
        echo "  ❌ index.js 有语法错误"
        node --check index.js 2>&1 | head -10
    fi
else
    if "$NODE_PATH" --check index.js > /dev/null 2>&1; then
        echo "  ✅ index.js 语法正确"
    else
        echo "  ❌ index.js 有语法错误"
        "$NODE_PATH" --check index.js 2>&1 | head -10
    fi
fi

echo ""
echo "=========================================="
echo "  检查完成"
echo "=========================================="
echo ""
echo "如果发现语法错误，请："
echo "1. 检查错误文件中是否有 'const 变量名;' 这样的声明（缺少初始化值）"
echo "2. 确保所有 const 声明都有赋值，例如："
echo "   const x = value;  ✅ 正确"
echo "   const x;          ❌ 错误"
echo ""

ENDSSH




