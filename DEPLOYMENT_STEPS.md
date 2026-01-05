# 海报迁移到 COS - 部署步骤

## 在服务器上执行以下命令：

### 1. 拉取最新代码
```bash
cd /var/www/aigc-agent
git pull origin main
```

### 2. 安装依赖（如果有新的依赖）
```bash
cd server
npm install
```

### 3. 检查海报文件夹（可选，但推荐）
```bash
npm run check-posters
```

这会检查 `poster/` 文件夹及其子文件夹是否存在。

### 4. 上传海报到 COS
```bash
npm run upload-posters
```

**注意：** 此步骤需要：
- 确保 `server/.env` 中配置了正确的 COS 凭证
- 确保本地 `poster/` 文件夹存在（包含 `7：10` 和 `3：4` 子文件夹）
- 如果海报已经在 COS 中，脚本会覆盖现有文件

### 5. 重新构建前端
```bash
cd ..
npm run build
```

### 6. 重启服务（如果需要）
```bash
# 如果使用 PM2
pm2 restart aigc-agent

# 或者重启 Nginx
sudo systemctl reload nginx
```

## 验证

1. 检查 `public/poster-config.json` 文件是否已生成
2. 访问首页，确认海报轮播正常显示
3. 检查浏览器控制台，确认海报图片从 COS 加载

## 注意事项

- 海报图片已从 Git 仓库中排除（`.gitignore`）
- 如果服务器上没有 `poster/` 文件夹，需要从本地复制或从 COS 下载
- 首次上传后，后续部署不需要重新上传海报（除非海报有更新）

