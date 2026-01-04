#!/bin/bash

# 在服务器端配置火山引擎API密钥

echo "=========================================="
echo "配置火山引擎API密钥"
echo "=========================================="

# 查找项目目录
PROJECT_DIR=""
if [ -d "/home/ubuntu/AIGC-jubianage-agent" ]; then
    PROJECT_DIR="/home/ubuntu/AIGC-jubianage-agent"
elif [ -d "$HOME/AIGC-jubianage-agent" ]; then
    PROJECT_DIR="$HOME/AIGC-jubianage-agent"
elif [ -d "/root/AIGC-jubianage-agent" ]; then
    PROJECT_DIR="/root/AIGC-jubianage-agent"
else
    echo "❌ 未找到项目目录，请手动指定路径"
    exit 1
fi

echo "✅ 找到项目目录: $PROJECT_DIR"

# 进入server目录
cd "$PROJECT_DIR/server" || exit 1

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo "📝 创建 .env 文件..."
    touch .env
fi

# 备份现有.env文件
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ 已备份现有 .env 文件"
fi

# 检查是否已存在配置
if grep -q "VOLCENGINE_AK=" .env 2>/dev/null; then
    echo "⚠️  检测到已存在 VOLCENGINE_AK 配置"
    read -p "是否要覆盖现有配置? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 已取消操作"
        exit 1
    fi
    # 删除旧的配置行
    sed -i '/^VOLCENGINE_AK=/d' .env
    sed -i '/^VOLCENGINE_SK=/d' .env
    sed -i '/^VOLCENGINE_API_HOST=/d' .env
    echo "✅ 已删除旧配置"
fi

# 添加新配置
echo "" >> .env
echo "# 火山引擎即梦AI-视频生成3.0 Pro配置" >> .env
echo "VOLCENGINE_AK=AKLTYjM1ZTY4NWRiMWEyNDg4NDg1ZTBhODdlYWNmYzY5ZTI" >> .env
echo "VOLCENGINE_SK=WVRoall6QmtNMkUwTnpsaE5EbGpZbUV5T1RZeU16Y3pZVGN4TnpKa01UTQ==" >> .env
echo "VOLCENGINE_API_HOST=https://visual.volcengineapi.com" >> .env

echo "✅ 配置已添加到 .env 文件"

# 验证配置
echo ""
echo "=========================================="
echo "验证配置"
echo "=========================================="
echo ""
grep "VOLCENGINE" .env

echo ""
echo "=========================================="
echo "✅ 配置完成！"
echo "=========================================="
echo ""
echo "下一步：重启后端服务使配置生效"
echo "  pm2 restart AIGC-jubianage-agent"
echo ""

