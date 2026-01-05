# Nginx 配置修复指南

## 问题诊断

从错误日志看到两个问题：
1. `rewrite or internal redirection cycle` - Nginx配置循环重定向
2. `connect() failed (111)` - 后端服务器未运行（已通过修复语法错误解决）

## 修复步骤

### 1. 更新代码并重启后端

```bash
cd /var/www/aigc-agent
git pull origin main
cd server
pm2 restart aigc-agent
pm2 logs aigc-agent --lines 20  # 检查是否启动成功
```

### 2. 修复 Nginx 配置

编辑 Nginx 配置文件：
```bash
sudo nano /etc/nginx/sites-available/aigc-agent
```

使用以下配置（修复循环重定向问题）：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name jubianai.cn www.jubianai.cn;

    # 前端静态文件
    location / {
        root /var/www/aigc-agent/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
        
        # 防止循环重定向
        if (-f $request_filename) {
            break;
        }
    }

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

    # 静态资源缓存（提高性能）
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/aigc-agent/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
```

### 3. 测试并重新加载 Nginx

```bash
# 测试配置
sudo nginx -t

# 如果测试通过，重新加载
sudo systemctl reload nginx

# 检查状态
sudo systemctl status nginx
```

### 4. 验证修复

```bash
# 检查后端是否运行
curl http://localhost:3002/api/health

# 检查PM2状态
pm2 status

# 查看PM2日志
pm2 logs aigc-agent --lines 50
```

## 如果仍有问题

### 检查 dist 目录是否存在
```bash
ls -la /var/www/aigc-agent/dist
```

### 检查文件权限
```bash
sudo chown -R ubuntu:ubuntu /var/www/aigc-agent/dist
```

### 重新构建前端
```bash
cd /var/www/aigc-agent
npm run build
sudo chown -R ubuntu:ubuntu dist/
```

