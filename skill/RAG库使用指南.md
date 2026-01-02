# RAG 库使用指南

## 📚 如何导入剧本文档到 RAG 库

### 方式 1：使用简单脚本导入（推荐）

#### 步骤 1：修改脚本配置

编辑 `server/services/videoMotionPrompt/simple-import-script.js` 文件，修改以下两行：

```javascript
// 剧本文件路径（修改为你的文档路径）
const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\安萌.docx'

// RAG 库中的剧本ID（修改为唯一的ID，建议使用英文和数字）
const scriptId = 'anmeng' // 例如：'anmeng', 'script_001', 'my_script' 等
```

**路径格式说明**：
- Windows 路径需要使用双反斜杠 `\\` 或正斜杠 `/`
- 示例：`'C:\\Users\\Administrator\\Desktop\\agent测试\\安萌.docx'`
- 或者：`'C:/Users/Administrator/Desktop/agent测试/安萌.docx'`

**scriptId 命名建议**：
- 使用英文、数字、下划线
- 避免使用中文和特殊字符
- 建议使用有意义的名称，如：`anmeng`, `script_001`, `my_project_v1`

#### 步骤 2：运行导入脚本

```powershell
cd server
node services/videoMotionPrompt/simple-import-script.js
```

#### 步骤 3：查看导入结果

脚本运行后会显示：
- ✅ 文件检查结果
- ✅ 解析成功信息（剧本长度、预览）
- ✅ 切分结果（片段数量）
- ✅ 存储成功信息
- ✅ 验证结果（检索测试）

**成功标志**：
```
✅ 成功存储 X 个片段到 RAG 库
   RAG 库 ID: anmeng
   存储路径: ./data/rag_vectors/anmeng.json
✅ 验证成功，检索到 X 个相关片段
🎉 导入完成！
```

## 🔍 如何确认是否导入成功

### 方法 1：检查文件是否存在

检查 RAG 库文件是否已创建：

```powershell
# 检查文件是否存在
Test-Path "server\data\rag_vectors\anmeng.json"
```

如果返回 `True`，说明文件已创建。

### 方法 2：查看文件内容

```powershell
# 查看文件内容（前50行）
Get-Content "server\data\rag_vectors\anmeng.json" -Head 50
```

应该能看到类似这样的内容：
```json
{
  "scriptId": "anmeng",
  "segments": [
    {
      "shotNumber": 1,
      "content": "第一段剧本内容...",
      ...
    }
  ]
}
```

### 方法 3：查看所有已导入的剧本

```powershell
# 列出所有 RAG 库文件
Get-ChildItem "server\data\rag_vectors\*.json" | Select-Object Name
```

会显示所有已导入的剧本，例如：
```
anmeng.json
test_script_001.json
```

### 方法 4：通过 API 验证

```powershell
# 测试检索功能（需要后端服务运行）
curl -X POST http://localhost:3002/api/generate-video-motion-prompt `
  -H "Content-Type: application/json" `
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "scriptContext": "测试内容",
    "shotNumber": 1,
    "scriptId": "anmeng"
  }'
```

如果返回结果中包含 RAG 检索的相关片段，说明导入成功。

## 📝 今后如何导入其他剧本

### 每次导入新剧本的步骤

1. **编辑脚本文件** `server/services/videoMotionPrompt/simple-import-script.js`
2. **修改两个配置项**：
   ```javascript
   // 修改文件路径
   const scriptFilePath = '你的新文档路径.docx'
   
   // 修改剧本ID（必须是唯一的）
   const scriptId = '新的剧本ID'
   ```
3. **运行脚本**：
   ```powershell
   cd server
   node services/videoMotionPrompt/simple-import-script.js
   ```
4. **确认导入成功**（参考上面的确认方法）

### 导入多个剧本的示例

**剧本 1：安萌**
```javascript
const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\安萌.docx'
const scriptId = 'anmeng'
```

**剧本 2：另一个剧本**
```javascript
const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\新剧本.docx'
const scriptId = 'new_script_001'
```

**剧本 3：第三个剧本**
```javascript
const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\第三个剧本.docx'
const scriptId = 'script_003'
```

每次导入时，只需修改这两个变量，然后运行脚本即可。

## 🗑️ 如何删除不需要的剧本

### 方法 1：直接删除 JSON 文件（推荐）

```powershell
# 删除指定的剧本
Remove-Item "server\data\rag_vectors\anmeng.json" -Force
```

### 方法 2：查看并选择删除

```powershell
# 先查看所有剧本
Get-ChildItem "server\data\rag_vectors\*.json"

# 然后删除不需要的
Remove-Item "server\data\rag_vectors\不需要的剧本.json" -Force
```

### 方法 3：删除所有剧本（谨慎使用）

```powershell
# 删除所有 RAG 库文件（会清空所有剧本）
Remove-Item "server\data\rag_vectors\*.json" -Force
```

### 方法 4：如果使用向量数据库（Chroma/Milvus）

如果使用的是高级版本的 RAG（向量数据库），还需要删除向量数据库中的集合：

**ChromaDB**：
- 删除集合：`collection.delete()` 或删除 ChromaDB 数据目录

**Milvus**：
```javascript
// 需要编写脚本删除集合
await milvusClient.dropCollection({
  collection_name: `script_${scriptId}`
})
```

## 📋 完整示例流程

### 示例：导入"新剧本.docx"

1. **准备文件**：将 `新剧本.docx` 放在 `C:\Users\Administrator\Desktop\agent测试\` 目录

2. **修改脚本**：
   ```javascript
   const scriptFilePath = 'C:\\Users\\Administrator\\Desktop\\agent测试\\新剧本.docx'
   const scriptId = 'new_script'
   ```

3. **运行导入**：
   ```powershell
   cd server
   node services/videoMotionPrompt/simple-import-script.js
   ```

4. **确认成功**：
   ```powershell
   Test-Path "server\data\rag_vectors\new_script.json"
   # 应该返回 True
   ```

5. **使用剧本**：
   在生成视频运动提示词时，使用 `scriptId: "new_script"`

6. **删除剧本**（如果需要）：
   ```powershell
   Remove-Item "server\data\rag_vectors\new_script.json" -Force
   ```

## ⚠️ 注意事项

1. **scriptId 必须唯一**：不同剧本必须使用不同的 scriptId
2. **文件路径要正确**：确保 DOCX 文件路径正确，使用双反斜杠或正斜杠
3. **删除前确认**：删除剧本后，使用该 scriptId 的检索功能将失效
4. **备份重要数据**：删除前可以备份 JSON 文件
5. **无需重启服务**：导入或删除后，无需重启后端服务，立即生效

## 💡 提示

- **批量导入**：可以创建一个批处理脚本，循环导入多个剧本
- **定期清理**：定期检查并删除不再使用的剧本，保持 RAG 库整洁
- **命名规范**：建议使用有意义的 scriptId，便于管理和识别


