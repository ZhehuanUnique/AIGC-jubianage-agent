# 配置 Docker 镜像加速器（推荐方案）

## 问题

Docker 无法连接到 Docker Hub，或者国内镜像源不可用。

## 解决方案：配置 Docker Desktop 镜像加速器

这是**最推荐**的方案，配置一次后所有镜像都会使用加速器。

### 步骤

1. **打开 Docker Desktop**
2. **点击右上角 ⚙️ Settings**
3. **选择 Docker Engine**
4. **在 JSON 配置中添加以下内容：**

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ]
}
```

5. **点击 Apply & Restart**

### 验证配置

```powershell
# 测试拉取镜像
docker pull python:3.10-slim
```

如果成功，说明镜像加速器配置成功。

### 然后使用原始 Dockerfile

配置镜像加速器后，可以直接使用原始的 `docker-compose.local.yml`：

```powershell
cd indextts-docker
docker-compose -f docker-compose.local.yml up -d --build
```

## 其他镜像源选项

如果上述镜像加速器不可用，可以尝试：

### 腾讯云镜像源

```json
{
  "registry-mirrors": [
    "https://ccr.ccs.tencentyun.com"
  ]
}
```

### 阿里云镜像源（需要登录）

1. 访问 https://cr.console.aliyun.com/
2. 获取专属加速地址
3. 添加到 `registry-mirrors`

### 网易镜像源

```json
{
  "registry-mirrors": [
    "https://hub-mirror.c.163.com"
  ]
}
```

## 推荐配置（多个镜像源，自动切换）

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

配置多个镜像源后，Docker 会自动尝试，如果第一个失败会尝试下一个。






