# RAG 库高级版本使用指南（Chroma/Milvus）

## 📚 概述

高级版本的 RAG 库使用向量数据库（Chroma 或 Milvus）存储剧本片段，支持真正的语义相似度检索，比简单版本更准确、更强大。

### 两种向量数据库对比

| 特性 | ChromaDB | Milvus |
|------|----------|--------|
| **部署方式** | 本地文件存储 | 独立服务（需要安装） |
| **安装难度** | ⭐ 简单 | ⭐⭐⭐ 较复杂 |
| **性能** | 适合中小规模 | 适合大规模数据 |
| **资源占用** | 低 | 中等 |
| **推荐场景** | 个人/小团队使用 | 企业/大规模使用 |

## 🚀 快速开始

### 步骤 1：安装依赖

#### 安装 ChromaDB（推荐新手）

```powershell
cd server
npm install chromadb
```

#### 安装 Milvus（适合大规模使用）

**1. 安装 Milvus SDK：**
```powershell
cd server
npm install @zilliz/milvus2-sdk-node
```

**2. 安装 Milvus 服务：**

**方式 A：使用 Docker（推荐）**
```powershell
docker pull milvusdb/milvus:latest
docker run -d --name milvus-standalone -p 19530:19530 -p 9091:9091 milvusdb/milvus:latest
```

**方式 B：使用 Docker Compose**
```yaml
# docker-compose.yml
version: '3.5'
services:
  etcd:
    image: quay.io/coreos/etcd:v3.5.5
    environment:
      - ETCD_AUTO_COMPACTION_MODE=revision
      - ETCD_AUTO_COMPACTION_RETENTION=1000
      - ETCD_QUOTA_BACKEND_BYTES=4294967296
      - ETCD_SNAPSHOT_COUNT=50000
    volumes:
      - etcd_data:/etcd
    command: etcd -advertise-client-urls=http://127.0.0.1:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd
  minio:
    image: minio/minio:RELEASE.2023-03-20T20-16-18Z
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    volumes:
      - minio_data:/minio_data
    command: minio server /minio_data --console-address ":9001"
  standalone:
    image: milvusdb/milvus:v2.3.3
    command: ["milvus", "run", "standalone"]
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
    volumes:
      - milvus_data:/var/lib/milvus
    ports:
      - "19530:19530"
      - "9091:9091"
    depends_on:
      - "etcd"
      - "minio"

volumes:
  etcd_data:
  minio_data:
  milvus_data:
```

然后运行：
```powershell
docker-compose up -d
```

### 步骤 2：安装 Gemini Embedding 依赖

```powershell
cd server
npm install @langchain/google-genai
```

### 步骤 3：配置环境变量

在 `server/.env` 文件中添加以下配置：

```env
# ==================== Gemini RAG 配置 ====================
# Gemini API Key（必需）
GEMINI_3_PRO_API_KEY=your_gemini_api_key_here
# 或使用
GEMINI_3_FLASH_API_KEY=your_gemini_api_key_here

# Gemini API 主机（可选，默认 https://api.302.ai）
GEMINI_API_HOST=https://api.302.ai

# 向量数据库类型：chroma 或 milvus
VECTOR_DB_TYPE=chroma

# Gemini RAG 向量数据库路径（Chroma 使用本地路径，Milvus 使用连接地址）
GEMINI_RAG_VECTOR_DB_PATH=./data/gemini_rag_vectors

# Milvus 配置（仅在 VECTOR_DB_TYPE=milvus 时使用）
MILVUS_HOST=localhost
MILVUS_PORT=19530

# Gemini RAG 检索返回的 top K 结果数量
GEMINI_RAG_TOP_K=5

# Gemini RAG 相似度阈值（0-1）
GEMINI_RAG_SIMILARITY_THRESHOLD=0.6

# 是否合并 CLIP 和 Gemini 的检索结果（混合检索）
GEMINI_RAG_MERGE_RESULTS=true
```

### 步骤 4：验证安装

启动后端服务，查看日志：

```powershell
cd server
npm start
```

如果看到以下日志，说明初始化成功：
```
✅ Gemini RAG 服务初始化完成（使用 CHROMA）
```
或
```
✅ Gemini RAG 服务初始化完成（使用 MILVUS）
```

