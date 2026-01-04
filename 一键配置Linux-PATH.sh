#!/bin/bash

# 一键配置 Linux 服务器 PATH（NVM Node.js）
# Node.js 路径：/home/ubuntu/.nvm/versions/node/v20.19.6/bin/node

echo "=========================================="
echo "  配置 NVM Node.js 到 PATH"
echo "=========================================="
echo ""

NODE_DIR="/home/ubuntu/.nvm/versions/node/v20.19.6/bin"
NODE_PATH="$NODE_DIR/node"

echo "Node.js 路径: $NODE_PATH"
echo "Node.js 目录: $NODE_DIR"
echo ""

# 方法 1: 直接添加到 PATH
echo "方法 1: 直接添加到 PATH"
if ! grep -q "$NODE_DIR" ~/.bashrc 2>/dev/null; then
    echo "" >> ~/.bashrc
    echo "# Node.js PATH (NVM 安装，添加于 $(date +%Y-%m-%d))" >> ~/.bashrc
    echo "export PATH=\"$NODE_DIR:\$PATH\"" >> ~/.bashrc
    echo "✅ 已添加到 ~/.bashrc"
else
    echo "ℹ️  ~/.bashrc 中已存在相关配置"
fi

# 方法 2: 使用 NVM 方式（推荐）
echo ""
echo "方法 2: 使用 NVM 方式（推荐）"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    echo "✅ 找到 NVM 安装"
    
    if ! grep -q "\.nvm/nvm.sh" ~/.bashrc 2>/dev/null; then
        echo "" >> ~/.bashrc
        echo "# NVM 配置（添加于 $(date +%Y-%m-%d))" >> ~/.bashrc
        echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
        echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm' >> ~/.bashrc
        echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion' >> ~/.bashrc
        echo 'nvm use v20.19.6 > /dev/null 2>&1 || true' >> ~/.bashrc
        echo 'nvm alias default v20.19.6' >> ~/.bashrc
        echo "✅ 已添加 NVM 加载配置到 ~/.bashrc"
    else
        echo "ℹ️  ~/.bashrc 中已存在 NVM 加载配置"
    fi
else
    echo "⚠️  未找到 NVM 安装，使用方法 1（直接添加 PATH）"
fi

# 应用到当前会话
export PATH="$NODE_DIR:$PATH"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

echo ""
echo "=========================================="
echo "  验证配置"
echo "=========================================="

if command -v node > /dev/null 2>&1; then
    echo "✅ node 命令可用: $(which node)"
    echo "✅ node 版本: $(node --version)"
else
    echo "⚠️  node 命令不可用"
    echo "   请执行: source ~/.bashrc"
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
echo "下一步："
echo "1. 执行: source ~/.bashrc"
echo "2. 验证: node --version"
echo "3. 如果使用 NVM，可以切换版本: nvm use v20.19.6"




