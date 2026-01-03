#!/bin/bash

echo "=========================================="
echo "  修复 Milvus Standalone 重启问题"
echo "=========================================="
echo ""

cd milvus || exit 1

echo "[1/4] 停止所有容器..."
docker-compose down
echo ""

echo "[2/4] 清理损坏的 RocksMQ 数据..."
if [ -d "volumes/milvus/rdb_data" ]; then
    echo "   正在删除 rdb_data 目录..."
    rm -rf "volumes/milvus/rdb_data"
    if [ $? -eq 0 ]; then
        echo "   ✅ 已清理损坏的数据"
    else
        echo "   ⚠️  清理失败，可能需要手动删除"
    fi
else
    echo "   ℹ️  rdb_data 目录不存在，跳过清理"
fi
echo ""

echo "[3/4] 重新启动服务..."
docker-compose up -d
echo ""

echo "[4/4] 等待服务启动（60秒）..."
sleep 60
echo ""

echo "=========================================="
echo "  检查容器状态"
echo "=========================================="
docker-compose ps
echo ""

echo "=========================================="
echo "  测试健康检查"
echo "=========================================="
HEALTH_CHECK=$(curl -s http://localhost:9091/healthz 2>/dev/null)
if [ "$HEALTH_CHECK" = "OK" ]; then
    echo "✅ Milvus 健康检查通过！"
else
    echo "⚠️  健康检查失败，请查看日志："
    echo "   docker-compose logs --tail=50 standalone"
fi
echo ""

echo "=========================================="
echo "   ✅ 修复完成！"
echo "=========================================="
echo ""
echo "如果问题仍然存在，请查看日志："
echo "  cd milvus"
echo "  docker-compose logs -f standalone"
echo ""

