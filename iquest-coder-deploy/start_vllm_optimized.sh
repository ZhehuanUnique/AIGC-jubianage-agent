#!/bin/bash

# IQuest-Coder 优化启动脚本（针对 RTX 5090 32GB 显存）

set -e

echo "🚀 启动 IQuest-Coder API 服务（优化版本）..."

# 模型配置 - 使用 14B 版本（推荐）
MODEL_NAME="${MODEL_NAME:-IQuestLab/IQuest-Coder-V1-14B-Instruct}"
# 如果显存充足，可以使用 40B 版本：
# MODEL_NAME="IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct"

HOST="0.0.0.0"
PORT=8000

# 性能配置（针对 RTX 5090 32GB 优化）
GPU_MEMORY_UTILIZATION=0.85      # 使用 85% 显存（保守配置）
MAX_MODEL_LEN=16384              # 16K 上下文（平衡性能和显存）
TENSOR_PARALLEL_SIZE=1           # 单卡部署

# 量化配置
QUANTIZATION="bitsandbytes"      # 4-bit 量化
LOAD_FORMAT="bitsandbytes"

# 推理优化
ENABLE_CHUNKED_PREFILL="true"
MAX_NUM_BATCHED_TOKENS=4096      # 减小批处理大小
MAX_NUM_SEQS=128                 # 减小并发数

# 采样参数
DEFAULT_TEMPERATURE=0.6
DEFAULT_TOP_P=0.85
DEFAULT_TOP_K=20

echo "📦 模型: $MODEL_NAME"
echo "🔧 量化: $QUANTIZATION (4-bit)"
echo "💾 显存利用率: ${GPU_MEMORY_UTILIZATION}%"
echo "📏 最大上下文: $MAX_MODEL_LEN tokens"
echo "🌡️  默认温度: $DEFAULT_TEMPERATURE"
echo ""

# 检查 GPU
echo "🔍 检查 GPU 状态..."
nvidia-smi

echo ""
echo "⏳ 正在启动 vLLM 服务..."
echo "💡 提示：首次启动需要下载模型，请耐心等待（约 10-20 分钟）"
echo ""

# 启动 vLLM 服务
python3 -m vllm.entrypoints.openai.api_server \
    --model "$MODEL_NAME" \
    --host "$HOST" \
    --port "$PORT" \
    --tensor-parallel-size "$TENSOR_PARALLEL_SIZE" \
    --gpu-memory-utilization "$GPU_MEMORY_UTILIZATION" \
    --max-model-len "$MAX_MODEL_LEN" \
    --quantization "$QUANTIZATION" \
    --load-format "$LOAD_FORMAT" \
    --enable-chunked-prefill \
    --max-num-batched-tokens "$MAX_NUM_BATCHED_TOKENS" \
    --max-num-seqs "$MAX_NUM_SEQS" \
    --trust-remote-code \
    --served-model-name "$MODEL_NAME" \
    --disable-log-requests

# 性能调优说明：
# 
# 如果遇到 OOM（显存不足）：
# 1. 减小 MAX_MODEL_LEN 到 8192
# 2. 减小 GPU_MEMORY_UTILIZATION 到 0.80
# 3. 减小 MAX_NUM_BATCHED_TOKENS 到 2048
# 4. 使用更小的模型（7B 版本）
#
# 如果推理速度慢：
# 1. 增加 MAX_NUM_BATCHED_TOKENS 到 8192
# 2. 增加 MAX_NUM_SEQS 到 256
# 3. 确保 Flash Attention 已安装
#
# 如果需要更长上下文：
# 1. 增加 MAX_MODEL_LEN 到 32768
# 2. 减小 MAX_NUM_SEQS 到 64
# 3. 监控显存使用情况
