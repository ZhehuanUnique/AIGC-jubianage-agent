# IndexTTS2.5 Docker 部署

本目录包含 IndexTTS2.5 的 Docker 部署方案，用于在生产环境中长期稳定运行文本转语音（TTS）服务。

**基于 IndexTTS2 官方 API**：https://github.com/index-tts/index-tts

## 🎯 两种部署方案

### 方案1：本地运行（推荐，无需传输文件）

**适合场景：**
- 模型文件在本地（E:\IndexTTS2.5\checkpoints）
- 不需要传输 20GB 文件到服务器
- 快速测试和开发

**使用方法：**
```powershell
cd indextts-docker
docker-compose -f docker-compose.local.yml up -d
```

详细说明请查看：[本地运行说明.md](./本地运行说明.md)

### 方案2：服务器运行（需要传输文件）

**适合场景：**
- 需要在服务器上稳定运行
- 需要从任何地方访问 API
- 不占用本地资源

**使用方法：**
1. 先传输模型文件到服务器（见下方步骤）
2. 在服务器上运行 `docker-compose up -d`

---

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

IndexTTS2 需要以下文件：
- `checkpoints/config.yaml` - 配置文件
- `checkpoints/` - 模型权重文件（从官方仓库下载）

将模型文件复制到服务器：

```bash
# 在服务器上创建目录
ssh ubuntu@119.45.121.152
mkdir -p /var/www/indextts-docker/{checkpoints,outputs}
```

```powershell
# 从本地复制模型文件（Windows PowerShell）
# 假设 E:\IndexTTS2.5\ 包含 checkpoints 目录（内有 config.yaml 和模型权重）
scp -r E:\IndexTTS2.5\checkpoints ubuntu@119.45.121.152:/var/www/indextts-docker/checkpoints
```

**注意**：`checkpoints` 目录必须包含 `config.yaml` 文件。

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

- `CHECKPOINT_PATH`: 检查点路径（默认：`/app/checkpoints`）
- `CONFIG_PATH`: 配置文件路径（默认：`/app/checkpoints/config.yaml`）
- `OUTPUT_PATH`: 输出路径（默认：`/app/outputs`）
- `PORT`: API 端口（默认：`8000`）
- `DEVICE`: 设备类型（`cpu` 或 `cuda`，默认：`cuda`）
- `USE_FP16`: 是否使用 FP16 精度（默认：`True`，减少显存占用）
- `USE_CUDA_KERNEL`: 是否使用 CUDA 内核加速（默认：`True`）
- `USE_DEEPSPEED`: 是否启用 DeepSpeed（默认：`False`）

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

## 📝 IndexTTS2 API 集成

**已完成**：`app.py` 已根据 IndexTTS2 官方 API 实现。

### 实现的功能

1. **模型加载**（`load_model()` 函数）：
   ```python
   from indextts.infer_v2 import IndexTTS2
   tts_model = IndexTTS2(
       cfg_path="checkpoints/config.yaml",
       model_dir="checkpoints",
       use_fp16=True,
       use_cuda_kernel=True,
       device="cuda"
   )
   ```

2. **语音生成**（`generate_tts()` 函数）：
   ```python
   tts_model.infer(
       spk_audio_prompt="voice.wav",  # 音色参考音频
       text="要合成的文本",
       output_path="output.wav",
       emo_audio_prompt="emotion.wav",  # 情感参考音频（可选）
       emo_alpha=0.7,  # 情感强度
       temperature=0.3,
       top_p=0.7
   )
   ```

## 🔌 API 接口

### 健康检查

```bash
GET /health
# 或
GET /api/health
```

响应：
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

### 查看模型信息

```bash
GET /models
# 或
GET /api/models
```

响应：
```json
{
  "model_dir": "/app/checkpoints",
  "config_path": "/app/checkpoints/config.yaml",
  "device": "cuda",
  "use_fp16": true,
  "use_cuda_kernel": true
}
```

### 文本转语音（兼容官方 API）

```bash
POST /tts
# 或
POST /api/tts
Content-Type: application/json

{
  "spk_audio_prompt": "base64_encoded_audio",  // 音色参考音频（base64 或 URL）
  "text": "要转换的文本",
  "emo_audio_prompt": "base64_encoded_audio",  // 情感参考音频（可选，base64 或 URL）
  "output_format": "wav",  // wav 或 mp3
  "emo_alpha": 0.7,  // 情感强度 0.0~1.0
  "temperature": 0.3,  // 采样随机性 0.0~1.0
  "top_p": 0.7,  // 核采样阈值 0.0~1.0
  "top_k": 20,  // 仅考虑概率最高的k个token
  "num_beams": 3,  // 束搜索宽度
  "repetition_penalty": 1.2,  // 重复惩罚
  "length_penalty": 1.0  // 长度惩罚
}
```

响应：
```json
{
  "status": "success",
  "audio": "data:audio/wav;base64,UklGRiQAAABXQVZFZm10...",
  "duration": 5.2,
  "format": "wav"
}
```

**注意**：
- `spk_audio_prompt` 支持 base64 编码、HTTP URL 或本地文件路径
- `emo_audio_prompt` 可选，用于情感控制
- 返回的 `audio` 字段是 base64 编码的音频数据

## 🔄 更新后端配置

在 `server/.env` 文件中添加：

```env
# IndexTTS2.5 配置
INDEXTTS_BASE_URL=http://119.45.121.152:8000
INDEXTTS_ENABLED=true
INDEXTTS_TIMEOUT=60000
```

然后重启后端服务。

## 📦 安装 IndexTTS2

如果模型文件尚未下载，可以使用官方脚本：

```bash
# 在服务器上
cd /var/www/indextts-docker
git clone https://github.com/index-tts/index-tts.git
cd index-tts
python download_models.py  # 下载模型权重
# 将下载的 checkpoints 目录复制到 /var/www/indextts-docker/checkpoints
```

或者从 PyPI 安装：

```bash
pip install indextts
```

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

