#!/bin/bash

# IQuest-Coder-V1-40B-Loop-Instruct vLLM 启动脚本

set -e

echo "🚀 启动 IQuest-Coder-V1-40B-Loop-Instruct API 服务..."

# 模型配置
MODEL_NAME="IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct"
HOST="0.0.0.0"
PORT=8000

# 性能配置（针对 RTX 5090 24GB 显存优化）
GPU_MEMORY_UTILIZATION=0.90  # 使用 90% 显存
MAX_MODEL_LEN=32768          # 最大上下文长度（根据显存调整）
TENSOR_PARALLEL_SIZE=1       # 单卡部署

# 量化配置（使用 4-bit 量化以适配 24GB 显存）
QUANTIZATION="bitsandbytes"  # 使用 bitsandbytes 4-bit 量化
LOAD_FORMAT="bitsandbytes"

# 推理优化
ENABLE_CHUNKED_PREFILL="true"
MAX_NUM_BATCHED_TOKENS=8192
MAX_NUM_SEQS=256

# 采样参数（官方推荐）
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
echo "⏳ 正在启动 vLLM 服务（首次启动需要下载模型，请耐心等待）..."
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

# 注意：如果显存不足，可以尝试以下调整：
# 1. 减小 MAX_MODEL_LEN 到 16384 或 8192
# 2. 减小 GPU_MEMORY_UTILIZATION 到 0.85
# 3. 减小 MAX_NUM_BATCHED_TOKENS 到 4096
# 4. 使用更激进的量化（如果支持）
