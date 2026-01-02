# 视频运动提示词生成功能测试指南

## 当前配置状态

### ✅ 已支持的功能
1. **文本模型** (`qwen2.5:7b`) - 当前配置
   - 根据剧本上下文推断图片内容
   - 生成动作和运镜提示词
   - 无需额外配置，直接可用

2. **视觉模型** (`qwen2.5-vl:7b`) - 已支持，需要下载模型
   - 直接分析图片内容
   - 更准确的动作和运镜分析
   - 需要下载视觉模型并更新配置

## 测试方法

### 方法 1: 使用 API 测试（推荐）

#### 1. 确保服务运行
```powershell
# 后端服务
cd server
npm start

# 在另一个终端检查 Ollama
ollama list
```

#### 2. 使用 curl 测试
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

#### 3. 使用浏览器测试
访问：`http://localhost:3002/api/ollama/health`

### 方法 2: 使用测试脚本

```powershell
cd server/services/videoMotionPrompt
node test.js
```

## 升级到视觉模型

### 步骤 1: 下载视觉模型

```powershell
ollama pull qwen2.5-vl:7b
```

**注意：** 视觉模型较大（约 8-10GB），需要更多显存和内存。

### 步骤 2: 更新环境变量

在 `server/.env` 文件中修改：

```env
# 从文本模型切换到视觉模型
OLLAMA_MODEL=qwen2.5-vl:7b
```

### 步骤 3: 重启后端服务

```powershell
# 停止当前服务（Ctrl+C）
# 重新启动
npm start
```

### 步骤 4: 验证视觉模型

```powershell
# 检查模型是否支持视觉
curl http://localhost:3002/api/ollama/health
```

如果返回的模型名称包含 `vl`，说明视觉模型已启用。

## 当前配置说明

### 文本模型 (`qwen2.5:7b`) - 当前使用
- ✅ **优点**：体积小（4.7GB），速度快，资源占用低
- ⚠️ **限制**：无法直接"看到"图片，只能根据剧本上下文推断
- 💡 **适用场景**：剧本描述详细，可以推断画面内容

### 视觉模型 (`qwen2.5-vl:7b`) - 可选升级
- ✅ **优点**：可以直接分析图片，生成更准确的提示词
- ⚠️ **限制**：体积大（8-10GB），需要更多显存（推荐 16GB+）
- 💡 **适用场景**：需要精确分析图片内容，生成高质量运动提示词

## 测试示例

### 示例 1: 基础测试（当前配置可用）

```json
{
  "imageUrl": "https://example.com/image.jpg",
  "scriptContext": "男主角站在画面中央，周围有多个女性围绕着他。",
  "shotNumber": 1
}
```

**预期输出：**
```json
{
  "success": true,
  "data": {
    "motionPrompt": "镜头缓慢推进，人物缓缓转身，目光扫过周围",
    "confidence": 0.85,
    "model": "qwen2.5:7b"
  }
}
```

### 示例 2: 完整参数测试

```json
{
  "imageUrl": "https://example.com/image.jpg",
  "scriptContext": "女主角在雨中奔跑，身后是追兵。",
  "shotNumber": 2,
  "scriptId": "script_001",
  "characterInfo": "女主角：年轻女性，长发，穿着白色连衣裙",
  "sceneInfo": "雨夜，街道，昏暗的灯光"
}
```

## 故障排查

### 问题 1: Ollama 服务不可用
```powershell
# 检查 Ollama 是否运行
ollama list

# 如果未运行，启动 Ollama（通常会自动启动）
```

### 问题 2: 模型未找到
```powershell
# 检查已下载的模型
ollama list

# 下载模型
ollama pull qwen2.5:7b
# 或
ollama pull qwen2.5-vl:7b
```

### 问题 3: 视觉模型不工作
- 确认模型名称包含 `vl`
- 确认图片 URL 可访问
- 检查后端日志中的错误信息

## 性能对比

| 模型 | 体积 | 显存需求 | 速度 | 准确性 |
|------|------|----------|------|--------|
| qwen2.5:7b | 4.7GB | 8GB+ | 快 | 中等（基于文本推断）|
| qwen2.5-vl:7b | 8-10GB | 16GB+ | 中等 | 高（直接分析图片）|

## 下一步

1. ✅ 当前配置（文本模型）已可用，可以开始测试
2. 🔄 如需更高准确性，可升级到视觉模型
3. 📈 未来可升级到更大的模型（14B、32B）

