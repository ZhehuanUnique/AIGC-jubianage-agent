# 修复 502 Bad Gateway 错误

## 问题诊断

502 Bad Gateway 错误通常表示 Nginx 无法连接到后端服务器（Node.js应用）。

## 修复步骤

### 1. 检查后端服务状态

```bash
# 检查 PM2 进程状态
pm2 status

# 查看后端服务日志
pm2 logs aigc-agent --lines 50

# 如果服务没有运行，启动它
cd /var/www/aigc-agent/server
pm2 start index.js --name aigc-agent
# 或者
pm2 restart aigc-agent
```

### 2. 检查端口是否被占用

```bash
# 检查 3002 端口是否被占用
sudo netstat -tlnp | grep 3002
# 或者
sudo lsof -i :3002

# 如果端口被占用，找到进程并停止
sudo kill -9 <PID>
```

### 3. 检查后端服务是否正常启动

```bash
# 手动测试后端服务
curl http://localhost:3002/api/health
# 或者
curl http://127.0.0.1:3002/api/health

# 如果返回错误，检查服务器日志
cd /var/www/aigc-agent/server
pm2 logs aigc-agent --lines 100
```

### 4. 检查 Nginx 配置

```bash
# 编辑 Nginx 配置
sudo nano /etc/nginx/sites-available/aigc-agent
```

确保配置正确：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name jubianai.cn www.jubianai.cn;

    # 后端 API（必须在 / 之前，优先级更高）
    location /api {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 前端静态文件
    location / {
        root /var/www/aigc-agent/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
}
```

### 5. 测试并重新加载 Nginx

```bash
# 测试 Nginx 配置
sudo nginx -t

# 如果测试通过，重新加载 Nginx
sudo systemctl reload nginx

# 或者重启 Nginx
sudo systemctl restart nginx
```

### 6. 查看 Nginx 错误日志

```bash
# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 查看最近的错误
sudo tail -n 50 /var/log/nginx/error.log
```

### 7. 检查服务器资源

```bash
# 检查内存使用
free -h

# 检查磁盘空间
df -h

# 检查 CPU 使用
top
```

### 8. 完整重启流程

如果以上步骤都不行，执行完整重启：

```bash
# 1. 停止服务
pm2 stop aigc-agent

# 2. 检查代码是否有更新
cd /var/www/aigc-agent
git pull origin main

# 3. 重启服务
cd server
pm2 restart aigc-agent

# 4. 检查服务状态
pm2 status
pm2 logs aigc-agent --lines 20

# 5. 测试后端
curl http://localhost:3002/api/health

# 6. 重启 Nginx
sudo systemctl restart nginx
```

## 常见问题

### 问题1：PM2 进程不存在

```bash
# 重新启动服务
cd /var/www/aigc-agent/server
pm2 start index.js --name aigc-agent
pm2 save
```

### 问题2：端口被占用

```bash
# 查找占用端口的进程
sudo lsof -i :3002

# 停止进程
sudo kill -9 <PID>

# 重新启动服务
pm2 restart aigc-agent
```

### 问题3：代码错误导致服务崩溃

```bash
# 查看详细错误日志
pm2 logs aigc-agent --lines 100

# 检查代码语法
cd /var/www/aigc-agent/server
node --check index.js
```

### 问题4：数据库连接失败

```bash
# 检查数据库连接
# 查看 .env 文件中的数据库配置
cd /var/www/aigc-agent/server
cat .env | grep -i database
```

## 快速修复脚本

创建并运行以下脚本：

```bash
#!/bin/bash
# fix-502.sh

echo "🔧 修复 502 Bad Gateway 错误..."

# 1. 检查并重启后端服务
cd /var/www/aigc-agent/server
pm2 restart aigc-agent
sleep 2

# 2. 检查服务状态
if pm2 list | grep -q "aigc-agent.*online"; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务启动失败，查看日志："
    pm2 logs aigc-agent --lines 20
    exit 1
fi

# 3. 测试后端连接
if curl -s http://localhost:3002/api/health > /dev/null; then
    echo "✅ 后端服务响应正常"
else
    echo "❌ 后端服务无响应"
    exit 1
fi

# 4. 重新加载 Nginx
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx 配置已重新加载"

echo "🎉 修复完成！请刷新页面测试。"
```

保存为 `fix-502.sh`，然后运行：

```bash
chmod +x fix-502.sh
./fix-502.sh
```