## 📝 如何将剧本存储到向量数据库

### 方式 1：使用 API 接口（推荐）

#### 存储到 Chroma/Milvus

```powershell
curl -X POST http://localhost:3002/api/rag/store-script `
  -H "Content-Type: application/json" `
  -d '{
    "scriptId": "anmeng",
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
    ],
    "useClip": false
  }'
```

**参数说明**：
- `scriptId`：剧本ID（唯一标识）
- `segments`：剧本片段数组
- `useClip`：是否使用 CLIP 生成向量（默认 false，使用 Gemini Embedding）

**混合存储策略**：
- `useClip: false`：使用 Gemini Embedding（适合公开数据）
- `useClip: true`：使用 CLIP 本地生成向量（适合敏感数据，保护隐私）

### 方式 2：创建导入脚本

创建一个新的导入脚本 `server/services/videoMotionPrompt/import-to-vector-db.js`：

```javascript
/**
 * 导入剧本到向量数据库（Chroma/Milvus）
 */

import { parseDocx } from '../../utils/docxParser.js'
import { geminiRagService } from './geminiRagService.js'
import { existsSync } from 'fs'

// 剧本文件路径
const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\安萌.docx'
const scriptId = 'anmeng' // RAG 库中的剧本ID
const useClip = false // false: 使用 Gemini Embedding, true: 使用 CLIP

/**
 * 简单的文本切分（按段落或句子）
 */
function simpleSegment(text) {
  const paragraphs = text
    .split(/\n\s*\n/) // 双换行分隔段落
    .map(p => p.trim())
    .filter(p => p.length > 0)
  
  if (paragraphs.length < 3) {
    return text
      .split(/\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
  }
  
  return paragraphs
}

async function importScriptToVectorDB() {
  console.log('📚 导入剧本文档到向量数据库...\n')

  try {
    // 步骤 1: 检查文件是否存在
    console.log('1️⃣ 检查文件...')
    if (!existsSync(scriptFilePath)) {
      console.error(`❌ 文件不存在: ${scriptFilePath}`)
      return
    }
    console.log(`✅ 找到文件: ${scriptFilePath}\n`)

    // 步骤 2: 解析 DOCX 文件
    console.log('2️⃣ 解析 DOCX 文件...')
    const scriptContent = await parseDocx(scriptFilePath)
    
    if (!scriptContent || scriptContent.trim().length === 0) {
      console.error('❌ 文件内容为空或无法解析')
      return
    }
    
    console.log(`✅ 解析成功，剧本长度: ${scriptContent.length} 字符\n`)

    // 步骤 3: 简单切分（按段落）
    console.log('3️⃣ 按段落切分剧本...')
    const segments = simpleSegment(scriptContent)
    
    console.log(`✅ 切分完成，共 ${segments.length} 个片段\n`)

    // 步骤 4: 准备存储数据
    console.log('4️⃣ 准备存储数据...')
    const segmentsForRAG = segments.map((content, index) => ({
      shotNumber: index + 1,
      content: content,
      prompt: '',
      description: '',
    }))
    
    console.log(`✅ 数据准备完成，共 ${segmentsForRAG.length} 个片段\n`)

    // 步骤 5: 存储到向量数据库
    console.log(`5️⃣ 存储到向量数据库（使用 ${useClip ? 'CLIP' : 'Gemini Embedding'}）...`)
    const storeResult = await geminiRagService.storeScriptSegments(
      scriptId, 
      segmentsForRAG,
      { useClip }
    )
    
    if (!storeResult) {
      console.error('❌ 存储到向量数据库失败')
      return
    }
    
    console.log(`✅ 成功存储 ${segmentsForRAG.length} 个片段到向量数据库`)
    console.log(`   RAG 库 ID: ${scriptId}`)
    console.log(`   使用向量: ${useClip ? 'CLIP（本地）' : 'Gemini Embedding（云端）'}\n`)

    // 步骤 6: 验证存储
    console.log('6️⃣ 验证存储...')
    if (segmentsForRAG.length > 0) {
      const testRetrieval = await geminiRagService.retrieveRelevantSegments(
        scriptId,
        segmentsForRAG[0].content,
        segmentsForRAG[0].shotNumber
      )
      
      console.log(`✅ 验证成功，检索到 ${testRetrieval.length} 个相关片段`)
    }
    console.log('')

    console.log('🎉 导入完成！\n')
    console.log('📋 使用说明：')
    console.log(`   在生成视频运动提示词时，使用 scriptId: "${scriptId}"`)
    console.log(`   系统会自动从向量数据库检索相关片段和上下文\n`)

  } catch (error) {
    console.error('❌ 导入失败:', error.message)
    console.error(error.stack)
  }
}

// 运行导入
importScriptToVectorDB()
```

