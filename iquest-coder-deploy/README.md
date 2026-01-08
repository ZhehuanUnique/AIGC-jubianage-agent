# IQuest-Coder-V1-40B-Loop-Instruct 云端部署指南

## 📋 服务器要求
- GPU: RTX 5090 (24GB VRAM)
- 系统: Ubuntu 22.04
- Docker: 已安装
- NVIDIA Driver: 已安装

## 🚀 快速部署

### 方法 1: Docker 部署（推荐）
```bash
# 1. 构建 Docker 镜像
docker build -t iquest-coder-api -f Dockerfile .

# 2. 运行容器
docker run -d \
  --name iquest-coder \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  iquest-coder-api

# 3. 查看日志
docker logs -f iquest-coder
```

### 方法 2: 直接部署
```bash
# 1. 安装依赖
bash install.sh

# 2. 启动服务
bash start_service.sh

# 3. 停止服务
bash stop_service.sh
```

## 📡 API 使用示例

### Python 客户端
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://你的服务器IP:8000/v1",
    api_key="dummy"  # vLLM 不需要真实 API key
)

response = client.chat.completions.create(
    model="IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct",
    messages=[
        {"role": "user", "content": "写一个 Python 函数计算斐波那契数列"}
    ],
    temperature=0.6,
    top_p=0.85,
    max_tokens=2048
)

print(response.choices[0].message.content)
```

### cURL 测试
```bash
curl http://你的服务器IP:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "temperature": 0.6,
    "top_p": 0.85
  }'
```

## 🔧 配置说明

### 模型参数
- **Temperature**: 0.6 (推荐)
- **Top P**: 0.85 (推荐)
- **Top K**: 20 (推荐)
- **Max Tokens**: 8192 (最大)
- **Context Length**: 128K

### 性能优化
- 使用 4-bit 量化减少显存占用
- 启用 Flash Attention 2 加速推理
- 配置合适的 max_model_len 避免 OOM

## 📊 监控和维护

### 查看服务状态
```bash
# Docker 方式
docker ps | grep iquest-coder
docker stats iquest-coder

# 直接部署方式
pm2 status iquest-coder
pm2 logs iquest-coder
```

### 重启服务
```bash
# Docker 方式
docker restart iquest-coder

# 直接部署方式
pm2 restart iquest-coder
```

## 🛡️ 安全建议
1. 配置防火墙，只允许特定 IP 访问
2. 使用 Nginx 反向代理添加 SSL
3. 实现 API 密钥验证
4. 设置请求速率限制

## 📝 故障排查

### 显存不足 (OOM)
- 减小 `max_model_len` 参数
- 使用更激进的量化（4-bit 或 3-bit）
- 减少 `gpu_memory_utilization`

### 推理速度慢
- 检查 GPU 利用率
- 启用 Flash Attention
- 调整 batch size

### 模型下载失败
- 配置 HuggingFace 镜像
- 使用代理下载
- 手动下载模型文件

## 🔗 相关链接
- [IQuest-Coder 官网](https://iquestcoder.ai/)
- [HuggingFace 模型页](https://huggingface.co/IQuestLab/IQuest-Coder-V1-40B-Loop-Instruct)
- [vLLM 文档](https://docs.vllm.ai/)
