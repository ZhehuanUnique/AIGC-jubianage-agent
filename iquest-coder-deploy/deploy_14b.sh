#!/bin/bash

# IQuest-Coder-V1-14B 一键部署脚本

set -e

echo "=========================================="
echo "  IQuest-Coder-V1-14B 一键部署"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker
echo "🔍 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    echo "请先安装 Docker: https://docs.docker.com/engine/install/"
    exit 1
fi
echo -e "${GREEN}✅ Docker 已安装${NC}"

# 检查 Docker Compose
echo "🔍 检查 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装${NC}"
    echo "请先安装 Docker Compose"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose 已安装${NC}"

# 检查 NVIDIA Docker
echo "🔍 检查 NVIDIA Docker..."
if ! docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi &> /dev/null; then
    echo -e "${RED}❌ NVIDIA Docker 未配置${NC}"
    echo "请先安装 NVIDIA Container Toolkit"
    exit 1
fi
echo -e "${GREEN}✅ NVIDIA Docker 已配置${NC}"

# 检查 GPU
echo "🔍 检查 GPU..."
if ! nvidia-smi &> /dev/null; then
    echo -e "${RED}❌ 未检测到 NVIDIA GPU${NC}"
    exit 1
fi
echo -e "${GREEN}✅ GPU 检测成功${NC}"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

echo ""
echo "=========================================="
echo "  开始部署"
echo "=========================================="
echo ""

# 停止旧容器（如果存在）
echo "🛑 停止旧容器..."
docker-compose -f docker-compose-14b.yml down 2>/dev/null || true

# 构建镜像
echo "🔨 构建 Docker 镜像..."
echo -e "${YELLOW}⏳ 这可能需要 5-10 分钟...${NC}"
docker-compose -f docker-compose-14b.yml build

# 启动服务
echo "🚀 启动服务..."
docker-compose -f docker-compose-14b.yml up -d

echo ""
echo -e "${GREEN}✅ 服务已启动！${NC}"
echo ""

# 等待服务就绪
echo "⏳ 等待服务就绪..."
echo -e "${YELLOW}💡 首次启动需要下载模型（约 8GB），请耐心等待 5-10 分钟${NC}"
echo ""

# 显示日志
echo "📝 实时日志（按 Ctrl+C 停止查看日志，服务会继续运行）:"
echo "----------------------------------------"
docker-compose -f docker-compose-14b.yml logs -f &
LOG_PID=$!

# 等待健康检查
MAX_WAIT=600  # 最多等待 10 分钟
WAIT_TIME=0
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        kill $LOG_PID 2>/dev/null || true
        echo ""
        echo "----------------------------------------"
        echo -e "${GREEN}✅ 服务已就绪！${NC}"
        break
    fi
    sleep 5
    WAIT_TIME=$((WAIT_TIME + 5))
done

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
    kill $LOG_PID 2>/dev/null || true
    echo ""
    echo -e "${RED}❌ 服务启动超时${NC}"
    echo "请检查日志: docker-compose -f docker-compose-14b.yml logs"
    exit 1
fi

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "📊 服务信息:"
echo "  - API 地址: http://localhost:8000"
echo "  - API 文档: http://localhost:8000/docs"
echo "  - 健康检查: http://localhost:8000/health"
echo ""
echo "🧪 测试命令:"
echo "  - 健康检查: curl http://localhost:8000/health"
echo "  - 完整测试: python3 test_api_14b.py"
echo ""
echo "📝 管理命令:"
echo "  - 查看日志: docker-compose -f docker-compose-14b.yml logs -f"
echo "  - 查看状态: docker-compose -f docker-compose-14b.yml ps"
echo "  - 重启服务: docker-compose -f docker-compose-14b.yml restart"
echo "  - 停止服务: docker-compose -f docker-compose-14b.yml down"
echo "  - 查看 GPU: nvidia-smi"
echo ""
echo "🎉 开始使用 IQuest-Coder-V1-14B 吧！"
echo ""
