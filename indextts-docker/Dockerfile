# IndexTTS2.5 Docker 镜像
# 基于 Python 3.10，支持 CUDA（如果有 GPU）

FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    build-essential \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 复制 requirements.txt 并安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制 IndexTTS2.5 项目文件
# 注意：模型文件将通过 volume 挂载，不包含在镜像中
COPY app.py .
COPY config.py .

# 创建模型和输出目录
RUN mkdir -p /app/models /app/checkpoints /app/outputs

# 暴露 API 端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# 启动 API 服务
CMD ["python", "app.py"]

