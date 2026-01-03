#!/bin/bash

echo "=========================================="
echo "  查看 Milvus 实时日志"
echo "=========================================="
echo ""
echo "按 Ctrl+C 退出日志查看"
echo ""

cd milvus || exit 1

docker-compose logs -f standalone

