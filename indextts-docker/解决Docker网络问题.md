# 解决 Docker 网络连接问题

## 问题描述

Docker 构建时无法连接到 Docker Hub：
```
failed to fetch oauth token: Post "https://auth.docker.io/token": dial tcp 199.96.58.85:443: connectex: A connection attempt failed
```

## 解决方案

### 方案1：使用国内镜像源（推荐）

**使用已创建的国内镜像配置文件：**

```powershell
cd indextts-docker
.\快速启动-使用国内镜像.ps1
```

或手动执行：

```powershell
docker-compose -f docker-compose.local.国内镜像.yml up -d --build
```

### 方案2：配置 Docker Desktop 使用镜像加速器

1. **打开 Docker Desktop**
2. **Settings → Docker Engine**
3. **添加镜像加速器配置：**

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

4. **点击 Apply & Restart**

### 方案3：使用代理（如果有 VPN）

在 Docker Desktop 中配置代理：
- Settings → Resources → Proxies
- 配置 HTTP/HTTPS 代理

### 方案4：手动拉取镜像

如果网络不稳定，可以手动拉取镜像：

```powershell
# 使用国内镜像源拉取
docker pull registry.cn-hangzhou.aliyuncs.com/acs/python:3.10-slim

# 或者使用代理拉取官方镜像
docker pull python:3.10-slim
```

## 验证网络连接

```powershell
# 测试 Docker Hub 连接
docker pull hello-world

# 如果失败，使用国内镜像
docker pull registry.cn-hangzhou.aliyuncs.com/acs/python:3.10-slim
```

## 已创建的文件

1. `Dockerfile.国内镜像` - 使用阿里云镜像源的 Dockerfile
2. `docker-compose.local.国内镜像.yml` - 使用国内镜像的配置
3. `快速启动-使用国内镜像.ps1` - 一键启动脚本

## 推荐操作

**如果 Docker Hub 连接失败，直接使用国内镜像方案：**

```powershell
cd indextts-docker
.\快速启动-使用国内镜像.ps1
```










