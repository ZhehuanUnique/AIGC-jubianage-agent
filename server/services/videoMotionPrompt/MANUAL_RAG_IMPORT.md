# 手动添加剧本到 RAG 库指南

## 方法 1: 使用简单脚本（推荐）

直接读取 DOCX 文件，按段落切分，不调用模型：

```powershell
cd C:\Users\Administrator\Desktop\AIGC-jubianage-agent\server
node services/videoMotionPrompt/simple-import-script.js
```

这个脚本会：
- ✅ 直接读取 DOCX 文件
- ✅ 按段落切分（不调用模型）
- ✅ 自动存储到 RAG 库

## 方法 2: 使用 API 接口

### 步骤 1: 读取剧本文件内容

你可以手动读取 DOCX 文件，或者使用脚本提取文本内容。

### 步骤 2: 调用 API 存储到 RAG 库

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
      },
      {
        "shotNumber": 2,
        "content": "第二段剧本内容...",
        "prompt": "",
        "description": ""
      }
    ]
  }'
```

## 方法 3: 直接编辑 JSON 文件

1. **运行简单脚本**生成初始 JSON 文件
2. **编辑文件**：`server/data/rag_vectors/anmeng.json`
3. **格式示例**：

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
    },
    {
      "shotNumber": 2,
      "content": "第二段剧本内容",
      "keywords": ["关键词1", "关键词2"],
      "storedAt": "2025-12-27T10:00:00.000Z"
    }
  ],
  "updatedAt": "2025-12-27T10:00:00.000Z"
}
```

## 切分策略

### 简单切分（按段落）
- 按双换行符切分
- 如果段落太少，按单换行符切分
- 适合大多数剧本格式

### 手动切分
- 可以手动编辑 JSON 文件
- 按句子、场景、分镜等逻辑切分
- 更灵活，但需要手动处理

## 使用存储的剧本

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

## 文件位置

- **存储路径**: `server/data/rag_vectors/{scriptId}.json`
- **示例**: `server/data/rag_vectors/anmeng.json`

## 注意事项

1. **scriptId** 要唯一，用于标识不同的剧本
2. **shotNumber** 从 1 开始，用于排序和上下文窗口
3. **content** 是必需的，其他字段可选
4. 修改 JSON 文件后，无需重启服务，立即生效

