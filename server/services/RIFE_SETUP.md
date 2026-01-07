# RIFE 补帧服务安装指南

## 概述

本项目使用 RIFE (Real-Time Intermediate Flow Estimation) 进行视频补帧处理。

## 安装步骤

### 1. 安装 Python 环境

确保已安装 Python 3.8 或更高版本：

```bash
python --version  # Windows
python3 --version  # Linux/Mac
```

### 2. 克隆 RIFE 项目

```bash
cd server
git clone https://github.com/hzwer/RIFE.git
cd RIFE
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

主要依赖包括：
- torch
- torchvision
- opencv-python
- numpy
- pillow

### 4. 下载模型文件

RIFE 需要下载预训练模型。模型文件应该放在 `train_log` 目录下。

可以从以下位置下载：
- 官方 GitHub Releases
- 或者使用 RIFE 项目提供的下载脚本

### 5. 配置环境变量（可选）

在 `.env` 文件中添加：

```env
# RIFE 配置（可选，使用默认路径时不需要）
RIFE_SCRIPT_PATH=./rife/inference_video.py
RIFE_MODEL_PATH=./rife/train_log
```

### 6. 测试安装

```bash
python inference_video.py --video test.mp4 --output test_output.mp4 --exp 2
```

## 备选方案：FFmpeg 补帧

如果 RIFE 不可用，系统会自动回退到使用 FFmpeg 的 `minterpolate` 滤镜进行补帧。

### 安装 FFmpeg

**Windows:**
- 下载：https://ffmpeg.org/download.html
- 添加到系统 PATH

**Linux:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Mac:**
```bash
brew install ffmpeg
```

## 使用说明

补帧功能已集成到项目中，用户在前端点击"补帧"按钮后：

1. 系统会创建视频处理任务
2. 优先尝试使用 RIFE 进行补帧
3. 如果 RIFE 失败，自动回退到 FFmpeg
4. 处理完成后，结果视频会上传到 COS
5. 用户可以在任务列表中查看处理结果

## 性能说明

- **RIFE**: 质量高，速度快，推荐使用
- **FFmpeg**: 质量中等，速度快，作为备选方案

## 故障排查

1. **Python 未找到**: 确保 Python 已安装并在 PATH 中
2. **RIFE 脚本不存在**: 检查 `RIFE_SCRIPT_PATH` 环境变量或默认路径
3. **模型文件缺失**: 确保模型文件已下载到正确位置
4. **FFmpeg 未安装**: 如果 RIFE 失败，确保 FFmpeg 已安装

## 参考链接

- RIFE GitHub: https://github.com/hzwer/RIFE
- FFmpeg 文档: https://ffmpeg.org/documentation.html

