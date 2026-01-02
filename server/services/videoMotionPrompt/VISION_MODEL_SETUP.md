# 视觉模型配置完成 ✅

## 当前配置

- **模型**: `llama3.2-vision:11b` ✅ 已下载
- **配置**: `.env` 文件已更新
- **状态**: 已就绪，等待测试

## 下一步：重启后端服务

### 1. 重启后端服务

如果后端服务正在运行，需要重启以应用新配置：

```powershell
# 停止当前服务（Ctrl+C）
# 然后重新启动
cd C:\Users\Administrator\Desktop\AIGC-jubianage-agent\server
npm start
```

### 2. 验证配置

服务启动后，检查健康状态：

```powershell
curl http://localhost:3002/api/ollama/health
```

应该返回：
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "model": "llama3.2-vision:11b",
    "baseUrl": "http://localhost:11434",
    "ragEnabled": true
  }
}
```

### 3. 测试视觉模型功能

#### 方法 1: 直接测试 Ollama（可选）

```powershell
# 测试视觉模型是否能分析图片
ollama run llama3.2-vision:11b "描述这张图片中的动作和运镜方式" --image https://example.com/image.jpg
```

#### 方法 2: 测试后端 API（推荐）

```powershell
curl -X POST http://localhost:3002/api/generate-video-motion-prompt `
  -H "Content-Type: application/json" `
  -d '{
    "imageUrl": "https://example.com/test-image.jpg",
    "scriptContext": "男主角站在画面中央，周围有多个女性围绕着他。他缓缓转身，目光扫过每一个人。",
    "shotNumber": 1,
    "scriptId": "test_001",
    "characterInfo": "男主角：年轻英俊，气质优雅",
    "sceneInfo": "室内场景，灯光柔和"
  }'
```

## 视觉模型的优势

使用 `llama3.2-vision:11b` 后，系统将能够：

1. ✅ **直接分析图片内容**：不再依赖剧本推断，可以直接"看到"图片
2. ✅ **更准确的提示词**：基于实际画面内容生成动作和运镜提示词
3. ✅ **更好的理解**：能够识别画面中的细节（人物姿态、物体位置、构图等）
4. ✅ **智能分析**：结合图片和剧本，生成更符合画面内容的运动提示词

## 性能说明

- **模型大小**: 7.8 GB
- **显存需求**: 推荐 16GB+（如果显存不足，会自动使用 CPU）
- **速度**: 比文本模型稍慢，但准确性更高

## 故障排查

### 问题 1: 服务启动失败
- 检查 `.env` 文件中的模型名称是否正确
- 确认 Ollama 服务正在运行：`ollama list`

### 问题 2: 视觉功能不工作
- 确认模型名称包含 `vision`（代码会自动检测）
- 检查后端日志中的错误信息
- 确认图片 URL 可访问

### 问题 3: 响应速度慢
- 如果显存不足，Ollama 会使用 CPU，速度较慢但可用
- 可以增加超时时间：`OLLAMA_TIMEOUT=120000`（120秒）

## 完成！

现在你的系统已经配置好视觉模型，可以开始使用了！🎉

重启后端服务后，系统将能够直接分析图片并生成更准确的视频运动提示词。