然后运行：

```powershell
cd server
node services/videoMotionPrompt/import-to-vector-db.js
```

## 🔍 如何确认是否导入成功

### 方法 1：查看服务日志

启动后端服务后，查看日志输出：

```
✅ 已存储 X 个剧本片段到 Chroma: script_anmeng
```

或

```
✅ 已存储 X 个剧本片段到 Milvus: script_anmeng
```

### 方法 2：检查 Chroma 数据库

如果使用 Chroma，检查数据目录：

```powershell
# 查看 Chroma 数据目录
Get-ChildItem "server\data\gemini_rag_vectors" -Recurse
```

应该能看到 Chroma 的数据库文件。

### 方法 3：检查 Milvus 集合

如果使用 Milvus，可以通过 Milvus 客户端查看：

```javascript
// 创建检查脚本
import { MilvusClient } from '@zilliz/milvus2-sdk-node'

const client = new MilvusClient({
  address: 'localhost:19530',
})

// 列出所有集合
const collections = await client.listCollections()
console.log('集合列表:', collections)
```

### 方法 4：通过 API 测试检索

```powershell
curl -X POST http://localhost:3002/api/generate-video-motion-prompt `
  -H "Content-Type: application/json" `
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "scriptContext": "测试内容",
    "shotNumber": 1,
    "scriptId": "anmeng",
    "model": "gemini-3-flash-preview"
  }'
```

如果返回结果中包含 RAG 检索的相关片段，说明导入成功。

## 🗑️ 如何删除向量数据库中的剧本

### 删除 Chroma 集合

**方式 1：删除数据目录**
```powershell
# 删除整个 Chroma 数据目录（会删除所有数据）
Remove-Item "server\data\gemini_rag_vectors" -Recurse -Force
```

**方式 2：使用 API 或脚本删除特定集合**

需要编写脚本调用 Chroma 客户端删除集合：

```javascript
import { ChromaClient } from 'chromadb'

const client = new ChromaClient({
  path: './data/gemini_rag_vectors',
})

// 删除集合
await client.deleteCollection({
  name: `script_${scriptId}`,
})
```

### 删除 Milvus 集合

```javascript
import { MilvusClient } from '@zilliz/milvus2-sdk-node'

const client = new MilvusClient({
  address: 'localhost:19530',
})

// 删除集合
await client.dropCollection({
  collection_name: `script_${scriptId}`,
})
```

## 🔄 混合检索策略

高级版本支持混合检索，可以同时使用 CLIP 和 Gemini Embedding：

### 存储时使用混合策略

```javascript
// 敏感数据使用 CLIP（本地生成，保护隐私）
await geminiRagService.storeScriptSegments(
  'sensitive_script',
  sensitiveSegments,
  { useClip: true }
)

// 公开数据使用 Gemini Embedding（云端生成，更准确）
await geminiRagService.storeScriptSegments(
  'public_script',
  publicSegments,
  { useClip: false }
)
```

### 检索时自动合并

在生成视频运动提示词时，如果设置了 `GEMINI_RAG_MERGE_RESULTS=true`，系统会自动合并 CLIP 和 Gemini 的检索结果，取最优结果。

## ⚙️ 配置说明

### Chroma 配置

```env
VECTOR_DB_TYPE=chroma
GEMINI_RAG_VECTOR_DB_PATH=./data/gemini_rag_vectors
```

- `GEMINI_RAG_VECTOR_DB_PATH`：Chroma 数据库的本地存储路径

### Milvus 配置

