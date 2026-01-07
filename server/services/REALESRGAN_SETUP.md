# Real-ESRGAN 安装指南

本文档说明如何在服务器上安装和配置 Real-ESRGAN，用于视频和图像的超分辨率处理。

## 什么是 Real-ESRGAN？

Real-ESRGAN 是一个实用的图像/视频超分辨率工具，能够将低分辨率图像/视频放大 2x 或 4x，同时保持较好的细节和清晰度。

- **GitHub**: https://github.com/xinntao/Real-ESRGAN
- **支持格式**: 图像（JPG, PNG等）和视频（MP4等）
- **放大倍数**: 2x, 4x
- **分辨率提升**: 
  - 720p → 1440p (2x) 或 4K (4x)
  - 1080p → 4K (2x) 或 8K (4x)

## 安装步骤

### 方法1: 使用 pip 安装（推荐，简单快速）

```bash
# 安装 Real-ESRGAN
pip3 install realesrgan

# 验证安装
python3 -c "import realesrgan; print('Real-ESRGAN 安装成功')"
```

### 方法2: 从 GitHub 克隆（完整功能）

```bash
# 1. 克隆仓库
cd /var/www/aigc-agent
git clone https://github.com/xinntao/Real-ESRGAN.git
cd Real-ESRGAN

# 2. 安装依赖
pip3 install basicsr facexlib gfpgan
pip3 install -r requirements.txt

# 3. 安装 Real-ESRGAN
pip3 install realesrgan

# 4. 下载模型文件（会自动下载，或手动下载）
# 模型会下载到 ~/.cache/realesrgan/ 目录
```

## 环境变量配置

在 `.env` 文件中添加以下配置（可选）：

```env
# Real-ESRGAN 配置
REALESRGAN_SCRIPT_PATH=/var/www/aigc-agent/Real-ESRGAN/inference_realesrgan.py
REALESRGAN_MODEL_PATH=/var/www/aigc-agent/Real-ESRGAN
```

如果不设置，系统会使用默认路径或自动检测。

## 验证安装

运行以下命令验证安装：

```bash
# 检查 Python 版本（需要 3.8+）
python3 --version

# 检查 Real-ESRGAN 是否安装
python3 -c "import realesrgan; print('✅ Real-ESRGAN 已安装')"

# 或者使用命令行工具
realesrgan --help
```

## 使用说明

### 支持的放大倍数

- **2x**: 将分辨率提升 2 倍（如 720p → 1440p）
- **4x**: 将分辨率提升 4 倍（如 720p → 4K）

### 支持的模型

- `RealESRGAN_x4plus`: 通用模型，支持 2x 和 4x 放大（推荐）
- `RealESRNet_x4plus`: 更轻量的模型
- `RealESRGAN_x4plus_anime`: 专门针对动漫/插画优化

### 性能要求

- **CPU**: 处理速度较慢，适合小视频
- **GPU**: 推荐使用 GPU 加速（CUDA），处理速度可提升 10-50 倍
- **内存**: 建议至少 4GB 可用内存
- **存储**: 处理后的视频可能比原视频大 4-16 倍

## 故障排除

### 问题1: 模块未找到

```bash
# 重新安装
pip3 install --upgrade realesrgan
```

### 问题2: 模型下载失败

模型会自动下载到 `~/.cache/realesrgan/` 目录。如果下载失败，可以手动下载：

```bash
# 创建缓存目录
mkdir -p ~/.cache/realesrgan

# 手动下载模型（示例）
# 访问 https://github.com/xinntao/Real-ESRGAN/releases 下载模型文件
```

### 问题3: 内存不足

对于大视频，可以调整分块大小：

- 在代码中设置 `tileSize` 参数（如 512 或 1024）
- 这会分块处理视频，减少内存占用

### 问题4: 处理速度慢

- 使用 GPU 加速（需要安装 CUDA 版本的 PyTorch）
- 降低 `tileSize` 参数（但会增加处理时间）
- 对于大视频，考虑先降低分辨率再处理

## 测试

安装完成后，可以通过 API 测试超分辨率功能：

```bash
# 创建超分辨率任务
curl -X POST http://localhost:3002/api/video-processing-tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoTaskId": "your_video_task_id",
    "processingType": "super_resolution",
    "scale": 2
  }'
```

## 注意事项

1. **处理时间**: 超分辨率处理可能需要较长时间，特别是大视频（可能需要 10-30 分钟）
2. **存储空间**: 处理后的视频文件会显著增大（4-16倍）
3. **质量**: 4x 放大的质量可能不如 2x 放大，建议根据需求选择
4. **GPU 加速**: 如果有 GPU，强烈建议使用 GPU 版本以提升处理速度

## 相关资源

- Real-ESRGAN GitHub: https://github.com/xinntao/Real-ESRGAN
- 官方文档: https://github.com/xinntao/Real-ESRGAN/blob/master/README.md
- 模型下载: https://github.com/xinntao/Real-ESRGAN/releases

