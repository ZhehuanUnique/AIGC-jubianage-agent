# 视频运动提示词生成模块

## 概述

本模块用于根据图片和剧本上下文生成视频运动提示词，支持本地模型部署和 RAG 系统。

## 目录结构

```
videoMotionPrompt/
├── README.md                    # 本文件
├── ollamaService.js             # Ollama 本地模型服务集成
├── ragService.js                # RAG 向量检索系统
├── videoMotionPromptGenerator.js # 视频运动提示词生成主服务
└── config.js                    # 配置文件
```

## 功能特性

1. **本地模型部署**：支持通过 Ollama 调用本地部署的 Qwen2.5-7B-Chat 模型
2. **模型切换**：支持未来升级到更大的模型（如 Qwen2.5-14B-Chat）
3. **RAG 系统**：基于向量检索的剧本上下文理解
4. **图片理解**：结合图片内容生成运动提示词
5. **可扩展性**：模块化设计，便于后续优化和迭代

## 快速开始

### 1. 安装 Ollama

```bash
# Windows (PowerShell)
winget install Ollama.Ollama

# 或访问 https://ollama.com/download
```

### 2. 下载模型

```bash
# 下载 Qwen2.5-7B-Chat（适合当前硬件）
ollama pull qwen2.5:7b

# 未来升级硬件后，可以下载更大的模型
# ollama pull qwen2.5:14b
# ollama pull qwen2.5:32b
```

### 3. 启动 Ollama 服务

```bash
# Ollama 会自动在后台运行
# 默认端口：11434
```

### 4. 配置环境变量

在 `.env` 文件中添加：

```env
# Ollama 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# RAG 配置（可选）
RAG_ENABLED=true
RAG_VECTOR_DB_PATH=./data/rag_vectors
```

## API 使用

### 生成视频运动提示词

```javascript
POST /api/generate-video-motion-prompt

{
  "imageUrl": "https://example.com/image.jpg",
  "scriptContext": "剧本上下文...",
  "shotNumber": 1,
  "characterInfo": "角色信息...",
  "sceneInfo": "场景信息..."
}
```

响应：

```json
{
  "success": true,
  "data": {
    "motionPrompt": "人物缓慢向前行走，镜头跟随移动",
    "confidence": 0.85
  }
}
```

## 未来升级路径

### 硬件升级到 RTX 5090 后

1. 下载更大的模型：
```bash
ollama pull qwen2.5:14b
# 或
ollama pull qwen2.5:32b
```

2. 更新环境变量：
```env
OLLAMA_MODEL=qwen2.5:14b
```

3. 无需修改代码，自动使用新模型

## 开发计划

- [x] Ollama 服务集成
- [x] 基础 RAG 系统
- [x] 视频运动提示词生成 API
- [ ] 图片理解集成（Vision 模型）
- [ ] 高级 RAG 优化（ChromaDB/Milvus）
- [ ] 模型微调支持
- [ ] 提示词质量评估

## 注意事项

1. 首次使用需要下载模型，可能需要较长时间
2. 7B 模型在 16GB 显存的 GPU 上运行良好
3. 如果显存不足，Ollama 会自动使用 CPU，但速度较慢
4. 建议定期清理 RAG 向量数据库，避免占用过多空间


