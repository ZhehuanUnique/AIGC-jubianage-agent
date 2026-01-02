# RAG 库实现说明

> 📖 **使用指南**：详细的使用方法请参考 [RAG库使用指南.md](./RAG库使用指南.md)

## 📚 概述

当前项目实现了两种 RAG（检索增强生成）方案：

1. **简单版本** (`ragService.js`)：基于 JSON 文件存储，使用关键词匹配进行相似度计算
2. **高级版本** (`geminiRagService.js`)：支持向量数据库（Chroma/Milvus），使用真正的向量相似度计算

## 🔍 实现方式

### 1. 简单版本（默认）

**存储方式**：
- 使用 JSON 文件存储剧本片段
- 文件路径：`server/data/rag_vectors/{scriptId}.json`
- 每个剧本一个 JSON 文件

**检索方式**：
- 基于关键词匹配的相似度计算
- 提取关键词 → 计算交集/并集 → 得到相似度分数
- 相似度阈值：默认 0.6（可配置）

**优点**：
- ✅ 无需额外依赖
- ✅ 实现简单，易于理解
- ✅ 适合小规模数据

**缺点**：
- ❌ 检索精度有限
- ❌ 无法理解语义相似性

### 2. 高级版本（Gemini RAG）

**存储方式**：
- 支持两种向量数据库：
  - **ChromaDB**：轻量级，适合本地部署
  - **Milvus**：高性能，适合大规模数据
- 使用向量嵌入（Embedding）存储剧本片段

**检索方式**：
- 使用 Gemini Embedding API 生成向量
- 支持混合检索：
  - **CLIP 向量**：用于敏感剧本数据（本地生成，私有存储）
  - **Gemini Embedding**：用于公开/参考素材（云端生成）
- 向量相似度计算（余弦相似度）

**优点**：
- ✅ 语义理解能力强
- ✅ 检索精度高
- ✅ 支持大规模数据
- ✅ 支持混合检索策略

**缺点**：
- ❌ 需要额外的向量数据库依赖
- ❌ 需要 Gemini API Key
- ❌ 配置相对复杂

## 📋 是否需要提前准备内容？

**是的，需要提前准备内容！**

RAG 库需要先存储剧本文档，然后才能进行检索。有以下几种方式：

### 方式 1：使用简单脚本导入（推荐）

```powershell
cd server
node services/videoMotionPrompt/simple-import-script.js
```

这个脚本会：
- ✅ 读取 DOCX 文件（路径在脚本中配置）
- ✅ 按段落自动切分
- ✅ 存储到 RAG 库（JSON 格式）

**修改脚本中的路径**：
```javascript
const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\安萌.docx'
const scriptId = 'anmeng' // RAG 库中的剧本ID
```

### 方式 2：使用 API 接口

```powershell
curl -X POST http://localhost:3002/api/rag/store-script `
  -H "Content-Type: application/json" `
  -d '{
    "scriptId": "script_001",
    "segments": [
      {
        "shotNumber": 1,
        "content": "第一段剧本内容...",
        "prompt": "可选的分镜提示词"
      },
      {
        "shotNumber": 2,
        "content": "第二段剧本内容..."
      }
    ]
  }'
```

### 方式 3：手动编辑 JSON 文件

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

## 🔄 工作流程

### 存储流程

```
1. 准备剧本文档（DOCX 或文本）
   ↓
2. 切分剧本为片段（按段落或使用模型切分）
   ↓
3. 存储到 RAG 库
   - 简单版本：存储为 JSON 文件
   - 高级版本：生成向量并存储到向量数据库
   ↓
4. 完成！可以开始使用 RAG 检索
```

### 检索流程

```
1. 生成视频运动提示词时，提供 scriptId 和当前分镜内容
   ↓
2. RAG 检索相关片段
   - 简单版本：关键词匹配，计算相似度
   - 高级版本：向量相似度搜索
   ↓
3. 获取上下文窗口（当前分镜前后各 N 个片段）
   ↓
4. 合并相关片段和上下文
   ↓
5. 结合图片分析和 RAG 上下文生成提示词
```

## ⚙️ 配置说明