```env
VECTOR_DB_TYPE=milvus
MILVUS_HOST=localhost
MILVUS_PORT=19530
```

- `MILVUS_HOST`：Milvus 服务的主机地址
- `MILVUS_PORT`：Milvus 服务的端口（默认 19530）

### 检索配置

```env
GEMINI_RAG_TOP_K=5                    # 返回前 5 个最相关的结果
GEMINI_RAG_SIMILARITY_THRESHOLD=0.6   # 相似度阈值（0-1）
GEMINI_RAG_MERGE_RESULTS=true         # 是否合并 CLIP 和 Gemini 结果
```

## 🎯 使用场景建议

### 使用 Chroma 的场景

- ✅ 个人开发/测试
- ✅ 小规模数据（< 10万片段）
- ✅ 快速部署，无需额外服务
- ✅ 本地存储，数据安全

### 使用 Milvus 的场景

- ✅ 企业级应用
- ✅ 大规模数据（> 10万片段）
- ✅ 需要高性能检索
- ✅ 多用户并发访问

### 使用 CLIP 的场景

- ✅ 敏感剧本数据（保护隐私）
- ✅ 需要本地处理（不依赖云端 API）
- ✅ 数据安全要求高

### 使用 Gemini Embedding 的场景

- ✅ 公开/参考素材
- ✅ 需要更准确的语义理解
- ✅ 可以接受云端处理

## 📋 完整示例

### 示例 1：使用 Chroma 存储剧本

```powershell
# 1. 配置 .env
VECTOR_DB_TYPE=chroma
GEMINI_3_PRO_API_KEY=your_key

# 2. 安装依赖
npm install chromadb @langchain/google-genai

# 3. 运行导入脚本
node services/videoMotionPrompt/import-to-vector-db.js

# 4. 使用剧本生成提示词
curl -X POST http://localhost:3002/api/generate-video-motion-prompt `
  -H "Content-Type: application/json" `
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "scriptContext": "当前分镜内容",
    "shotNumber": 1,
    "scriptId": "anmeng",
    "model": "gemini-3-flash-preview"
  }'
```

### 示例 2：使用 Milvus 存储剧本

```powershell
# 1. 启动 Milvus 服务
docker run -d --name milvus-standalone -p 19530:19530 milvusdb/milvus:latest

# 2. 配置 .env
VECTOR_DB_TYPE=milvus
MILVUS_HOST=localhost
MILVUS_PORT=19530

# 3. 安装依赖
npm install @zilliz/milvus2-sdk-node @langchain/google-genai

# 4. 运行导入脚本
node services/videoMotionPrompt/import-to-vector-db.js
```

## ⚠️ 注意事项

1. **Gemini API Key 必需**：使用 Gemini Embedding 需要有效的 API Key
2. **Milvus 服务必须运行**：使用 Milvus 时，确保 Milvus 服务正在运行
3. **向量生成需要时间**：首次导入大量数据时，生成向量可能需要较长时间
4. **存储空间**：向量数据库会占用一定的存储空间，注意磁盘容量
5. **性能优化**：对于大规模数据，建议使用 Milvus 以获得更好的性能

## 💡 故障排查

### 问题 1：Chroma 初始化失败

**错误信息**：`⚠️ ChromaDB 未安装，Chroma 功能将不可用`

**解决方法**：
```powershell
npm install chromadb
```

### 问题 2：Milvus 连接失败

**错误信息**：`⚠️ Milvus 初始化失败`

**解决方法**：
1. 检查 Milvus 服务是否运行：`docker ps | grep milvus`
2. 检查端口是否正确：默认 19530
3. 检查防火墙设置

### 问题 3：Gemini Embedding 失败

**错误信息**：`⚠️ @langchain/google-genai 未安装`

**解决方法**：
```powershell
npm install @langchain/google-genai
```

### 问题 4：向量生成慢

**原因**：大量数据需要逐个生成向量

**解决方法**：
- 使用批量处理
- 考虑使用 CLIP（本地更快）
- 优化切分策略，减少片段数量

## 📚 相关文档

- [RAG库实现说明.md](./RAG库实现说明.md) - RAG 库技术实现细节
- [RAG库使用指南.md](./RAG库使用指南.md) - 简单版本使用指南


