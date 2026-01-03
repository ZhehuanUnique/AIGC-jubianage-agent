# IndexTTS2.5 Docker 部署

本目录包含 IndexTTS2.5 的 Docker 部署方案，用于在生产环境中长期稳定运行文本转语音（TTS）服务。

## 🏗️ 目录结构

```
indextts-docker/
├── Dockerfile              # Docker 镜像构建文件
├── docker-compose.yml      # Docker Compose 配置
├── app.py                  # Flask API 服务
├── config.py               # 配置文件
├── requirements.txt        # Python 依赖
├── .dockerignore           # Docker 忽略文件
└── README.md              # 本文档
```

## 🚀 快速开始

### 手动部署

#### 步骤1：准备模型文件

将 IndexTTS2.5 的模型文件复制到服务器：

```bash
# 在服务器上创建目录
ssh ubuntu@119.45.121.152
mkdir -p /var/www/indextts-docker/{models,checkpoints,outputs}
```

```powershell
# 从本地复制模型文件（Windows PowerShell）
scp -r E:\IndexTTS2.5\models ubuntu@119.45.121.152:/var/www/indextts-docker/models
scp -r E:\IndexTTS2.5\checkpoints ubuntu@119.45.121.152:/var/www/indextts-docker/checkpoints
```

#### 步骤2：复制项目文件

```bash
# 复制 Docker 相关文件到服务器
scp -r indextts-docker/* ubuntu@119.45.121.152:/var/www/indextts-docker/
```

#### 步骤3：构建和启动

```bash
# SSH 到服务器
ssh ubuntu@119.45.121.152
cd /var/www/indextts-docker

# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 🔧 配置说明

### 环境变量

在 `docker-compose.yml` 中可以配置以下环境变量：

- `MODEL_PATH`: 模型文件路径（默认：`/app/models`）
- `CHECKPOINT_PATH`: 检查点路径（默认：`/app/checkpoints`）
- `OUTPUT_PATH`: 输出路径（默认：`/app/outputs`）
- `PORT`: API 端口（默认：`8000`）
- `DEVICE`: 设备类型（`cpu` 或 `cuda`，默认：`cpu`）

### GPU 支持

如果需要使用 GPU，需要：

1. **安装 NVIDIA Docker**：
   ```bash
   # 在服务器上
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
   sudo apt-get update && sudo apt-get install -y nvidia-docker2
   sudo systemctl restart docker
   ```

2. **修改 docker-compose.yml**：
   ```yaml
   deploy:
     resources:
       reservations:
         devices:
           - driver: nvidia
             count: 1
             capabilities: [gpu]
   ```

3. **修改 requirements.txt**：
   使用 GPU 版本的 PyTorch：
   ```txt
   torch==2.1.0+cu118
   torchaudio==2.1.0+cu118
   ```

## 📝 实现 IndexTTS2.5 集成

**重要**：`app.py` 中的模型加载和语音生成功能需要根据 IndexTTS2.5 的实际 API 实现。

### 需要修改的部分

1. **模型加载**（`load_model()` 函数）：
   ```python
   # 根据 IndexTTS2.5 的实际导入方式
   from indextts import IndexTTS  # 示例
   tts_model = IndexTTS(checkpoint_path=CHECKPOINT_PATH)
   available_voices = tts_model.list_voices()
   ```

2. **语音生成**（`generate_tts()` 函数）：
   ```python
   # 调用 IndexTTS2.5 生成语音
   audio_path = tts_model.generate(
       text=text,
       voice_id=voice_id,
       speed=speed,
       pitch=pitch,
       output_format=format_type,
       output_dir=OUTPUT_PATH
   )
   ```

## 🔌 API 接口

### 健康检查

```bash
GET /api/health
```

响应：
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_path": "/app/models",
  "checkpoint_path": "/app/checkpoints",
  "output_path": "/app/outputs"
}
```

### 获取音色列表

```bash
GET /api/voices
```

响应：
```json
{
  "success": true,
  "voices": [
    {
      "id": "default",
      "name": "默认音色",
      "description": "默认音色"
    }
  ]
}
```

### 生成语音

```bash
POST /api/tts/generate
Content-Type: application/json

{
  "text": "要转换的文本",
  "voice_id": "default",
  "speed": 1.0,
  "pitch": 0,
  "format": "wav"
}
```

响应：
```json
{
  "success": true,
  "audio_url": "/api/audio/output.wav",
  "format": "wav",
  "duration": 5.2
}
```

## 🔄 更新后端配置

在 `server/.env` 文件中添加：

```env
# IndexTTS2.5 配置
INDEXTTS_BASE_URL=http://119.45.121.152:8000
INDEXTTS_ENABLED=true
INDEXTTS_TIMEOUT=60000
```

然后重启后端服务。

## 📋 管理命令

### 查看日志

```bash
ssh ubuntu@119.45.121.152
cd /var/www/indextts-docker
docker-compose logs -f
```

### 重启服务

```bash
docker-compose restart
```

### 停止服务

```bash
docker-compose down
```

### 更新服务

```bash
# 停止服务
docker-compose down

# 重新构建
docker-compose build --no-cache

# 启动服务
docker-compose up -d
```

## ❓ 常见问题

### Q1: 容器启动失败？

**A:** 检查日志：
```bash
docker-compose logs
```

常见原因：
- 模型文件路径不正确
- 端口被占用
- 内存不足

### Q2: 模型加载失败？

**A:** 
1. 检查模型文件是否完整
2. 检查 `requirements.txt` 中的依赖是否正确
3. 根据 IndexTTS2.5 的实际 API 修改 `app.py`

### Q3: API 调用超时？

**A:** 
1. 增加超时时间（在 `server/.env` 中设置 `INDEXTTS_TIMEOUT`）
2. 检查服务器资源使用情况
3. 考虑使用 GPU 加速

### Q4: 如何查看容器资源使用？

**A:** 
```bash
docker stats indextts-api
```

## 🔗 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Flask 文档](https://flask.palletsprojects.com/)
- [IndexTTS2.5 项目文档](https://github.com/your-repo/IndexTTS2.5)