### 简单版本配置

在 `server/.env` 文件中：

```env
# RAG 配置
RAG_ENABLED=true                    # 是否启用 RAG
RAG_VECTOR_DB_PATH=./data/rag_vectors  # RAG 数据存储路径
RAG_TOP_K=5                         # 检索前 5 个相关片段
RAG_SIMILARITY_THRESHOLD=0.6        # 相似度阈值（0-1）
```

### 高级版本配置

```env
# Gemini RAG 配置
GEMINI_3_PRO_API_KEY=your_api_key   # Gemini API Key
VECTOR_DB_TYPE=milvus               # 向量数据库类型：chroma 或 milvus
MILVUS_HOST=localhost               # Milvus 主机地址
MILVUS_PORT=19530                   # Milvus 端口
GEMINI_RAG_TOP_K=5                  # 检索前 5 个相关片段
GEMINI_RAG_SIMILARITY_THRESHOLD=0.6 # 相似度阈值
GEMINI_RAG_MERGE_RESULTS=true       # 是否合并 CLIP 和 Gemini 结果
```

## 📊 数据格式

### JSON 文件格式（简单版本）

```json
{
  "scriptId": "anmeng",
  "segments": [
    {
      "shotNumber": 1,
      "content": "剧本片段内容",
      "prompt": "分镜提示词（可选）",
      "description": "描述（可选）",
      "keywords": ["关键词1", "关键词2"],
      "storedAt": "2025-12-27T10:00:00.000Z"
    }
  ],
  "updatedAt": "2025-12-27T10:00:00.000Z"
}
```

### 向量数据库格式（高级版本）

存储在 Chroma 或 Milvus 中，包含：
- **id**: 片段ID（如 `segment_1`）
- **embedding**: 向量嵌入（768 维）
- **content**: 剧本片段内容
- **shotNumber**: 分镜编号
- **scriptId**: 剧本ID
- **embeddingType**: 嵌入类型（`clip` 或 `gemini`）

## 🎯 使用示例

### 1. 存储剧本

```javascript
// 通过 API
POST /api/rag/store-script
{
  "scriptId": "anmeng",
  "segments": [
    {
      "shotNumber": 1,
      "content": "第一段内容..."
    }
  ]
}
```

### 2. 生成视频运动提示词（自动使用 RAG）

```javascript
// 通过 API
POST /api/generate-video-motion-prompt
{
  "imageUrl": "https://example.com/image.jpg",
  "scriptContext": "当前分镜内容...",
  "shotNumber": 1,
  "scriptId": "anmeng"  // 指定剧本ID，系统会自动检索
}
```

系统会自动：
- ✅ 从 RAG 库检索相关片段（相似度 >= 0.6）
- ✅ 获取当前分镜前后的上下文（窗口大小：2）
- ✅ 结合图片分析和 RAG 上下文生成提示词

## 🔍 检索逻辑

### 简单版本

1. **关键词提取**：从文本中提取关键词
2. **相似度计算**：计算关键词交集/并集比例
3. **过滤**：只返回相似度 >= 阈值的片段
4. **排序**：按相似度降序排列
5. **截取**：返回前 K 个结果

### 高级版本

1. **向量生成**：使用 Gemini Embedding 或 CLIP 生成查询向量
2. **向量搜索**：在向量数据库中搜索相似向量
3. **混合检索**：合并 CLIP 和 Gemini 的检索结果
4. **过滤和排序**：按相似度过滤和排序
5. **返回结果**：返回前 K 个相关片段

## 📝 总结

**RAG 库实现方式**：
- ✅ 简单版本：JSON 文件 + 关键词匹配（默认）
- ✅ 高级版本：向量数据库 + 向量相似度（可选）

**是否需要提前准备内容**：
- ✅ **是的**，需要先存储剧本文档到 RAG 库
- ✅ 可以通过脚本、API 或手动编辑 JSON 文件

**推荐流程**：
1. 使用 `simple-import-script.js` 脚本导入剧本
2. 在生成视频运动提示词时指定 `scriptId`
3. 系统自动检索相关片段和上下文
4. 结合图片分析生成更准确的提示词

