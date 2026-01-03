#!/bin/bash

echo "=========================================="
echo "  等待并检查 Milvus 服务"
echo "=========================================="
echo ""

cd milvus || exit 1

echo "Milvus 需要 30-60 秒才能完全启动..."
echo ""

# 检查容器状态
echo "[1/3] 检查容器状态..."
docker-compose ps
echo ""

# 等待并重试健康检查
echo "[2/3] 等待 Milvus 启动并检查健康状态..."
echo ""

MAX_ATTEMPTS=12
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "[尝试 $ATTEMPT/$MAX_ATTEMPTS] 等待 5 秒后检查..."
    sleep 5
    
    # 检查健康状态
    HEALTH_CHECK=$(curl -s http://localhost:9091/healthz 2>/dev/null)
    
    if [ "$HEALTH_CHECK" = "OK" ]; then
        echo ""
        echo "✅ Milvus 健康检查通过！"
        echo ""
        echo "现在可以启动后端服务了："
        echo "  cd server"
        echo "  npm run dev"
        exit 0
    else
        # 检查容器是否还在运行
        CONTAINER_STATUS=$(docker-compose ps standalone | grep standalone | awk '{print $6}')
        if [[ "$CONTAINER_STATUS" == *"Exited"* ]] || [[ "$CONTAINER_STATUS" == *"Restarting"* ]]; then
            echo "  ⚠️  容器状态异常: $CONTAINER_STATUS"
            echo ""
            echo "查看日志以找出问题："
            echo "  docker-compose logs --tail=50 standalone"
            exit 1
        fi
        echo "  ⏳ Milvus 还在启动中..."
    fi
done

echo ""
echo "⚠️  等待超时（60秒），但 Milvus 可能还在启动中"
echo ""
echo "[3/3] 查看 Milvus 日志（最近 30 行）..."
docker-compose logs --tail=30 standalone
echo ""

echo "请手动检查："
echo "  1. 容器状态: docker-compose ps"
echo "  2. 健康检查: curl http://localhost:9091/healthz"
echo "  3. 查看日志: docker-compose logs -f standalone"
echo ""

