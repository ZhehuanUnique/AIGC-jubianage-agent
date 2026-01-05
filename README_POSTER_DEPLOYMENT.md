# 海报图片部署说明

为了节省 Git 仓库空间和部署时间，海报图片已迁移到腾讯云 COS（对象存储）。

## 部署步骤

### 1. 上传海报图片到 COS

在服务器上执行以下命令：

```bash
cd /var/www/aigc-agent/server
node scripts/upload-posters-to-cos.js
```

这个脚本会：
- 读取 `poster/` 文件夹中的所有图片
- 上传到 COS 的 `posters/` 目录
- 生成 `public/poster-config.json` 配置文件（包含所有 COS URL）

### 2. 配置文件说明

上传完成后，会在 `public/poster-config.json` 生成配置文件，格式如下：

```json
{
  "posters": [
    {
      "folder": "7：10",
      "fileName": "海报7-10.png",
      "cosKey": "posters/7：10/海报7-10.png",
      "cosUrl": "https://xxx.cos.ap-guangzhou.myqcloud.com/posters/7：10/海报7-10.png"
    }
  ],
  "lastUpdated": "2026-01-05T..."
}
```

### 3. Git 配置

海报文件夹和配置文件已添加到 `.gitignore`：
- `poster/` - 本地海报文件夹（不提交到 Git）
- `public/poster/` - 本地副本（不提交到 Git）
- `public/poster-config.json` - 配置文件（不提交到 Git，需要手动上传后生成）

### 4. 首次部署

首次部署时，需要：
1. 在服务器上运行上传脚本
2. 将生成的 `poster-config.json` 复制到 `public/` 目录
3. 或者直接从 COS URL 访问（前端代码会自动从配置文件加载）

### 5. 更新海报

如果需要更新海报：
1. 将新海报放入 `poster/` 文件夹
2. 运行上传脚本
3. 重新生成配置文件

## 优势

- ✅ 减少 Git 仓库大小（海报图片不提交到 Git）
- ✅ 加快部署速度（不需要下载大量图片文件）
- ✅ 使用 CDN 加速（如果配置了 COS CDN）
- ✅ 统一管理（所有静态资源都在 COS）

## 注意事项

- 确保服务器上已配置 COS 环境变量（`COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`）
- 如果 COS 配置不可用，前端会自动回退到本地路径（开发环境）

