# 修复 Docker Engine 配置

## 问题说明

您的 Docker Engine 配置文件有 JSON 语法错误：
- 多余的 `}` 和 `{` 导致结构不正确
- 末尾有 `|` 字符
- JSON 格式不完整

## 正确的配置

将 Docker Engine 配置区域的内容替换为以下正确的 JSON：

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

## 修复步骤

1. **打开 Docker Desktop**
   - 点击右上角的设置图标（齿轮）
   - 在左侧选择 "Docker Engine"

2. **清空当前内容**
   - 选中编辑器中的所有内容（Ctrl+A）
   - 删除

3. **粘贴正确的配置**
   - 复制上面的正确 JSON 配置
   - 粘贴到编辑器中

4. **应用配置**
   - 点击右下角的 "Apply & restart" 按钮
   - Docker 会重启并应用新配置

## 配置说明

- **`builder.gc.enabled: true`**: 启用构建缓存清理
- **`builder.gc.defaultKeepStorage: "20GB"`**: 保留 20GB 构建缓存
- **`experimental: false`**: 禁用实验性功能
- **`registry-mirrors`**: Docker 镜像加速器列表（国内镜像源）

## 验证配置

配置应用后，可以通过以下命令验证：

```bash
# 查看 Docker 信息
docker info | grep -A 10 "Registry Mirrors"

# 或者
docker info
```

应该能看到配置的镜像加速器。

## 常见问题

### 如果 Apply 按钮仍然是灰色的

- 检查 JSON 语法是否正确
- 确保没有多余的逗号
- 确保所有引号都是英文引号（`"` 而不是 `"` 或 `"`）

### 如果 Docker 无法启动

- 检查 JSON 格式是否正确
- 可以尝试最小配置：
  ```json
  {
    "registry-mirrors": [
      "https://docker.mirrors.ustc.edu.cn"
    ]
  }
  ```

### 其他可用的镜像加速器

如果上面的镜像源速度慢，可以尝试：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://dockerhub.azk8s.cn",
    "https://reg-mirror.qiniu.com"
  ]
}
```

## 最小配置（仅镜像加速器）

如果只需要配置镜像加速器，可以使用这个最小配置：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```




