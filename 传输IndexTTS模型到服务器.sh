#!/bin/bash

# IndexTTS2.5 模型文件传输脚本
# 在 Git Bash 中运行

echo "=========================================="
echo "  IndexTTS2.5 模型文件传输"
echo "=========================================="
echo ""

# 配置
SERVER="ubuntu@119.45.121.152"
REMOTE_DIR="/var/www/indextts-docker"
LOCAL_CHECKPOINTS="/e/IndexTTS2.5/checkpoints"  # Git Bash 路径格式

# 步骤1：在服务器上创建目录
echo "步骤1: 在服务器上创建目录..."
ssh $SERVER "mkdir -p $REMOTE_DIR/checkpoints $REMOTE_DIR/outputs"

if [ $? -ne 0 ]; then
    echo "❌ 创建目录失败"
    exit 1
fi

echo "✅ 目录创建成功"
echo ""

# 步骤2：检查本地文件是否存在
echo "步骤2: 检查本地文件..."
if [ ! -d "$LOCAL_CHECKPOINTS" ]; then
    echo "❌ 本地目录不存在: $LOCAL_CHECKPOINTS"
    exit 1
fi

echo "✅ 本地目录存在"
echo ""

# 步骤3：传输文件
echo "步骤3: 开始传输文件（这可能需要较长时间，请耐心等待）..."
echo "源目录: $LOCAL_CHECKPOINTS"
echo "目标: $SERVER:$REMOTE_DIR/checkpoints"
echo ""

scp -r "$LOCAL_CHECKPOINTS" "$SERVER:$REMOTE_DIR/checkpoints"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 文件传输成功！"
    echo ""
    echo "步骤4: 验证文件..."
    ssh $SERVER "ls -lh $REMOTE_DIR/checkpoints/ | head -10"
else
    echo ""
    echo "❌ 文件传输失败"
    echo ""
    echo "提示："
    echo "1. 检查网络连接"
    echo "2. 检查 SSH 密钥是否已配置"
    echo "3. 检查服务器磁盘空间是否充足"
    exit 1
fi

echo ""
echo "=========================================="
echo "  传输完成"
echo "=========================================="




