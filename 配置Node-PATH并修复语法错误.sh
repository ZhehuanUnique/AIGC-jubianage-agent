#!/bin/bash

echo "=========================================="
echo "  配置 Node.js PATH 并修复语法错误"
echo "=========================================="
echo ""

# 连接到服务器并执行
ssh ubuntu@119.45.121.152 bash << 'REMOTE_SCRIPT'
set -e

cd /var/www/aigc-agent

echo "步骤 1: 查找 Node.js 安装位置"
echo "----------------------------------------"

# 方法1: 使用 which
NODE_PATH=$(which node 2>/dev/null || which nodejs 2>/dev/null || echo "")

# 方法2: 检查常见位置
if [ -z "$NODE_PATH" ]; then
    for path in /usr/bin/nodejs /usr/local/bin/node /opt/nodejs/bin/node; do
        if [ -f "$path" ]; then
            NODE_PATH="$path"
            break
        fi
    done
fi

# 方法3: 从 PM2 获取
if [ -z "$NODE_PATH" ] && command -v pm2 > /dev/null 2>&1; then
    PM2_INFO=$(pm2 info aigc-agent 2>/dev/null || echo "")
    if [ -n "$PM2_INFO" ]; then
        PM2_NODE=$(echo "$PM2_INFO" | grep "exec path" | awk '{print $4}' | head -1)
        if [ -n "$PM2_NODE" ]; then
            NODE_DIR=$(dirname "$PM2_NODE" 2>/dev/null)
            if [ -n "$NODE_DIR" ] && [ -f "$NODE_DIR/node" ]; then
                NODE_PATH="$NODE_DIR/node"
            fi
        fi
    fi
fi

if [ -z "$NODE_PATH" ]; then
    echo "❌ 未找到 Node.js"
    echo ""
    echo "请手动查找 Node.js："
    echo "  find /usr -name node 2>/dev/null | head -5"
    echo "  find /opt -name node 2>/dev/null | head -5"
    echo "  find /home -name node 2>/dev/null | head -5"
    exit 1
fi

NODE_DIR=$(dirname "$NODE_PATH")
NODE_VERSION=$("$NODE_PATH" --version 2>/dev/null || echo "未知")

echo "✅ 找到 Node.js: $NODE_PATH"
echo "✅ 版本: $NODE_VERSION"
echo "✅ 目录: $NODE_DIR"

echo ""
echo "步骤 2: 配置 PATH 环境变量"
echo "----------------------------------------"

# 添加到当前会话
export PATH="$NODE_DIR:$PATH"
echo "✅ 已添加到当前会话的 PATH"

# 添加到 ~/.bashrc
if ! grep -q "export PATH.*$NODE_DIR" ~/.bashrc 2>/dev/null; then
    echo "" >> ~/.bashrc
    echo "# Node.js PATH (自动添加于 $(date +%Y-%m-%d\ %H:%M:%S))" >> ~/.bashrc
    echo "export PATH=\"$NODE_DIR:\$PATH\"" >> ~/.bashrc
    echo "✅ 已添加到 ~/.bashrc（永久生效）"
else
    echo "ℹ️  ~/.bashrc 中已存在相关配置"
fi

# 添加到 ~/.profile（备用）
if [ -f ~/.profile ] && ! grep -q "export PATH.*$NODE_DIR" ~/.profile 2>/dev/null; then
    echo "" >> ~/.profile
    echo "# Node.js PATH (自动添加于 $(date +%Y-%m-%d\ %H:%M:%S))" >> ~/.profile
    echo "export PATH=\"$NODE_DIR:\$PATH\"" >> ~/.profile
    echo "✅ 已添加到 ~/.profile（备用）"
fi

echo ""
echo "步骤 3: 验证配置"
echo "----------------------------------------"

# 重新加载 PATH
export PATH="$NODE_DIR:$PATH"

if command -v node > /dev/null 2>&1; then
    echo "✅ node 命令可用: $(which node)"
    echo "✅ node 版本: $(node --version)"
else
    echo "⚠️  node 命令仍不可用，但可以直接使用: $NODE_PATH"
    # 创建别名
    alias node="$NODE_PATH"
    alias npm="$NODE_DIR/npm" 2>/dev/null || true
fi

if command -v npm > /dev/null 2>&1; then
    echo "✅ npm 命令可用: $(which npm)"
    echo "✅ npm 版本: $(npm --version)"
fi

echo ""
echo "步骤 4: 检查语法错误"
echo "----------------------------------------"

cd server

# 使用找到的 node 路径
NODE_CMD="node"
if ! command -v node > /dev/null 2>&1; then
    NODE_CMD="$NODE_PATH"
fi

ERROR_COUNT=0
ERROR_FILES=""

echo "检查服务文件..."
for file in services/*.js; do
    if [ -f "$file" ]; then
        if "$NODE_CMD" --check "$file" > /dev/null 2>&1; then
            echo "  ✅ $(basename $file)"
        else
            echo "  ❌ $(basename $file) - 有语法错误"
            "$NODE_CMD" --check "$file" 2>&1 | head -3
            ERROR_COUNT=$((ERROR_COUNT + 1))
            ERROR_FILES="$ERROR_FILES $file"
        fi
    fi
done

echo ""
echo "检查主入口文件..."
if "$NODE_CMD" --check index.js > /dev/null 2>&1; then
    echo "  ✅ index.js"
else
    echo "  ❌ index.js - 有语法错误"
    "$NODE_CMD" --check index.js 2>&1 | head -5
    ERROR_COUNT=$((ERROR_COUNT + 1))
    ERROR_FILES="$ERROR_FILES index.js"
fi

echo ""
echo "=========================================="
if [ $ERROR_COUNT -eq 0 ]; then
    echo "✅ 所有检查通过！"
    echo ""
    echo "现在可以重启服务："
    echo "  pm2 restart aigc-agent"
else
    echo "❌ 发现 $ERROR_COUNT 个文件有语法错误"
    echo ""
    echo "有问题的文件："
    echo "$ERROR_FILES"
    echo ""
    echo "请检查这些文件中的 const 声明是否都有初始化值"
    echo "例如："
    echo "  const x = value;  ✅ 正确"
    echo "  const x;          ❌ 错误（缺少初始化值）"
fi
echo "=========================================="

REMOTE_SCRIPT

echo ""
echo "脚本执行完成！"




