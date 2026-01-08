# IQuest-Coder-V1-40B-Loop-Instruct Docker 部署
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04

# 设置环境变量
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV CUDA_HOME=/usr/local/cuda
ENV PATH=${CUDA_HOME}/bin:${PATH}
ENV LD_LIBRARY_PATH=${CUDA_HOME}/lib64:${LD_LIBRARY_PATH}

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    git \
    wget \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

# 升级 pip
RUN pip3 install --no-cache-dir --upgrade pip

# 安装 PyTorch (CUDA 12.1)
RUN pip3 install --no-cache-dir \
    torch==2.1.2 \
    torchvision==0.16.2 \
    torchaudio==2.1.2 \
    --index-url https://download.pytorch.org/whl/cu121

# 安装 vLLM 和相关依赖
RUN pip3 install --no-cache-dir \
    vllm==0.6.3 \
    transformers==4.56.0 \
    accelerate==0.34.2 \
    bitsandbytes==0.44.1 \
    flash-attn==2.7.3 \
    sentencepiece \
    protobuf

# 创建工作目录
WORKDIR /app

# 复制启动脚本
COPY start_vllm.sh /app/start_vllm.sh
RUN chmod +x /app/start_vllm.sh

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=300s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动服务
CMD ["/app/start_vllm.sh"]
