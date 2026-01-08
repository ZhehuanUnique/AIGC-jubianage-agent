#!/bin/bash

# IQuest-Coder-V1-40B 环境安装脚本（直接部署方式）

set -e

echo "🔧 开始安装 IQuest-Coder-V1-40B 部署环境..."

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  请使用 sudo 运行此脚本"
    exit 1
fi

# 更新系统
echo "📦 更新系统包..."
apt-get update
apt-get upgrade -y

# 安装基础依赖
echo "📦 安装基础依赖..."
apt-get install -y \
    python3.10 \
    python3-pip \
    python3-venv \
    git \
    wget \
    curl \
    vim \
    htop \
    tmux \
    build-essential

# 检查 NVIDIA 驱动
echo "🔍 检查 NVIDIA 驱动..."
if ! command -v nvidia-smi &> /dev/null; then
    echo "❌ 未检测到 NVIDIA 驱动，请先安装 NVIDIA 驱动"
    exit 1
fi

nvidia-smi

# 创建 Python 虚拟环境
echo "🐍 创建 Python 虚拟环境..."
python3 -m venv /opt/iquest-coder-env
source /opt/iquest-coder-env/bin/activate

# 升级 pip
echo "📦 升级 pip..."
pip install --upgrade pip

# 安装 PyTorch (CUDA 12.1)
echo "🔥 安装 PyTorch..."
pip install torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2 \
    --index-url https://download.pytorch.org/whl/cu121

# 安装 vLLM 和依赖
echo "⚡ 安装 vLLM..."
pip install vllm==0.6.3
pip install transformers==4.56.0
pip install accelerate==0.34.2
pip install bitsandbytes==0.44.1
pip install flash-attn==2.7.3
pip install sentencepiece protobuf

# 安装 PM2（用于进程管理）
echo "📦 安装 PM2..."
if ! command -v npm &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

npm install -g pm2

# 创建工作目录
echo "📁 创建工作目录..."
mkdir -p /opt/iquest-coder
cp start_vllm.sh /opt/iquest-coder/
chmod +x /opt/iquest-coder/start_vllm.sh

# 创建 PM2 配置
cat > /opt/iquest-coder/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'iquest-coder',
    script: '/opt/iquest-coder/start_vllm.sh',
    interpreter: '/bin/bash',
    cwd: '/opt/iquest-coder',
    env: {
      CUDA_VISIBLE_DEVICES: '0',
      PYTHONPATH: '/opt/iquest-coder-env/lib/python3.10/site-packages'
    },
    max_memory_restart: '20G',
    error_file: '/var/log/iquest-coder-error.log',
    out_file: '/var/log/iquest-coder-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false
  }]
};
EOF

echo ""
echo "✅ 安装完成！"
echo ""
echo "📝 下一步操作："
echo "1. 启动服务: bash start_service.sh"
echo "2. 查看日志: pm2 logs iquest-coder"
echo "3. 查看状态: pm2 status"
echo "4. 停止服务: bash stop_service.sh"
echo ""
