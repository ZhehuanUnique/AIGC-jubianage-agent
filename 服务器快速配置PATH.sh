#!/bin/bash

# 服务器快速配置 Node.js 到 PATH
# 使用方法：ssh ubuntu@119.45.121.152 < 服务器快速配置PATH.sh

echo "=========================================="
echo "  配置 Node.js 到 PATH"
echo "=========================================="
echo ""

# 步骤 1: 查找 Node.js
echo "步骤 1: 查找 Node.js 安装位置..."
NODE_PATH=""

# 方法 1: 使用 which
if command -v nodejs > /dev/null 2>&1; then
    NODE_PATH=$(which nodejs)
elif command -v node > /dev/null 2>&1; then
    NODE_PATH=$(which node)
fi

# 方法 2: 检查常见位置
if [ -z "$NODE_PATH" ]; then
    for path in /usr/bin/nodejs /usr/local/bin/node /opt/nodejs/bin/node; do
        if [ -f "$path" ]; then
            NODE_PATH="$path"
            break
        fi
    done
fi

# 方法 3: 使用 find
if [ -z "$NODE_PATH" ]; then
    NODE_PATH=$(find /usr -name node 2>/dev/null | grep -E 'bin/node$' | head -1)
fi

# 方法 4: 从 PM2 获取
if [ -z "$NODE_PATH" ] && command -v pm2 > /dev/null 2>&1; then
    PM2_INFO=$(pm2 info aigc-agent 2>/dev/null)
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
    echo "请手动查找："
    echo "  find /usr -name node 2>/dev/null"
    echo "  find /opt -name node 2>/dev/null"
    exit 1
fi

NODE_DIR=$(dirname "$NODE_PATH")
NODE_VERSION=$("$NODE_PATH" --version 2>/dev/null || echo "未知")

echo "✅ 找到 Node.js: $NODE_PATH"
echo "✅ 目录: $NODE_DIR"
echo "✅ 版本: $NODE_VERSION"

# 步骤 2: 配置 PATH
echo ""
echo "步骤 2: 配置 PATH 环境变量..."

# 检查是否已在 ~/.bashrc 中
if grep -q "export PATH.*$NODE_DIR" ~/.bashrc 2>/dev/null; then
    echo "ℹ️  ~/.bashrc 中已存在相关配置"
else
    # 添加到 ~/.bashrc
    echo "" >> ~/.bashrc
    echo "# Node.js PATH (自动添加于 $(date +%Y-%m-%d\ %H:%M:%S))" >> ~/.bashrc
    echo "export PATH=\"$NODE_DIR:\$PATH\"" >> ~/.bashrc
    echo "✅ 已添加到 ~/.bashrc（永久生效）"
fi

# 添加到当前会话
export PATH="$NODE_DIR:$PATH"
echo "✅ 已添加到当前会话"

# 步骤 3: 验证
echo ""
echo "步骤 3: 验证配置..."

if command -v node > /dev/null 2>&1; then
    echo "✅ node 命令可用: $(which node)"
    echo "✅ node 版本: $(node --version)"
elif command -v nodejs > /dev/null 2>&1; then
    echo "✅ nodejs 命令可用: $(which nodejs)"
    echo "✅ nodejs 版本: $(nodejs --version)"
else
    echo "⚠️  node/nodejs 命令仍不可用"
    echo "   但可以直接使用: $NODE_PATH"
fi

if command -v npm > /dev/null 2>&1; then
    echo "✅ npm 命令可用: $(which npm)"
    echo "✅ npm 版本: $(npm --version)"
fi

echo ""
echo "=========================================="
echo "  配置完成！"
echo "=========================================="
echo ""
echo "注意："
echo "1. 当前会话已生效"
echo "2. 已添加到 ~/.bashrc，新会话会自动生效"
echo "3. 如果当前会话仍不可用，请执行："
echo "   source ~/.bashrc"
echo "   或"
echo "   export PATH=\"$NODE_DIR:\$PATH\""




