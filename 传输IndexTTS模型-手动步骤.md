# IndexTTS2.5 模型文件传输 - 手动步骤

## 问题原因

`scp` 命令失败是因为目标目录 `/var/www/indextts-docker/checkpoints` 在服务器上不存在。

## 解决方案

### 方法1：使用自动化脚本（推荐）

**在 Windows PowerShell 中运行：**

```powershell
.\传输IndexTTS模型到服务器.ps1
```

**或在 Git Bash 中运行：**

```bash
bash 传输IndexTTS模型到服务器.sh
```

### 方法2：手动执行（分两步）

#### 步骤1：在服务器上创建目录

```bash
# 在 PowerShell 或 Git Bash 中
ssh ubuntu@119.45.121.152 "mkdir -p /var/www/indextts-docker/checkpoints /var/www/indextts-docker/outputs"
```

#### 步骤2：传输文件

**在 PowerShell 中：**

```powershell
scp -r E:\IndexTTS2.5\checkpoints ubuntu@119.45.121.152:/var/www/indextts-docker/checkpoints
```

**在 Git Bash 中：**

```bash
scp -r /e/IndexTTS2.5/checkpoints ubuntu@119.45.121.152:/var/www/indextts-docker/checkpoints
```

## 验证传输结果

传输完成后，验证文件是否成功：

```bash
ssh ubuntu@119.45.121.152
ls -lh /var/www/indextts-docker/checkpoints/
# 应该能看到 config.yaml 和模型权重文件
```

## 注意事项

1. **文件较大（约 20GB）**：传输可能需要较长时间，请保持网络连接稳定
2. **磁盘空间**：确保服务器有足够的磁盘空间（至少 25GB）
3. **网络稳定性**：如果传输中断，可以重新运行命令（会覆盖已存在的文件）

## 如果传输中断

如果传输过程中断，可以使用 `rsync` 进行断点续传（如果已安装）：

```powershell
# PowerShell
rsync -avz --progress E:\IndexTTS2.5\checkpoints/ ubuntu@119.45.121.152:/var/www/indextts-docker/checkpoints/
```

```bash
# Git Bash
rsync -avz --progress /e/IndexTTS2.5/checkpoints/ ubuntu@119.45.121.152:/var/www/indextts-docker/checkpoints/
```




