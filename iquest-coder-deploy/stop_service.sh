#!/bin/bash

# 停止 IQuest-Coder 服务

echo "🛑 停止 IQuest-Coder-V1-40B API 服务..."

pm2 stop iquest-coder
pm2 delete iquest-coder

echo "✅ 服务已停止"
