# 视频运动提示词生成模块 - 快速启动指南

## 前置条件

1. **安装 Ollama**
   - Windows: **访问 https://ollama.com/download 下载安装程序（推荐）**
   - 或使用命令行（如果系统支持）: `winget install Ollama.Ollama`
   - 安装完成后，Ollama 会自动在后台运行

2. **下载模型**
   ```bash
   # 下载 Qwen2.5-7B-Chat（适合当前硬件）
   ollama pull qwen2.5:7b
   ```

3. **验证安装**
   ```bash
   # 检查 Ollama 是否运行
   ollama list
   
   # 测试模型
   ollama run qwen2.5:7b "你好"
   ```

## 配置环境变量

在 `server/.env` 文件中添加：

```env
# Ollama 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# RAG 配置（可选）
RAG_ENABLED=true
RAG_VECTOR_DB_PATH=./data/rag_vectors
```

## 启动服务

1. **启动后端服务**
   ```bash
   cd server
   npm start
   ```

2. **检查 Ollama 服务状态**
   ```bash
   # 访问 API
   curl http://localhost:3002/api/ollama/health
   ```

## 使用示例

### 1. 生成视频运动提示词

```bash
curl -X POST http://localhost:3002/api/generate-video-motion-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "scriptContext": "男主角站在画面中央，周围有多个女性围绕着他。",
    "shotNumber": 1,
    "scriptId": "script_001"
  }'
```

### 2. 存储剧本到 RAG 库

```bash
curl -X POST http://localhost:3002/api/rag/store-script \
  -H "Content-Type: application/json" \
  -d '{
    "scriptId": "script_001",
    "segments": [
      {
        "shotNumber": 1,
        "content": "男主角站在画面中央...",
        "prompt": "景别：中景。主体: 男主角..."
      }
    ]
  }'
```

### 3. 在图生视频时自动生成运动提示词

```bash
curl -X POST http://localhost:3002/api/generate-video \
  -F "image=@image.jpg" \
  -F "model=doubao-seedance-1-5-pro-251215" \
  -F "scriptContext=男主角站在画面中央..." \
  -F "shotNumber=1" \
  -F "scriptId=script_001"
```

## 未来升级到更大模型

当硬件升级到 RTX 5090 后：

1. **下载更大的模型**
   ```bash
   ollama pull qwen2.5:14b
   # 或
   ollama pull qwen2.5:32b
   ```

2. **更新环境变量**
   ```env
   OLLAMA_MODEL=qwen2.5:14b
   ```

3. **重启服务** - 无需修改代码！

## 故障排查

### Ollama 服务未运行
```bash
# 检查 Ollama 是否运行
ollama list

# 如果未运行，启动 Ollama（通常会自动启动）
# Windows: 检查服务或重新安装
```

### 模型未下载
```bash
# 检查已下载的模型
ollama list

# 下载模型
ollama pull qwen2.5:7b
```

### API 调用超时
- 检查 `OLLAMA_TIMEOUT` 环境变量（默认60秒）
- 如果硬件性能较低，可以增加超时时间

### RAG 功能不工作
- 检查 `RAG_ENABLED=true` 是否设置
- 确保 `RAG_VECTOR_DB_PATH` 目录可写

## 性能优化建议

1. **7B 模型最低要求**
   - GPU: 8GB+ 显存（推荐 16GB+）
   - RAM: 16GB+
   - 如果显存不足，Ollama 会自动使用 CPU（速度较慢）

2. **14B 模型要求**
   - GPU: 24GB+ 显存（如 RTX 4090）
   - RAM: 32GB+

3. **32B 模型要求**
   - GPU: 40GB+ 显存（如 A100）
   - RAM: 64GB+

## 下一步

- [ ] 集成 Vision 模型进行图片理解
- [ ] 升级到向量数据库（ChromaDB/Milvus）
- [ ] 进行模型微调
- [ ] 添加提示词质量评估

