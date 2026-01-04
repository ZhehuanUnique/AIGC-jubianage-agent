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

### 前置条件

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

### 配置环境变量

在 `server/.env` 文件中添加：

```env
# Ollama 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# RAG 配置（可选）
RAG_ENABLED=true
RAG_VECTOR_DB_PATH=./data/rag_vectors
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.6
```

### 启动服务

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

## RAG 库集成

### 功能说明

系统已经完整集成了 RAG（检索增强生成）功能，可以：

1. **存储整个剧本文档**到 RAG 库
2. **自动检索相关片段**：根据当前分镜内容，从 RAG 库中检索相似度高的相关片段
3. **获取上下文窗口**：自动获取当前分镜前后的片段，保持剧情连贯性
4. **结合图片分析**：视觉模型直接分析图片 + RAG 检索的剧本上下文 = 更准确的提示词

### 完整工作流程

```
1. 存储剧本文档 → RAG 库
   ↓
2. 提供图片 + 当前分镜内容
   ↓
3. 视觉模型分析图片内容
   ↓
4. RAG 检索相关剧本片段（相似度 >= 0.6）
   ↓
5. 获取上下文窗口（前后各 2 个分镜）
   ↓
6. 结合图片分析 + RAG 上下文 → 生成视频运动提示词
```

### 存储剧本到 RAG 库

#### 方法 1: 使用简单脚本（推荐）

直接读取 DOCX 文件，按段落切分，不调用模型：

```powershell
cd server
node services/videoMotionPrompt/simple-import-script.js
```

这个脚本会：
- ✅ 直接读取 DOCX 文件
- ✅ 按段落切分（不调用模型）
- ✅ 自动存储到 RAG 库

**修改脚本配置**：编辑 `simple-import-script.js` 文件，修改文件路径和 scriptId。

#### 方法 2: 使用 API 接口

```powershell
curl -X POST http://localhost:3002/api/rag/store-script `
  -H "Content-Type: application/json" `
  -d '{
    "scriptId": "anmeng",
    "segments": [
      {
        "shotNumber": 1,
        "content": "第一段剧本内容...",
        "prompt": "可选的分镜提示词",
        "description": "可选的描述"
      }
    ]
  }'
```

#### 方法 3: 直接编辑 JSON 文件

1. 运行简单脚本生成初始 JSON 文件
2. 编辑文件：`server/data/rag_vectors/{scriptId}.json`
3. 格式示例：

```json
{
  "scriptId": "anmeng",
  "segments": [
    {
      "shotNumber": 1,
      "content": "第一段剧本内容",
      "prompt": "分镜提示词（可选）",
      "description": "描述（可选）",
      "keywords": ["关键词1", "关键词2"],
      "storedAt": "2025-12-27T10:00:00.000Z"
    }
  ],
  "updatedAt": "2025-12-27T10:00:00.000Z"
}
```

### 使用存储的剧本

生成视频运动提示词时，使用 `scriptId`：

```powershell
curl -X POST http://localhost:3002/api/generate-video-motion-prompt `
  -H "Content-Type: application/json" `
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "scriptContext": "当前分镜的内容...",
    "shotNumber": 1,
    "scriptId": "anmeng"
  }'
```

系统会自动：
- ✅ 从 RAG 库检索相关片段（相似度 >= 0.6）
- ✅ 获取当前分镜前后的上下文（窗口大小：2）
- ✅ 结合图片分析和 RAG 上下文生成提示词

### RAG 检索逻辑

1. **相似度计算**：基于关键词匹配的相似度计算，提取关键词 → 计算交集/并集 → 得到相似度分数
2. **检索策略**：
   - **相关片段检索**：检索与当前分镜内容相似度 >= 0.6 的片段
   - **上下文窗口**：获取当前分镜前后各 2 个片段（共 4 个）
   - **去重**：排除当前分镜本身
3. **结果合并**：相关片段 + 上下文窗口 → 合并为完整的 RAG 上下文，按分镜编号排序，保持时间顺序

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

## 注意事项

1. 首次使用需要下载模型，可能需要较长时间
2. 7B 模型在 16GB 显存的 GPU 上运行良好
3. 如果显存不足，Ollama 会自动使用 CPU，但速度较慢
4. 建议定期清理 RAG 向量数据库，避免占用过多空间
5. **scriptId** 要唯一，用于标识不同的剧本
6. **shotNumber** 从 1 开始，用于排序和上下文窗口
7. **content** 是必需的，其他字段可选
8. 修改 JSON 文件后，无需重启服务，立即生效


