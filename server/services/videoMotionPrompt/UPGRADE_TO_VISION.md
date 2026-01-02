# 升级到视觉模型指南

## ✅ 配置已更新

`.env` 文件中的模型配置已更新为：
```env
OLLAMA_MODEL=qwen2.5-vl:7b
```

## 📥 下一步：下载视觉模型

### 方案 1: 尝试 Qwen 视觉模型（如果可用）

在 PowerShell 中执行：

```powershell
# 注意：模型名称是 qwen2.5-vl:7b（vl，不是 v1）
ollama pull qwen2.5-vl:7b
```

**如果提示模型不存在，尝试：**
```powershell
# 尝试其他可能的名称
ollama pull qwen-vl:7b
ollama pull qwen2-vl:7b
```

### 方案 2: 使用其他视觉模型（推荐）

如果 Qwen 视觉模型不可用，可以使用 `llama3.2-vision`：

```powershell
# 下载 llama3.2-vision（11B 版本，需要 8GB+ 显存）
ollama pull llama3.2-vision:11b
```

然后在 `.env` 文件中修改：
```env
OLLAMA_MODEL=llama3.2-vision:11b
```

**注意：**
- 视觉模型体积较大（约 8-10GB），下载需要一些时间
- 需要更多显存（推荐 16GB+）
- 如果显存不足，Ollama 会自动使用 CPU（速度较慢）

## 🔍 验证下载

下载完成后，检查模型列表：

```powershell
ollama list
```

应该能看到 `qwen2.5-vl:7b` 模型。

## 🧪 测试视觉模型

### 方法 1: 直接测试 Ollama

```powershell
ollama run qwen2.5-vl:7b "描述这张图片" --image https://example.com/image.jpg
```

### 方法 2: 测试后端 API

1. **重启后端服务**（如果正在运行）：
   ```powershell
   # 停止当前服务（Ctrl+C）
   cd C:\Users\Administrator\Desktop\AIGC-jubianage-agent\server
   npm start
   ```

2. **检查健康状态**：
   ```powershell
   curl http://localhost:3002/api/ollama/health
   ```
   
   应该返回：
   ```json
   {
     "success": true,
     "data": {
       "healthy": true,
       "model": "qwen2.5-vl:7b",
       ...
     }
   }
   ```

3. **测试视频运动提示词生成**：
   ```powershell
   curl -X POST http://localhost:3002/api/generate-video-motion-prompt `
     -H "Content-Type: application/json" `
     -d '{
       "imageUrl": "https://example.com/test-image.jpg",
       "scriptContext": "男主角站在画面中央，周围有多个女性围绕着他。",
       "shotNumber": 1
     }'
   ```

## 🎯 视觉模型的优势

1. **直接分析图片**：不再依赖剧本推断，可以直接"看到"图片内容
2. **更准确的提示词**：基于实际画面内容生成动作和运镜提示词
3. **更好的理解**：能够识别画面中的细节（人物姿态、物体位置、构图等）

## ⚙️ 性能要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| 显存 | 8GB | 16GB+ |
| 内存 | 16GB | 32GB+ |
| 模型大小 | 8-10GB | - |

## 🔄 如果遇到问题

### 问题 1: 显存不足
- Ollama 会自动使用 CPU，速度较慢但可用
- 或降级回文本模型：`OLLAMA_MODEL=qwen2.5:7b`

### 问题 2: 模型下载失败或模型不存在

**如果 `qwen2.5-vl:7b` 不存在：**

1. **检查可用的视觉模型**：
   ```powershell
   # 访问 Ollama 模型库查看可用模型
   # https://ollama.com/library
   ```

2. **使用替代视觉模型**：
   ```powershell
   # 使用 llama3.2-vision
   ollama pull llama3.2-vision:11b
   ```
   然后更新 `.env`：
   ```env
   OLLAMA_MODEL=llama3.2-vision:11b
   ```

3. **或者暂时使用文本模型**（已优化，效果也不错）：
   ```env
   OLLAMA_MODEL=qwen2.5:7b
   ```
   当前代码已优化，即使没有视觉模型，也能根据剧本上下文生成较好的提示词。

### 问题 3: 视觉功能不工作
- 确认模型名称包含 `vl`
- 检查后端日志
- 确认图片 URL 可访问

## 📝 完成升级

升级完成后，系统将能够：
- ✅ 直接分析图片内容
- ✅ 生成更准确的视频运动提示词
- ✅ 更好地理解画面构图和动作

现在可以开始下载模型了！

