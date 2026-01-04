#!/bin/bash

echo "=========================================="
echo "  配置 Node.js 到 PATH"
echo "=========================================="
echo ""

ssh ubuntu@119.45.121.152 << 'ENDSSH'
echo "1. 查找 Node.js 安装位置..."

# 尝试多种方法查找 node
NODE_PATHS=(
    "$(which node 2>/dev/null)"
    "$(which nodejs 2>/dev/null)"
    "$(find /usr -name node 2>/dev/null | grep -E 'bin/node$' | head -1)"
    "$(find /opt -name node 2>/dev/null | grep -E 'bin/node$' | head -1)"
    "$(find /home -name node 2>/dev/null | grep -E 'bin/node$' | head -1)"
    "$(readlink -f $(which nodejs 2>/dev/null) 2>/dev/null)"
)

NODE_FOUND=""
for path in "${NODE_PATHS[@]}"; do
    if [ -n "$path" ] && [ -f "$path" ]; then
        NODE_FOUND="$path"
        break
    fi
done

# 如果 PM2 在运行，从 PM2 获取 node 路径
if [ -z "$NODE_FOUND" ] && command -v pm2 > /dev/null 2>&1; then
    PM2_NODE=$(pm2 info aigc-agent 2>/dev/null | grep "exec path" | awk '{print $4}' | head -1)
    if [ -n "$PM2_NODE" ]; then
        NODE_DIR=$(dirname "$PM2_NODE" 2>/dev/null)
        if [ -n "$NODE_DIR" ] && [ -f "$NODE_DIR/node" ]; then
            NODE_FOUND="$NODE_DIR/node"
        fi
    fi
fi

# 检查常见的 Node.js 安装位置
if [ -z "$NODE_FOUND" ]; then
    COMMON_PATHS=(
        "/usr/local/bin/node"
        "/usr/bin/node"
        "/usr/bin/nodejs"
        "/opt/nodejs/bin/node"
        "$HOME/.nvm/versions/node/*/bin/node"
        "$HOME/.local/bin/node"
    )
    
    for path in "${COMMON_PATHS[@]}"; do
        # 处理通配符
        if [[ "$path" == *"*"* ]]; then
            EXPANDED=$(eval echo $path | head -1)
            if [ -f "$EXPANDED" ]; then
                NODE_FOUND="$EXPANDED"
                break
            fi
        elif [ -f "$path" ]; then
            NODE_FOUND="$path"
            break
        fi
    done
fi

if [ -z "$NODE_FOUND" ]; then
    echo "  ❌ 未找到 Node.js"
    echo ""
    echo "  检查是否安装了 Node.js："
    echo "  - 检查 /usr/bin/nodejs"
    echo "  - 检查 /usr/local/bin/node"
    echo "  - 检查是否使用 nvm 安装"
    echo ""
    echo "  如果未安装，请先安装 Node.js："
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

echo "  ✅ 找到 Node.js: $NODE_FOUND"

# 获取 Node.js 版本
NODE_VERSION=$($NODE_FOUND --version 2>/dev/null)
echo "  ✅ Node.js 版本: $NODE_VERSION"

# 获取 Node.js 目录
NODE_DIR=$(dirname "$NODE_FOUND")
echo "  ✅ Node.js 目录: $NODE_DIR"

echo ""
echo "2. 配置 PATH 环境变量..."

# 检查是否已在 PATH 中
if echo "$PATH" | grep -q "$NODE_DIR"; then
    echo "  ✅ $NODE_DIR 已在 PATH 中"
else
    echo "  ⚠️  $NODE_DIR 不在 PATH 中，需要添加"
    
    # 添加到当前 shell 的 PATH
    export PATH="$NODE_DIR:$PATH"
    echo "  ✅ 已添加到当前会话的 PATH"
    
    # 添加到 ~/.bashrc（持久化）
    if ! grep -q "$NODE_DIR" ~/.bashrc 2>/dev/null; then
        echo "" >> ~/.bashrc
        echo "# Node.js PATH (added by script)" >> ~/.bashrc
        echo "export PATH=\"$NODE_DIR:\$PATH\"" >> ~/.bashrc
        echo "  ✅ 已添加到 ~/.bashrc（永久生效）"
    else
        echo "  ℹ️  ~/.bashrc 中已存在相关配置"
    fi
    
    # 添加到 ~/.profile（备用）
    if [ -f ~/.profile ] && ! grep -q "$NODE_DIR" ~/.profile 2>/dev/null; then
        echo "" >> ~/.profile
        echo "# Node.js PATH (added by script)" >> ~/.profile
        echo "export PATH=\"$NODE_DIR:\$PATH\"" >> ~/.profile
        echo "  ✅ 已添加到 ~/.profile（备用）"
    fi
fi

echo ""
echo "3. 验证配置..."
export PATH="$NODE_DIR:$PATH"
if command -v node > /dev/null 2>&1; then
    echo "  ✅ node 命令可用: $(which node)"
    echo "  ✅ node 版本: $(node --version)"
else
    echo "  ❌ node 命令仍不可用"
    echo "  请手动执行: export PATH=\"$NODE_DIR:\$PATH\""
fi

echo ""
echo "4. 检查 npm 和 pm2..."
if command -v npm > /dev/null 2>&1; then
    echo "  ✅ npm 可用: $(which npm)"
else
    echo "  ⚠️  npm 不可用"
fi

if command -v pm2 > /dev/null 2>&1; then
    echo "  ✅ pm2 可用: $(which pm2)"
else
    echo "  ⚠️  pm2 不可用"
fi

echo ""
echo "=========================================="
echo "  配置完成"
echo "=========================================="
echo ""
echo "注意："
echo "1. 当前会话已生效"
echo "2. 已添加到 ~/.bashrc，新会话会自动生效"
echo "3. 如果当前会话仍不可用，请执行："
echo "   source ~/.bashrc"
echo "   或"
echo "   export PATH=\"$NODE_DIR:\$PATH\""

ENDSSH




